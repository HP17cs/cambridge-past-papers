import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

const DEFAULT_PREFERENCES = {
  onboarding_completed: false,
  show_only_selected_subjects: false,
  preferences_updated_at: null,
  subject_ids: [],
  subjects: [],
};

function userWithOnboarding(user) {
  if (!user) return user;
  return {
    ...user,
    onboarding_completed: !!user.onboarding_completed,
    show_only_selected_subjects: !!user.show_only_selected_subjects,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyPreferences = (prefs) => {
    setPreferences(prefs || { ...DEFAULT_PREFERENCES });
    setUser((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        onboarding_completed: !!(prefs && prefs.onboarding_completed),
        show_only_selected_subjects: !!(prefs && prefs.show_only_selected_subjects),
      };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        const parsed = userWithOnboarding(JSON.parse(savedUser));
        setUser(parsed);
        setPreferences({
          ...DEFAULT_PREFERENCES,
          onboarding_completed: !!parsed.onboarding_completed,
          show_only_selected_subjects: !!parsed.show_only_selected_subjects,
        });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    (async () => {
      if (token) {
        try {
          const { data } = await api.get('/preferences');
          applyPreferences(data);
        } catch {
          // Fall back to the cached user's onboarding fields already set above.
        }
      }
      setLoading(false);
    })();
  }, []);

  const refreshPreferences = async () => {
    const { data } = await api.get('/preferences');
    applyPreferences(data);
    return data;
  };

  const savePreferences = async (payload) => {
    const { data } = await api.put('/preferences', payload);
    applyPreferences(data);
    return data;
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const normalized = userWithOnboarding(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(normalized));
    setUser(normalized);
    setPreferences({
      ...DEFAULT_PREFERENCES,
      onboarding_completed: normalized.onboarding_completed,
      show_only_selected_subjects: normalized.show_only_selected_subjects,
    });
    refreshPreferences().catch(() => {});
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    const normalized = userWithOnboarding(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(normalized));
    setUser(normalized);
    setPreferences({
      ...DEFAULT_PREFERENCES,
      onboarding_completed: normalized.onboarding_completed,
      show_only_selected_subjects: normalized.show_only_selected_subjects,
    });
    return data;
  };

  const googleLogin = async (googleData) => {
    const { data } = await api.post('/auth/google', googleData);
    const normalized = userWithOnboarding(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(normalized));
    setUser(normalized);
    setPreferences({
      ...DEFAULT_PREFERENCES,
      onboarding_completed: normalized.onboarding_completed,
      show_only_selected_subjects: normalized.show_only_selected_subjects,
    });
    refreshPreferences().catch(() => {});
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setPreferences(null);
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  };

  const value = { user, preferences, loading, login, register, googleLogin, logout, updateUser, refreshPreferences, savePreferences };
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}