const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/products
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

  const products = await prisma.product.findMany({
    where,
    include: {
      _count: { select: { materials: true } },
    },
    orderBy: { name: 'asc' },
  });

  const result = products.map(p => ({
    id: p.id,
    name: p.name,
    code: p.code,
    description: p.description,
    netPrice: p.netPrice,
    vatRate: p.vatRate,
    grossPrice: p.grossPrice,
    isActive: p.isActive,
    materialCount: p._count.materials,
    createdAt: p.createdAt,
  }));

  res.json(result);
}));

// GET /api/products/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      materials: {
        include: {
          material: { select: { id: true, name: true, code: true, typeSize: true, netPrice: true, grossPrice: true } },
        },
      },
    },
  });

  if (!product) {
    return res.status(404).json({ error: 'Produkt nie znaleziony' });
  }

  res.json({
    ...product,
    materials: product.materials.map(pm => ({
      id: pm.id,
      materialId: pm.materialId,
      materialName: pm.material.name,
      materialCode: pm.material.code,
      materialTypeSize: pm.material.typeSize,
      netPrice: pm.material.netPrice,
      grossPrice: pm.material.grossPrice,
      quantity: pm.quantity,
    })),
  });
}));

// POST /api/products
router.post('/', asyncHandler(async (req, res) => {
  const { name, code, description, netPrice, vatRate, grossPrice, materials } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Nazwa i kod są wymagane' });
  }

  const existing = await prisma.product.findUnique({ where: { code } });
  if (existing) {
    return res.status(400).json({ error: 'Produkt o tym kodzie już istnieje' });
  }

  const calcGross = grossPrice || ((netPrice || 0) * (1 + (vatRate || 23) / 100));

  const product = await prisma.product.create({
    data: {
      name,
      code,
      description: description || null,
      netPrice: netPrice || 0,
      vatRate: vatRate ?? 23,
      grossPrice: Math.round(calcGross * 100) / 100,
      materials: materials?.length ? {
        create: materials.map(m => ({
          materialId: m.materialId,
          quantity: m.quantity,
        })),
      } : undefined,
    },
    include: {
      materials: {
        include: { material: true },
      },
    },
  });

  res.status(201).json(product);
}));

// PUT /api/products/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, code, description, netPrice, vatRate, grossPrice, materials } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Nazwa i kod są wymagane' });
  }

  const existing = await prisma.product.findFirst({ where: { code, NOT: { id } } });
  if (existing) {
    return res.status(400).json({ error: 'Inny produkt o tym kodzie już istnieje' });
  }

  const calcGross = grossPrice || ((netPrice || 0) * (1 + (vatRate || 23) / 100));

  const product = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name,
        code,
        description: description || null,
        netPrice: netPrice || 0,
        vatRate: vatRate ?? 23,
        grossPrice: Math.round(calcGross * 100) / 100,
      },
    });

    // Replace materials
    await tx.productMaterial.deleteMany({ where: { productId: id } });
    if (materials?.length) {
      await tx.productMaterial.createMany({
        data: materials.map(m => ({
          productId: id,
          materialId: m.materialId,
          quantity: m.quantity,
        })),
      });
    }

    return tx.product.findUnique({
      where: { id },
      include: {
        materials: { include: { material: true } },
      },
    });
  });

  res.json(product);
}));

// POST /api/products/:id/duplicate
router.post('/:id/duplicate', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const original = await prisma.product.findUnique({
    where: { id },
    include: { materials: true },
  });

  if (!original) {
    return res.status(404).json({ error: 'Produkt nie znaleziony' });
  }

  // Generate unique code
  let newCode = original.code + '-KOPIA';
  let counter = 1;
  while (await prisma.product.findUnique({ where: { code: newCode } })) {
    newCode = original.code + '-KOPIA-' + counter;
    counter++;
  }

  const newProduct = await prisma.product.create({
    data: {
      name: original.name + ' (kopia)',
      code: newCode,
      description: original.description,
      netPrice: original.netPrice,
      vatRate: original.vatRate,
      grossPrice: original.grossPrice,
      materials: {
        create: original.materials.map(m => ({
          materialId: m.materialId,
          quantity: m.quantity,
        })),
      },
    },
    include: {
      materials: { include: { material: true } },
    },
  });

  res.status(201).json(newProduct);
}));

// PATCH /api/products/:id/toggle
router.patch('/:id/toggle', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    return res.status(404).json({ error: 'Produkt nie znaleziony' });
  }

  const updated = await prisma.product.update({
    where: { id },
    data: { isActive: !product.isActive },
  });

  res.json(updated);
}));

// DELETE /api/products/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return res.status(404).json({ error: 'Produkt nie znaleziony' });
  await prisma.product.delete({ where: { id } });
  res.json({ message: 'Produkt usunięty' });
}));

// POST /api/products/delete-batch
router.post('/delete-batch', asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Wymagana lista ID' });
  }
  const result = await prisma.product.deleteMany({ where: { id: { in: ids.map(Number) } } });
  res.json({ deleted: result.count });
}));

module.exports = router;
