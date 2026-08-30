function createOrderService(prisma) {
  return async function createOrder(data) {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      throw Object.assign(new Error('Zamówienie musi zawierać co najmniej jedną pozycję'), { status: 400 });
    }

    return prisma.$transaction(async (tx) => {
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

      for (const item of data.items) {
        const quantity = Number(item.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw Object.assign(new Error('Ilość pozycji musi być dodatnią liczbą'), { status: 400 });
        }

        if (item.materialId) {
          const material = await tx.material.findUnique({ where: { id: item.materialId } });
          if (!material) {
            throw Object.assign(new Error(`Materiał o ID ${item.materialId} nie istnieje`), { status: 400 });
          }

          const orderItem = await tx.orderItem.create({
            data: {
              orderId: order.id,
              materialId: item.materialId,
              quantity,
              unitPrice: item.unitPrice ?? null,
            },
          });

          await tx.orderMaterialUsage.create({
            data: {
              orderId: order.id,
              orderItemId: orderItem.id,
              productId: null,
              materialId: item.materialId,
              quantityUsed: quantity,
            },
          });
        } else if (item.productId) {
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
              quantity,
              unitPrice: item.unitPrice ?? null,
            },
          });

          for (const bom of product.materials) {
            await tx.orderMaterialUsage.create({
              data: {
                orderId: order.id,
                orderItemId: orderItem.id,
                productId: item.productId,
                materialId: bom.materialId,
                quantityUsed: bom.quantity * quantity,
              },
            });
          }
        } else {
          throw Object.assign(new Error('Każda pozycja musi mieć produkt lub materiał'), { status: 400 });
        }
      }

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
  };
}

async function createOrder(data) {
  const prisma = require('../prisma');
  return createOrderService(prisma)(data);
}

module.exports = { createOrder, createOrderService };
