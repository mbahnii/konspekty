// Где лежат картинки видео: у видео из базы — в хранилище Supabase, иначе — на GitHub (папка data/)
export const FROM_DB = new Set()
const STORAGE = 'https://lpjeumxpeqqbfpxmzlhl.supabase.co/storage/v1/object/public/frames'
export const fileUrl = (id, rel) => (FROM_DB.has(id) ? `${STORAGE}/${id}/${rel}` : `./data/v/${id}/${rel}`)
