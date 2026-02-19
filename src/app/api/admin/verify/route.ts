import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    if (!adminPasswordHash) {
      console.error('ADMIN_PASSWORD_HASH environment variable is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Hash the provided password and compare using timing-safe comparison
    const inputHash = createHash('sha256').update(password).digest('hex');

    const inputBuffer = Buffer.from(inputHash, 'hex');
    const storedBuffer = Buffer.from(adminPasswordHash, 'hex');

    if (inputBuffer.length !== storedBuffer.length) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = timingSafeEqual(inputBuffer, storedBuffer);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
