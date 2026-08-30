const test = require('node:test');
const assert = require('node:assert/strict');
const { createDashboardService } = require('../src/services/dashboardService');

function material(id, name, code, netPrice, grossPrice, groups = []) {
  return {
    id,
    name,
    code,
    netPrice,
    grossPrice,
    groups: groups.map(([groupId, groupName]) => ({ group: { id: groupId, name: groupName } })),
  };
}

function makePrisma(records) {
  const calls = [];
  return {
    calls,
    prisma: {
      orderMaterialUsage: {
        findMany: async (args) => {
          calls.push(args);
          return records;
        },
      },
    },
  };
}

test('dashboard sumuje wielokrotne zużycia tego samego materiału', async () => {
  const steel = material(1, 'Stal', 'ST-01', 10, 12.3, [[7, 'Obudowy']]);
  const { prisma } = makePrisma([
    { materialId: 1, quantityUsed: 1.25, material: steel },
    { materialId: 1, quantityUsed: 2.5, material: steel },
  ]);

  const getDashboardData = createDashboardService(prisma);
  const result = await getDashboardData({});

  assert.equal(result.allMaterials[0].totalQuantity, 3.75);
  assert.equal(result.allMaterials[0].netValue, 37.5);
  assert.equal(result.allMaterials[0].grossValue, 46.13);
});

test('materiał może należeć do więcej niż jednej grupy', async () => {
  const cable = material(2, 'Przewód', 'KB-01', 3, 3.69, [[1, 'Kable'], [2, 'Elektronika']]);
  const { prisma } = makePrisma([{ materialId: 2, quantityUsed: 5, material: cable }]);

  const result = await createDashboardService(prisma)({});

  assert.equal(result.groups.length, 2);
  assert.equal(result.groups[0].materials[0].materialCode, 'KB-01');
  assert.equal(result.groups[1].materials[0].materialCode, 'KB-01');
});

test('materiał bez grupy trafia do sekcji ungrouped', async () => {
  const loose = material(3, 'Element luzem', 'EL-01', 1, 1.23);
  const { prisma } = makePrisma([{ materialId: 3, quantityUsed: 2, material: loose }]);

  const result = await createDashboardService(prisma)({});

  assert.equal(result.ungrouped.length, 1);
  assert.equal(result.ungrouped[0].materialId, 3);
});

test('filtr grupy zwraca tylko wskazaną grupę', async () => {
  const shared = material(4, 'Wspólny', 'W-01', 2, 2.46, [[10, 'A'], [20, 'B']]);
  const { prisma } = makePrisma([{ materialId: 4, quantityUsed: 1, material: shared }]);

  const result = await createDashboardService(prisma)({ groupId: '20' });

  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].groupId, 20);
  assert.deepEqual(result.allMaterials, []);
  assert.deepEqual(result.ungrouped, []);
});

test('filtry dat są przekazywane do zapytania o zużycie', async () => {
  const { prisma, calls } = makePrisma([]);
  await createDashboardService(prisma)({ dateFrom: '2026-08-01', dateTo: '2026-08-31' });

  const filter = calls[0].where.order.orderDate;
  assert.equal(filter.gte.toISOString().slice(0, 10), '2026-08-01');
  assert.equal(filter.lte.getFullYear(), 2026);
  assert.equal(filter.lte.getMonth(), 7);
  assert.equal(filter.lte.getDate(), 31);
  assert.equal(filter.lte.getHours(), 23);
  assert.equal(filter.lte.getMinutes(), 59);
});
