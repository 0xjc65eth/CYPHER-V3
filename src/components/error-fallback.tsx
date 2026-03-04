'use client'

import React from 'react';
import Link from 'next/link';
import { Card, Title, Text } from '@tremor/react';

interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-[#181A20] flex items-center justify-center p-4">
      <Card className="bg-gradient-to-br from-[#1D2D3D] to-[#2D3D4D] border-none shadow-xl p-6 max-w-2xl w-full">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mb-4 border border-rose-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <Title className="text-white text-2xl mb-2">Oops! Something went wrong</Title>
          <Text className="text-gray-400 mb-4">
            We're experiencing some technical difficulties. Our team has been notified and is working to fix the issue.
          </Text>
          {error && (
            <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50 mb-4 w-full overflow-auto">
              <Text className="text-rose-300 text-sm font-mono">
                Error: {error.message || 'Unknown error'}
              </Text>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Text className="text-white font-medium mb-2">Try these steps:</Text>
            <ul className="list-disc pl-5 space-y-1 text-gray-300">
              <li>Refresh the page</li>
              <li>Clear your browser cache</li>
              <li>Check your internet connection</li>
              <li>Try again in a few minutes</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Link 
              href="/"
              className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-all text-center"
            >
              Go to Homepage
            </Link>
            {resetErrorBoundary && (
              <button
                onClick={resetErrorBoundary}
                className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition-all"
              >
                Try Again
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-700/50">
          <Text className="text-xs text-gray-400">
            If the problem persists, please contact our support team at support@example.com
          </Text>
          <Text className="text-xs text-gray-500 mt-1">
            Error ID: ERR-{Date.now().toString(36).toUpperCase()}
          </Text>
        </div>
      </Card>
    </div>
  );
}
