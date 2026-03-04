'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, authHelpers, UserProfile } from '@/lib/auth/supabase';
import { useRouter } from 'next/navigation';
import { devLogger } from '@/lib/logger';

/**
 * Contexto de Autenticação
 * Gerencia estado global de autenticação e perfil do usuário
 */

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: { username?: string }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: 'google' | 'github' | 'discord') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Carregar sessão inicial
  useEffect(() => {
    const loadSession = async () => {
      try {
        const { session: currentSession } = await authHelpers.getSession() as any;
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          await loadUserProfile(currentSession.user.id);
        }
      } catch (error) {
        devLogger.error(error as Error, 'Failed to load initial session');
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(async (event: any, session: any) => {
      devLogger.log('AUTH', 'Auth state changed', { event });
      
      if (session) {
        setSession(session);
        setUser(session.user);
        await loadUserProfile(session.user.id);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
      
      // Redirecionar baseado no evento
      switch (event) {
        case 'SIGNED_IN':
          router.push('/');
          break;
        case 'SIGNED_OUT':
          router.push('/auth/login');
          break;
        case 'PASSWORD_RECOVERY':
          router.push('/auth/reset-password');
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Carregar perfil do usuário
  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        // Se o perfil não existe, criar um novo
        if (error.code === 'PGRST116') {
          const newProfile = await createUserProfile(userId);
          setProfile(newProfile);
        } else {
          throw error;
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      devLogger.error(error as Error, 'Failed to load user profile');
    }
  };

  // Criar perfil inicial do usuário
  const createUserProfile = async (userId: string): Promise<UserProfile> => {
    const { user } = await authHelpers.getCurrentUser() as any;
    
    const newProfile: Partial<UserProfile> = {
      id: userId,
      email: user?.email || '',
      username: user?.user_metadata?.username || user?.email?.split('@')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      trading_experience: 'beginner',
      preferred_currency: 'USD',
      notifications_enabled: true,
      ai_features_enabled: true,
      beta_tester: false,
    };

    const { data, error } = await (supabase as any)
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();

    if (error) {
      devLogger.error(error, 'Failed to create user profile');
      throw error;
    }

    return data as UserProfile;
  };

  // Funções de autenticação
  const signUp = async (email: string, password: string, metadata?: { username?: string }) => {
    setLoading(true);
    const result = await authHelpers.signUp(email, password, metadata);
    setLoading(false);
    return { error: result.error };
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const result = await authHelpers.signIn(email, password);
    setLoading(false);
    return { error: result.error };
  };

  const signInWithOAuth = async (provider: 'google' | 'github' | 'discord') => {
    setLoading(true);
    const result = await authHelpers.signInWithOAuth(provider);
    setLoading(false);
    return { error: result.error };
  };

  const signOut = async () => {
    setLoading(true);
    await authHelpers.signOut();
    setLoading(false);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    const result = await authHelpers.updateProfile(user.id, updates);
    
    if (result.profile) {
      setProfile(result.profile);
    }
    
    return { error: result.error };
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook para usar o contexto de autenticação
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook para verificar se o usuário está autenticado
export function useIsAuthenticated() {
  const { user, loading } = useAuth();
  return { isAuthenticated: !!user, loading };
}

// Hook para proteger rotas
export function useRequireAuth(redirectUrl: string = '/auth/login') {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectUrl);
    }
  }, [user, loading, router, redirectUrl]);

  return { user, loading };
}