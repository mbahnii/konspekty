// Масштаб времени анимаций (то же число --mo, что и в CSS): для таймеров и анимаций, которые идут из кода
export const mo = () => { const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mo')); return v > 0 ? v : 1 }
export const ms = (n) => Math.round(n * mo())
