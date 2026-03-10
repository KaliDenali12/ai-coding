import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { ErrorScreen } from '@/components/ErrorScreen.tsx'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`Render error: ${error.message}`, info.componentStack)
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorScreen onRetry={this.handleRetry} />
    }
    return this.props.children
  }
}
