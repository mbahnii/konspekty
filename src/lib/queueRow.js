// Запись очереди для базы. url не может быть пустым (в таблице NOT NULL): у фото-материалов это «photos:<id>» — иначе запись падает
// и вся синхронизация очереди останавливается.
export const queueRow = (x) => ({
  id: x.id,
  url: x.url || (x.vid ? `photos:${x.vid}` : ''),
  kind: x.kind,
  note: JSON.stringify({ title: x.title, channel: x.channel, vid: x.vid, translate: x.tr, photos: x.photos, mode: x.mode, guest: x.guest, share: x.share, thumb: x.thumb, autoname: x.autoname }),
})
