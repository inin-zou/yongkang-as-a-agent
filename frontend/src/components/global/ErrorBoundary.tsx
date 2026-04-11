import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--color-void)',
          color: 'var(--color-ink)',
          fontFamily: 'var(--font-sans)',
          padding: '24px',
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: '16px',
          }}>
            Something went wrong
          </h1>
          <pre style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: 'var(--color-ink-muted)',
            maxWidth: '600px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              padding: '8px 20px',
              border: '1px solid var(--color-ink-muted)',
              borderRadius: '4px',
              background: 'transparent',
              color: 'var(--color-ink)',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
