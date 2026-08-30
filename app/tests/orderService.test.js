const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrderService } = require('../src/services/orderService');

function makePrisma({ products = {}, materials = {} } = {}) {
  const createdItems = [];
  const usage = [];
  let itemId = 100;

  const tx = {
    order: {
      create: async ({ data }) => ({ id: 1, ...data }),
      findUnique: async () => ({ id: 1, items: createdItems, materialUsage: usage }),
    },
    product: {
      findUnique: async ({ where }) => products[where.id] || null,
    },
    material: {
      findUnique: async ({ where }) => materials[where.id] || null,
    },
    orderItem: {
      create: async ({ data }) => {
        const row = { id: itemId++, ...data };
        createdItems.push(row);
        return row;
      },
    },
    orderMaterialUsage: {
      create: async ({ data }) => {
        usage.push({ ...data });
        return data;
      },
    },
  };

  return {
    prisma: { $transaction: async (fn) => fn(tx) },
    createdItems,
    usage,
  };
}

function baseOrder(items) {
  return {
    orderDate: '2026-08-31',
    customerNameSnapshot: 'Klient testowy',
    paymentMethod: 'bank_transfer',
    items,
  };
}

test('sprzedaż produktu rozwija BOM do snapshotu zużycia materiałów', async () => {
  const { prisma, usage } = makePrisma({
    products: {
      7: {
        id: 7,
        name: 'Palnik A',
        materials: [
          { materialId: 10, quantity: 2.5 },
          { materialId: 11, quantity: 4 },
        ],
      },
    },
  });

  const createOrder = createOrderService(prisma);
  await createOrder(baseOrder([{ productId: 7, quantity: 3 }]));

  assert.deepEqual(
    usage.map((row) => ({ materialId: row.materialId, quantityUsed: row.quantityUsed })),
    [
      { materialId: 10, quantityUsed: 7.5 },
      { materialId: 11, quantityUsed: 12 },
    ]
  );
});

test('sprzedaż materiału bezpośredniego zapisuje zużycie 1:1', async () => {
  const { prisma, usage } = makePrisma({ materials: { 3: { id: 3, name: 'Śruba' } } });
  const createOrder = createOrderService(prisma);

  await createOrder(baseOrder([{ materialId: 3, quantity: 8 }]));

  assert.equal(usage.length, 1);
  assert.equal(usage[0].materialId, 3);
  assert.equal(usage[0].productId, null);
  assert.equal(usage[0].quantityUsed, 8);
});

test('snapshot zachowuje ilości BOM z momentu sprzedaży', async () => {
  const product = {
    id: 5,
    name: 'Produkt',
    materials: [{ materialId: 20, quantity: 2 }],
  };
  const { prisma, usage } = makePrisma({ products: { 5: product } });
  const createOrder = createOrderService(prisma);

  await createOrder(baseOrder([{ productId: 5, quantity: 4 }]));
  product.materials[0].quantity = 99;

  assert.equal(usage[0].quantityUsed, 8);
});

test('odrzuca produkt bez zdefiniowanego BOM', async () => {
  const { prisma } = makePrisma({ products: { 9: { id: 9, name: 'Bez BOM', materials: [] } } });
  const createOrder = createOrderService(prisma);

  await assert.rejects(
    () => createOrder(baseOrder([{ productId: 9, quantity: 1 }])),
    (error) => error.status === 400 && /nie ma zdefiniowanego składu/.test(error.message)
  );
});

test('odrzuca nieistniejący materiał', async () => {
  const { prisma } = makePrisma();
  const createOrder = createOrderService(prisma);

  await assert.rejects(
    () => createOrder(baseOrder([{ materialId: 404, quantity: 1 }])),
    (error) => error.status === 400 && /nie istnieje/.test(error.message)
  );
});

test('odrzuca pustą listę pozycji', async () => {
  const { prisma } = makePrisma();
  const createOrder = createOrderService(prisma);

  await assert.rejects(
    () => createOrder(baseOrder([])),
    (error) => error.status === 400 && /co najmniej jedną pozycję/.test(error.message)
  );
});

test('odrzuca ilość równą zero lub ujemną', async () => {
  const { prisma } = makePrisma({ materials: { 1: { id: 1 } } });
  const createOrder = createOrderService(prisma);

  await assert.rejects(
    () => createOrder(baseOrder([{ materialId: 1, quantity: 0 }])),
    (error) => error.status === 400 && /dodatnią liczbą/.test(error.message)
  );
});
