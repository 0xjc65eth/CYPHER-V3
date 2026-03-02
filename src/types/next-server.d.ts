// Augment NextRequest with ip property (available in Vercel Edge Runtime)
import { NextRequest as OriginalNextRequest } from 'next/server';

declare module 'next/server' {
  interface NextRequest {
    ip?: string;
  }
}
