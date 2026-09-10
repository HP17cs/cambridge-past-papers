import { useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/contexts/AuthContext';
import { Button, TextField, Title, Subtitle, useColors } from '@/components/ui-kit';
import { errorMessage } from '@/lib/api';

export default function RegisterScreen() {
  const { register, preferences } = useAuth();
  const c = useColors();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      router.replace(preferences && !preferences.onboarding_completed ? '/onboarding' : '/dashboard');
    } catch (err) {
      setError(errorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.wrap, { backgroundColor: c.bg }]}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <LinearGradient colors={c.gradient} style={styles.logoWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="book" size={34} color="#fff" />
          </LinearGradient>
          <Title style={styles.heading}>Create account</Title>
          <Subtitle style={styles.subheading}>Start tracking your Cambridge past papers</Subtitle>

          <View style={[styles.form, { backgroundColor: c.card, borderColor: c.border }]}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: c.bad + '1a', borderColor: c.bad }]}>
                <Text style={{ color: c.bad, fontSize: 13 }}>{error}</Text>
              </View>
            ) : null}

            <TextField value={name} onChangeText={setName} placeholder="Full name" autoComplete="name" />
            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder="Email (you@example.com)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextField value={password} onChangeText={setPassword} placeholder="Password (min 6 characters)" secureTextEntry autoComplete="password-new" />
            <TextField value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm password" secureTextEntry autoComplete="password-new" />

            <Button title={loading ? 'Creating account...' : 'Create Account'} onPress={handleSubmit} loading={loading} />
            <Button title="Already have an account? Sign in" onPress={() => router.push('/login')} variant="ghost" textStyle={styles.ghostText} />
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
  logoWrap: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20 },
  logoText: { fontSize: 34 },
  heading: { textAlign: 'center' },
  subheading: { textAlign: 'center', marginBottom: 28 },
  form: { borderRadius: 16, borderWidth: 1, padding: 20 },
  errorBox: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 14 },
  ghostText: { fontWeight: '500' },
});
