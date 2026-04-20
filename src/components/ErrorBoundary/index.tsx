import { Component, ReactNode } from 'react'
import styles from './ErrorBoundary.module.css'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 生产环境可以上报到日志服务
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className={styles.container}>
          <div className={styles.icon}>⚠️</div>
          <h2 className={styles.title}>出错了</h2>
          <p className={styles.message}>{this.state.error?.message || '未知错误'}</p>
          <div className={styles.actions}>
            <button className={styles.retryBtn} onClick={this.handleReset}>重试</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
