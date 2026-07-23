import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './i18n'
import './styles/tokens.css'
import './styles/global.css'
import 'katex/dist/katex.min.css'
import { checkStorageVersion } from './utils/storage'

checkStorageVersion()

// v2 架构入口（环境变量切换）：AI_MARKDOWN_V2=1 时用新 AppShell + 渲染层。
// 默认仍走旧 App，保证现有功能与 e2e 不受影响。
const useV2 = import.meta.env.VITE_V2 === '1' || localStorage.getItem('v2-enabled') === '1'

async function render() {
  const root = ReactDOM.createRoot(document.getElementById('root')!)
  if (useV2) {
    const { AppShell } = await import('./app/AppShell')
    root.render(
      <React.StrictMode>
        <AppShell />
      </React.StrictMode>
    )
  } else {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  }
}

void render()
