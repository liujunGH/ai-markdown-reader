import { ThemeProvider } from './context/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'

function App() {
  return (
    <ThemeProvider>
      <div className="app">
        <header style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <ThemeToggle />
        </header>
        <main>Markdown Reader</main>
      </div>
    </ThemeProvider>
  )
}

export default App
