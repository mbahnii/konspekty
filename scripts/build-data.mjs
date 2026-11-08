// Собирает данные для сайта из ../output/<видео>/ в public/data/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(here, '../../output')
const OUT = path.resolve(here, '../public/data')

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
fs.rmSync(OUT, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })   // повтор при ENOTEMPTY (гонка с другим процессом)
fs.mkdirSync(path.join(OUT, 'v'), { recursive: true })

const index = []
for (const name of fs.readdirSync(SRC)) {
  try {
  const dir = path.join(SRC, name)
  const metaP = path.join(dir, 'meta.json')
  if (!fs.statSync(dir).isDirectory() || !fs.existsSync(metaP)) continue
  const meta = readJson(metaP)
  const sumP = path.join(dir, 'summary.json')
  const summary = fs.existsSync(sumP) ? readJson(sumP) : null
  const item = {
    id: meta.id, title: meta.title, channel: meta.channel, duration: meta.duration,
    url: meta.url, ready: !!summary,
    added: Math.round(fs.statSync(summary ? sumP : metaP).mtimeMs),   // когда появилось — новые видео показываем сверху
  }
  if (summary) {
    Object.assign(item, {
      emoji: summary.emoji || '🎬', level: summary.level, topics: summary.topics,
      lang: summary.lang || 'ru',
      counts: {
        sections: summary.sections.length, guides: summary.guides.length,
        terms: summary.terms.length, later: summary.later.length,
      },
      cover: (() => { const fr = meta.frames ?? []; const s = summary.sections.find((x) => !x.skip && fr.some((f) => f.t >= x.t && f.t < x.end)); const f = s && fr.find((f) => f.t >= s.t && f.t < s.end); return f ? (f.thumb || f.file) : null })(),
      guides: summary.guides.map((g) => ({ id: g.id, n: g.steps.length, done: !!g.done_already })),
    })
    const vdir = path.join(OUT, 'v', meta.id)
    fs.mkdirSync(vdir, { recursive: true })
    fs.writeFileSync(path.join(vdir, 'summary.json'), JSON.stringify(summary))
    const { segments, transcript_source, ...slim } = meta   // транскрипт сайту не нужен
    fs.writeFileSync(path.join(vdir, 'meta.json'), JSON.stringify({ ...slim, segments }))
    if (fs.existsSync(path.join(dir, 'frames'))) fs.cpSync(path.join(dir, 'frames'), path.join(vdir, 'frames'), { recursive: true })
  }
  index.push(item)
  } catch (e) { console.warn('пропускаю папку', name, '—', e.message) }   // сломанная/недокачанная папка не должна ломать публикацию
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index))
// «Главное по темам», которое пишет Claude (необязательно)
const topicsP = path.join(SRC, 'topics.json')
if (fs.existsSync(topicsP)) fs.copyFileSync(topicsP, path.join(OUT, 'topics.json'))
console.log(`build-data: ${index.length} видео, готово к показу: ${index.filter((v) => v.ready).length}`)
