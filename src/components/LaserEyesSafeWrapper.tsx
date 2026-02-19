'use client'

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class LaserEyesSafeWrapper extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a BigInt conversion error
    if (error.message.includes('BigInt') || error.message.includes('Math.pow')) {
      return { hasError: true, error }
    }
    
    // For other errors, let them bubble up
    throw error
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LaserEyes error boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-md">
          <h3 className="text-yellow-400 font-medium">Wallet Provider Issue</h3>
          <p className="text-yellow-300 text-sm mt-1">
            LaserEyes wallet provider encountered a BigInt conversion error. 
            Using fallback wallet connection.
          </p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-3 py-1 bg-yellow-500 text-black text-xs rounded hover:bg-yellow-400"
          >
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}