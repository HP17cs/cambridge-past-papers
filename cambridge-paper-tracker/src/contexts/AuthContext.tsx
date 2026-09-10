import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from '../lib/api';
import { clearSession, getToken, getUser as getStoredUser, setToken, setUser as persistUser } from '../lib/storage';
import type { AuthResponse, AuthUser, UserPreferences } from '../lib/types';

const DEFAULT_PREFERENCES: UserPreferences = {
  onboarding_completed: false,
  show_only_selected_subjects: false,
  preferences_updated_at: null,
  subject_ids: [],
  subjects: [],
};

interface AuthContextValue {
  user: AuthUser | null;
  preferences: UserPreferences | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  googleLogin: (credential: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => void;
  refreshPreferences: () => Promise<UserPreferences>;
  savePreferences: (payload: { subject_ids?: number[]; show_only_selected_subjects?: boolean; onboarding_completed?: boolean }) => Promise<UserPreferences>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applyOnboarding(user: AuthUser): AuthUser {
  return {
    ...user,
    onboarding_completed: !!user.onboarding_completed,
    show_only_selected_subjects: !!user.show_only_selected_subjects,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const savedUser = await getStoredUser();
      if (token && savedUser) {
        const parsed = applyOnboarding(savedUser as unknown as AuthUser);
        setUser(parsed);
        setPreferences({
          ...DEFAULT_PREFERENCES,
          onboarding_completed: !!parsed.onboarding_completed,
          show_only_selected_subjects: !!parsed.show_only_selected_subjects,
        });
      }
      if (token) {
        try {
          const prefs = await api.getPreferences();
          setPreferences(prefs);
          setUser((prev) => {
            if (!prev) return prev;
            const updated = {
              ...prev,
              onboarding_completed: prefs.onboarding_completed,
              show_only_selected_subjects: prefs.show_only_selected_subjects,
            };
            persistUser(updated as unknown as Record<string, unknown>);
            return updated;
          });
        } catch {
          // Fall back to the cached onboarding fields already set above.
        }
      }
      setLoading(false);
    })();
  }, []);

  const persistAuth = useCallback(async (data: AuthResponse) => {
    await setToken(data.token);
    await persistUser(data.user as unknown as Record<string, unknown>);
    api.setAuthToken(data.token);
    setUser(applyOnboarding(data.user));
    setPreferences({
      ...DEFAULT_PREFERENCES,
      onboarding_completed: !!data.user.onboarding_completed,
      show_only_selected_subjects: !!data.user.show_only_selected_subjects,
    });
    return applyOnboarding(data.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login(email, password);
    return persistAuth(data);
  }, [persistAuth]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await api.register(name, email, password);
    return persistAuth(data);
  }, [persistAuth]);

  const googleLogin = useCallback(async (credential: string) => {
    const data = await api.googleLogin(credential);
    return persistAuth(data);
  }, [persistAuth]);

  const logout = useCallback(async () => {
    await clearSession();
    api.setAuthToken(null);
    setUser(null);
    setPreferences(null);
  }, []);

  const updateUser = useCallback(
    (updates: Partial<AuthUser>) => {
      setUser((prev) => {
        const updated = { ...(prev as AuthUser), ...updates };
        persistUser(updated as unknown as Record<string, unknown>);
        return updated;
      });
    },
    []
  );

  const refreshPreferences = useCallback(async () => {
    const prefs = await api.getPreferences();
    setPreferences(prefs);
    setUser((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        onboarding_completed: prefs.onboarding_completed,
        show_only_selected_subjects: prefs.show_only_selected_subjects,
      };
      persistUser(updated as unknown as Record<string, unknown>);
      return updated;
    });
    return prefs;
  }, []);

  const savePreferences = useCallback(async (payload: { subject_ids?: number[]; show_only_selected_subjects?: boolean; onboarding_completed?: boolean }) => {
    const prefs = await api.savePreferences(payload);
    setPreferences(prefs);
    setUser((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        onboarding_completed: prefs.onboarding_completed,
        show_only_selected_subjects: prefs.show_only_selected_subjects,
      };
      persistUser(updated as unknown as Record<string, unknown>);
      return updated;
    });
    return prefs;
  }, []);

  return (
    <AuthContext.Provider value={{ user, preferences, loading, login, register, googleLogin, logout, updateUser, refreshPreferences, savePreferences }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
