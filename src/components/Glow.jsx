// Мягкое цветное свечение вверху экрана — одно на весь сайт (не мигает при переходах).
// center — по центру (страница «Як користуватися»), иначе ближе к заголовку слева.
export default function Glow({ center }) {
  return <div className={`amb ${center ? 'center' : ''}`} aria-hidden><i /><i /><i /></div>
}
