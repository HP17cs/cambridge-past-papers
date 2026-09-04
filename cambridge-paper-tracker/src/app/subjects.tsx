import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors, Card, Title, Subtitle, TextField, Badge, LoadingScreen, EmptyState } from '@/components/ui-kit';
import MainTabs from '@/components/main-tabs';
import { getSubjects } from '@/lib/api';
import type { Subject } from '@/lib/types';

export default function SubjectsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filtered, setFiltered] = useState<Subject[]>([]);
  const [search, setSearch] = useState('');
  const [qualification, setQualification] = useState('');
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSubjects = useCallback(async () => {
    try {
      const data = await getSubjects();
      setSubjects(data);
      setFiltered(data);
      setQualifications([...new Set(data.map((s) => s.qualification_short_name).filter(Boolean))].sort() as string[]);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

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

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <LoadingScreen />
        <MainTabs />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Title>Subjects</Title>
        <Subtitle>{subjects.length} subjects available</Subtitle>

        <TextField value={search} onChangeText={setSearch} placeholder="Search subjects..." style={styles.search} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {['', ...qualifications].map((q) => (
            <Pressable
              key={q || 'all'}
              onPress={() => setQualification(q)}
              style={[
                styles.chip,
                { backgroundColor: q === qualification ? c.accentSoft : c.card, borderColor: c.border },
              ]}
            >
              <Text style={{ color: q === qualification ? c.accent : c.subtext, fontSize: 13, fontWeight: '500' }}>
                {q || 'All'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.grid}>
          {filtered.map((subject) => (
            <Card key={subject.id} style={styles.subjectCard} onPress={() => router.push({ pathname: '/subject/[id]', params: { id: String(subject.id) } })}>
              <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>
                {subject.name}
              </Text>
              <View style={styles.metaRow}>
                <Text style={[styles.code, { color: c.subtext }]}>{subject.code}</Text>
                {subject.qualification_short_name ? (
                  <Badge label={subject.qualification_short_name} color={c.accent} bg={c.accentSoft} />
                ) : null}
              </View>
            </Card>
          ))}
        </View>

        {filtered.length === 0 && (
          <EmptyState icon="search" title="No subjects found" subtitle="No subjects matched your search or qualification filter." />
        )}
      </ScrollView>
      <MainTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 28 },
  search: { marginTop: 16 },
  chips: { flexDirection: 'row', marginBottom: 16 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, marginRight: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  subjectCard: { width: '48.5%', marginBottom: 0, minHeight: 104 },
  name: { fontSize: 14, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  code: { fontSize: 12, fontWeight: '500' },
});
