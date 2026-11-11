// CSS-правила дизайну: змінні визначені, радіуси й часи через множники, пілюля = .dyn*
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(app, 'src')
function walk(d, out = []) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p, out); else out.push(p) } return out }
const all = walk(src)
const cssFiles = all.filter((f) => f.endsWith('.css'))
const jsFiles = all.filter((f) => /\.(jsx?|mjs)$/.test(f))
const rel = (f) => path.relative(app, f)
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
const line = (s, pos) => s.slice(0, pos).split('\n').length

// простий розбір CSS: список декларацій { prop, value, sel, reduced, file, line }
function declarations(file) {
  const s = stripComments(fs.readFileSync(file, 'utf8')); const out = []
  const stack = []; let i = 0, buf = '', bufStart = 0
  const inReduced = () => stack.some((b) => /prefers-reduced-motion/.test(b))
  while (i < s.length) {
    const c = s[i]
    if (c === '(') { // дужки (url(...), calc) — копіюємо цілком
      let d = 0, j = i; do { if (s[j] === '(') d++; else if (s[j] === ')') d-- ; j++ } while (d > 0 && j < s.length); buf += s.slice(i, j); i = j; continue
    }
    if (c === '"' || c === "'") { let j = i + 1; while (j < s.length && s[j] !== c) j += s[j] === '\\' ? 2 : 1; buf += s.slice(i, j + 1); i = j + 1; continue }
    if (c === '{') { stack.push(buf.trim()); buf = ''; i++; bufStart = i; continue }
    if (c === '}') { flush(); stack.pop(); buf = ''; i++; continue }
    if (c === ';') { flush(); buf = ''; i++; continue }
    if (!buf.trim()) bufStart = i
    buf += c; i++
  }
  function flush() {
    const m = /^\s*([-\w]+)\s*:\s*([\s\S]*)$/.exec(buf)
    if (!m || !stack.length) return
    const top = stack[stack.length - 1]; if (/^@(media|supports|keyframes|font-face|layer)/.test(top)) { if (!/^@(font-face)/.test(top)) return }
    out.push({ prop: m[1], value: m[2].trim(), sel: top, reduced: inReduced(), file: rel(file), line: line(s, bufStart + (buf.length - buf.trimStart().length)) })
  }
  return out
}
const decls = cssFiles.flatMap(declarations)

// ---------- (а) var(--x) ----------
test('розбір CSS дав багато декларацій', () => assert.ok(decls.length > 800, `декларацій: ${decls.length}`))
const defined = new Set()
for (const d of decls) if (d.prop.startsWith('--')) defined.add(d.prop)
for (const f of cssFiles) for (const m of stripComments(fs.readFileSync(f, 'utf8')).matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1])
const fromJs = new Set()
for (const f of jsFiles) for (const m of fs.readFileSync(f, 'utf8').matchAll(/['"`](--[\w-]+)['"`]|setProperty\(\s*['"`](--[\w-]+)/g)) fromJs.add(m[1] || m[2])
// Змінні, що ставляться з JS/інлайн: перевіряємо, що вони справді ставляться десь у jsx (а не просто «виключення без причини»)
test('кожна використана var(--x) без запасного значення визначена в CSS або виставляється з JS', () => {
  const missing = new Map()
  for (const f of cssFiles) {
    const s = stripComments(fs.readFileSync(f, 'utf8'))
    for (const m of s.matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g)) {
      const name = m[1], hasFallback = m[2] === ','
      if (hasFallback) continue
      if (!defined.has(name) && !fromJs.has(name)) (missing.get(name) ?? missing.set(name, []).get(name)).push(`${rel(f)}:${line(s, m.index)}`)
    }
  }
  assert.deepEqual([...missing].map(([k, v]) => `${k}  ${v.slice(0, 3).join(', ')}${v.length > 3 ? ' …' : ''}`), [])
})
test('var(--x, запасне) з невизначеною x — повідомляємо (запасне значення маскує помилку)', () => {
  const m2 = new Map()
  for (const f of cssFiles) {
    const s = stripComments(fs.readFileSync(f, 'utf8'))
    for (const m of s.matchAll(/var\(\s*(--[\w-]+)\s*,/g)) if (!defined.has(m[1]) && !fromJs.has(m[1])) (m2.get(m[1]) ?? m2.set(m[1], []).get(m[1])).push(`${rel(f)}:${line(s, m.index)}`)
  }
  assert.deepEqual([...m2].map(([k, v]) => `${k} ${v[0]}`), [])
})
// ---------- (б) радіуси та часи ----------
const px = /(?<![\w.-])(\d*\.?\d+)px/g
const inCalcWith = (value, idx, needle) => { // чи лежить позиція idx усередині calc( … ), що містить needle
  for (let i = idx; i >= 0; i--) {
    if (value[i] === '(') { // шукаємо відкриваючу дужку, що охоплює idx
      let d = 0, j = i; do { if (value[j] === '(') d++; else if (value[j] === ')') d--; j++ } while (d > 0 && j < value.length)
      if (j > idx && /calc\($/.test(value.slice(0, i + 1)) && value.slice(i, j).includes(needle)) return true
    }
  }
  return false
}
test('border-radius: немає «голих» px (крім 0, 50%, ≥50px) поза calc(… * var(--k)) / похідних від var(--r…)', () => {
  const bad = [], fallbacks = []
  for (const d of decls) {
    if (!/radius$/.test(d.prop) && !/^--(r|rin|ctl-r|rad|radius)(-[\w]+)?$/.test(d.prop)) continue
    if (/^var\(--[\w-]+\)$/.test(d.value)) continue
    for (const m of d.value.matchAll(px)) {
      const n = parseFloat(m[1]); if (n === 0 || n >= 50) continue
      if (inCalcWith(d.value, m.index, 'var(')) continue   // зсув від іншого (вже масштабованого) радіуса: calc(var(--rin) - 3px)
      if (/var\(--[\w-]+,\s*[^)]*$/.test(d.value.slice(0, m.index + m[0].length))) { fallbacks.push(`${d.file}:${d.line} ${d.value}`); continue }   // запасне значення var(--rin, 12px)
      bad.push(`${d.file}:${d.line}  ${d.sel} { ${d.prop}: ${d.value} }`); break
    }
  }
  assert.deepEqual(bad, [])
})
const timeRe = /(?<![\w.-])(\d*\.?\d+)(ms|s)(?![\w-])/g
const TIME_PROPS = /^(transition|transition-duration|transition-delay|animation|animation-duration|animation-delay)$/
test('transition/animation: тривалості тільки через calc(… * var(--mo)) (виняток: 0s, 1ms у reduced-motion)', () => {
  const bad = []
  for (const d of decls) {
    if (!TIME_PROPS.test(d.prop)) continue
    for (const m of d.value.matchAll(timeRe)) {
      const n = parseFloat(m[1]); if (n === 0) continue
      if (d.reduced && n === 1 && m[2] === 'ms') continue
      if (inCalcWith(d.value, m.index, 'var(--mo)')) continue
      bad.push(`${d.file}:${d.line}  ${d.sel} { ${d.prop}: ${d.value} }`); break
    }
  }
  assert.deepEqual(bad, [])
})
test('змінні-тривалості (--x: 200ms) теж масштабуються через --mo', () => {
  const bad = []
  for (const d of decls) {
    if (!d.prop.startsWith('--') || /^--(mo|k|kp)$/.test(d.prop) || d.reduced) continue
    for (const m of d.value.matchAll(timeRe)) {
      const n = parseFloat(m[1]); if (n === 0) continue
      if (inCalcWith(d.value, m.index, 'var(--mo)')) continue
      bad.push(`${d.file}:${d.line}  ${d.prop}: ${d.value}`); break
    }
  }
  assert.deepEqual(bad, [])
})
test('prefers-reduced-motion: у блоці немає тривалостей, більших за 1ms', () => {
  const bad = decls.filter((d) => d.reduced && TIME_PROPS.test(d.prop)).filter((d) => [...d.value.matchAll(timeRe)].some((m) => parseFloat(m[1]) > 0 && !(m[1] === '1' && m[2] === 'ms'))).map((d) => `${d.file}:${d.line} ${d.sel} { ${d.prop}: ${d.value} }`)
  assert.deepEqual(bad, [])
})
test('animation/transition не використовує нестандартні криві (лише токени --ease-* / --dyn-*)', () => {
  const bad = []
  for (const d of decls) {
    if (!/^(transition|animation|transition-timing-function|animation-timing-function)$/.test(d.prop)) continue
    const OK = /cubic-bezier\(\s*\.34,\s*1\.26,\s*\.64,\s*1\s*\)|cubic-bezier\(\s*\.32,\s*\.72,\s*0,\s*1\s*\)/
    const curves = [...d.value.matchAll(/cubic-bezier\([^)]*\)/g)].map((m) => m[0])
    if (curves.some((c) => !OK.test(c)) && !d.prop.startsWith('--')) bad.push(`${d.file}:${d.line} ${d.sel} { ${d.prop}: ${d.value} }`)
  }
  assert.deepEqual(bad, [])
})

// ---------- (в) стара пілюля .island ----------
const jsText = jsFiles.map((f) => [f, fs.readFileSync(f, 'utf8')])
test('у jsx/js немає посилань на стару пілюлю .island / className="island…"', () => {
  const bad = []
  for (const [f, s] of jsText) {
    for (const m of s.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
      const str = m[2]
      if (/(^|[\s.])island(?![\w-]*\s*=)(?=$|[\s.\-_:#\[]|\b)/.test(str) && /(^|[\s.])island([\s.\-_]|$)/.test(str)) bad.push(`${rel(f)}:${line(s, m.index)}  ${JSON.stringify(str.slice(0, 60))}`)
    }
  }
  assert.deepEqual(bad, [])
})
test('у CSS немає мертвих правил старої пілюлі (.island / .island-dock), якщо jsx їх уже не використовує', () => {
  const lines = new Set()
  for (const f of cssFiles) { const s = stripComments(fs.readFileSync(f, 'utf8')); for (const m of s.matchAll(/\.island(?:-dock)?(?![\w-])/g)) lines.add(`${rel(f)}:${line(s, m.index)}`) }
  assert.equal(lines.size, 0, `мертвих селекторів: ${lines.size}; перший ${[...lines][0]}, останній ${[...lines].at(-1)}`)
})
const cssClasses = new Set()
for (const f of cssFiles) for (const m of stripComments(fs.readFileSync(f, 'utf8')).matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) cssClasses.add(m[1])
test('кожен клас isl-* / dyn* / island*, згаданий у jsx, має правило в CSS', () => {
  const used = new Map()
  for (const [f, s] of jsText) for (const m of s.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    if (m[2].includes('${') ) { /* частини шаблону */ }
    for (const tok of m[2].split(/[\s,]+/)) if (/^(isl|dyn|island)[\w-]*$/.test(tok) && !tok.endsWith('-')) (used.get(tok) ?? used.set(tok, []).get(tok)).push(`${rel(f)}:${line(s, m.index)}`)
  }
  const missing = [...used].filter(([k]) => !cssClasses.has(k)).map(([k, v]) => `${k}  ${v[0]}`)
  assert.deepEqual(missing, [])
})
test('кожен клас, що задається в jsx через className="…" (літерали), або є в CSS, або є явним «маркером» (on, tap, …)', () => {
  const used = new Map()
  for (const [f, s] of jsText) for (const m of s.matchAll(/className=(?:"([^"]*)"|'([^']*)')/g)) for (const tok of (m[1] ?? m[2]).split(/\s+/)) if (tok) (used.get(tok) ?? used.set(tok, []).get(tok)).push(`${rel(f)}:${line(s, m.index)}`)
  const jsAll = jsText.map(([, s]) => s).join('\n')
  // клас є «маркером», якщо на нього посилаються з JS (querySelector / classList / === ) — тоді CSS не обов'язковий
  const missing = [...used].filter(([k]) => !cssClasses.has(k) && !new RegExp(`['"\`.\\s]${k}['"\`\\s]|\\.${k}\\b|classList[^\\n]*['"]${k}['"]`).test(jsAll.replace(new RegExp(`className="[^"]*\\b${k}\\b[^"]*"`, 'g'), ''))).map(([k, v]) => `${k}  ${v[0]}`)
  assert.deepEqual(missing, [])
})
