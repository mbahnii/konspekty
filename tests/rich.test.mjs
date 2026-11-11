// Розмітка конспектів (richtext.jsx: inline / Md): тести за описом, включно із безпекою
import test from 'node:test'
import assert from 'node:assert/strict'
import { loadEntry } from './_bundle.mjs'

const { htmlInline: H, htmlMd: M } = await loadEntry()
const textOf = (html) => html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')

test('базова розмітка', () => {
  assert.match(H('==жовте=='), /<mark[^>]*class="[^"]*\by\b[^"]*"[^>]*>жовте<\/mark>/)
  for (const c of 'grbp') assert.match(H(`==${c}:колір==`), new RegExp(`<mark[^>]*class="[^"]*\\b${c}\\b[^"]*"[^>]*>колір</mark>`), c)
  assert.equal(H('++підкреслене++'), '<u>підкреслене</u>')
  assert.equal(H('`код`'), '<code>код</code>')
  assert.equal(H('[[Cmd]]'), '<kbd>Cmd</kbd>')
  assert.equal(H('**жирне**'), '<b>жирне</b>')
  assert.equal(H('а **б** в'), 'а <b>б</b> в')
})
test('НЕ розмітка: C++, a = b, 2*3*4 лишаються буквально', () => {
  const same = ['C++', 'C++ и C++', 'C++ та C++ та ще C++', 'a = b', 'a == b', 'x = y = z', '2*3*4', '2 * 3 * 4', 'a==b and c==d', 'i++ and j++', 'a ++ b ++ c', 'c++;', '1+1=2', 'x ** 2', 'a * b']
  for (const t of same) assert.equal(textOf(H(t)), t, t)
  for (const t of same) assert.ok(!/<(u|mark|b|i)[ >]|<(u|b|i)>/.test(H(t)), `без тегів: ${t} → ${H(t)}`)
})
const safeH = (t) => { try { return H(t) } catch (e) { return `THROWS ${e.message}` } }
test('незакриті маркери лишаються буквально (і не падають)', () => {
  const bad = []
  for (const t of ['==abc', 'abc==', '++abc', '**abc', '`abc', '[[abc', 'abc]]', '==g:abc', '*abc', 'a ** b', 'текст ==abc', '==', '++', '**', '`', '[[', ']]', '==abc ++def', '**a *b']) {
    const h = safeH(t)
    if (/^THROWS/.test(h) || textOf(h) !== t || /<(mark|u|b|i|code|kbd)\b/.test(h)) bad.push(`${JSON.stringify(t)} → ${h}`)
  }
  assert.deepEqual(bad, [])
})
test('порожні маркери не ламаються й не зникають', () => {
  const bad = []
  for (const t of ['====', '****', '++++', '``', '[[]]', '==g:==', 'a ==== b']) {
    const h = safeH(t)
    if (/^THROWS/.test(h) || /<(mark|u|b|i|code|kbd)\b[^>]*><\/(mark|u|b|i|code|kbd)>/.test(h) || textOf(h) !== t) bad.push(`${JSON.stringify(t)} → ${h}`)
  }
  assert.deepEqual(bad, [])
})
test('вкладеність', () => {
  const a = H('**жирний ==жовтий== текст**'); assert.match(a, /<b>.*<mark[^>]*>жовтий<\/mark>.*<\/b>/)
  const b = H('==++під++=='); assert.match(b, /<mark[^>]*><u>під<\/u><\/mark>/)
  const c = H('==g:**ж**=='); assert.match(c, /<mark[^>]*class="[^"]*\bg\b[^"]*"[^>]*><b>ж<\/b><\/mark>/)
  assert.match(H('++**x**++'), /<u><b>x<\/b><\/u>/)
})
test('кілька маркерів у рядку не склеюються', () => {
  const h = H('==а== і ==b:б== і ++в++')
  assert.equal((h.match(/<mark/g) || []).length, 2); assert.equal((h.match(/<u>/g) || []).length, 1)
  assert.equal(textOf(h), 'а і б і в')
  assert.equal((H('**а** та **б**').match(/<b>/g) || []).length, 2)
})
test('код усередині не інтерпретується', () => {
  assert.equal(H('`==x== **y**`'), '<code>==x== **y**</code>')
  assert.equal(textOf(H('`a++b`')), 'a++b')
})
test('inline: null/undefined/число/порожньо', () => {
  assert.equal(H(null), ''); assert.equal(H(undefined), ''); assert.equal(H(''), ''); assert.equal(H(0), '0')
})
test('юнікод і переноси поруч із маркерами', () => {
  assert.match(H('==їжак=='), />їжак</); assert.match(H('Так: ==важливо==!'), /<mark[^>]*>важливо<\/mark>!/)
  assert.match(H('(==в дужках==)'), /<mark/)
})

// ---------- безпека ----------
const EVIL = ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<svg onload=alert(1)>', '<iframe src="javascript:alert(1)"></iframe>',
  '"><script>alert(1)</script>', '<a href="javascript:alert(1)">x</a>', '<b onmouseover=alert(1)>x</b>']
const stripIcons = (h) => h.replace(/<svg class="i"[^>]*>.*?<\/svg>/g, '')
const rawHtml = /<(script|img|svg|iframe|style|object|embed)\b/i
const handler = /<[^>]*\son\w+\s*=/i
test('безпека inline: HTML виводиться текстом', () => {
  for (const e of EVIL) for (const wrap of ['%', '**%**', '==%==', '++%++', '`%`', '[[%]]', '==g:%==', 'a %  b']) {
    const h = H(wrap.replace('%', e))
    assert.ok(!rawHtml.test(h) && !handler.test(h), `${wrap.replace('%', e)} → ${h}`)
  }
  assert.equal(textOf(H('<script>alert(1)</script>')), '<script>alert(1)</script>')
})
test('безпека Md: блоки', () => {
  const blocks = (e) => [e, `# ${e}`, `### ${e}`, `- ${e}\n- ${e}`, `1. ${e}`, `> ${e}`, `> [!remember] ${e}`, `| ${e} | b |\n|---|---|\n| ${e} | d |`, '```bash\n' + e + '\n```', '```' + e + '\n x\n```', `[${e}](${e})`, `[x](javascript:alert(1))`, `![x](javascript:alert(1))`, `![${e}](x)`]
  for (const e of EVIL) for (const b of blocks(e)) {
    const h = stripIcons(M(b))
    assert.ok(!rawHtml.test(h) && !handler.test(h), `${JSON.stringify(b)} → ${h}`)
    assert.ok(!/href="\s*javascript:/i.test(h) && !/src="\s*javascript:/i.test(h), `javascript: у посиланні ${JSON.stringify(b)} → ${h}`)
  }
})
test('Md: порожній/некоректний текст не падає', () => {
  for (const t of [undefined, null, '', '   ', '\n\n', 12, '```', '```bash', '> ', '> [!', '|', '| a |', '|---|', '- ', '1. ', '---', '###']) assert.doesNotThrow(() => M(t), JSON.stringify(t))
})
test('Md: структура — абзаци, списки, код, таблиця, врізка', () => {
  assert.match(M('перший\n\nдругий'), /<p>перший<\/p><p>другий<\/p>/)
  assert.match(M('- а\n- б'), /<ul><li>а<\/li><li>б<\/li><\/ul>/)
  assert.match(M('1. а\n2. б'), /<ol>.*<li>а<\/li>.*<li>б<\/li>.*<\/ol>/)
  assert.match(textOf(M('```bash\necho hi\n```')), /echo hi/)
  assert.match(M('| a | b |\n|---|---|\n| 1 | 2 |'), /<table/)
  assert.match(M('> [!remember] Запам’ятай'), /Запам’ятай/)
  assert.ok(!/\[!remember\]/.test(M('> [!remember] Запам’ятай')), 'маркер врізки не показується')
  assert.match(M('### Підзаголовок'), /<h\d[^>]*>Підзаголовок<\/h\d>/)
})
test('Md: розмітка всередині блоків працює', () => {
  assert.match(M('- **а**\n- ==б=='), /<li><b>а<\/b><\/li><li><mark/)
  assert.match(M('| **а** | b |\n|---|---|\n| 1 | 2 |'), /<b>а<\/b>/)
})
test('Md: код у блоці ``` не інтерпретується як розмітка', () => {
  const h = M('```\n==x== **y** C++\n```')
  assert.ok(!/<mark|<b>/.test(h), h)
})
test('Md: незакритий ``` не з’їдає решту тексту безслідно', () => {
  const h = M('до\n\n```bash\necho 1\n\nпісля')
  assert.match(textOf(h), /echo 1/); assert.match(textOf(h), /після/)
})
