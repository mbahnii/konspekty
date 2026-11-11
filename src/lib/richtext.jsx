import { Fragment, useState } from 'react'
import { useT } from '../i18n'
import { useToast } from '../store/ui'
import { ICopy, IOk } from '../components/Icons'
import '../styles/rich.css'

// Богатый текст конспектов — как в Notion / Obsidian.
// В тексте:  **жирный**  *курсив*  `код`  ==жёлтое==  ==g:зелёное== (r красное, b синее, p фиолетовое)  ++подчёркнутое++  [[Cmd]]
// Блоки:     ```bash … ```  (код)   > [!remember] …  (врезка)   | таблица |   ### подзаголовок   ---   списки (1. и -)

const HL = { y: 'y', g: 'g', r: 'r', b: 'b', p: 'p' }
// Границы условий (?<![\w…]) нужны, чтобы «C++», «a = b», «2*3*4» не принимались за разметку
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|(?<![=\w])==(?:[grbpy]:)?(?=\S)[^=]+?(?<=\S)==(?![=\w])|(?<![\w+])\+\+(?=\S)[^+]+?(?<=\S)\+\+(?![\w+])|\[\[[^\]]+\]\]|(?<![\w*])\*(?=[^\s*])[^*]+?(?<=[^\s*])\*(?![\w*]))/g

export function inline(text) {
  return String(text ?? '').split(INLINE).map((p, i) => {
    if (!p) return null
    if (p.startsWith('**') && p.length > 4) return <b key={i}>{inline(p.slice(2, -2))}</b>
    if (p.startsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>
    if (p.startsWith('==')) {
      const m = p.match(/^==(?:([grbpy]):)?([\s\S]+)==$/)
      return <mark key={i} className={`mk ${HL[m?.[1] || 'y']}`}>{inline(m?.[2] ?? p)}</mark>
    }
    if (p.startsWith('++')) return <u key={i}>{inline(p.slice(2, -2))}</u>
    if (p.startsWith('[[')) return <kbd key={i}>{p.slice(2, -2)}</kbd>
    if (p.startsWith('*') && p.length > 2) return <i key={i}>{inline(p.slice(1, -1))}</i>
    return <Fragment key={i}>{p}</Fragment>
  })
}

// ---- подсветка кода (лёгкая, без библиотек): комментарии, строки, числа, ключевые слова, флаги ----
const KW = 'def|class|return|if|elif|else|for|while|import|from|as|in|not|and|or|True|False|None|const|let|var|function|async|await|export|git|cd|ls|npm|npx|pip|python3?|claude|mkdir|echo|curl|sudo|brew|cat|rm|mv|cp'
const TOK = new RegExp(`(#[^\\n]*|//[^\\n]*)|("(?:[^"\\\\\\n]|\\\\.)*"|'[^'\\n]*')|(\\b\\d+(?:\\.\\d+)?\\b)|(\\b(?:${KW})\\b)|((?<=\\s)--?[A-Za-z][\\w-]*)`, 'g')
function highlight(code, lang) {
  if (!lang || /^(text|math|txt|plain|md|markdown)$/i.test(lang)) return code
  const out = []; let last = 0, m
  TOK.lastIndex = 0
  while ((m = TOK.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index))
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'n' : m[4] ? 'k' : 'f'
    out.push(<span key={m.index} className={`tk-${cls}`}>{m[0]}</span>)
    last = m.index + m[0].length
  }
  out.push(code.slice(last))
  return out
}

function CodeBlock({ lang, code }) {
  const t = useT()
  const say = useToast((s) => s.say)
  const [ok, setOk] = useState(false)
  const copy = () => { navigator.clipboard?.writeText(code); setOk(true); say(t('toast.copied')); setTimeout(() => setOk(false), 1400) }
  return (
    <figure className="codeblock">
      <figcaption><span>{lang || 'code'}</span>
        <button className={`copy tap ${ok ? 'ok' : ''}`} onClick={copy} aria-label={t('copy')}>{ok ? <IOk /> : <ICopy />}</button>
      </figcaption>
      <pre><code>{highlight(code, lang)}</code></pre>
    </figure>
  )
}

// ---- врезки: > [!remember] текст ----
const ALIAS = { info: 'note', important: 'remember', caution: 'danger', error: 'danger', success: 'tip', hint: 'tip', question: 'note' }
const ICONS = {
  note: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  tip: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />,
  remember: <path d="M6 3h12v18l-6-4-6 4z" />,
  warning: <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></>,
  danger: <><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>,
  example: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h8M8 17h4" /></>,
}
function Callout({ lines }) {
  const t = useT()
  const m = lines[0].match(/^\[!(\w+)\]\s*(.*)/)
  let type = m ? m[1].toLowerCase() : 'quote'
  type = ALIAS[type] || type
  if (!ICONS[type] && type !== 'quote') type = 'note'
  const body = (m ? [m[2], ...lines.slice(1)] : lines).join('\n')
  return (
    <aside className={`callout c-${type}`}>
      {type !== 'quote' && <div className="co-h"><svg className="i" viewBox="0 0 24 24" aria-hidden="true">{ICONS[type]}</svg>{t(`co.${type}`)}</div>}
      <div className="co-b"><Md text={body} /></div>
    </aside>
  )
}

function Table({ head, rows }) {
  return (
    <div className="md-table"><table>
      <thead><tr>{head.map((c, i) => <th key={i}>{inline(c)}</th>)}</tr></thead>
      <tbody>{rows.map((r, ri) => <tr key={ri}>{head.map((_, ci) => <td key={ci}>{inline(r[ci] ?? '')}</td>)}</tr>)}</tbody>
    </table></div>
  )
}
const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())

export function Md({ text }) {
  const lines = String(text ?? '').replace(/\r/g, '').split('\n')
  const out = []
  let para = [], i = 0
  const flush = () => { if (para.length) { out.push(<p key={out.length}>{inline(para.join(' '))}</p>); para = [] } }
  while (i < lines.length) {
    const l = lines[i]
    let m = l.match(/^```([\w+-]*)\s*$/)
    if (m) {                                                  // блок кода
      flush(); const code = []; i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++])
      i++; out.push(<CodeBlock key={out.length} lang={m[1]} code={code.join('\n')} />); continue
    }
    if (!l.trim()) { flush(); i++; continue }
    if ((m = l.match(/^#{3,4}\s+(.*)/))) { flush(); out.push(<h4 key={out.length} className="md-h">{inline(m[1])}</h4>); i++; continue }
    if (/^-{3,}\s*$/.test(l)) { flush(); out.push(<hr key={out.length} />); i++; continue }
    if (/^>\s?/.test(l)) {                                    // врезка или цитата
      flush(); const q = []
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''))
      out.push(<Callout key={out.length} lines={q} />); continue
    }
    if (/^\|.*\|\s*$/.test(l) && /^\|?\s*:?-{2,}/.test(lines[i + 1] || '')) {   // таблица
      flush(); const head = cells(l); i += 2; const rows = []
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]))
      out.push(<Table key={out.length} head={head} rows={rows} />); continue
    }
    const ordered = /^\s*\d+\.\s+/.test(l), bullet = /^\s*-\s+/.test(l)
    if (ordered || bullet) {                                  // список (вложенные пункты показываем на одном уровне)
      flush(); const items = []; const re = ordered ? /^\s*\d+\.\s+(.*)/ : /^\s*-\s+(.*)/
      let mm
      while (i < lines.length && (mm = lines[i].match(re))) { items.push(mm[1]); i++ }
      const L = ordered ? 'ol' : 'ul'
      out.push(<L key={out.length}>{items.map((x, k) => {
        const task = x.match(/^\[( |x|X)\]\s+(.*)/)
        return task ? <li key={k} className={`task ${task[1] === ' ' ? '' : 'done'}`}>{inline(task[2])}</li> : <li key={k}>{inline(x)}</li>
      })}</L>)
      continue
    }
    para.push(l.trim()); i++
  }
  flush()
  return <>{out}</>
}
