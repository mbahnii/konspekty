// Функція входу через Telegram (Supabase Edge Function): запускаємо її код локально із заглушками Deno/Supabase/Telegram.
// Перший же тест ловить «функція падає під час запуску» (так було, коли залишився уламок старого коду) — тоді бот віддавав 500 на все.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { transformWithOxc } from 'vite'

const FN = new URL('../../_supabase-черновики/functions/telegram-auth/index.ts', import.meta.url)
const CODE = 'abcdefabcdefabcdefabcdefabcdef12'
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
const T = fs.existsSync(FN) ? test : test.skip     // файл функції лежить поза репозиторієм сайту — без нього тести пропускаються
const SECRET = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('konspekty-webhook:1:x'))).slice(0, 48)

let handler; const calls = []
async function boot() {
  let src = fs.readFileSync(FN, 'utf8')
  src = src.replace(/import \{ createClient \} from [^\n]+\n/, 'const createClient=()=>({auth:{admin:{createUser:async()=>({error:null}),generateLink:async()=>({data:{properties:{hashed_token:"TOK"}}})}},from:()=>({upsert:async()=>({}),delete:()=>({like:()=>({lt:async()=>({})})})})});\n')
  const out = (await transformWithOxc(src, 'index.ts', { lang: 'ts' })).code
  globalThis.Deno = { env: { get: (k) => ({ TELEGRAM_BOT_TOKEN: '1:x', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }[k]) }, serve: (h) => { handler = h } }
  globalThis.fetch = async (u, o) => { calls.push({ u: String(u), body: o?.body ? JSON.parse(o.body) : null }); return new Response(JSON.stringify({ ok: true })) }
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tgfn-')), 'fn.mjs')
  fs.writeFileSync(f, out)
  await import(f)
}
const send = async (body) => {
  calls.length = 0
  const res = await handler(new Request('https://x/fn', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': SECRET }, body: JSON.stringify(body) }))
  return { status: res.status, methods: calls.map((c) => c.u.split('/bot1:x/')[1] || (c.u.includes('realtime') ? 'broadcast' : c.u)), calls: [...calls] }
}
const user = { id: 1, first_name: 'Тест', language_code: 'uk' }

T('функція запускається (немає помилки під час завантаження) і відповідає на OPTIONS', async () => {
  await boot()
  assert.equal(typeof handler, 'function')
  assert.equal((await handler(new Request('https://x/fn', { method: 'OPTIONS' }))).status, 200)
})

T('/start з кодом → бот надсилає віджет-картку (не входить сам)', async () => {
  const r = await send({ message: { from: user, chat: { id: 1 }, text: `/start ${CODE}` } })
  assert.equal(r.status, 200)
  assert.deepEqual(r.methods, ['sendWidget'])
  const b = r.calls[0].body
  assert.equal(b.allow_queries, true)
  assert.ok(b.html.includes("go('ok'") && b.html.includes("go('no'") && b.html.includes(`+':${CODE}'`), 'у віджеті кнопки «Це я» та «Скасувати» шлють боту ok:/no: разом з кодом входу')
  assert.ok(b.html.includes('TelegramWidget.request'))
  assert.ok(b.html.length < 32768, 'ліміт віджета 32 КБ')
  assert.ok(b.html.includes('Це я'), 'інтерфейс за замовчуванням українською')
})

T('/start без коду → просто привітання', async () => {
  const r = await send({ message: { from: user, chat: { id: 1 }, text: '/start' } })
  assert.deepEqual(r.methods, ['sendMessage'])
})

T('нажатие «Це я» у віджеті: ключ входу іде на сайт і боту відповідають вчасно', async () => {
  const r = await send({ widget_query: { id: 'q1', from: user, chat: { id: 1 }, data: `ok:${CODE}` } })
  assert.equal(r.status, 200)
  assert.ok(r.methods.includes('broadcast'), 'сайт отримує ключ')
  assert.ok(r.methods.includes('answerWidgetQuery'), 'на запит віджета треба відповісти (є 15 секунд)')
  const sent = r.calls.find((c) => c.u.includes('sendMessage'))?.body
  assert.ok(!JSON.stringify(sent).includes('http'), 'у чаті немає посилання на сайт (людина просто повертається в браузер)')
})

T('«Скасувати» не входить: ключ не відправляється', async () => {
  const r = await send({ widget_query: { id: 'q2', from: user, chat: { id: 1 }, data: `no:${CODE}` } })
  assert.ok(!r.methods.includes('broadcast'))
  assert.ok(r.methods.includes('answerWidgetQuery'))
})

T('запасні кнопки (якщо віджет не показався) працюють так само', async () => {
  const r = await send({ callback_query: { id: 'c1', from: user, message: { chat: { id: 1 }, message_id: 5 }, data: `ok:${CODE}` } })
  assert.ok(r.methods.includes('broadcast') && r.methods.includes('answerCallbackQuery'))
})

T('сміття у запиті не валить функцію: поганий код, порожнє оновлення', async () => {
  for (const body of [{}, { widget_query: { id: 'q', from: user, data: 'ok:коротко' } }, { message: { from: user, chat: { id: 1 }, text: '/start ' } }]) {
    const r = await send(body)
    assert.equal(r.status, 200, JSON.stringify(body))
    assert.ok(!r.methods.includes('broadcast'), 'без правильного коду ключ входу не віддається')
  }
})

T('запит без секретного заголовка Telegram не приймається як повідомлення бота', async () => {
  const res = await handler(new Request('https://x/fn', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ widget_query: { id: 'q', from: user, data: `ok:${CODE}` } }) }))
  assert.notEqual(res.status, 200, 'підроблене нажаття ззовні не має впускати')
})
