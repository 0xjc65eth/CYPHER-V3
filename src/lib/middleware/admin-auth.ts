/**
 * Admin Authentication for Next.js App Router API routes.
 *
 * Validates a JWT signed with ADMIN_JWT_SECRET.
 * Usage in a route handler:
 *
 *   const auth = validateAdminAuth(request);
 *   if (!auth.ok) return auth.response;
 *   // auth.admin contains { adminId, username, role }
 */

import { NextRequest, NextResponse } from 'next/server';

interface AdminPayload {
  adminId: string;
  username: string;
  role: string;
}

type AuthResult =
  | { ok: true; admin: AdminPayload }
  | { ok: false; response: NextResponse };

export function validateAdminAuth(request: NextRequest): AuthResult {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Admin authentication required' },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.substring(7);
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    console.error('[admin-auth] ADMIN_JWT_SECRET is not configured');
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Authentication system misconfigured' },
        { status: 500 }
      ),
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, secret) as Record<string, unknown>;

    if (!decoded.adminId) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, error: 'Invalid admin token' },
          { status: 401 }
        ),
      };
    }

    return {
      ok: true,
      admin: {
        adminId: decoded.adminId as string,
        username: (decoded.username as string) || 'admin',
        role: (decoded.role as string) || 'admin',
      },
    };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Invalid or expired admin token' },
        { status: 401 }
      ),
    };
  }
}
