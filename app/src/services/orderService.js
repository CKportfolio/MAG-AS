const prisma = require('../prisma');

async function createOrder(data) {
  return prisma.$transaction(async (tx) => {
    // 1. Create the order
    const order = await tx.order.create({
      data: {
        orderDate: new Date(data.orderDate),
        customerId: data.customerId || null,
        customerNameSnapshot: data.customerNameSnapshot,
        documentNumber: data.documentNumber || null,
        invoiceNumber: data.invoiceNumber || null,
        paymentMethod: data.paymentMethod,
        note: data.note || null,
      },
    });

    // 2. For each item, create OrderItem and calculate material usage snapshot
    for (const item of data.items) {
      if (item.materialId) {
        // Raw material item — sold directly
        const material = await tx.material.findUnique({ where: { id: item.materialId } });
        if (!material) {
          throw Object.assign(new Error(`Materiał o ID ${item.materialId} nie istnieje`), { status: 400 });
        }

        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            materialId: item.materialId,
            quantity: item.quantity,
            unitPrice: item.unitPrice || null,
          },
        });

        // Direct material usage snapshot
        await tx.orderMaterialUsage.create({
          data: {
            orderId: order.id,
            orderItemId: orderItem.id,
            productId: null,
            materialId: item.materialId,
            quantityUsed: item.quantity,
          },
        });
      } else if (item.productId) {
        // Product item — BOM-based usage
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { materials: true },
        });

        if (!product) {
          throw Object.assign(new Error(`Produkt o ID ${item.productId} nie istnieje`), { status: 400 });
        }

        if (product.materials.length === 0) {
          throw Object.assign(
            new Error(`Produkt "${product.name}" nie ma zdefiniowanego składu materiałowego. Dodaj materiały do produktu przed złożeniem zamówienia.`),
            { status: 400 }
          );
        }

        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice || null,
          },
        });

        // Save material usage snapshot from BOM
        for (const bom of product.materials) {
          await tx.orderMaterialUsage.create({
            data: {
              orderId: order.id,
              orderItemId: orderItem.id,
              productId: item.productId,
              materialId: bom.materialId,
              quantityUsed: bom.quantity * item.quantity,
            },
          });
        }
      } else {
        throw Object.assign(new Error('Każda pozycja musi mieć produkt lub materiał'), { status: 400 });
      }
    }

    // Return complete order
    return tx.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            product: { select: { name: true, code: true } },
            material: { select: { name: true, code: true } },
          },
        },
        materialUsage: {
          include: { material: { select: { name: true, code: true } } },
        },
      },
    });
  });
}

module.exports = { createOrder };
