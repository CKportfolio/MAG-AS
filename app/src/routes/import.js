const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { asyncHandler } = require('../middleware/errorHandler');

function parseCsvText(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = parseCsvLine(lines[0], separator);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], separator);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim().toLowerCase()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line, sep) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === sep) { result.push(current); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

function parseNum(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(',', '.')) || 0;
}

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
