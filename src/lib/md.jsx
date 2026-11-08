import { Fragment } from 'react'

export function inline(text) {
  return String(text ?? '').split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).map((p, i) => {
    if (p.startsWith('**')) return <b key={i}>{p.slice(2, -2)}</b>
    if (p.startsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>
    if (p.startsWith('*') && p.length > 2) return <i key={i}>{p.slice(1, -1)}</i>
    return <Fragment key={i}>{p}</Fragment>
  })
}

// Мини-Markdown: абзацы, списки (1. и -), **жирный**, `код`
export function Md({ text }) {
  return String(text ?? '').split(/\n\n+/).map((block, bi) => {
    const out = []; let list = null, para = []
    const fp = () => { if (para.length) { out.push(<p key={out.length}>{inline(para.join(' '))}</p>); para = [] } }
    const fl = () => { if (list) { const L = list.tag; out.push(<L key={out.length}>{list.items.map((x, i) => <li key={i}>{inline(x)}</li>)}</L>); list = null } }
    for (const l of block.split('\n')) {
      const o = l.match(/^\d+\.\s+(.*)/), u = l.match(/^-\s+(.*)/)
      if (o || u) { fp(); const tag = o ? 'ol' : 'ul'; if (!list || list.tag !== tag) { fl(); list = { tag, items: [] } } list.items.push((o || u)[1]) }
      else { fl(); para.push(l) }
    }
    fp(); fl()
    return <Fragment key={bi}>{out}</Fragment>
  })
}
