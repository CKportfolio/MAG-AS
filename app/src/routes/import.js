const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { asyncHandler } = require('../middleware/errorHandler');

const { parseCsvText, parseNum } = require('../services/csvService');

// POST /api/import/materials
router.post('/materials', asyncHandler(async (req, res) => {
  const { csv } = req.body;
  if (!csv) return res.status(400).json({ error: 'Brak danych CSV' });

  const rows = parseCsvText(csv);
  if (rows.length === 0) return res.status(400).json({ error: 'Plik CSV jest pusty lub ma nieprawidłowy format' });

  let created = 0, skipped = 0, errors = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = r['nazwa'] || r['name'] || '';
    const code = r['kod'] || r['code'] || '';

    if (!name || !code) {
      errors.push(`Wiersz ${i + 2}: brak nazwy lub kodu`);
      skipped++;
      continue;
    }

    const existing = await prisma.material.findUnique({ where: { code } });
    if (existing) {
      errors.push(`Wiersz ${i + 2}: kod "${code}" już istnieje — pominięto`);
      skipped++;
      continue;
    }

    const netPrice = parseNum(r['cena netto'] || r['netprice'] || r['cena_netto']);
    const vatRate = parseNum(r['vat %'] || r['vat'] || r['vatrate'] || r['vat_rate']) || 23;
    const grossPrice = parseNum(r['cena brutto'] || r['grossprice'] || r['cena_brutto']) || Math.round(netPrice * (1 + vatRate / 100) * 100) / 100;

    await prisma.material.create({
      data: {
        name,
        code,
        typeSize: r['typ/rozmiar'] || r['typesize'] || r['typ_rozmiar'] || null,
        netPrice,
        vatRate,
        grossPrice,
        description: r['opis'] || r['description'] || null,
      },
    });
    created++;
  }

  res.json({ created, skipped, errors, total: rows.length });
}));

// POST /api/import/products
router.post('/products', asyncHandler(async (req, res) => {
  const { csv } = req.body;
  if (!csv) return res.status(400).json({ error: 'Brak danych CSV' });

  const rows = parseCsvText(csv);
  if (rows.length === 0) return res.status(400).json({ error: 'Plik CSV jest pusty lub ma nieprawidłowy format' });

  let created = 0, skipped = 0, errors = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = r['nazwa'] || r['name'] || '';
    const code = r['kod'] || r['code'] || '';

    if (!name || !code) {
      errors.push(`Wiersz ${i + 2}: brak nazwy lub kodu`);
      skipped++;
      continue;
    }

    const existing = await prisma.product.findUnique({ where: { code } });
    if (existing) {
      errors.push(`Wiersz ${i + 2}: kod "${code}" już istnieje — pominięto`);
      skipped++;
      continue;
    }

    const netPrice = parseNum(r['cena netto'] || r['netprice'] || r['cena_netto']);
    const vatRate = parseNum(r['vat %'] || r['vat'] || r['vatrate'] || r['vat_rate']) || 23;
    const grossPrice = parseNum(r['cena brutto'] || r['grossprice'] || r['cena_brutto']) || Math.round(netPrice * (1 + vatRate / 100) * 100) / 100;

    await prisma.product.create({
      data: {
        name,
        code,
        description: r['opis'] || r['description'] || null,
        netPrice,
        vatRate,
        grossPrice,
      },
    });
    created++;
  }

  res.json({ created, skipped, errors, total: rows.length });
}));

module.exports = router;
