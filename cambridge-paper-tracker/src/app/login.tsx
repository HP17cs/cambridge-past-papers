import { useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/contexts/AuthContext';
import { Button, TextField, Title, Subtitle, useColors } from '@/components/ui-kit';
import { errorMessage } from '@/lib/api';

export default function LoginScreen() {
  const { login } = useAuth();
  const c = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/dashboard');
    } catch (err) {
      setError(errorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
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
        <Button
          title="Don't have an account? Sign up"
          onPress={() => router.push('/register')}
          variant="ghost"
          textStyle={styles.ghostText}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, justifyContent: 'center' },
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
});
