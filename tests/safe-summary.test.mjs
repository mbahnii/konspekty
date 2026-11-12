// Битий або старий конспект без списків не має ламати сторінку й пошук
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// safeSummary — проста функція без залежностей: беремо її код прямо з файлу
const src = readFileSync(new URL('../src/data/useData.js', import.meta.url), 'utf8')
const m = src.match(/const LISTS = .*\nexport const safeSummary = .*\n/)
assert.ok(m, 'safeSummary знайдено в useData.js')
const safeSummary = new Function(`${m[0].replace('export const', 'const')}; return safeSummary`)()

test('відсутні списки замінюються порожніми, інше лишається', () => {
  const s = safeSummary({ tldr: 'х', sections: [{ t: 0 }] })
  assert.deepEqual(s.terms, []); assert.deepEqual(s.guides, []); assert.deepEqual(s.later, []); assert.deepEqual(s.key_points, [])
  assert.equal(s.sections.length, 1); assert.equal(s.tldr, 'х')
})
test('не об’єкт → null; не масив у списку → порожній масив', () => {
  assert.equal(safeSummary(null), null); assert.equal(safeSummary('abc'), null)
  assert.deepEqual(safeSummary({ terms: 'oops' }).terms, [])
})
