const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { getDashboardData } = require('../services/dashboardService');

// GET /api/export/dashboard.csv
router.get('/dashboard.csv', asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, groupId } = req.query;
  const data = await getDashboardData({ dateFrom, dateTo, groupId });

  const BOM = '\uFEFF';
  const separator = ';';
  const headers = ['Grupa', 'Nazwa materiału', 'Kod materiału', 'Ilość zużyta', 'Cena netto', 'Cena brutto', 'Wartość netto', 'Wartość brutto'];

  const rows = [];

  for (const group of data.groups) {
    for (const mat of group.materials) {
      rows.push([
        escCsv(group.groupName), escCsv(mat.materialName), escCsv(mat.materialCode),
        formatNum(mat.totalQuantity), formatNum(mat.netPrice), formatNum(mat.grossPrice),
        formatNum(mat.netValue), formatNum(mat.grossValue),
      ].join(separator));
    }
  }

  for (const mat of data.ungrouped) {
    rows.push([
      escCsv('(bez grupy)'), escCsv(mat.materialName), escCsv(mat.materialCode),
      formatNum(mat.totalQuantity), formatNum(mat.netPrice), formatNum(mat.grossPrice),
      formatNum(mat.netValue), formatNum(mat.grossValue),
    ].join(separator));
  }

  const csv = BOM + headers.join(separator) + '\n' + rows.join('\n');
  const filename = `dashboard_${dateFrom || 'all'}_${dateTo || 'all'}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}));

// GET /api/export/materials.csv
router.get('/materials.csv', asyncHandler(async (req, res) => {
  const materials = await prisma.material.findMany({
    orderBy: { name: 'asc' },
    include: { groups: { include: { group: true } } },
  });

  const BOM = '\uFEFF';
  const separator = ';';
  const headers = ['Nazwa', 'Kod', 'Typ/Rozmiar', 'Cena netto', 'VAT %', 'Cena brutto', 'Opis', 'Grupy', 'Aktywny'];
  const rows = materials.map(m => [
    escCsv(m.name), escCsv(m.code), escCsv(m.typeSize),
    formatNum(m.netPrice), formatNum(m.vatRate), formatNum(m.grossPrice),
    escCsv(m.description), escCsv(m.groups.map(g => g.group.name).join(', ')),
    m.isActive ? 'Tak' : 'Nie',
  ].join(separator));

  const csv = BOM + headers.join(separator) + '\n' + rows.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="materials.csv"');
  res.send(csv);
}));

// GET /api/export/products.csv
router.get('/products.csv', asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: { materials: { include: { material: true } } },
  });

  const BOM = '\uFEFF';
  const separator = ';';
  const headers = ['Nazwa', 'Kod', 'Opis', 'Cena netto', 'VAT %', 'Cena brutto', 'Skład (materiał:ilość)', 'Aktywny'];
  const rows = products.map(p => [
    escCsv(p.name), escCsv(p.code), escCsv(p.description),
    formatNum(p.netPrice), formatNum(p.vatRate), formatNum(p.grossPrice),
    escCsv(p.materials.map(m => `${m.material.code}:${m.quantity}`).join(', ')),
    p.isActive ? 'Tak' : 'Nie',
  ].join(separator));

  const csv = BOM + headers.join(separator) + '\n' + rows.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
  res.send(csv);
}));

function escCsv(val) {
  if (val == null) return '';
  const str = String(val);
  if (str.includes('"') || str.includes(';') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function formatNum(val) {
  if (val == null) return '0';
  return String(val).replace('.', ',');
}

module.exports = router;
