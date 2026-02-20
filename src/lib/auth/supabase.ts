// Using stub for development - Supabase not configured
import { devLogger } from '@/lib/logger';

/**
 * Cliente Supabase para autenticação e database
 * MODO DESENVOLVIMENTO - Usando stub sem variáveis de ambiente
 */

// Verificar variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (process.env.NODE_ENV === 'production' && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required in production');
}

// Stub client for development
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signUp: async () => ({ user: null, session: null, error: new Error('Stub mode - Supabase not configured') }),
    signInWithPassword: async () => ({ user: null, session: null, error: new Error('Stub mode - Supabase not configured') }),
    signInWithOAuth: async () => ({ url: null, error: new Error('Stub mode - Supabase not configured') }),
    signOut: async () => ({ error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    resetPasswordForEmail: async () => ({ error: null }),
    updateUser: async () => ({ error: null }),
    exchangeCodeForSession: async () => ({ data: { user: null, session: null }, error: new Error('Stub mode') })
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: { code: 'PGRST116' } })
      })
    }),
    insert: () => ({
      select: () => ({
        single: async () => ({ data: null, error: new Error('Stub mode - Supabase not configured') })
      })
    }),
    update: () => ({
      eq: () => ({
        select: () => ({
          single: async () => ({ data: null, error: new Error('Stub mode - Supabase not configured') })
        })
      })
    })
  })
};

// Tipos de usuário
export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
  // Campos específicos do CYPHER ORDI FUTURE
  trading_experience?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  preferred_currency?: 'USD' | 'EUR' | 'BRL';
  notifications_enabled?: boolean;
  ai_features_enabled?: boolean;
  beta_tester?: boolean;
}

// Helper functions para autenticação
export const authHelpers = {
  /**
   * Registrar novo usuário
   */
  async signUp(email: string, password: string, metadata?: { username?: string }) {
    if (!supabaseUrl || !supabaseAnonKey) {
      devLogger.log('AUTH', 'Supabase not available - mock signup');
      return { 
        user: null, 
        session: null, 
        error: new Error('Authentication service not available in development mode') 
      };
    }
    
    try {
      devLogger.log('AUTH', 'Signing up new user (stub mode)', { email });
      return { user: null, session: null, error: new Error('Stub mode - Supabase not configured') };
    } catch (error) {
      devLogger.error(error as Error, 'Sign up failed');
      return { user: null, session: null, error: error as Error };
    }
  },

  /**
   * Login de usuário
   */
  async signIn(email: string, password: string) {
    if (!supabaseUrl || !supabaseAnonKey) {
      devLogger.log('AUTH', 'Supabase not available - mock signin');
      return { 
        user: null, 
        session: null, 
        error: new Error('Authentication service not available in development mode') 
      };
    }
    
    try {
      devLogger.log('AUTH', 'Signing in user (stub mode)', { email });
      return { user: null, session: null, error: new Error('Stub mode - Supabase not configured') };
    } catch (error) {
      devLogger.error(error as Error, 'Sign in failed');
      return { user: null, session: null, error: error as Error };
    }
  },

  /**
   * Login com OAuth (Google, GitHub, Discord, Telegram)
   */
  async signInWithOAuth(provider: 'google' | 'github' | 'discord') {
    if (!supabaseUrl || !supabaseAnonKey) {
      devLogger.log('AUTH', 'Supabase not available - mock OAuth');
      return { 
        url: null, 
        error: new Error('OAuth not available in development mode') 
      };
    }
    
    try {
      devLogger.log('AUTH', `Signing in with ${provider} (stub mode)`);
      return { url: null, error: new Error('Stub mode - Supabase not configured') };
    } catch (error) {
      devLogger.error(error as Error, `OAuth sign in failed: ${provider}`);
      return { url: null, error: error as Error };
    }
  },

  /**
   * Logout
   */
  async signOut() {
    if (!supabaseUrl || !supabaseAnonKey) {
      devLogger.log('AUTH', 'Supabase not available - mock signout');
      return { error: null };
    }
    
    try {
      devLogger.log('AUTH', 'Signing out user (stub mode)');
      return { error: null };
    } catch (error) {
      devLogger.error(error as Error, 'Sign out failed');
      return { error: error as Error };
    }
  },

  /**
   * Obter sessão atual
   */
  async getSession() {
    if (!supabaseUrl || !supabaseAnonKey) {
      devLogger.log('AUTH', 'Supabase not available - returning null session');
      return { session: null, error: null };
    }
    
    try {
      return { session: null, error: null };
    } catch (error) {
      devLogger.error(error as Error, 'Failed to get session');
      return { session: null, error: error as Error };
    }
  },

  /**
   * Obter usuário atual
   */
  async getCurrentUser() {
    if (!supabaseUrl || !supabaseAnonKey) {
      devLogger.log('AUTH', 'Supabase not available - returning null user');
      return { user: null, error: null };
    }
    
    try {
      return { user: null, error: null };
    } catch (error) {
      devLogger.error(error as Error, 'Failed to get current user');
      return { user: null, error: error as Error };
    }
  },

  /**
   * Atualizar perfil do usuário
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    try {
      devLogger.log('AUTH', 'Updating user profile (stub mode)', { userId });
      return { profile: null, error: new Error('Stub mode - Supabase not configured') };
    } catch (error) {
      devLogger.error(error as Error, 'Failed to update profile');
      return { profile: null, error: error as Error };
    }
  },

  /**
   * Resetar senha
   */
  async resetPassword(email: string) {
    if (!supabaseUrl || !supabaseAnonKey) {
      devLogger.log('AUTH', 'Supabase not available - mock password reset');
      return { error: null };
    }
    
    try {
      devLogger.log('AUTH', 'Requesting password reset (stub mode)', { email });
      return { error: null };
    } catch (error) {
      devLogger.error(error as Error, 'Password reset failed');
      return { error: error as Error };
    }
  },

  /**
   * Atualizar senha
   */
  async updatePassword(newPassword: string) {
    if (!supabaseUrl || !supabaseAnonKey) {
      devLogger.log('AUTH', 'Supabase not available - mock password update');
      return { error: null };
    }
    
    try {
      devLogger.log('AUTH', 'Updating password (stub mode)');
      return { error: null };
    } catch (error) {
      devLogger.error(error as Error, 'Password update failed');
      return { error: error as Error };
    }
  },
};