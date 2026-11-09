// Модульні тести клієнтської частини (вбудований раннер Node: node --test)
import test from 'node:test'
import assert from 'node:assert/strict'
import { fmt, framesFor, ytLink } from '../src/lib/time.js'
import { stepOn, guideDone } from '../src/store/progress.js'

test('fmt: форматування часу хв:сс і год:хв:сс', () => {
  assert.equal(fmt(0), '0:00')
  assert.equal(fmt(75), '1:15')
  assert.equal(fmt(3725), '1:02:05')
  assert.equal(fmt(-5), '0:00')
})

test('ytLink: посилання на момент відео', () => {
  assert.equal(ytLink('abc', 90.7), 'https://www.youtube.com/watch?v=abc&t=90s')
})

test('framesFor: кадри лише свого розділу, не більше 6 і рівномірно', () => {
  const meta = { frames: Array.from({ length: 30 }, (_, i) => ({ t: i * 10, file: `f${i}.webp` })) }
  const s = { t: 50, end: 200 }
  const r = framesFor(meta, s)
  assert.equal(r.length, 6)
  assert.ok(r.every((f) => f.t >= 50 && f.t < 200))
  assert.equal(r[0].t, 50)
  assert.equal(r.at(-1).t, 190)
  assert.deepEqual(framesFor({ frames: [] }, s), [])
})

test('stepOn / guideDone: відмітки користувача мають пріоритет над done_already', () => {
  const g = { id: 'g1', steps: [{}, {}], done_already: true }
  assert.equal(stepOn({}, 'v', g, 0), true)                     // за замовчуванням — з конспекту
  assert.equal(stepOn({ 'v/g1/0': false }, 'v', g, 0), false)   // користувач зняв відмітку
  assert.equal(guideDone({ 'v/g1/1': false }, 'v', g), false)
  assert.equal(guideDone({}, 'v', g), true)
})
