import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppShell } from './app/AppShell'
import './i18n'
import './styles/tokens.css'
import './styles/global.css'
import 'katex/dist/katex.min.css'
import { checkStorageVersion } from './utils/storage'

checkStorageVersion()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>,
)
