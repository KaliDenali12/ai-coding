import { Component, Fragment } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { ErrorScreen } from '@/components/ErrorScreen.tsx'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  recoveryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, recoveryCount: 0 }
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`Render error: ${error.message}`, info.componentStack)
  }

  private handleRetry = (): void => {
    this.setState(prev => ({ hasError: false, recoveryCount: prev.recoveryCount + 1 }))
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorScreen onRetry={this.handleRetry} />
    }
    return <Fragment key={this.state.recoveryCount}>{this.props.children}</Fragment>
  }
}
