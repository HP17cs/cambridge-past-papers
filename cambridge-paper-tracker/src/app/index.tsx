import { Redirect } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { user, preferences, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/login" />;
  if (preferences && !preferences.onboarding_completed) return <Redirect href="/onboarding" />;
  return <Redirect href="/dashboard" />;
}
