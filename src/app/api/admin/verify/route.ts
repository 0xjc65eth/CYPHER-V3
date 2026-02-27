import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { strictRateLimit } from '@/lib/middleware/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 attempts per 15 minutes (Redis-backed with in-memory fallback)
    const rateLimitResponse = await strictRateLimit(request, 5, 900);
    if (rateLimitResponse) return rateLimitResponse;

    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    if (!adminPasswordHash) {
      console.error('[AUTH] Required admin configuration is missing');
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    // Compare password using bcrypt
    const isValid = await bcrypt.compare(password, adminPasswordHash);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Issue a signed JWT so subsequent admin API calls are authenticated server-side
    const jwtSecret = process.env.ADMIN_JWT_SECRET;
    if (!jwtSecret) {
      console.error('[AUTH] ADMIN_JWT_SECRET is not configured');
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { adminId: 'admin', username: 'admin', role: 'admin' },
      jwtSecret,
      { expiresIn: '4h' }
    );

    return NextResponse.json({ success: true, token });
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
