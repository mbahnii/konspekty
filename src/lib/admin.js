// Администратор — аккаунт владельца сайта (тот же, под которым работает worker). Чужие конспекты удалять может только он;
// обычный пользователь — только свои. Настоящую проверку делает worker (worker.py delete_allowed), здесь — чтобы лишнее не показывать.
export const ADMIN_EMAILS = ['bahniimike@gmail.com']
export const isAdmin = (session) => !!session?.user?.email && ADMIN_EMAILS.includes(session.user.email.toLowerCase())
export const canDelete = (session, v) => !!session?.user && !session.user.is_anonymous && (isAdmin(session) || (!!v?.owner && v.owner === session.user.id))
