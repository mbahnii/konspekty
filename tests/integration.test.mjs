// Інтеграційний тест: збирання даних сайту з output/ (build-data.mjs) і відповідність файлів
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const data = path.join(app, 'public', 'data')

test('build-data: кожне готове відео має summary.json, meta.json і кадри', () => {
  execFileSync('node', ['scripts/build-data.mjs'], { cwd: app, stdio: 'pipe' })
  const index = JSON.parse(fs.readFileSync(path.join(data, 'index.json'), 'utf8'))
  assert.ok(index.length > 0, 'список відео не порожній')
  for (const v of index.filter((x) => x.ready)) {
    const dir = path.join(data, 'v', v.id)
    const s = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8'))
    const m = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'))
    assert.equal(s.video_id, v.id)
    assert.equal(m.id, v.id)
    assert.equal(v.counts.sections, s.sections.length)
    assert.ok(!('transcript_source' in m), 'транскрипт не публікується')
    for (const f of m.frames ?? []) assert.ok(fs.existsSync(path.join(dir, f.file)), `є кадр ${f.file}`)
  }
})
