import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import '../design/tokens.css'
import '../design/design.css'
import './app.css'

createRoot(document.getElementById('root')).render(<HashRouter><App /></HashRouter>)
