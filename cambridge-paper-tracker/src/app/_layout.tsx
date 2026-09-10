import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProgressProvider } from '@/contexts/ProgressContext';

function RootNavigator() {
  const { user, preferences, loading } = useAuth();
  const { isDark } = useTheme();

  if (loading) {
    return null;
  }

  const authed = !!user;
  const needsOnboarding = authed && !!preferences && !preferences.onboarding_completed;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={authed && !needsOnboarding}>
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="subjects" />
          <Stack.Screen name="papers" />
          <Stack.Screen name="progress" />
          <Stack.Screen name="ignored" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="subject/[id]" />
          <Stack.Screen name="paper/[id]" />
        </Stack.Protected>
        <Stack.Protected guard={authed}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!authed}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </Stack.Protected>
        <Stack.Screen name="index" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ProgressProvider>
            <RootNavigator />
          </ProgressProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
