const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/groups
router.get('/', asyncHandler(async (req, res) => {
  const { search } = req.query;

  const where = {};
  if (search) {
    where.name = { contains: search };
  }

  const groups = await prisma.group.findMany({
    where,
    include: {
      _count: { select: { materials: true } },
    },
    orderBy: { name: 'asc' },
  });

  const result = groups.map(g => ({
    id: g.id,
    name: g.name,
    description: g.description,
    materialCount: g._count.materials,
    createdAt: g.createdAt,
  }));

  res.json(result);
}));

// GET /api/groups/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      materials: {
        include: {
          material: { select: { id: true, name: true, code: true, isActive: true } },
        },
      },
    },
  });

  if (!group) {
    return res.status(404).json({ error: 'Grupa nie znaleziona' });
  }

  res.json({
    ...group,
    materials: group.materials.map(m => m.material),
  });
}));

// POST /api/groups
router.post('/', asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nazwa grupy jest wymagana' });
  }

  const group = await prisma.group.create({
    data: { name, description: description || null },
  });

  res.status(201).json(group);
}));

// PUT /api/groups/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nazwa grupy jest wymagana' });
  }

  const group = await prisma.group.update({
    where: { id },
    data: { name, description: description || null },
  });

  res.json(group);
}));

// DELETE /api/groups/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const group = await prisma.group.findUnique({
    where: { id },
    include: { _count: { select: { materials: true } } },
  });

  if (!group) {
    return res.status(404).json({ error: 'Grupa nie znaleziona' });
  }

  if (group._count.materials > 0) {
    return res.status(400).json({
      error: `Nie można usunąć grupy — jest powiązana z ${group._count.materials} materiałami. Najpierw usuń powiązania.`,
    });
  }

  await prisma.group.delete({ where: { id } });
  res.json({ message: 'Grupa została usunięta' });
}));

module.exports = router;
