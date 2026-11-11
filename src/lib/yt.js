// Идентификатор видео YouTube из ссылки (youtu.be/…, watch?v=…, shorts/…, live/…, embed/…); иначе undefined
export const ytId = (u) => String(u ?? '').match(/(?:youtu\.be\/|[?&]v=|shorts\/|live\/|embed\/)([\w-]{11})/)?.[1]
