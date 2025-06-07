'use client'

import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container py-5">
          <div className="notification is-danger">
            <h2 className="title is-4">Something went wrong</h2>
            <p className="mb-4">
              We&apos;re sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <div className="buttons">
              <button
                className="button is-primary"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </button>
              <button
                className="button is-light"
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                Try Again
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="has-text-weight-semibold">Error Details (Development)</summary>
                <pre className="mt-2 has-background-light p-3">
                  {this.state.error?.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary