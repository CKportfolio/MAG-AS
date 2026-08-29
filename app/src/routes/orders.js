const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { createOrder } = require('../services/orderService');

// GET /api/orders
router.get('/', asyncHandler(async (req, res) => {
  const { search, dateFrom, dateTo } = req.query;

  const where = {};

  if (dateFrom || dateTo) {
    where.orderDate = {};
    if (dateFrom) where.orderDate.gte = new Date(dateFrom);
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      where.orderDate.lte = to;
    }
  }

  if (search) {
    where.OR = [
      { customerNameSnapshot: { contains: search } },
      { documentNumber: { contains: search } },
      { invoiceNumber: { contains: search } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, code: true } },
          material: { select: { id: true, name: true, code: true } },
        },
      },
    },
    orderBy: { orderDate: 'desc' },
  });

  const result = orders.map(o => ({
    id: o.id,
    orderDate: o.orderDate,
    customerNameSnapshot: o.customerNameSnapshot,
    documentNumber: o.documentNumber,
    invoiceNumber: o.invoiceNumber,
    paymentMethod: o.paymentMethod,
    note: o.note,
    itemCount: o.items.length,
    items: o.items.map(i => ({
      productName: i.product?.name || null,
      productCode: i.product?.code || null,
      materialName: i.material?.name || null,
      materialCode: i.material?.code || null,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      type: i.productId ? 'product' : 'material',
    })),
    createdAt: o.createdAt,
  }));

  res.json(result);
}));

// GET /api/orders/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          product: { select: { id: true, name: true, code: true } },
          material: { select: { id: true, name: true, code: true } },
        },
      },
      materialUsage: {
        include: {
          material: { select: { id: true, name: true, code: true, netPrice: true, grossPrice: true } },
          product: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!order) {
    return res.status(404).json({ error: 'Zamówienie nie znalezione' });
  }

  res.json(order);
}));

// POST /api/orders
router.post('/', asyncHandler(async (req, res) => {
  const data = req.body;

  if (!data.orderDate) {
    return res.status(400).json({ error: 'Data zamówienia jest wymagana' });
  }
  if (!data.customerNameSnapshot) {
    return res.status(400).json({ error: 'Nazwa klienta jest wymagana' });
  }
  if (!data.paymentMethod) {
    return res.status(400).json({ error: 'Forma płatności jest wymagana' });
  }
  if (!data.items || data.items.length === 0) {
    return res.status(400).json({ error: 'Zamówienie musi zawierać co najmniej jedną pozycję' });
  }

  for (const item of data.items) {
    if (!item.productId && !item.materialId) {
      return res.status(400).json({ error: 'Każda pozycja musi mieć produkt lub materiał' });
    }
    if (!item.quantity || item.quantity <= 0) {
      return res.status(400).json({ error: 'Każda pozycja musi mieć dodatnią ilość' });
    }
  }

  const order = await createOrder(data);

  res.status(201).json(order);
}));

// DELETE /api/orders/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return res.status(404).json({ error: 'Zamówienie nie znalezione' });
  await prisma.order.delete({ where: { id } });
  res.json({ message: 'Zamówienie usunięte' });
}));

// POST /api/orders/delete-batch
router.post('/delete-batch', asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Wymagana lista ID' });
  }
  const result = await prisma.order.deleteMany({ where: { id: { in: ids.map(Number) } } });
  res.json({ deleted: result.count });
}));

module.exports = router;
