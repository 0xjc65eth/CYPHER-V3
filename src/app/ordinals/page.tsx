'use client'

import OrdinalsPage from '@/components/ordinals/OrdinalsPage';
import { ErrorBoundary } from '@/components/error-boundaries/ErrorBoundary';

export default function Ordinals() {
  return (
    <ErrorBoundary level="page" name="Ordinals">
      <OrdinalsPage />
    </ErrorBoundary>
  );
}
