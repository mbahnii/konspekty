import { useEffect, useRef, useState } from 'react'

// Кольцо прогресса очереди. Одна линия с закруглёнными концами:
//   в очереди → скачивается → пишется конспект → публикуется → готово (галочка) → обратный отсчёт до «улёта».
// Переход на следующий этап — «прыжок» с пружинкой. Пока этап идёт, кончик линии мягко качается
// вперёд-назад, а в центре «дышит» точка. После «готово» та же линия зелёным убывает до нуля — это отсчёт.
export const STEPS = 5
const PCT = [12, 36, 62, 86, 100]
const HUES = [16, 34, 50, 84, 138]
export const stepColor = (k) => `hsl(${HUES[Math.max(0, Math.min(STEPS - 1, k))]} 86% 54%)`

export function QueueRing({ k = 0, mode = 'run', size = 28, leaveMs = 0, ringRef }) {
  const leaving = mode === 'leaving'
  const pct = mode === 'error' || mode === 'done' ? 100 : leaving ? 0 : PCT[Math.min(k, STEPS - 1)]
  const color = mode === 'error' ? 'var(--danger)' : mode === 'local' ? 'color-mix(in srgb, var(--island-text) 40%, transparent)'
    : mode === 'done' || leaving ? stepColor(STEPS - 1) : stepColor(k)
  // отсчёт: линия линейно убывает за leaveMs (тот же круг, без второго кольца)
  const fillStyle = { '--p': pct, ...(leaving && leaveMs ? { transition: `--p ${leaveMs}ms linear, stroke 400ms ease` } : null) }
  return (
    <svg ref={ringRef} className={`qring ${mode}`} width={size} height={size} viewBox="0 0 36 36" aria-hidden="true" style={{ '--c': color }}>
      <circle className="trk" cx="18" cy="18" r="14.5" pathLength="100" />
      <circle className="fill" cx="18" cy="18" r="14.5" pathLength="100" style={fillStyle} />
      {(mode === 'done' || leaving) && <path className="ok" d="M12.6 18.3l3.7 3.7 7.2-7.4" pathLength="100" />}
      {mode === 'error' && <path className="err" d="M18 11.8v7.4M18 23.9v.2" />}
      {(mode === 'run' || mode === 'local') && <circle className="dot" cx="18" cy="18" r="3" />}
    </svg>
  )
}

// Строка-«барабан»: старая подпись уезжает вверх и гаснет, новая выкатывается снизу
export function StageLabel({ text, className = '' }) {
  const [st, setSt] = useState({ cur: text, prev: null, n: 0 })
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setSt((s) => (s.cur === text ? s : { cur: text, prev: s.cur, n: s.n + 1 }))
  }, [text])
  return (
    <span className={`slabel ${className}`}>
      {st.prev !== null && <span key={`p${st.n}`} className="out">{st.prev}</span>}
      <span key={`c${st.n}`} className={st.n ? 'in' : ''}>{st.cur}</span>
    </span>
  )
}
