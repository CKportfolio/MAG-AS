const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/materials
router.get('/', asyncHandler(async (req, res) => {
  const { search, active } = req.query;

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
    ];
  }

  if (active === 'true') where.isActive = true;
  else if (active === 'false') where.isActive = false;

  const materials = await prisma.material.findMany({
    where,
    include: {
      groups: { include: { group: true } },
      _count: { select: { productMaterials: true } },
    },
    orderBy: { name: 'asc' },
  });

  const result = materials.map(m => ({
    id: m.id,
    name: m.name,
    code: m.code,
    typeSize: m.typeSize,
    netPrice: m.netPrice,
    vatRate: m.vatRate,
    grossPrice: m.grossPrice,
    description: m.description,
    isActive: m.isActive,
    groupCount: m.groups.length,
    groups: m.groups.map(g => ({ id: g.group.id, name: g.group.name })),
    usedInProducts: m._count.productMaterials,
    createdAt: m.createdAt,
  }));

  res.json(result);
}));

// GET /api/materials/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const material = await prisma.material.findUnique({
    where: { id },
    include: {
      attributes: true,
      groups: { include: { group: true } },
    },
  });

  if (!material) {
    return res.status(404).json({ error: 'Materiał nie znaleziony' });
  }

  res.json({
    ...material,
    groups: material.groups.map(g => ({ id: g.group.id, name: g.group.name })),
  });
}));

// POST /api/materials
router.post('/', asyncHandler(async (req, res) => {
  const { name, code, typeSize, netPrice, vatRate, grossPrice, description, attributes, groupIds } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Nazwa i kod są wymagane' });
  }

  const existing = await prisma.material.findUnique({ where: { code } });
  if (existing) {
    return res.status(400).json({ error: 'Materiał o tym kodzie już istnieje' });
  }

  const calculatedGross = grossPrice || (netPrice * (1 + (vatRate || 23) / 100));

  const material = await prisma.material.create({
    data: {
      name,
      code,
      typeSize: typeSize || null,
      netPrice: netPrice || 0,
      vatRate: vatRate ?? 23,
      grossPrice: Math.round(calculatedGross * 100) / 100,
      description: description || null,
      attributes: attributes?.length ? {
        create: attributes.map(a => ({
          attributeName: a.attributeName,
          attributeValue: a.attributeValue,
        })),
      } : undefined,
      groups: groupIds?.length ? {
        create: groupIds.map(gId => ({ groupId: gId })),
      } : undefined,
    },
    include: {
      attributes: true,
      groups: { include: { group: true } },
    },
  });

  res.status(201).json(material);
}));

// PUT /api/materials/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, code, typeSize, netPrice, vatRate, grossPrice, description, attributes, groupIds } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Nazwa i kod są wymagane' });
  }

  const existing = await prisma.material.findFirst({ where: { code, NOT: { id } } });
  if (existing) {
    return res.status(400).json({ error: 'Inny materiał o tym kodzie już istnieje' });
  }

  const calculatedGross = grossPrice || (netPrice * (1 + (vatRate || 23) / 100));

  const material = await prisma.$transaction(async (tx) => {
    // Update material
    await tx.material.update({
      where: { id },
      data: {
        name,
        code,
        typeSize: typeSize || null,
        netPrice: netPrice || 0,
        vatRate: vatRate ?? 23,
        grossPrice: Math.round(calculatedGross * 100) / 100,
        description: description || null,
      },
    });

    // Replace attributes
    await tx.materialAttribute.deleteMany({ where: { materialId: id } });
    if (attributes?.length) {
      await tx.materialAttribute.createMany({
        data: attributes.map(a => ({
          materialId: id,
          attributeName: a.attributeName,
          attributeValue: a.attributeValue,
        })),
      });
    }

    // Replace group assignments
    await tx.materialGroup.deleteMany({ where: { materialId: id } });
    if (groupIds?.length) {
      await tx.materialGroup.createMany({
        data: groupIds.map(gId => ({ materialId: id, groupId: gId })),
      });
    }

    return tx.material.findUnique({
      where: { id },
      include: {
        attributes: true,
        groups: { include: { group: true } },
      },
    });
  });

  res.json(material);
}));

// PATCH /api/materials/:id/toggle
router.patch('/:id/toggle', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const material = await prisma.material.findUnique({ where: { id } });

  if (!material) {
    return res.status(404).json({ error: 'Materiał nie znaleziony' });
  }

  const updated = await prisma.material.update({
    where: { id },
    data: { isActive: !material.isActive },
  });

  res.json(updated);
}));

// DELETE /api/materials/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) return res.status(404).json({ error: 'Materiał nie znaleziony' });
  await prisma.material.delete({ where: { id } });
  res.json({ message: 'Materiał usunięty' });
}));

// POST /api/materials/delete-batch
router.post('/delete-batch', asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Wymagana lista ID' });
  }
  const result = await prisma.material.deleteMany({ where: { id: { in: ids.map(Number) } } });
  res.json({ deleted: result.count });
}));

module.exports = router;
