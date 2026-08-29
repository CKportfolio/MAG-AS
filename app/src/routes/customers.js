const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/customers
router.get('/', asyncHandler(async (req, res) => {
  const { search } = req.query;

  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { taxId: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  res.json(customers);
}));

// GET /api/customers/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const customer = await prisma.customer.findUnique({ where: { id } });

  if (!customer) {
    return res.status(404).json({ error: 'Klient nie znaleziony' });
  }

  res.json(customer);
}));

// POST /api/customers
router.post('/', asyncHandler(async (req, res) => {
  const { name, taxId, email, phone, note } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nazwa klienta jest wymagana' });
  }

  const customer = await prisma.customer.create({
    data: {
      name,
      taxId: taxId || null,
      email: email || null,
      phone: phone || null,
      note: note || null,
    },
  });

  res.status(201).json(customer);
}));

// PUT /api/customers/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, taxId, email, phone, note } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nazwa klienta jest wymagana' });
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name,
      taxId: taxId || null,
      email: email || null,
      phone: phone || null,
      note: note || null,
    },
  });

  res.json(customer);
}));

// DELETE /api/customers/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return res.status(404).json({ error: 'Klient nie znaleziony' });
  await prisma.customer.delete({ where: { id } });
  res.json({ message: 'Klient usunięty' });
}));

// POST /api/customers/delete-batch
router.post('/delete-batch', asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Wymagana lista ID' });
  }
  const result = await prisma.customer.deleteMany({ where: { id: { in: ids.map(Number) } } });
  res.json({ deleted: result.count });
}));

module.exports = router;
