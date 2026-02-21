import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { loginApi, registerApi, getMeApi, logoutApi, api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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
          setUser(response.data.user as User);
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

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      const response = await loginApi(email, password, role);

      if (response.success && response.data?.user) {
        setUser(response.data.user as User);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[AUTH] Login error:', error);
      return false;
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      const response = await registerApi(name, email, password, role);

      if (response.success && response.data?.user) {
        setUser(response.data.user as User);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[AUTH] Registration error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error('[AUTH] Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user, isLoading }}>
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
