import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthUser, UserRole } from '@/types';
import { loginApi, registerApi, getMeApi, logoutApi, api } from '@/lib/api';
import { useInactivityLogout } from '@/hooks/use-inactivity-logout';

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string, instituteCode?: string) => Promise<boolean>;
  register: (data: { name: string; email: string; password: string; role: string; institute_name?: string; institute_code?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  institute: AuthUser['institute'] | null;
  hasModule: (module: string) => boolean;
  isRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeAuthUser(raw: AuthUser): AuthUser {
  if (!raw) return raw;
  if (raw.institute) return raw;

  const source = raw as AuthUser & {
    institute_name?: string;
    institute_code?: string;
    modules_enabled?: Record<string, boolean>;
    ai_insight_enabled?: boolean;
    subscription_plan?: string;
    max_students?: number;
  };

  if (!raw.institute_id) return raw;

  return {
    ...raw,
    institute: {
      id: raw.institute_id,
      name: source.institute_name || '',
      code: source.institute_code || '',
      modules_enabled: source.modules_enabled || {},
      ai_insight_enabled: source.ai_insight_enabled ?? true,
      subscription_plan: source.subscription_plan,
      max_students: source.max_students,
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = localStorage.getItem('eduyantra_token');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await getMeApi();
        if (response.success && response.data?.user) {
          setUser(normalizeAuthUser(response.data.user as AuthUser));
        } else {
          api.clearToken();
        }
      } catch (error) {
        console.error('[AUTH] Failed to restore session:', error);
        api.clearToken();
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string, instituteCode?: string): Promise<boolean> => {
    try {
      const response = await loginApi(email, password, instituteCode);

      if (response.success && response.data?.user) {
        setUser(normalizeAuthUser(response.data.user as AuthUser));
        return true;
      }

      return false;
    } catch (error) {
      console.error('[AUTH] Login error:', error);
      return false;
    }
  };

  const register = async (data: { name: string; email: string; password: string; role: string; institute_name?: string; institute_code?: string }): Promise<boolean> => {
    try {
      const response = await registerApi(data);

      if (response.success && response.data?.user) {
        setUser(normalizeAuthUser(response.data.user as AuthUser));
        return true;
      }

      return false;
    } catch (error) {
      console.error('[AUTH] Registration error:', error);
      return false;
    }
  };

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error('[AUTH] Logout error:', error);
    } finally {
      setUser(null);
    }
  }, []);

  // Auto-logout after 30 minutes of inactivity
  useInactivityLogout(logout, !!user);

  const institute = user?.institute || null;

  const hasModule = (module: string): boolean => {
    if (!institute?.modules_enabled) return true; // default allow if no config
    return institute.modules_enabled[module] !== false;
  };

  const isRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user, login, register, logout,
      isAuthenticated: !!user, isLoading,
      institute, hasModule, isRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
