// Тести ПРАВИЛ, які сформулював власник сайту (писані зі слів власника, а не під готовий код).
import test from 'node:test'
import assert from 'node:assert/strict'
import { inScope, countScopes } from '../src/lib/scope.js'
import { isAdmin, canDelete } from '../src/lib/admin.js'
import { queueRow } from '../src/lib/queueRow.js'

const ME = 'user-me', OTHER = 'user-other'
const notes = [
  { id: 'a', owner: ME, visibility: 'public' },        // мій, але поділений → «Загальні» (+ «Усі»), НЕ «Мої»
  { id: 'b', owner: ME, visibility: 'private' },       // мій особистий → «Мої» (+ «Усі»), НЕ «Загальні»
  { id: 'c', owner: OTHER, visibility: 'public' },     // чужий загальний → «Загальні» (+ «Усі»)
  { id: 'd', owner: OTHER, visibility: 'private' },    // чужий особистий → ніде
  { id: 'e', owner: null, visibility: 'public' },      // старий без власника, загальний
  { id: 'f' },                                         // без полів взагалі = загальний
]
const where = (v, uid) => ['mine', 'public', 'all'].filter((c) => inScope(c, v, uid))

test('кожен конспект — або в «Загальні», або в «Мої», ніколи в обох; «Усі» — це їх об’єднання', () => {
  for (const v of notes) {
    const w = where(v, ME)
    assert.ok(!(w.includes('mine') && w.includes('public')), `${v.id}: одночасно і в «Мої», і в «Загальні»: ${w}`)
    if (w.includes('mine') || w.includes('public')) assert.ok(w.includes('all'), `${v.id}: є в «Мої/Загальні», але нема в «Усі»`)
    if (w.includes('all')) assert.ok(w.includes('mine') || w.includes('public'), `${v.id}: в «Усі», але ні в «Мої», ні в «Загальні»`)
  }
})

test('додав у «Загальні» — видно в «Загальні» і «Усі», але не в «Мої»', () => {
  assert.deepEqual(where({ id: 'x', owner: ME, visibility: 'public' }, ME).sort(), ['all', 'public'])
})

test('додав у «Мої» — видно в «Мої» і «Усі», але не в «Загальні»', () => {
  assert.deepEqual(where({ id: 'x', owner: ME, visibility: 'private' }, ME).sort(), ['all', 'mine'])
})

test('чужі особисті не видно взагалі і не рахуються', () => {
  assert.deepEqual(where({ id: 'x', owner: OTHER, visibility: 'private' }, ME), [])
  assert.deepEqual(where({ id: 'x', owner: OTHER, visibility: 'private' }, undefined), [])
})

test('лічильники у вкладках збігаються зі списками, а «Усі» = «Загальні» + «Мої»', () => {
  const c = countScopes(notes, ME)
  for (const k of ['all', 'public', 'mine']) assert.equal(c[k], notes.filter((v) => inScope(k, v, ME)).length, k)
  assert.equal(c.all, c.public + c.mine)
  assert.deepEqual(c, { all: 5, public: 4, mine: 1 })
})

test('без входу «Мої» порожні, а «Загальні» видно', () => {
  const c = countScopes(notes, undefined)
  assert.equal(c.mine, 0)
  assert.equal(c.public, 4)
  assert.equal(c.all, 4)
})

test('видаляти можна лише свої; чужі — ні; адміністратор — будь-які', () => {
  const me = { user: { id: ME, email: 'someone@example.com' } }
  const admin = { user: { id: 'adm', email: 'bahniimike@gmail.com' } }
  assert.equal(canDelete(me, { owner: ME }), true)
  assert.equal(canDelete(me, { owner: OTHER }), false)
  assert.equal(canDelete(me, { owner: null }), false, 'конспект без власника може видалити лише адміністратор')
  assert.equal(canDelete(null, { owner: ME }), false, 'без входу видаляти не можна')
  assert.equal(canDelete({ user: { id: ME, is_anonymous: true } }, { owner: ME }), false, 'гість не видаляє')
  assert.equal(canDelete(admin, { owner: OTHER }), true)
  assert.equal(canDelete(admin, { owner: null }), true)
  assert.equal(isAdmin(me), false)
  assert.equal(isAdmin(admin), true)
  assert.equal(isAdmin({ user: { email: 'BAHNIIMIKE@gmail.com' } }), true, 'регістр пошти не важливий')
  assert.equal(isAdmin(null), false)
})

test('запис черги для фото без посилання не має порожнього url (інакше падає вся синхронізація)', () => {
  const r = queueRow({ id: '1', url: null, kind: 'delete', vid: 'ph-abc', title: 'T' })
  assert.ok(r.url && r.url.length > 0)
  assert.equal(queueRow({ id: '2', url: 'https://youtu.be/x', kind: 'add', vid: 'x' }).url, 'https://youtu.be/x')
  assert.equal(typeof queueRow({ id: '3', url: 'u', kind: 'add' }).note, 'string')
})

test('у записі черги їде позначка автоназви й мініатюра (фото без імені отримує назву від нейромережі)', () => {
  const n = JSON.parse(queueRow({ id: '1', url: 'photos:ph-1', kind: 'add', vid: 'ph-1', autoname: true, thumb: 'data:image/jpeg;base64,AAAA' }).note)
  assert.equal(n.autoname, true)
  assert.ok(n.thumb.startsWith('data:image/'))
})
