import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useColors, Card, Title, Subtitle, SectionTitle, TextField, Button, Label } from '@/components/ui-kit';
import MainTabs from '@/components/main-tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, THEMES } from '@/contexts/ThemeContext';
import { updateMe, deleteMe, errorMessage } from '@/lib/api';

export default function SettingsScreen() {
  const { user, preferences, updateUser, logout } = useAuth();
  const { theme, themes, setTheme, mode, toggleMode } = useTheme();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async () => {
    setMessage('');
    setError('');
    setLoading(true);
    try {
      await updateMe({
        name: name || undefined,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      if (name !== user?.name) updateUser({ name });
      setMessage('Profile updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(errorMessage(err, 'Update failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete account', 'Are you sure you want to delete your account? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMe();
            await logout();
            router.replace('/login');
          } catch (err) {
            setError('Failed to delete account');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Title>Settings</Title>
        <Subtitle>Manage your account</Subtitle>

        <SectionTitle>Subject Preferences</SectionTitle>
        <Card>
          <Text style={[styles.rowLabel, { color: c.text }]}>Your subjects</Text>
          <Text style={{ color: c.subtext, fontSize: 12, marginBottom: 12 }}>
            {(preferences?.subject_ids?.length || 0)} subject{(preferences?.subject_ids?.length || 0) === 1 ? '' : 's'} selected ·{' '}
            {preferences?.show_only_selected_subjects ? 'only showing your subjects' : 'showing all subjects'}
          </Text>
          <Button title="Edit Preferences" onPress={() => router.push('/onboarding')} />
        </Card>

        <SectionTitle>Appearance</SectionTitle>
        <Card>
          <Text style={[styles.rowLabel, { color: c.text }]}>Theme</Text>
          <View style={styles.swatchRow}>
            {themes.map((t) => (
              <Pressable key={t.id} onPress={() => setTheme(t.id)} style={styles.swatchWrap}>
                <LinearGradient colors={t.gradient} style={[styles.swatch, theme === t.id && styles.swatchActive]} />
                <Text style={[styles.swatchName, { color: theme === t.id ? c.accent : c.subtext }]}>{t.name}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.themeModeRow}>
            <View style={styles.flex1}>
              <Text style={[styles.rowLabel, { color: c.text }]}>Dark Mode</Text>
              <Text style={{ color: c.subtext, fontSize: 12 }}>Use the dark color scheme</Text>
            </View>
            <Pressable onPress={toggleMode} style={[styles.toggle, { backgroundColor: mode === 'dark' ? c.accent : c.border }]}>
              <View style={[styles.toggleKnob, { alignSelf: mode === 'dark' ? 'flex-end' : 'flex-start' }]} />
            </Pressable>
          </View>
        </Card>

        <SectionTitle>Profile</SectionTitle>
        <Card>
          {message ? (
            <View style={[styles.msgBox, { backgroundColor: c.good + '1a', borderColor: c.good }]}>
              <Text style={{ color: c.good, fontSize: 13 }}>{message}</Text>
            </View>
          ) : null}
          {error ? (
            <View style={[styles.msgBox, { backgroundColor: c.bad + '1a', borderColor: c.bad }]}>
              <Text style={{ color: c.bad, fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}

          <Label>Name</Label>
          <TextField value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" />
          <Label>Email</Label>
          <TextField value={user?.email || ''} editable={false} placeholder="Email" autoCapitalize="none" />
          <Label>Current Password</Label>
          <TextField value={currentPassword} onChangeText={setCurrentPassword} placeholder="Required to change password" secureTextEntry autoComplete="password" />
          <Label>New Password</Label>
          <TextField value={newPassword} onChangeText={setNewPassword} placeholder="Leave blank to keep current" secureTextEntry autoComplete="password-new" />
          <Button title={loading ? 'Saving...' : 'Save Changes'} onPress={handleUpdateProfile} loading={loading} />
        </Card>

        <SectionTitle>Account</SectionTitle>
        <Card>
          <Button title="Log out" onPress={() => { logout(); router.replace('/login'); }} variant="outline" style={styles.logout} />
        </Card>

        <Card style={{ borderColor: c.bad }}>
          <Text style={[styles.dangerTitle, { color: c.bad }]}>Danger Zone</Text>
          <Text style={{ color: c.subtext, fontSize: 13, marginBottom: 12 }}>Once you delete your account, there is no going back.</Text>
          <Button title="Delete Account" onPress={handleDeleteAccount} variant="danger" />
        </Card>
      </ScrollView>
      <MainTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  rowLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  swatchRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  swatchWrap: { alignItems: 'center' },
  swatch: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: '#fff' },
  swatchName: { fontSize: 11, marginTop: 6 },
  themeModeRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'transparent', paddingTop: 12 },
  toggle: { width: 52, height: 30, borderRadius: 999, padding: 3, justifyContent: 'center' },
  toggleKnob: { width: 24, height: 24, borderRadius: 999, backgroundColor: '#fff' },
  msgBox: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 14 },
  flex1: { flex: 1 },
  logout: { marginBottom: 8 },
  dangerTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
});
