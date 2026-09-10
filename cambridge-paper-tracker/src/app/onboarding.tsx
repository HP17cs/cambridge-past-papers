import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useColors, Title, Subtitle, TextField, Button, EmptyState } from '@/components/ui-kit';
import { useAuth } from '@/contexts/AuthContext';
import { getSubjects } from '@/lib/api';
import type { Subject } from '@/lib/types';

const WELCOME = 0;
const SUBJECTS = 1;
const DISPLAY = 2;

export default function OnboardingScreen() {
  const { preferences, savePreferences, updateUser } = useAuth();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const editing = !!preferences?.onboarding_completed;
  const [step, setStep] = useState(editing ? SUBJECTS : WELCOME);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filtered, setFiltered] = useState<Subject[]>([]);
  const [search, setSearch] = useState('');
  const [qualification, setQualification] = useState('');
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showPref, setShowPref] = useState<'only' | 'all'>('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadSubjects = useCallback(async () => {
    try {
      const data = await getSubjects();
      setSubjects(data);
      setFiltered(data);
      setQualifications([...new Set(data.map((s) => s.qualification_short_name).filter(Boolean))].sort() as string[]);
    } catch (err) {
      setError('Failed to load subjects. Please try again.');
    }
  }, []);

  useEffect(() => {
    loadSubjects();
    if (editing && preferences) {
      setSelected(new Set(preferences.subject_ids || []));
      setShowPref(preferences.show_only_selected_subjects ? 'only' : 'all');
    }
  }, [editing, loadSubjects, preferences]);

  useEffect(() => {
    let result = subjects;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          (s.qualification_short_name || '').toLowerCase().includes(q) ||
          (s.qualification_name || '').toLowerCase().includes(q)
      );
    }
    if (qualification) {
      result = result.filter((s) => s.qualification_short_name === qualification);
    }
    setFiltered(result);
  }, [search, qualification, subjects]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const finish = async () => {
    if (selected.size === 0) {
      setError('Select at least one subject to continue.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const prefs = await savePreferences({
        subject_ids: [...selected],
        show_only_selected_subjects: showPref === 'only',
        onboarding_completed: true,
      });
      updateUser({
        onboarding_completed: prefs.onboarding_completed,
        show_only_selected_subjects: prefs.show_only_selected_subjects,
      });
      router.replace(editing ? '/settings' : '/dashboard');
    } catch (err) {
      setError((err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error || 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = selected.size;

  return (
    <View style={[styles.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {step === WELCOME ? (
        <View style={styles.centerWrap}>
          <LinearGradient colors={c.gradient} style={styles.logoWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="book" size={36} color="#fff" />
          </LinearGradient>
          <Text style={[styles.welcomeTitle, { color: c.text }]}>Welcome to Cambridge Past Papers 👋</Text>
          <Text style={[styles.welcomeSub, { color: c.subtext }]}>
            Track your Cambridge past papers, mark them complete and stay on top
            of every subject — all in one place.
          </Text>
          <Text style={[styles.madeBy, { color: c.textMuted }]}>Made by HP17</Text>
          <Button title="Choose My Subjects" onPress={() => setStep(SUBJECTS)} style={styles.welcomeBtn} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Title>{editing ? 'Edit Your Subjects' : 'Choose My Subjects'}</Title>
          <Subtitle>Pick the subjects you're taking so we can put them front and centre.</Subtitle>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: c.bad + '1a', borderColor: c.bad }]}>
              <Text style={{ color: c.bad, fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}

          <TextField value={search} onChangeText={setSearch} placeholder="Search subjects..." style={styles.search} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={styles.chipsContent}>
            {['', ...qualifications].map((q) => (
              <Pressable
                key={q || 'all'}
                onPress={() => setQualification(q)}
                style={[styles.chip, { backgroundColor: q === qualification ? c.accentSoft : c.card, borderColor: c.border }]}
              >
                <Text style={{ color: q === qualification ? c.accent : c.subtext, fontSize: 13, fontWeight: '500' }}>{q || 'All'}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.list}>
            {filtered.map((subject) => {
              const on = selected.has(subject.id);
              return (
                <Pressable
                  key={subject.id}
                  onPress={() => toggle(subject.id)}
                  style={[
                    styles.subjectCard,
                    { backgroundColor: c.card, borderColor: on ? c.accent : c.border },
                    on && styles.subjectSelected,
                  ]}
                >
                  <View style={styles.subjectInfo}>
                    <Text style={[styles.subjectName, { color: c.text }]} numberOfLines={2}>{subject.name}</Text>
                    <Text style={[styles.subjectMeta, { color: c.subtext }]}>
                      {subject.code} &middot; {subject.qualification_short_name || subject.qualification_name}
                    </Text>
                  </View>
                  <View style={[styles.tick, { borderColor: on ? c.accent : c.border, backgroundColor: on ? c.accent : 'transparent' }]}>
                    {on ? <Text style={styles.tickMark}>✓</Text> : null}
                  </View>
                </Pressable>
              );
            })}
            {filtered.length === 0 && (
              <EmptyState icon="search" title="No subjects found" subtitle="No subjects matched your search or qualification filter." />
            )}
          </View>

          <View style={styles.footer}>
            <Text style={{ color: c.subtext, fontSize: 13 }}>
              {selectedCount > 0 ? `${selectedCount} subject${selectedCount > 1 ? 's' : ''} selected` : 'Select at least one subject'}
            </Text>
            <View style={styles.footerRight}>
              {editing ? (
                <Button title="Cancel" variant="ghost" onPress={() => router.back()} textStyle={{ color: c.subtext }} />
              ) : null}
              <Button title="Continue" onPress={() => setStep(DISPLAY)} disabled={selectedCount === 0} />
            </View>
          </View>
        </ScrollView>
      )}

      {step === DISPLAY && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Title>How should we show papers?</Title>
          <Subtitle>Choose how Past Papers should be displayed for you.</Subtitle>

          <Pressable
            onPress={() => setShowPref('only')}
            style={[styles.prefCard, { backgroundColor: c.card, borderColor: showPref === 'only' ? c.accent : c.border }]}
          >
            <Text style={[styles.prefTitle, { color: c.text }]}>Only my subjects</Text>
            <Text style={[styles.prefDesc, { color: c.subtext }]}>
              Past Papers will only show papers from the {selectedCount} subject{selectedCount > 1 ? 's' : ''} you chose.
            </Text>
            {showPref === 'only' && <Text style={[styles.prefSelected, { color: c.accent }]}>✓ Selected</Text>}
          </Pressable>

          <Pressable
            onPress={() => setShowPref('all')}
            style={[styles.prefCard, { backgroundColor: c.card, borderColor: showPref === 'all' ? c.accent : c.border }]}
          >
            <Text style={[styles.prefTitle, { color: c.text }]}>All subjects</Text>
            <Text style={[styles.prefDesc, { color: c.subtext }]}>
              See every past paper, with your {selectedCount} chosen subject{selectedCount > 1 ? 's' : ''} highlighted.
            </Text>
            {showPref === 'all' && <Text style={[styles.prefSelected, { color: c.accent }]}>✓ Selected</Text>}
          </Pressable>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: c.bad + '1a', borderColor: c.bad }]}>
              <Text style={{ color: c.bad, fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Button title="Back" variant="ghost" onPress={() => setStep(SUBJECTS)} textStyle={{ color: c.subtext }} />
            <Button title={saving ? 'Saving...' : editing ? 'Save Preferences' : 'Finish'} onPress={finish} loading={saving} disabled={selectedCount === 0} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoWrap: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  welcomeTitle: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  welcomeSub: { fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  madeBy: { fontSize: 12, marginTop: 16 },
  welcomeBtn: { marginTop: 28, alignSelf: 'stretch' },
  content: { padding: 16, paddingBottom: 40 },
  search: { marginTop: 16 },
  chips: { flexDirection: 'row', marginTop: 12, marginBottom: 16 },
  chipsContent: { paddingRight: 16 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, marginRight: 8 },
  list: { gap: 12, marginTop: 4 },
  subjectCard: { borderRadius: 16, borderWidth: 2, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjectSelected: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  subjectInfo: { flex: 1 },
  subjectName: { fontSize: 15, fontWeight: '600' },
  subjectMeta: { fontSize: 12, marginTop: 3 },
  tick: { width: 26, height: 26, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tickMark: { color: '#fff', fontSize: 15, fontWeight: '800' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, gap: 12 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefCard: { borderRadius: 16, borderWidth: 2, padding: 18, marginTop: 16 },
  prefTitle: { fontSize: 16, fontWeight: '700' },
  prefDesc: { fontSize: 13, marginTop: 8, lineHeight: 19 },
  prefSelected: { fontSize: 13, fontWeight: '600', marginTop: 10 },
  errorBox: { borderRadius: 12, padding: 12, borderWidth: 1, marginTop: 12 },
});