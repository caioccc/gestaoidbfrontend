import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import apiClient from '../api/client';
import { accountsApi } from '../api/accounts';

export interface UserSessionChurch {
  id: number;
  name: string;
  code?: string | null;
  status: string;
  church_type?: 'INDEPENDENT' | 'CONGREGATION' | string;
  parent_church?: number | null;
  is_approved?: boolean;
  accounting_category?: string | null;
}

export interface UserSession {
  id: number;
  email: string;
  name: string;
  is_staff: boolean;
  is_active: boolean;
  church?: UserSessionChurch | null;
  role?: 'PASTOR' | 'SECRETARIA' | 'TESOUREIRO' | null;
  role_display?: string | null;
}

const STAFF_ROLES = ['PASTOR', 'ADMIN'] as const;
const FINANCE_ROLES = ['TESOUREIRO', 'PASTOR', 'ADMIN'] as const;
const SECRETARY_ROLES = ['SECRETARIA', 'PASTOR', 'ADMIN'] as const;

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchChurch: (churchId: number) => Promise<UserSession>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get('idb_auth_token');
    const storedUser = Cookies.get('idb_user_data');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        Cookies.remove('idb_auth_token');
        Cookies.remove('idb_user_data');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/api/accounts/login/', { email, password });
    const { access, user: userData } = response.data;

    // Cookie persistido por 7 dias
    Cookies.set('idb_auth_token', access, { expires: 7, sameSite: 'lax' });
    Cookies.set('idb_user_data', JSON.stringify(userData), { expires: 7, sameSite: 'lax' });

    setUser(userData);
    router.push(userData.is_staff ? '/admin/churches' : '/dashboard');
  };

  const logout = () => {
    Cookies.remove('idb_auth_token');
    Cookies.remove('idb_user_data');
    setUser(null);
    router.push('/login');
  };

  const switchChurch = async (churchId: number) => {
    const { user: updated } = await accountsApi.switchChurch(churchId);
    Cookies.set('idb_user_data', JSON.stringify(updated), { expires: 7, sameSite: 'lax' });
    setUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout, switchChurch }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export function useRoleHelpers(user: UserSession | null) {
  const isAdmin = !!user?.is_staff;
  const role = user?.role ?? (isAdmin ? 'ADMIN' : null);
  const hasRole = (...roles: string[]) =>
    isAdmin || (role !== null && (roles as string[]).includes(role));
  const canFinance = hasRole(...FINANCE_ROLES);
  const canSecretary = hasRole(...SECRETARY_ROLES);
  const canManageChurch = hasRole(...STAFF_ROLES) || user?.church?.church_type === 'INDEPENDENT';
  return { isAdmin, role, hasRole, canFinance, canSecretary, canManageChurch };
}