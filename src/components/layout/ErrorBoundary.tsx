import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
          <div className="rounded-xl border border-red-700 bg-red-900/20 p-8 text-center">
            <h2 className="mb-2 text-lg font-semibold text-red-400">Something went wrong</h2>
            <p className="text-sm text-gray-400">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 rounded-lg bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
