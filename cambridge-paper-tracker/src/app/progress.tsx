import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors, Card, Title, Subtitle, SectionTitle, GradientBar, Badge, LoadingScreen } from '@/components/ui-kit';
import MainTabs from '@/components/main-tabs';
import { useProgress } from '@/contexts/ProgressContext';
import { getStats } from '@/lib/api';
import { sessionLabel } from '@/lib/format';
import type { Stats } from '@/lib/types';

export default function ProgressScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toggleIgnore } = useProgress();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((err) => console.error('Failed to load stats:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleRestore = useCallback(
    async (paperId: number) => {
      try {
        await toggleIgnore(paperId);
        setStats((prev) =>
          prev
            ? {
                ...prev,
                ignored: Math.max(0, (prev.ignored || 0) - 1),
                ignoredPapers: (prev.ignoredPapers || []).filter((p) => p.variant_id !== paperId),
                remaining: Math.min(prev.total, (prev.remaining || 0) + 1),
              }
            : prev
        );
      } catch (err) {
        console.error('Failed to restore paper:', err);
      }
    },
    [toggleIgnore]
  );

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <LoadingScreen />
        <MainTabs />
      </View>
    );
  }

  if (!stats) return null;

  const bySubject = stats.bySubject || [];

  return (
    <View style={[styles.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Title>Progress</Title>
        <Subtitle>Your Cambridge past paper completion</Subtitle>

        <Card style={styles.overview}>
          <Text style={[styles.overviewBig, { color: c.text }]}>
            {stats.completed} / {stats.total}
          </Text>
          <Text style={[styles.overviewSmall, { color: c.subtext }]}>papers completed</Text>
          <GradientBar value={stats.percentage / 100} height={12} colors={c.gradient} />
          <Text style={[styles.overviewPct, { color: c.text }]}>{stats.percentage}% complete</Text>
        </Card>

        <View style={styles.statRow}>
          <Card style={styles.statCard}>
            <Text style={[styles.statLabel, { color: c.subtext }]}>Total</Text>
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
          <Pressable onPress={() => router.push('/ignored')} style={styles.statCard}>
            <Card style={stats.ignored > 0 ? { borderColor: c.warn } : null}>
              <Text style={[styles.statLabel, { color: c.subtext }]}>Ignored</Text>
              <Text style={[styles.statValue, { color: stats.ignored > 0 ? c.warn : c.subtext }]}>{stats.ignored.toLocaleString()}</Text>
            </Card>
          </Pressable>
        </View>

        {bySubject.length > 0 ? (
          <View>
            <SectionTitle>Progress by Subject</SectionTitle>
            {bySubject.map((s, i) => {
              const effective = s.total - (s.ignored_count || 0);
              const pct = effective > 0 ? s.completed_count / effective : 0;
              return (
                <Card key={i} style={styles.progressRow}>
                  <View style={styles.progressRowHeader}>
                    <View style={styles.flex1}>
                      <Text style={[styles.progressName, { color: c.text }]} numberOfLines={1}>{s.name}</Text>
                      <Text style={{ color: c.subtext, fontSize: 11, marginTop: 2 }}>
                        {s.code} · {s.qualification}
                      </Text>
                    </View>
                    <Text style={[styles.progressCount, { color: c.text }]}>
                      {s.completed_count}/{effective}
                      {s.ignored_count > 0 ? ` (${s.ignored_count} ignored)` : ''}
                    </Text>
                  </View>
                  <GradientBar value={pct} height={8} colors={c.gradient} />
                  <Text style={{ color: c.subtext, fontSize: 11, marginTop: 4 }}>{Math.round(pct * 100)}%</Text>
                </Card>
              );
            })}
          </View>
        ) : null}

        {stats.recent && stats.recent.length > 0 ? (
          <View>
            <SectionTitle>Recently Completed</SectionTitle>
            {stats.recent.map((paper, i) => (
              <Card key={i} style={styles.recentRow}>
                <View style={styles.flex1}>
                  <Text style={[styles.recentName, { color: c.text }]} numberOfLines={1}>
                    {paper.subject_name} — Paper {paper.paper_number}
                    {paper.variant_number != null ? ` — Variant ${paper.variant_number}` : ''}
                  </Text>
                  <Text style={{ color: c.subtext, fontSize: 11, marginTop: 2 }}>
                    {paper.year} · {sessionLabel(paper.session)}
                    {paper.completed_at ? ` · ${new Date(paper.completed_at).toLocaleDateString()}` : ''}
                  </Text>
                </View>
                <Badge label="Completed" color={c.good} bg={c.good + '22'} />
              </Card>
            ))}
          </View>
        ) : null}

        {stats.ignoredPapers && stats.ignoredPapers.length > 0 ? (
          <View>
            <View style={styles.sectionRow}>
              <SectionTitle style={styles.sectionGrow}>Ignored Papers</SectionTitle>
              <Badge label={`${stats.ignoredPapers.length} hidden`} color={c.warn} bg={c.warn + '22'} />
            </View>
            {stats.ignoredPapers.map((paper) => (
              <Card key={paper.variant_id} style={styles.ignoredRow}>
                <Pressable style={styles.flex1} onPress={() => router.push({ pathname: '/paper/[id]', params: { id: String(paper.variant_id) } })}>
                  <Text style={[styles.recentName, { color: c.text }]} numberOfLines={1}>
                    {paper.subject_name} — Paper {paper.paper_number}
                    {paper.variant_number != null ? ` — Variant ${paper.variant_number}` : ''}
                  </Text>
                  <Text style={{ color: c.subtext, fontSize: 11, marginTop: 2 }}>
                    {paper.year} · {sessionLabel(paper.session)} · {paper.subject_code}
                  </Text>
                </Pressable>
                <Pressable onPress={() => handleRestore(paper.variant_id)} hitSlop={8}>
                  <Text style={{ color: c.warn, fontWeight: '600', fontSize: 13 }}>Restore</Text>
                </Pressable>
              </Card>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <MainTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 28 },
  overview: { alignItems: 'center', padding: 28 },
  overviewBig: { fontSize: 40, fontWeight: '800' },
  overviewSmall: { color: '#888', marginTop: 2, marginBottom: 16 },
  overviewPct: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 8 },
  statCard: { width: '48.5%', marginBottom: 0 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  progressRow: { marginBottom: 8 },
  progressRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  progressName: { fontSize: 14, fontWeight: '500' },
  progressCount: { fontSize: 14, fontWeight: '600' },
  recentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  recentName: { fontSize: 13, fontWeight: '500' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionGrow: { flex: 1, marginBottom: 12, marginTop: 20 },
  ignoredRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  flex1: { flex: 1 },
});
