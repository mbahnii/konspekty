// Тонкая полоска разделов в прилипшем меню: показывает, где ты сейчас, и позволяет прыгнуть к разделу.
// Полная «плёнка» с кадрами остаётся в странице (components/Timeline.jsx).
export default function MiniTimeline({ secs, current, onPick }) {
  return (
    <div className="mini-tl" role="navigation">
      {secs.map((s) => (
        <button key={s.id} tabIndex={-1} aria-label={s.title} title={s.title}
          className={`${s.skip ? 'skip' : ''} ${current === s.id ? 'on' : ''}`} style={{ flex: Math.max(1, s.end - s.t) }}
          onClick={() => onPick(s.id)} />
      ))}
    </div>
  )
}
