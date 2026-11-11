import { useEffect, useRef, useState } from 'react'

// Кольцо прогресса очереди: 6 этапов, каждый — «прыжок» кольца с пружинкой.
// 0 в очереди → 1 скачивается → 2 пишется конспект → 3 публикуется → 4 готово → 5 скоро исчезнет.
// Пока этап идёт — по дорожке бежит блик и «дышит» кончик заливки (видно, что работа идёт).
// Цвет — от оранжево-красного к зелёному.
export const STEPS = 6
const HUES = [14, 32, 48, 78, 128, 140]
export const stepColor = (k) => `hsl(${HUES[Math.max(0, Math.min(STEPS - 1, k))]} 88% 54%)`

export function QueueRing({ k = 0, mode = 'run', size = 30, leaveMs = 0, ringRef }) {
  const pct = mode === 'error' ? 100 : ((k + 1) / STEPS) * 100
  const color = mode === 'error' ? 'var(--danger)' : mode === 'local' ? 'color-mix(in srgb, var(--island-text) 45%, transparent)' : stepColor(k)
  const ok = mode === 'done' || mode === 'leaving'
  return (
    <svg ref={ringRef} className={`qring ${mode}`} width={size} height={size} viewBox="0 0 36 36" aria-hidden="true" style={{ '--c': color }}>
      <circle className="trk" cx="18" cy="18" r="15" pathLength="100" />
      <circle className="fill" cx="18" cy="18" r="15" pathLength="100" style={{ strokeDashoffset: 100 - pct }} />
      {mode === 'run' && <circle className="comet" cx="18" cy="18" r="15" pathLength="100" />}
      {mode === 'leaving' && leaveMs > 0 && <circle className="count" cx="18" cy="18" r="10.5" pathLength="100" style={{ animationDuration: `${leaveMs}ms` }} />}
      {ok && <path className="ok" d="M12.5 18.4l3.6 3.6 7.4-7.6" pathLength="100" />}
      {mode === 'error' && <path className="err" d="M18 11.5v8M18 24.2v.3" />}
      {mode === 'run' && <circle className="dot" cx="18" cy="18" r="2.6" />}
    </svg>
  )
}

// Подпись этапа: старая уезжает вниз и гаснет, новая выезжает сверху
export function StageLabel({ text }) {
  const [st, setSt] = useState({ cur: text, prev: null, n: 0 })
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setSt((s) => (s.cur === text ? s : { cur: text, prev: s.cur, n: s.n + 1 }))
  }, [text])
  return (
    <span className="slabel">
      {st.prev !== null && <span key={`p${st.n}`} className="out">{st.prev}</span>}
      <span key={`c${st.n}`} className={st.n ? 'in' : ''}>{st.cur}</span>
    </span>
  )
}
