const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsvText, parseCsvLine, parseNum } = require('../src/services/csvService');

test('parser rozpoznaje CSV rozdzielany średnikiem', () => {
  const rows = parseCsvText('Nazwa;Kod;Cena netto\nŚruba;SR-01;1,25');
  assert.deepEqual(rows, [{ nazwa: 'Śruba', kod: 'SR-01', 'cena netto': '1,25' }]);
});

test('parser obsługuje pola w cudzysłowie ze średnikiem', () => {
  const rows = parseCsvText('Nazwa;Kod\n"Profil; aluminiowy";AL-01');
  assert.equal(rows[0].nazwa, 'Profil; aluminiowy');
  assert.equal(rows[0].kod, 'AL-01');
});

test('parser obsługuje podwójny cudzysłów wewnątrz pola', () => {
  assert.deepEqual(parseCsvLine('"Element ""premium""";E-01', ';'), ['Element "premium"', 'E-01']);
});

test('parseNum obsługuje polski separator dziesiętny', () => {
  assert.equal(parseNum('12,50'), 12.5);
  assert.equal(parseNum(''), 0);
});
