import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { useColors, Card, Title, Subtitle, SectionTitle, GradientBar, Badge, LoadingScreen } from '@/components/ui-kit';
import MainTabs from '@/components/main-tabs';
import { getStats, getFilters } from '@/lib/api';
import { sessionLabel } from '@/lib/format';
import type { Stats, Subject } from '@/lib/types';

export default function DashboardScreen() {
  const { user } = useAuth();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentSubjects, setRecentSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const [statsData, filtersData] = await Promise.all([getStats(), getFilters()]);
      setStats(statsData);
      setRecentSubjects((filtersData.subjects || []).slice(0, 8));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <LoadingScreen />
        <MainTabs />
      </View>
    );
  }

  const bySubject = (stats?.bySubject || []).filter((s) => s.completed_count > 0).slice(0, 5);

  return (
    <View style={[styles.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Title>Welcome, {user?.name}</Title>
        <Subtitle>Track your Cambridge past paper progress</Subtitle>

        {stats && (
          <View style={styles.statGrid}>
            <Card style={styles.statCard}>
              <Text style={[styles.statLabel, { color: c.subtext }]}>Total Papers</Text>
              <Text style={[styles.statValue, { color: c.text }]}>{stats.total.toLocaleString()}</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statLabel, { color: c.subtext }]}>Completed</Text>
              <Text style={[styles.statValue, { color: c.good }]}>{stats.completed.toLocaleString()}</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statLabel, { color: c.subtext }]}>Remaining</Text>
              <Text style={[styles.statValue, { color: c.accent }]}>{stats.remaining.toLocaleString()}</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statLabel, { color: c.subtext }]}>Progress</Text>
              <Text style={[styles.statValue, { color: c.text }]}>{stats.percentage}%</Text>
            </Card>
          </View>
        )}

        {stats && stats.ignored > 0 && (
          <Pressable onPress={() => router.push('/ignored')}>
            <View style={[styles.ignoredBanner, { backgroundColor: c.warn + '18', borderColor: c.warn }]}>
              <Text style={[styles.ignoredText, { color: c.warn }]}>
                {stats.ignored.toLocaleString()} {stats.ignored === 1 ? 'paper is' : 'papers are'} ignored and excluded from progress. View →
              </Text>
            </View>
          </Pressable>
        )}

        {stats && stats.total > 0 && (
          <Card>
            <Text style={[styles.cardTitle, { color: c.text }]}>Overall Progress</Text>
            <GradientBar value={stats.total > 0 ? stats.completed / stats.total : 0} height={10} />
            <Text style={[styles.cardMeta, { color: c.subtext, marginTop: 6 }]}>
              {stats.completed.toLocaleString()} of {stats.total.toLocaleString()} completed
            </Text>
          </Card>
        )}

        <View style={styles.rowHeader}>
          <SectionTitle style={styles.sectionGrow}>Subjects</SectionTitle>
          <Pressable onPress={() => router.push('/subjects')}>
            <Text style={[styles.link, { color: c.accent }]}>View all</Text>
          </Pressable>
        </View>

        <View style={styles.subjectGrid}>
          {recentSubjects.map((subject) => (
            <Card key={subject.id} style={styles.subjectCard} onPress={() => router.push({ pathname: '/subject/[id]', params: { id: String(subject.id) } })}>
              <Text style={[styles.subjectName, { color: c.text }]} numberOfLines={2}>
                {subject.name}
              </Text>
              <Text style={[styles.subjectMeta, { color: c.subtext }]}>
                {subject.code}
                {subject.qualification_short_name ? ` · ${subject.qualification_short_name}` : ''}
              </Text>
            </Card>
          ))}
        </View>

        {bySubject.length > 0 && (
          <View>
            <View style={styles.rowHeader}>
              <SectionTitle style={styles.sectionGrow}>Progress by Subject</SectionTitle>
              <Pressable onPress={() => router.push('/progress')}>
                <Text style={[styles.link, { color: c.accent }]}>View all</Text>
              </Pressable>
            </View>
            {bySubject.map((s, i) => {
              const effective = s.total - (s.ignored_count || 0);
              const pct = effective > 0 ? s.completed_count / effective : 0;
              return (
                <Card key={i} style={styles.progressRow}>
                  <View style={styles.progressRowHeader}>
                    <Text style={[styles.progressName, { color: c.text }]} numberOfLines={1}>
                      {s.name} — {s.code}
                    </Text>
                    <Text style={[styles.progressCount, { color: c.subtext }]}>
                      {s.completed_count}/{effective}
                      {s.ignored_count > 0 ? ` (${s.ignored_count} ignored)` : ''}
                    </Text>
                  </View>
                  <GradientBar value={pct} height={6} colors={c.gradient} />
                </Card>
              );
            })}
          </View>
        )}

        {stats && stats.recent && stats.recent.length > 0 && (
          <View>
            <SectionTitle>Recently Completed</SectionTitle>
            {stats.recent.map((paper, i) => (
              <Card key={i} style={styles.recentRow}>
                <View style={styles.flex1}>
                  <Text style={[styles.recentName, { color: c.text }]} numberOfLines={1}>
                    {paper.subject_name} — Paper {paper.paper_number}
                    {paper.variant_number != null ? ` — Variant ${paper.variant_number}` : ''}
                  </Text>
                  <Text style={[styles.recentMeta, { color: c.subtext }]}>
                    {paper.year} · {sessionLabel(paper.session)}
                  </Text>
                </View>
                <Badge label="Completed" color={c.good} bg={c.good + '22'} />
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
      <MainTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex1: { flex: 1 },
  content: { padding: 20, paddingBottom: 28 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 20 },
  statCard: { width: '48.5%', marginBottom: 0 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  ignoredBanner: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 16 },
  ignoredText: { fontSize: 13 },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  cardMeta: { fontSize: 12 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionGrow: { flex: 1, marginTop: 20, marginBottom: 0 },
  link: { fontSize: 14, fontWeight: '600', marginTop: 20 },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  subjectCard: { width: '48.5%', marginBottom: 0 },
  subjectName: { fontSize: 13, fontWeight: '600' },
  subjectMeta: { fontSize: 11, marginTop: 4 },
  progressRow: { marginBottom: 8 },
  progressRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  progressName: { fontSize: 13, fontWeight: '500', flex: 1, marginRight: 8 },
  progressCount: { fontSize: 11 },
  recentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  recentName: { fontSize: 13, fontWeight: '500' },
  recentMeta: { fontSize: 11, marginTop: 2 },
});
