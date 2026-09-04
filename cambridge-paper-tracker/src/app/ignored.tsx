import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors, Card, Title, Subtitle, Button, EmptyState, LoadingScreen } from '@/components/ui-kit';
import MainTabs from '@/components/main-tabs';
import { useProgress } from '@/contexts/ProgressContext';
import { getStats } from '@/lib/api';
import { sessionLabel } from '@/lib/format';
import type { IgnoredPaper as IgnoredPaperT } from '@/lib/types';

export default function IgnoredScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toggleIgnore } = useProgress();
  const [papers, setPapers] = useState<IgnoredPaperT[]>([]);
  const [loading, setLoading] = useState(true);

  const loadIgnored = useCallback(async () => {
    try {
      const data = await getStats();
      setPapers(data.ignoredPapers || []);
    } catch (err) {
      console.error('Failed to load ignored papers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIgnored();
  }, [loadIgnored]);

  const handleRestore = useCallback(
    async (paperId: number) => {
      try {
        await toggleIgnore(paperId);
        setPapers((prev) => prev.filter((p) => p.variant_id !== paperId));
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

  return (
    <View style={[styles.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Title>Ignored Papers</Title>
        <Subtitle>
          {papers.length === 0
            ? 'Papers you have hidden from your progress will appear here.'
            : `${papers.length} ${papers.length === 1 ? 'paper is' : 'papers are'} hidden from your progress`}
        </Subtitle>

        {papers.length === 0 ? (
          <EmptyState
            icon="happy-outline"
            title="No ignored papers"
            subtitle="When you hide a paper from your progress, you'll be able to manage it here."
          />
        ) : (
          <View style={styles.list}>
            {papers.map((paper) => (
              <Card key={paper.variant_id} style={styles.row}>
                <Pressable style={styles.flex1} onPress={() => router.push({ pathname: '/paper/[id]', params: { id: String(paper.variant_id) } })}>
                  <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                    {paper.subject_name} — Paper {paper.paper_number}
                    {paper.variant_number != null ? ` — Variant ${paper.variant_number}` : ''}
                  </Text>
                  <Text style={[styles.meta, { color: c.subtext }]}>
                    {paper.year} · {sessionLabel(paper.session)} · {paper.subject_code}
                  </Text>
                </Pressable>
                <Pressable onPress={() => handleRestore(paper.variant_id)} hitSlop={8}>
                  <Text style={[styles.restore, { color: c.warn }]}>Restore</Text>
                </Pressable>
              </Card>
            ))}
          </View>
        )}

        {papers.length > 0 ? (
          <Button title="Browse Past Papers" onPress={() => router.push('/papers')} variant="outline" style={styles.browse} />
        ) : null}
      </ScrollView>
      <MainTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  list: { marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  name: { fontSize: 14, fontWeight: '500' },
  meta: { fontSize: 12, marginTop: 2 },
  restore: { fontSize: 14, fontWeight: '600' },
  flex1: { flex: 1 },
  browse: { marginTop: 16 },
});
