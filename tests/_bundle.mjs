// Збирає tests/_entry.jsx у тимчасову папку (поза проєктом) і повертає імпортований модуль
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'
import react from '@vitejs/plugin-react'

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let cached
export async function loadEntry() {
  if (cached) return cached
  const base = process.env.TEST_TMP || fs.mkdtempSync(path.join(os.tmpdir(), 'konspekty-'))
  const outDir = path.join(base, 'bundle')
  await build({
    root: app, configFile: false, logLevel: 'silent', plugins: [react()],
    ssr: { noExternal: true },
    build: { ssr: path.join(app, 'tests/_entry.jsx'), outDir, emptyOutDir: true, write: true, rollupOptions: { output: { format: 'es', entryFileNames: 'entry.mjs' } } },
  })
  cached = await import(pathToFileURL(path.join(outDir, 'entry.mjs')).href)
  return cached
}
