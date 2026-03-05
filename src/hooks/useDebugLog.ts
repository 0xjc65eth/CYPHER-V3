'use client';

import { useEffect } from 'react';

export function useDebugLog(_component: string, _data: any, _dependencies: any[] = []) {
  // No-op in production
}

export function logAPICall(_endpoint: string, _response: any, _error?: any) {
  // No-op in production
}

export function logPerformance(_operation: string, _startTime: number) {
  // No-op in production
}
