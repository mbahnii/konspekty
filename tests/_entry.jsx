// Вхідна точка для тестів: збирається vite (ssr) в один файл, щоб Node міг виконати jsx з src/
import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { inline as _inline, Md as _Md } from '../src/lib/richtext.jsx'
import { translate } from '../src/i18n/index.js'
export { translate }
export const htmlInline = (text) => renderToStaticMarkup(createElement(Fragment, null, _inline(text)))
export const htmlMd = (text) => renderToStaticMarkup(createElement(_Md, { text }))
export { shareDefault } from '../src/lib/share.js'
export { useSettings } from '../src/store/settings.js'
export { accountInfo } from '../src/lib/account.js'
