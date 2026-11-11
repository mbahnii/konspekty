// Тести за описом бажаної поведінки (yt, time, account, share, progress, translate)
import test from 'node:test'
import assert from 'node:assert/strict'
import { ytId } from '../src/lib/yt.js'
import { fmt, pageNo, stamp, framesFor, frameUrl, ytLink } from '../src/lib/time.js'
import { loadEntry } from './_bundle.mjs'
import { stepOn, guideDone } from '../src/store/progress.js'

const { accountInfo, shareDefault, useSettings } = await loadEntry()
const ID = 'dQw4w9WgXcQ'

// ---------- 1. ytId ----------
test('ytId: нормальні посилання YouTube', () => {
  const ok = [
    `https://youtu.be/${ID}`, `https://youtu.be/${ID}?si=abcDEF123`, `https://youtu.be/${ID}?t=30`,
    `https://www.youtube.com/watch?v=${ID}`, `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://www.youtube.com/watch?feature=share&v=${ID}`, `https://www.youtube.com/watch?list=PL123&index=2&v=${ID}`,
    `https://www.youtube.com/watch?v=${ID}&list=PLxyz&t=5`, `https://m.youtube.com/watch?v=${ID}`,
    `https://www.youtube.com/shorts/${ID}`, `https://www.youtube.com/shorts/${ID}?si=zzz`, `https://www.youtube.com/live/${ID}`,
    `https://www.youtube.com/live/${ID}?is=abc`, `https://www.youtube.com/embed/${ID}`, `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://music.youtube.com/watch?v=${ID}`, `  https://youtu.be/${ID}  `, `youtu.be/${ID}`, `www.youtube.com/watch?v=${ID}`,
  ]
  for (const u of ok) assert.equal(ytId(u), ID, u)
})
test('ytId: id з дефісом і підкресленням', () => {
  assert.equal(ytId('https://youtu.be/a-b_c-d_e-f'), 'a-b_c-d_e-f')
})
test('ytId: не-YouTube і сміття відхиляються', () => {
  const bad = [
    `https://example.com/watch?v=${ID}`, `https://vimeo.com/embed/${ID}`, `https://evil.com/?v=${ID}`,
    `https://notyoutube.com/watch?v=${ID}`, `https://youtube.com.evil.com/watch?v=${ID}`,
    `https://example.com/shorts/${ID}`, ID, 'hello world', 'https://www.youtube.com/', 'https://www.youtube.com/watch?v=short',
    'https://youtu.be/abc', 'https://youtu.be/', '', '   ', null, undefined, 12345678901, 0, {}, [],
  ]
  const wrong = bad.filter((u) => ytId(u)).map((u) => `${JSON.stringify(u)} → ${ytId(u)}`)
  assert.deepEqual(wrong, [], 'ці значення не мали б розпізнаватись як YouTube')
})
test('ytId: надто довгий id (12+ символів) не обрізається мовчки до 11', () => {
  assert.ok(!ytId('https://youtu.be/abcdefghijkl'), 'id з 12 символів не є валідним')
})

// ---------- 2. time ----------
test('fmt: межі', () => {
  assert.equal(fmt(0), '0:00'); assert.equal(fmt(59), '0:59'); assert.equal(fmt(60), '1:00')
  assert.equal(fmt(75), '1:15'); assert.equal(fmt(3599), '59:59'); assert.equal(fmt(3600), '1:00:00'); assert.equal(fmt(3725), '1:02:05')
  assert.equal(fmt(36000), '10:00:00')
})
test('fmt: від’ємні, дробові, NaN, не-числа', () => {
  const bad = [-5, -0.4, NaN, undefined, null].map((x) => [x, fmt(x)]).filter(([, r]) => r !== '0:00')
  assert.deepEqual(bad, [], 'від’ємні/NaN/порожнє → 0:00')
  assert.equal(fmt(75.9), '1:15') // дробова частина не показується
  for (const x of [59.999, 3599.999, 0.999, 119.5]) {
    const s = fmt(x)
    assert.match(s, /^(\d+:)?\d{1,2}:\d{2}$/, `формат для ${x}: ${s}`)
    assert.ok(!/(^|:)60$/.test(s), `немає «60» секунд/хвилин: ${x} → ${s}`)
  }
})
test('pageNo / stamp для фото: сторінка = t/60 + 1', () => {
  assert.equal(pageNo(0), 1); assert.equal(pageNo(59.9), 1); assert.equal(pageNo(60), 2); assert.equal(pageNo(185), 4)
  const ph = { source: 'photos' }
  assert.equal(stamp(ph, 0), 'p. 1'); assert.equal(stamp(ph, 130), 'p. 3'); assert.equal(stamp(ph, 60, 'стор.'), 'стор. 2')
  assert.equal(stamp({ source: 'youtube' }, 75), '1:15'); assert.equal(stamp(null, 75), '1:15'); assert.equal(stamp(undefined, 5), '0:05')
})
test('pageNo: від’ємні та NaN не дають сторінку 0 / NaN', () => {
  const bad = [-5, -0.1, NaN, undefined, null].map((x) => [x, pageNo(x)]).filter(([, r]) => r !== 1)
  assert.deepEqual(bad, [])
})
const mkMeta = (n, step = 10) => ({ frames: Array.from({ length: n }, (_, i) => ({ t: i * step, file: `f${i}.webp` })) })
test('framesFor: ≤6, [t,end), рівномірно', () => {
  const r = framesFor(mkMeta(30), { t: 50, end: 200 })
  assert.equal(r.length, 6)
  assert.ok(r.every((f) => f.t >= 50 && f.t < 200))
  assert.equal(new Set(r.map((f) => f.t)).size, 6, 'без дублікатів')
  const idx = r.map((f) => f.t / 10); const gaps = idx.slice(1).map((v, i) => v - idx[i])
  assert.ok(Math.max(...gaps) - Math.min(...gaps) <= 1, `рівномірно: ${gaps}`)
  assert.ok(r.every((f, i) => i === 0 || f.t > r[i - 1].t), 'у порядку часу')
})
test('framesFor: кадр рівно на end не входить; кадр рівно на t входить', () => {
  const r = framesFor(mkMeta(10), { t: 20, end: 50 })
  assert.deepEqual(r.map((f) => f.t), [20, 30, 40])
})
test('framesFor: мало кадрів — усі; 7 кадрів — 6 різних', () => {
  assert.equal(framesFor(mkMeta(4), { t: 0, end: 100 }).length, 4)
  const r = framesFor(mkMeta(7), { t: 0, end: 100 }); assert.equal(r.length, 6); assert.equal(new Set(r.map((f) => f.t)).size, 6)
})
test('framesFor: порожньо/відсутні кадри/розділ без кадрів', () => {
  assert.deepEqual(framesFor({ frames: [] }, { t: 0, end: 10 }), [])
  assert.deepEqual(framesFor({}, { t: 0, end: 10 }), [])
  assert.deepEqual(framesFor(null, { t: 0, end: 10 }), [])
  assert.deepEqual(framesFor(mkMeta(5), { t: 1000, end: 2000 }), [])
  assert.deepEqual(framesFor(mkMeta(5), { t: 5, end: 5 }), [])
})
test('framesFor: max=1 не дає NaN/undefined, max=0 порожньо', () => {
  const r = framesFor(mkMeta(10), { t: 0, end: 100 }, 1)
  assert.equal(r.length, 1); assert.ok(r[0] && Number.isFinite(r[0].t))
  assert.deepEqual(framesFor(mkMeta(10), { t: 0, end: 100 }, 0), [])
  assert.equal(framesFor(mkMeta(10), { t: 0, end: 100 }, 2).length, 2)
})
test('frameUrl / ytLink', () => {
  assert.match(frameUrl('vid', { file: 'a.webp', thumb: 't.webp' }, true), /vid\/t\.webp$/)
  assert.match(frameUrl('vid', { file: 'a.webp', thumb: 't.webp' }, false), /vid\/a\.webp$/)
  assert.match(frameUrl('vid', { file: 'a.webp' }, true), /vid\/a\.webp$/, 'без thumb — повний файл')
  assert.equal(ytLink('abc', 0), 'https://www.youtube.com/watch?v=abc&t=0s')
  assert.equal(ytLink('abc', 59.99), 'https://www.youtube.com/watch?v=abc&t=59s')
  assert.equal(ytLink('abc', -3), 'https://www.youtube.com/watch?v=abc&t=0s', 'від’ємний час → t=0s')
  assert.ok(!/NaN|undefined/.test(ytLink('abc', undefined)))
})

// ---------- 6. accountInfo ----------
const sess = (user) => ({ user: { id: 'u1', ...user } })
test('accountInfo: session=null → null; порожні metadata не падають', () => {
  assert.equal(accountInfo(null), null); assert.equal(accountInfo(undefined), null)
  for (const s of [sess({}), sess({ user_metadata: {}, app_metadata: {} }), sess({ user_metadata: null, app_metadata: null }), { user: null }, {}]) {
    assert.doesNotThrow(() => accountInfo(s))
  }
  const a = accountInfo(sess({}))
  if (a) assert.equal(typeof a.name, 'string')
})
test('accountInfo: github', () => {
  const a = accountInfo(sess({ email: 'g@x.com', app_metadata: { provider: 'github' }, user_metadata: { user_name: 'octocat', name: 'The Octocat' } }))
  assert.equal(a.provider, 'github'); assert.match(`${a.name} ${a.sub}`, /octocat|Octocat/)
})
test('accountInfo: github без name, лише user_name', () => {
  const a = accountInfo(sess({ app_metadata: { provider: 'github' }, user_metadata: { user_name: 'octocat' } }))
  assert.equal(a.provider, 'github'); assert.match(a.name, /octocat/)
})
test('accountInfo: google (пошта + ім’я)', () => {
  const a = accountInfo(sess({ email: 'ann@gmail.com', app_metadata: { provider: 'google' }, user_metadata: { full_name: 'Ann Lee', name: 'Ann Lee' } }))
  assert.equal(a.provider, 'google'); assert.equal(a.name, 'Ann Lee'); assert.match(a.sub, /ann@gmail\.com/)
})
test('accountInfo: google без імені — ім’я з пошти', () => {
  const a = accountInfo(sess({ email: 'ann@gmail.com', app_metadata: { provider: 'google' }, user_metadata: {} }))
  assert.ok(a.name && !/undefined/.test(a.name)); assert.match(`${a.name}${a.sub}`, /ann/)
})
test('accountInfo: telegram (user_metadata.provider)', () => {
  const a = accountInfo(sess({ email: 'tg123@telegram.local', app_metadata: { provider: 'email' }, user_metadata: { provider: 'telegram', name: 'Іван', username: 'ivan_tg' } }))
  assert.equal(a.provider, 'telegram'); assert.equal(a.name, 'Іван'); assert.match(a.sub, /ivan_tg/)
  assert.ok(!/telegram\.local/.test(a.sub), 'службова пошта не показується')
})
test('accountInfo: telegram без username', () => {
  const a = accountInfo(sess({ app_metadata: { provider: 'email' }, user_metadata: { provider: 'telegram', name: 'Іван' } }))
  assert.equal(a.provider, 'telegram'); assert.equal(a.name, 'Іван'); assert.ok(!/undefined|null|@$/.test(a.sub ?? ''))
})
test('accountInfo: email', () => {
  const a = accountInfo(sess({ email: 'me@mail.com', app_metadata: { provider: 'email' }, user_metadata: {} }))
  assert.equal(a.provider, 'email'); assert.match(`${a.name} ${a.sub}`, /me@mail\.com|me/)
})
test('accountInfo: display_name має пріоритет для всіх провайдерів', () => {
  for (const [provider, um] of [['github', { user_name: 'octo' }], ['google', { full_name: 'G Name' }], ['email', {}], ['email', { provider: 'telegram', name: 'TG', username: 'tgu' }]]) {
    const a = accountInfo(sess({ email: 'a@b.c', app_metadata: { provider }, user_metadata: { ...um, display_name: 'Мій Нік' } }))
    assert.equal(a.name, 'Мій Нік', `${provider}/${JSON.stringify(um)}`)
  }
})

// ---------- 7. shareDefault ----------
function env({ hash = '', wide = false, catalog = 'all' }) {
  globalThis.location = { hash }
  globalThis.matchMedia = (q) => ({ matches: wide && /861/.test(q), media: q })
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }
  useSettings.setState({ catalog })
}
test('shareDefault: головна, телефон', () => {
  for (const c of ['all', 'public']) {
    for (const hash of ['', '#', '#/']) { env({ hash, catalog: c }); assert.equal(shareDefault(), true, `${c} ${JSON.stringify(hash)}`) }
  }
})
test('shareDefault: «Мої» — завжди особисте', () => {
  for (const hash of ['', '#/', '#/topics']) for (const wide of [false, true]) { env({ hash, wide, catalog: 'mine' }); assert.equal(shareDefault(), false, `${hash} wide=${wide}`) }
})
test('shareDefault: важлива ЛИШЕ вкладка в момент додавання — сторінка й пристрій не впливають (правило власника 12.11)', () => {
  for (const hash of ['#/', '#/topics', '#/video/abc', '#/profile']) for (const wide of [false, true]) {
    env({ hash, wide, catalog: 'all' }); assert.equal(shareDefault(), true, `«Усі» ${hash} wide=${wide}`)
    env({ hash, wide, catalog: 'public' }); assert.equal(shareDefault(), true, `«Загальні» ${hash} wide=${wide}`)
    env({ hash, wide, catalog: 'mine' }); assert.equal(shareDefault(), false, `«Мої» ${hash} wide=${wide}`)
  }
})
test('shareDefault: повертає саме boolean', () => {
  env({ hash: '#/', catalog: 'all' }); assert.equal(typeof shareDefault(), 'boolean')
  env({ hash: '#/topics', catalog: 'all' }); assert.equal(typeof shareDefault(), 'boolean')
})

// ---------- 8. progress ----------
test('stepOn/guideDone: порожній список кроків', () => {
  const g = { id: 'g', steps: [], done_already: false }
  assert.equal(guideDone({}, 'v', g), false, 'порожня інструкція без кроків не вважається виконаною')
  assert.doesNotThrow(() => guideDone({}, 'v', { id: 'g' }))
})
test('stepOn: відмітки користувача проти done_already', () => {
  const g = { id: 'g', steps: [{}, {}, {}], done_already: false }
  assert.equal(stepOn({}, 'v', g, 0), false)
  assert.equal(stepOn({ 'v/g/0': true }, 'v', g, 0), true)
  assert.equal(stepOn({ 'v/g/0': true }, 'v', g, 1), false)
  const d = { ...g, done_already: true }
  assert.equal(stepOn({ 'v/g/2': false }, 'v', d, 2), false)
  assert.equal(stepOn({ 'v/g/2': false }, 'v', d, 1), true)
  assert.equal(guideDone({ 'v/g/0': true, 'v/g/1': true, 'v/g/2': true }, 'v', g), true)
  assert.equal(guideDone({ 'v/g/0': true, 'v/g/1': true }, 'v', g), false)
})
test('stepOn: відмітки іншого відео/інструкції не змішуються; marks=undefined не падає', () => {
  const g = { id: 'g', steps: [{}], done_already: false }
  assert.equal(stepOn({ 'w/g/0': true, 'v/h/0': true }, 'v', g, 0), false)
  assert.doesNotThrow(() => stepOn(undefined, 'v', g, 0))
})
