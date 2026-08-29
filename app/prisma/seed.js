const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Groups
  const groupSruby = await prisma.group.create({ data: { name: 'Śruby i elementy złączne', description: 'Śruby, nakrętki, podkładki' } });
  const groupElektronika = await prisma.group.create({ data: { name: 'Elektronika', description: 'Komponenty elektroniczne' } });
  const groupObudowy = await prisma.group.create({ data: { name: 'Obudowy', description: 'Obudowy i elementy konstrukcyjne' } });
  const groupKable = await prisma.group.create({ data: { name: 'Kable i przewody', description: 'Kable zasilające, sygnałowe' } });

  // Materials
  const mat1 = await prisma.material.create({
    data: {
      name: 'Śruba M4x12',
      code: 'SR-M4-12',
      typeSize: 'M4x12mm',
      netPrice: 0.15,
      vatRate: 23,
      grossPrice: 0.18,
      description: 'Śruba metryczna M4 długość 12mm',
      attributes: {
        create: [
          { attributeName: 'Materiał', attributeValue: 'Stal nierdzewna' },
          { attributeName: 'Klasa', attributeValue: '8.8' },
        ],
      },
      groups: { create: [{ groupId: groupSruby.id }] },
    },
  });

  const mat2 = await prisma.material.create({
    data: {
      name: 'Śruba M6x20',
      code: 'SR-M6-20',
      typeSize: 'M6x20mm',
      netPrice: 0.25,
      vatRate: 23,
      grossPrice: 0.31,
      description: 'Śruba metryczna M6 długość 20mm',
      attributes: {
        create: [
          { attributeName: 'Materiał', attributeValue: 'Stal ocynkowana' },
        ],
      },
      groups: { create: [{ groupId: groupSruby.id }] },
    },
  });

  const mat3 = await prisma.material.create({
    data: {
      name: 'Nakrętka M4',
      code: 'NK-M4',
      typeSize: 'M4',
      netPrice: 0.08,
      vatRate: 23,
      grossPrice: 0.10,
      groups: { create: [{ groupId: groupSruby.id }] },
    },
  });

  const mat4 = await prisma.material.create({
    data: {
      name: 'Rezystor 10kΩ',
      code: 'EL-R10K',
      typeSize: '0805 SMD',
      netPrice: 0.05,
      vatRate: 23,
      grossPrice: 0.06,
      description: 'Rezystor SMD 10kΩ',
      attributes: {
        create: [
          { attributeName: 'Tolerancja', attributeValue: '1%' },
          { attributeName: 'Moc', attributeValue: '0.125W' },
        ],
      },
      groups: { create: [{ groupId: groupElektronika.id }] },
    },
  });

  const mat5 = await prisma.material.create({
    data: {
      name: 'Kondensator 100nF',
      code: 'EL-C100N',
      typeSize: '0805 SMD',
      netPrice: 0.03,
      vatRate: 23,
      grossPrice: 0.04,
      groups: { create: [{ groupId: groupElektronika.id }] },
    },
  });

  const mat6 = await prisma.material.create({
    data: {
      name: 'Obudowa aluminiowa 120x80',
      code: 'OB-AL-120',
      typeSize: '120x80x40mm',
      netPrice: 25.00,
      vatRate: 23,
      grossPrice: 30.75,
      description: 'Obudowa aluminiowa anodowana',
      attributes: {
        create: [
          { attributeName: 'Kolor', attributeValue: 'Czarny' },
          { attributeName: 'Grubość ścianki', attributeValue: '2mm' },
        ],
      },
      groups: { create: [{ groupId: groupObudowy.id }] },
    },
  });

  const mat7 = await prisma.material.create({
    data: {
      name: 'Kabel zasilający 2x0.75',
      code: 'KB-ZAS-075',
      typeSize: '2x0.75mm² 1m',
      netPrice: 2.50,
      vatRate: 23,
      grossPrice: 3.08,
      groups: { create: [{ groupId: groupKable.id }] },
    },
  });

  const mat8 = await prisma.material.create({
    data: {
      name: 'Przewód sygnałowy 4-żyłowy',
      code: 'KB-SYG-4',
      typeSize: '4x0.25mm² 1m',
      netPrice: 3.20,
      vatRate: 23,
      grossPrice: 3.94,
      groups: { create: [{ groupId: groupKable.id }, { groupId: groupElektronika.id }] },
    },
  });

  // Products
  const prodA = await prisma.product.create({
    data: {
      name: 'Moduł sterownika A',
      code: 'PROD-MSA',
      description: 'Moduł sterownika w obudowie aluminiowej',
      netPrice: 150.00,
      vatRate: 23,
      grossPrice: 184.50,
      materials: {
        create: [
          { materialId: mat6.id, quantity: 1 },
          { materialId: mat1.id, quantity: 4 },
          { materialId: mat3.id, quantity: 4 },
          { materialId: mat4.id, quantity: 8 },
          { materialId: mat5.id, quantity: 4 },
          { materialId: mat7.id, quantity: 1.5 },
        ],
      },
    },
  });

  const prodB = await prisma.product.create({
    data: {
      name: 'Adapter sygnałowy B',
      code: 'PROD-ASB',
      description: 'Adapter do konwersji sygnałów',
      netPrice: 45.00,
      vatRate: 23,
      grossPrice: 55.35,
      materials: {
        create: [
          { materialId: mat4.id, quantity: 12 },
          { materialId: mat5.id, quantity: 6 },
          { materialId: mat8.id, quantity: 0.5 },
          { materialId: mat2.id, quantity: 2 },
        ],
      },
    },
  });

  const prodC = await prisma.product.create({
    data: {
      name: 'Zestaw montażowy C',
      code: 'PROD-ZMC',
      description: 'Zestaw śrub i elementów montażowych',
      netPrice: 12.00,
      vatRate: 23,
      grossPrice: 14.76,
      materials: {
        create: [
          { materialId: mat1.id, quantity: 10 },
          { materialId: mat2.id, quantity: 6 },
          { materialId: mat3.id, quantity: 10 },
        ],
      },
    },
  });

  // Customer
  const customer = await prisma.customer.create({
    data: {
      name: 'Firma Testowa Sp. z o.o.',
      taxId: '1234567890',
      email: 'kontakt@firmatestowa.pl',
      phone: '+48 123 456 789',
      note: 'Klient testowy',
    },
  });

  // Order with material usage
  const order = await prisma.order.create({
    data: {
      orderDate: new Date('2026-04-01'),
      customerId: customer.id,
      customerNameSnapshot: customer.name,
      documentNumber: 'ZAM/2026/04/001',
      invoiceNumber: 'FV/2026/04/001',
      paymentMethod: 'bank_transfer',
      note: 'Zamówienie testowe',
    },
  });

  // Order items
  const item1 = await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId: prodA.id,
      quantity: 3,
      unitPrice: 150.00,
    },
  });

  const item2 = await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId: prodC.id,
      quantity: 2,
    },
  });

  // Material usage for item1 (3x Moduł sterownika A)
  const prodAMaterials = await prisma.productMaterial.findMany({ where: { productId: prodA.id } });
  for (const pm of prodAMaterials) {
    await prisma.orderMaterialUsage.create({
      data: {
        orderId: order.id,
        orderItemId: item1.id,
        productId: prodA.id,
        materialId: pm.materialId,
        quantityUsed: pm.quantity * 3,
      },
    });
  }

  // Material usage for item2 (2x Zestaw montażowy C)
  const prodCMaterials = await prisma.productMaterial.findMany({ where: { productId: prodC.id } });
  for (const pm of prodCMaterials) {
    await prisma.orderMaterialUsage.create({
      data: {
        orderId: order.id,
        orderItemId: item2.id,
        productId: prodC.id,
        materialId: pm.materialId,
        quantityUsed: pm.quantity * 2,
      },
    });
  }

  console.log('Seed completed successfully!');
  console.log(`Created: 4 groups, 8 materials, 3 products, 1 customer, 1 order`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
