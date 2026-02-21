/**
 * Admin Authentication Middleware
 * Enhanced security for administrative endpoints
 * NOW WITH PERSISTENT SESSIONS (Redis + Supabase fallback)
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { EnhancedLogger } from '@/lib/enhanced-logger';
import { dbService } from '@/lib/database';
import { redis, CACHE_CONFIG } from '@/lib/cache/redis.config';

interface AdminUser {
  id: string;
  username: string;
  role: 'admin' | 'super_admin' | 'system';
  permissions: string[];
  lastLogin: number;
  sessionId: string;
}

interface AuthenticatedRequest extends Request {
  admin?: AdminUser;
}

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// Session Management (Redis primary, DB fallback)
// ============================================================================

async function cacheSession(sessionId: string, data: any): Promise<void> {
  try {
    await redis.setex(
      `${CACHE_CONFIG.KEYS.ADMIN_SESSION}:${sessionId}`,
      CACHE_CONFIG.TTL.ADMIN_SESSION,
      JSON.stringify(data)
    );
  } catch {
    // Redis unavailable, DB is the source of truth
  }
}

async function getCachedSession(sessionId: string): Promise<any | null> {
  try {
    const cached = await redis.get(`${CACHE_CONFIG.KEYS.ADMIN_SESSION}:${sessionId}`);
    if (cached) {
      return typeof cached === 'string' ? JSON.parse(cached) : cached;
    }
  } catch {
    // Redis unavailable, fall through to DB
  }
  return null;
}

async function removeCachedSession(sessionId: string): Promise<void> {
  try {
    await redis.del(`${CACHE_CONFIG.KEYS.ADMIN_SESSION}:${sessionId}`);
  } catch {
    // Best-effort cleanup
  }
}

// ============================================================================
// Admin User Retrieval
// ============================================================================

async function getAdminUser(adminId: string): Promise<AdminUser | null> {
  const admin = await dbService.getAdminById(adminId);
  if (!admin) return null;

  return {
    id: admin.id,
    username: admin.username,
    role: admin.role,
    permissions: admin.permissions || [],
    lastLogin: admin.last_login ? new Date(admin.last_login).getTime() : Date.now(),
    sessionId: '',
  };
}

// ============================================================================
// Admin Authentication Middleware
// ============================================================================

export const adminAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Admin authentication required',
        code: 'ADMIN_AUTH_REQUIRED'
      });
    }

    // Verify JWT token
    const decoded = await verifyAdminToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin token',
        code: 'INVALID_ADMIN_TOKEN'
      });
    }

    // Get admin user from DB
    const admin = await getAdminUser(decoded.adminId);
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Admin user not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Verify session - check Redis cache first, then DB
    let session = await getCachedSession(decoded.sessionId);

    if (!session) {
      // Cache miss, check DB
      const dbSession = await dbService.getAdminSession(decoded.sessionId);
      if (dbSession) {
        session = {
          adminId: dbSession.admin_id,
          createdAt: new Date(dbSession.created_at!).getTime(),
          lastActivity: new Date(dbSession.last_activity!).getTime(),
          ipAddress: dbSession.ip_address,
          userAgent: dbSession.user_agent,
        };
        // Re-cache it
        await cacheSession(decoded.sessionId, session);
      }
    }

    if (!session || session.adminId !== admin.id) {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin session',
        code: 'INVALID_SESSION'
      });
    }

    // Check session expiry
    if (Date.now() - session.createdAt > SESSION_DURATION) {
      await removeCachedSession(decoded.sessionId);
      await dbService.deactivateSession(decoded.sessionId);
      return res.status(401).json({
        success: false,
        error: 'Admin session expired',
        code: 'SESSION_EXPIRED'
      });
    }

    // Update last activity (async, non-blocking)
    session.lastActivity = Date.now();
    cacheSession(decoded.sessionId, session).catch(() => {});
    dbService.updateSessionActivity(decoded.sessionId).catch(() => {});

    // Add admin to request
    admin.sessionId = decoded.sessionId;
    req.admin = admin;

    EnhancedLogger.info('Admin authenticated', {
      adminId: admin.id,
      username: admin.username,
      role: admin.role,
      endpoint: req.originalUrl,
      method: req.method,
      ip: req.ip
    });

    next();
  } catch (error) {
    EnhancedLogger.error('Admin authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication system error',
      code: 'AUTH_SYSTEM_ERROR'
    });
  }
};

// ============================================================================
// Permission-based Authorization
// ============================================================================

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const admin = req.admin;

      if (!admin) {
        return res.status(401).json({
          success: false,
          error: 'Admin authentication required',
          code: 'ADMIN_AUTH_REQUIRED'
        });
      }

      if (admin.role === 'super_admin' || admin.permissions.includes('*')) {
        return next();
      }

      const hasPermission = admin.permissions.some(perm => {
        if (perm === permission) return true;
        if (perm.endsWith('*')) {
          return permission.startsWith(perm.slice(0, -1));
        }
        return false;
      });

      if (!hasPermission) {
        EnhancedLogger.warn('Admin permission denied', {
          adminId: admin.id,
          requiredPermission: permission,
          adminPermissions: admin.permissions,
          endpoint: req.originalUrl
        });

        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: permission
        });
      }

      next();
    } catch (error) {
      EnhancedLogger.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization system error',
        code: 'AUTH_SYSTEM_ERROR'
      });
    }
  };
};

// ============================================================================
// Role-based Authorization
// ============================================================================

export const requireRole = (roles: string | string[]) => {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const admin = req.admin;

      if (!admin) {
        return res.status(401).json({
          success: false,
          error: 'Admin authentication required',
          code: 'ADMIN_AUTH_REQUIRED'
        });
      }

      if (!requiredRoles.includes(admin.role)) {
        EnhancedLogger.warn('Admin role access denied', {
          adminId: admin.id,
          adminRole: admin.role,
          requiredRoles,
          endpoint: req.originalUrl
        });

        return res.status(403).json({
          success: false,
          error: 'Insufficient role privileges',
          code: 'INSUFFICIENT_ROLE',
          required: requiredRoles,
          current: admin.role
        });
      }

      next();
    } catch (error) {
      EnhancedLogger.error('Role check error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization system error',
        code: 'AUTH_SYSTEM_ERROR'
      });
    }
  };
};

// ============================================================================
// Token Handling
// ============================================================================

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }
  return null;
}

async function verifyAdminToken(token: string): Promise<any> {
  try {
    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      console.error('CRITICAL: ADMIN_JWT_SECRET is not set!');
      return null;
    }
    const decoded = jwt.verify(token, secret) as any;
    if (!decoded.adminId || !decoded.sessionId || !decoded.role) {
      return null;
    }
    return decoded;
  } catch (error) {
    EnhancedLogger.error('Token verification failed:', error);
    return null;
  }
}

export const generateAdminToken = (admin: AdminUser, sessionId: string): string => {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error('ADMIN_JWT_SECRET environment variable is required');
  }
  return jwt.sign({
    adminId: admin.id,
    username: admin.username,
    role: admin.role,
    sessionId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  }, secret);
};

// ============================================================================
// Session Creation (NOW PERSISTED)
// ============================================================================

export const createAdminSession = async (adminId: string, ipAddress: string, userAgent: string): Promise<string> => {
  const sessionId = `session_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

  const sessionData = {
    adminId,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    ipAddress,
    userAgent
  };

  // Store in Redis for fast access
  await cacheSession(sessionId, sessionData);

  // Store in DB for persistence
  await dbService.createAdminSession({
    session_id: sessionId,
    admin_id: adminId,
    ip_address: ipAddress,
    user_agent: userAgent,
    is_active: true,
    expires_at: new Date(Date.now() + SESSION_DURATION).toISOString(),
  });

  return sessionId;
};

// ============================================================================
// Admin Login (NOW WITH DB-BACKED USERS)
// ============================================================================

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { username, password, mfaCode } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Get admin from database
    const adminRecord = await dbService.getAdminByUsername(username);
    if (!adminRecord) {
      EnhancedLogger.warn('Admin login failed - user not found', { username });
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password using timing-safe comparison
    const validPassword = await verifyAdminPassword(password, adminRecord.password_hash);
    if (!validPassword) {
      EnhancedLogger.warn('Admin login failed - invalid password', { username });
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify MFA if enabled
    if (adminRecord.mfa_enabled && mfaCode) {
      if (!await verifyMFA(adminRecord.mfa_secret, mfaCode)) {
        EnhancedLogger.warn('Admin login failed - invalid MFA', { username });
        return res.status(401).json({
          success: false,
          error: 'Invalid MFA code',
          code: 'INVALID_MFA'
        });
      }
    }

    const admin: AdminUser = {
      id: adminRecord.id,
      username: adminRecord.username,
      role: adminRecord.role,
      permissions: adminRecord.permissions || [],
      lastLogin: Date.now(),
      sessionId: '',
    };

    // Create persistent session
    const sessionId = await createAdminSession(
      admin.id,
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown'
    );

    // Generate token
    const token = generateAdminToken(admin, sessionId);

    EnhancedLogger.info('Admin login successful', {
      adminId: admin.id,
      username: admin.username,
      role: admin.role,
      sessionId
    });

    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          role: admin.role,
          permissions: admin.permissions
        },
        session: {
          id: sessionId,
          expiresAt: Date.now() + SESSION_DURATION
        }
      }
    });

  } catch (error) {
    EnhancedLogger.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login system error',
      code: 'LOGIN_SYSTEM_ERROR'
    });
  }
};

// ============================================================================
// Password Verification (bcrypt-compatible via pgcrypto)
// ============================================================================

async function verifyAdminPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;
  try {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(password, storedHash);
  } catch (error) {
    console.error('[AUTH] Password verification failed');
    return false;
  }
}

async function verifyMFA(secret: string, code: string): Promise<boolean> {
  if (!secret || !code) return false;
  try {
    const speakeasy = require('speakeasy');
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
  } catch (error) {
    console.error('[AUTH] MFA verification failed');
    return false;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  adminAuth,
  requirePermission,
  requireRole,
  adminLogin,
  generateAdminToken,
  createAdminSession
};
