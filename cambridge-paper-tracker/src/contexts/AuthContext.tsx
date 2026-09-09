import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from '../lib/api';
import { clearSession, getToken, getUser as getStoredUser, setToken, setUser as persistUser } from '../lib/storage';
import type { AuthUser } from '../lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  googleLogin: (credential: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const savedUser = await getStoredUser();
      if (token && savedUser) {
        setUser(savedUser as unknown as AuthUser);
        api.setAuthToken(token);
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login(email, password);
    await setToken(data.token);
    await persistUser(data.user as unknown as Record<string, unknown>);
    api.setAuthToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await api.register(name, email, password);
    await setToken(data.token);
    await persistUser(data.user as unknown as Record<string, unknown>);
    api.setAuthToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const googleLogin = useCallback(async (credential: string) => {
    const data = await api.googleLogin(credential);
    await setToken(data.token);
    await persistUser(data.user as unknown as Record<string, unknown>);
    api.setAuthToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    api.setAuthToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback(
    (updates: Partial<AuthUser>) => {
      setUser((prev) => {
        const updated = { ...(prev as AuthUser), ...updates };
        setUser(updated);
        return updated;
      });
    },
    []
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
