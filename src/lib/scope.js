// Правило «где виден конспект» (одно на весь сайт):
//   Загальні — открыт всем (visibility public);  Мої — личный и мой (private + owner = я);  Усі — Загальні + Мої.
// Каждый конспект ровно в одном из двух мест (общий или личный); чужие личные не видны и не считаются.
export const isPublic = (v) => (v?.visibility ?? 'public') === 'public'
export const isMine = (v, uid) => !!uid && v?.owner === uid && !isPublic(v)
export const inScope = (catalog, v, uid) => (catalog === 'mine' ? isMine(v, uid) : catalog === 'public' ? isPublic(v) : isPublic(v) || isMine(v, uid))
export const countScopes = (list, uid) => ({
  all: list.filter((v) => inScope('all', v, uid)).length,
  public: list.filter((v) => inScope('public', v, uid)).length,
  mine: list.filter((v) => inScope('mine', v, uid)).length,
})
