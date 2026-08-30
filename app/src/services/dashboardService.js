function createDashboardService(prisma) {
  return async function getDashboardData({ dateFrom, dateTo, groupId }) {
    const orderDateFilter = {};
    if (dateFrom) orderDateFilter.gte = new Date(dateFrom);
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      orderDateFilter.lte = to;
    }

    const whereUsage = {};
    if (dateFrom || dateTo) {
      whereUsage.order = { orderDate: orderDateFilter };
    }

    const usage = await prisma.orderMaterialUsage.findMany({
      where: whereUsage,
      include: {
        material: {
          include: {
            groups: {
              include: { group: true },
            },
          },
        },
      },
    });

    const materialMap = {};
    for (const record of usage) {
      const matId = record.materialId;
      if (!materialMap[matId]) {
        materialMap[matId] = {
          materialId: matId,
          materialName: record.material.name,
          materialCode: record.material.code,
          netPrice: record.material.netPrice,
          grossPrice: record.material.grossPrice,
          totalQuantity: 0,
          groups: record.material.groups.map((g) => ({
            id: g.group.id,
            name: g.group.name,
          })),
        };
      }
      materialMap[matId].totalQuantity += record.quantityUsed;
    }

    const allMaterials = Object.values(materialMap).map((mat) => ({
      ...mat,
      totalQuantity: Math.round(mat.totalQuantity * 10000) / 10000,
      netValue: Math.round(mat.totalQuantity * mat.netPrice * 100) / 100,
      grossValue: Math.round(mat.totalQuantity * mat.grossPrice * 100) / 100,
    }));

    const groupMap = {};
    const ungrouped = [];

    for (const mat of allMaterials) {
      if (mat.groups.length === 0) {
        ungrouped.push(mat);
      } else {
        for (const g of mat.groups) {
          if (groupId && g.id !== parseInt(groupId)) continue;
          if (!groupMap[g.id]) {
            groupMap[g.id] = {
              groupId: g.id,
              groupName: g.name,
              materials: [],
            };
          }
          groupMap[g.id].materials.push(mat);
        }
      }
    }

    const groups = Object.values(groupMap);
    const totalNetValue = allMaterials.reduce((sum, m) => sum + m.netValue, 0);
    const totalGrossValue = allMaterials.reduce((sum, m) => sum + m.grossValue, 0);

    return {
      groups,
      ungrouped: groupId ? [] : ungrouped,
      allMaterials: groupId ? [] : allMaterials,
      summary: {
        totalMaterials: allMaterials.length,
        totalNetValue: Math.round(totalNetValue * 100) / 100,
        totalGrossValue: Math.round(totalGrossValue * 100) / 100,
      },
    };
  };
}

async function getDashboardData(options) {
  const prisma = require('../prisma');
  return createDashboardService(prisma)(options);
}

module.exports = { getDashboardData, createDashboardService };
