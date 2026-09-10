import { useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

import { useAuth } from '@/contexts/AuthContext';
import { Button, TextField, Title, Subtitle, useColors } from '@/components/ui-kit';
import { errorMessage } from '@/lib/api';
import { GOOGLE_CLIENT_ID } from '@/lib/config';

GoogleSignin.configure({
  webClientId: GOOGLE_CLIENT_ID,
});

export default function LoginScreen() {
  const { login, googleLogin, preferences } = useAuth();
  const c = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const home = () => router.replace(preferences && !preferences.onboarding_completed ? '/onboarding' : '/dashboard');

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) {
        setError('Google sign-in returned no token. Please try again.');
        return;
      }
      await googleLogin(idToken);
      home();
    } catch (err) {
      if (isErrorWithCode(err)) {
        if (err.code === statusCodes.SIGN_IN_CANCELLED || err.code === statusCodes.IN_PROGRESS) {
          return;
        }
      }
      setError(errorMessage(err, 'Google login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      home();
    } catch (err) {
      setError(errorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.wrap, { backgroundColor: c.bg }]}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={c.gradient}
            style={styles.logoWrap}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="book" size={34} color="#fff" />
          </LinearGradient>
          <Title style={styles.heading}>Welcome back</Title>
          <Subtitle style={styles.subheading}>Sign in to continue</Subtitle>

          <View style={[styles.form, { backgroundColor: c.card, borderColor: c.border }]}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: c.bad + '1a', borderColor: c.bad }]}>
                <Text style={{ color: c.bad, fontSize: 13 }}>{error}</Text>
              </View>
            ) : null}

            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder="Email (you@example.com)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextField
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              autoComplete="password"
            />

            <Button title={loading ? 'Signing in...' : 'Sign In'} onPress={handleSubmit} loading={loading} />

            <View style={styles.orDivider}>
              <View style={[styles.orLine, { backgroundColor: c.border }]} />
              <Text style={[styles.orText, { color: c.subtext }]}>or</Text>
              <View style={[styles.orLine, { backgroundColor: c.border }]} />
            </View>

            <Pressable
              onPress={handleGoogleSignIn}
              disabled={loading}
              style={({ pressed }) => [
                styles.googleBtn,
                pressed && styles.googlePressed,
                loading && styles.googleDisabled,
              ]}
            >
              <Ionicons name="logo-google" size={18} color="#4285F4" />
              <Text style={styles.googleText}>{loading ? 'Signing in...' : 'Continue with Google'}</Text>
            </Pressable>

            <Button
              title="Don't have an account? Sign up"
              onPress={() => router.push('/register')}
              variant="ghost"
              textStyle={styles.ghostText}
            />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  logoText: { fontSize: 34 },
  heading: { textAlign: 'center' },
  subheading: { textAlign: 'center', marginBottom: 28 },
  form: { borderRadius: 16, borderWidth: 1, padding: 20 },
  errorBox: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 14 },
  ghostText: { fontWeight: '500' },
  orDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 14 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { fontSize: 12, fontWeight: '500' },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3e6f0',
    backgroundColor: '#ffffff',
    paddingVertical: 13,
  },
  googlePressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  googleDisabled: { opacity: 0.5 },
  googleText: { fontSize: 15, fontWeight: '600', color: '#1f1f1f' },
});
