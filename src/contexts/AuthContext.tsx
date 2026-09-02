import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import apiClient from '../api/client';

export interface UserSession {
  id: number;
  email: string;
  name: string;
  is_staff: boolean;
  church?: {
    id: number;
    name: string;
    code: string;
    status: string;
  };
}

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
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

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);