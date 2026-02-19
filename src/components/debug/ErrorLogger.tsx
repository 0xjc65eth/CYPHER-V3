'use client'

import { useEffect } from 'react'

export function ErrorLogger() {
  useEffect(() => {
    // Log all errors to console with details
    window.addEventListener('error', (event) => {
      console.error('🔴 ERROR CAPTURED:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        stack: event.error?.stack
      })
    })

    // Log unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('🔴 PROMISE REJECTION:', event.reason)
    })

    // Override console.error to capture React errors
    const originalError = console.error
    console.error = (...args) => {
      originalError.apply(console, args)
    }
  }, [])

  return null
}