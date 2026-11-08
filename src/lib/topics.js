// Человеческие названия тем (slug из summary.json → uk / ru / en)
const N = {
  setup: ['Встановлення і старт', 'Установка и старт', 'Setup'],
  'claude-md': ['CLAUDE.md і правила', 'CLAUDE.md и правила', 'CLAUDE.md & rules'],
  sessions: ['Сесії', 'Сессии', 'Sessions'],
  memory: ['Пам’ять', 'Память', 'Memory'],
  skills: ['Скіли', 'Скиллы', 'Skills'],
  limits: ['Ліміти', 'Лимиты', 'Limits'],
  models: ['Моделі', 'Модели', 'Models'],
  mcp: ['MCP і інтеграції', 'MCP и интеграции', 'MCP & integrations'],
  agents: ['Агенти', 'Агенты', 'Agents'],
  hooks: ['Хуки', 'Хуки', 'Hooks'],
  prompts: ['Як ставити задачі', 'Как ставить задачи', 'Prompting'],
  german: ['Німецька мова', 'Немецкий язык', 'German'],
  pronunciation: ['Вимова', 'Произношение', 'Pronunciation'],
  'language-learning': ['Вивчення мов', 'Изучение языков', 'Language learning'],
  habits: ['Звички й регулярність', 'Привычки и регулярность', 'Habits & consistency'],
}
const I = { uk: 0, ru: 1, en: 2 }
export const topicName = (id, lang) => N[id]?.[I[lang] ?? 0] ?? id.replace(/-/g, ' ')
