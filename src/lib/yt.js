// Идентификатор видео YouTube из ссылки: только youtube.com (www/m/music), youtube-nocookie.com и youtu.be.
// Формы: youtu.be/ID, watch?v=ID, shorts/ID, live/ID, embed/ID. Любой другой сайт или id не из 11 символов — undefined.
const HOST = /^(?:https?:\/\/)?(?:(?:www|m|music)\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)(?=[/?#:]|$)/i
export const ytId = (u) => {
  const s = String(u ?? '').trim()
  return HOST.test(s) ? s.match(/(?:youtu\.be\/|[?&]v=|shorts\/|live\/|embed\/)([\w-]{11})(?![\w-])/)?.[1] : undefined
}
