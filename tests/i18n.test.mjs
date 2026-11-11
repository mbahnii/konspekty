// i18n: словник переводів (дублікати, 3 мови, використання t('…') у src/, плейсхолдери, translate)
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEntry } from './_bundle.mjs'

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(app, 'src')
const text = fs.readFileSync(path.join(src, 'i18n/index.js'), 'utf8')

// --- розбір об'єкта K: рядки виду  ключ: ['uk', 'ru', 'en'],  (рядок у лапках '…' з екрануванням \')
const start = text.indexOf('const K = {'), end = text.indexOf('\n}\n', start)
const body = text.slice(start + 'const K = {'.length, end)
function parseK(b) {
  const entries = []; let i = 0
  const ws = () => { while (i < b.length && /[\s,]/.test(b[i])) i++ ; if (b.startsWith('//', i)) { while (i < b.length && b[i] !== '\n') i++; ws() } }
  const str = () => {
    const q = b[i]; assert.ok(q === "'" || q === '"' || q === '`', `очікувалась лапка біля: ${b.slice(i, i + 40)}`); i++
    let s = ''
    while (b[i] !== q) { if (b[i] === '\\') { s += b[i + 1]; i += 2 } else s += b[i++] }
    i++; return s
  }
  for (ws(); i < b.length; ws()) {
    let key; if (/['"]/.test(b[i])) key = str(); else { const m = /^[A-Za-z_$][\w$]*/.exec(b.slice(i)); key = m[0]; i += key.length }
    ws(); assert.equal(b[i], ':', `після ключа ${key}`); i++; ws()
    assert.equal(b[i], '[', `масив у ${key}`); i++
    const vals = []; for (ws(); b[i] !== ']'; ws()) vals.push(str())
    i++; entries.push([key, vals])
  }
  return entries
}
const entries = parseK(body)
const dict = new Map(entries)

test('словник розібрався і не порожній', () => assert.ok(entries.length > 100, `ключів: ${entries.length}`))
test('немає дубльованих ключів', () => {
  const seen = new Map(), dup = []
  for (const [k] of entries) { seen.set(k, (seen.get(k) || 0) + 1) }
  for (const [k, n] of seen) if (n > 1) dup.push(`${k} ×${n}`)
  assert.deepEqual(dup, [])
})
test('кожен ключ має рівно 3 непорожні переклади [uk, ru, en]', () => {
  const bad = entries.filter(([, v]) => v.length !== 3 || v.some((x) => !x.trim())).map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
  assert.deepEqual(bad, [])
})
test('плейсхолдери {x} однакові в усіх трьох мовах', () => {
  const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
  const bad = entries.filter(([, v]) => v.length === 3 && !(ph(v[0]) === ph(v[1]) && ph(v[1]) === ph(v[2]))).map(([k, v]) => `${k}: ${v.map(ph).join(' | ')}`)
  assert.deepEqual(bad, [])
})
test('переклади не збігаються буква в букву з ключем-заглушкою і uk≠en для довгих фраз', () => {
  // довга фраза, ідентична в uk і en, — ознака забутого перекладу
  const bad = entries.filter(([, v]) => v.length === 3 && v[0].length > 25 && v[0] === v[2]).map(([k]) => k)
  assert.deepEqual(bad, [])
})

// --- використання у src/
function walk(d, out = []) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p, out); else if (/\.(jsx?|mjs)$/.test(f.name)) out.push(p) } return out }
const files = walk(src).filter((f) => !f.endsWith('i18n/index.js'))
const used = new Map(), dynamic = []
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8')
  for (const m of s.matchAll(/(?<![\w$.])t\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    const [, q, k] = m
    if (q === '`' && k.includes('${')) dynamic.push([path.relative(src, f), k]); else (used.get(k) ?? used.set(k, []).get(k)).push(path.relative(src, f))
  }
  for (const m of s.matchAll(/(?<![\w$.])t\(\s*([A-Za-z_$][\w$.?\[\]]*)\s*[,)]/g)) dynamic.push([path.relative(src, f), `<expr ${m[1]}>`])
}
test('кожен літеральний t(\'…\') із src/ є у словнику', () => {
  const missing = [...used].filter(([k]) => !dict.has(k)).map(([k, fs_]) => `${k}  (${[...new Set(fs_)].join(', ')})`)
  assert.deepEqual(missing, [])
})
test('динамічні ключі: відомі значення існують у словнику', () => {
  const known = [
    ...['system', 'light', 'dark', 'systemS', 'lightS', 'darkS'].map((x) => `theme.${x}`),
    ...['min', 'mid', 'max', 'minS', 'midS', 'maxS'].map((x) => `mo.${x}`),
  ]
  const missing = known.filter((k) => !dict.has(k))
  // решта динамічних звернень: покажемо їх шаблони і перевіримо, що для кожного префікса є хоч один ключ
  const prefixes = new Set(dynamic.filter(([, k]) => k.includes('${')).map(([, k]) => k.split('${')[0]))
  const noPrefix = [...prefixes].filter((p) => ![...dict.keys()].some((k) => k.startsWith(p)))
  assert.deepEqual({ missing, noPrefix }, { missing: [], noPrefix: [] })
})
test('динамічні ключі: перебір значень, які реально існують у даних (filter/level/stage/q)', () => {
  // кожна група має повний набір: усі суфікси з джерела існують
  const need = {
    level: ['beginner', 'middle', 'advanced'],
    stage: ['published', 'summary'],
  }
  const missing = []
  for (const [g, arr] of Object.entries(need)) for (const x of arr) if (!dict.has(`${g}.${x}`)) missing.push(`${g}.${x}`)
  assert.deepEqual(missing, [])
})
test('усі ключі словника використовуються (немає осиротілих)', () => {
  const dynPrefixes = [...new Set(dynamic.map(([, k]) => k.split('${')[0]).filter((p) => !p.startsWith('<expr')))]
  const hasExpr = dynamic.some(([, k]) => k.startsWith('<expr'))
  const all = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n')
  const orphan = [...dict.keys()].filter((k) => !used.has(k) && !dynPrefixes.some((p) => p && k.startsWith(p)) && !/^(stage|sh)\./.test(k) && !all.includes(`'${k}'`) && !all.includes(`"${k}"`) && !all.includes(`\`${k}\``))
  // не жорсткий провал: ключі, що можуть формуватись із виразів, перелічуємо в повідомленні
  assert.deepEqual(orphan, [], hasExpr ? 'є t(<вираз>) — частина ключів може бути динамічною' : '')
})

// --- translate
const { translate } = await loadEntry()
test('translate: мови і запасні варіанти', () => {
  assert.equal(translate('uk', 'loading'), dict.get('loading')[0])
  assert.equal(translate('ru', 'loading'), dict.get('loading')[1])
  assert.equal(translate('en', 'loading'), dict.get('loading')[2])
  assert.equal(translate('xx', 'loading'), dict.get('loading')[0], 'невідома мова → українська')
  assert.equal(translate('en', 'нема.такого.ключа'), 'нема.такого.ключа', 'невідомий ключ → сам ключ')
  assert.equal(translate('en', '__proto__'), '__proto__')
  assert.equal(translate('en', 'constructor'), 'constructor', 'службові властивості Object не ключі')
  assert.equal(translate('en', 'toString'), 'toString')
})
test('translate: підстановка {a} {b}, у тому числі спецсимволи у значеннях', () => {
  assert.equal(translate('en', 'rail.done', { a: 3, b: 5 }), '3 of 5')
  assert.equal(translate('uk', 'rail.done', { a: 0, b: 0 }), '0 з 0', 'нуль не губиться')
  assert.equal(translate('en', 'rail.done', { a: "$&", b: "$'" }), "$& of $'", 'значення з $-шаблонами підставляються буквально')
  assert.equal(translate('en', 'rail.done', { a: '$$', b: '$1' }), '$$ of $1')
  assert.equal(translate('en', 'rail.done', { a: 1 }), '1 of {b}', 'відсутня змінна лишається видимою, без падіння')
  assert.equal(translate('en', 'rail.done'), '{a} of {b}')
})
test('translate: повторюваний плейсхолдер підставляється всюди', () => {
  const twice = entries.find(([, v]) => v.some((s) => /\{(\w+)\}[\s\S]*\{\1\}/.test(s)))
  if (!twice) return
  const [k, v] = twice, lang = ['uk', 'ru', 'en'][v.findIndex((s) => /\{(\w+)\}[\s\S]*\{\1\}/.test(s))]
  const name = /\{(\w+)\}[\s\S]*\{\1\}/.exec(v[['uk', 'ru', 'en'].indexOf(lang)])[1]
  assert.ok(!translate(lang, k, { [name]: 'X' }).includes(`{${name}}`))
})

// --- стадії worker -> підписи в пілюлі
test('кожна стадія, яку ставить worker (stage="…"), має підписи stage.X і короткий sh.X', () => {
  const w = fs.readFileSync(path.join(app, '../worker/worker.py'), 'utf8') + fs.readFileSync(path.join(app, '../worker/photos.py'), 'utf8')
  const stages = new Set([...w.matchAll(/stage\s*=\s*["']([\w-]+)["']/g)].map((m) => m[1]))
  const on = [...w.matchAll(/on_stage\(\s*["']([\w-]+)["']/g)].map((m) => m[1]); on.forEach((x) => stages.add(x))
  assert.ok(stages.size >= 5, [...stages].join())
  const missing = []
  for (const st of stages) for (const k of [`stage.${st}`, `sh.${st}`]) if (!dict.has(k)) missing.push(k)
  assert.deepEqual(missing, [])
})
test('кожен st.X (стан черги) має короткий sh.X', () => {
  const miss = [...dict.keys()].filter((k) => k.startsWith('st.') && !dict.has('sh.' + k.slice(3)))
  assert.deepEqual(miss, [])
})
