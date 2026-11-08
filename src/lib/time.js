export function fmt(sec) {
  sec = Math.max(0, Math.round(sec))
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), r = sec % 60
  const p = (n) => String(n).padStart(2, '0')
  return h ? `${h}:${p(m)}:${p(r)}` : `${m}:${p(r)}`
}
export const ytLink = (id, t) => `https://www.youtube.com/watch?v=${id}&t=${Math.floor(t)}s`

// Кадры раздела: от начала до конца, максимум 6 (равномерно)
export function framesFor(meta, s, max = 6) {
  const l = (meta?.frames ?? []).filter((f) => f.t >= s.t && f.t < s.end)
  if (l.length <= max) return l
  if (max === 1) return [l[0]]
  return Array.from({ length: max }, (_, i) => l[Math.round((i * (l.length - 1)) / (max - 1))])
}
export const frameUrl = (id, f, thumb) => `./data/v/${id}/${(thumb && f.thumb) || f.file}`
