import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useColors, Card, Badge, GradientBar, LoadingScreen, EmptyState, Header } from '@/components/ui-kit';
import { useProgress } from '@/contexts/ProgressContext';
import { PaperRow } from '@/components/paper-row';
import { getSubjectDetail } from '@/lib/api';
import { sessionLabel } from '@/lib/format';
import type { SubjectDetailResponse } from '@/lib/types';

export default function SubjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectId = Number(id);
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { progressMap } = useProgress();
  const [data, setData] = useState<SubjectDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      setData(await getSubjectDetail(subjectId));
    } catch (err) {
      setError('Failed to load subject');
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    load();
  }, [load]);

  const subject = data?.subject;
  const papers = data?.papers;
  const completedCount = papers ? papers.filter((p) => progressMap[p.id]?.completed).length : data?.completed || 0;
  const ignoredCount = papers ? papers.filter((p) => progressMap[p.id]?.ignored).length : 0;
  const effectiveTotal = (papers?.length ?? data?.total ?? 0) - ignoredCount;
  const displayedCompleted = papers ? completedCount : data?.completed || 0;
  const total = papers?.length ?? data?.total ?? 0;

  return (
    <View style={[styles.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <Header title={subject?.name ?? 'Subject'} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {loading ? (
          <LoadingScreen />
        ) : error || !data ? (
          <EmptyState icon="warning-outline" title="Failed to load" subtitle={error || 'Subject not found'} />
        ) : (
          <View>
            {(() => {
              const subj = data.subject;
              if (!subj) return null;
              return (
                <View>
                  <Text style={[styles.subjectCode, { color: c.subtext }]}>
                    {subj.code}
                    {subj.qualification_name ? ` · ${subj.qualification_name}` : ''}
                  </Text>
                  {subj.description ? (
                    <Text style={[styles.desc, { color: c.subtext }]}>{subj.description}</Text>
                  ) : null}
                </View>
              );
            })()}

            <View style={styles.statRow}>
              <Card style={styles.statCard}>
                <Text style={[styles.statLabel, { color: c.subtext }]}>Total</Text>
                <Text style={[styles.statValue, { color: c.text }]}>{total}</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={[styles.statLabel, { color: c.subtext }]}>Completed</Text>
                <Text style={[styles.statValue, { color: c.good }]}>{displayedCompleted}</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={[styles.statLabel, { color: c.subtext }]}>Remaining</Text>
                <Text style={[styles.statValue, { color: c.accent }]}>{effectiveTotal - displayedCompleted}</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={[styles.statLabel, { color: c.subtext }]}>Progress</Text>
                <Text style={[styles.statValue, { color: c.text }]}>
                  {effectiveTotal > 0 ? Math.round((displayedCompleted / effectiveTotal) * 100) : 0}%
                </Text>
              </Card>
            </View>

            {ignoredCount > 0 ? (
              <View style={[styles.ignoredBanner, { backgroundColor: c.warn + '18', borderColor: c.warn }]}>
                <Text style={[styles.ignoredText, { color: c.warn }]}>
                  {ignoredCount} {ignoredCount === 1 ? 'paper is' : 'papers are'} ignored and excluded from progress.
                </Text>
              </View>
            ) : null}

            <Card style={styles.progressCard}>
              <GradientBar value={effectiveTotal > 0 ? displayedCompleted / effectiveTotal : 0} height={10} colors={c.gradient} />
            </Card>

            {total === 0 ? (
              <EmptyState
                icon="document-text-outline"
                title="No verified papers available yet"
                subtitle="This subject is on the catalogue but its papers have not yet been verified against Cambridge sources."
              />
            ) : (
              <View>
                {Object.keys(data.grouped || {})
                  .sort((a, b) => Number(b) - Number(a))
                  .map((year) => (
                    <View key={year}>
                      <Text style={[styles.yearHeader, { color: c.text }]}>{year}</Text>
                      {Object.keys(data.grouped[year])
                        .sort((a, b) => (a === 'mj' ? -1 : 1))
                        .map((session) => (
                          <View key={session}>
                            <Text style={[styles.sessionHeader, { color: c.textMuted }]}>{sessionLabel(session)}</Text>
                            {Object.keys(data.grouped[year][session])
                              .sort((a, b) => Number(a) - Number(b))
                              .map((pn) => {
                                const group = data.grouped[year][session][pn];
                                return <PaperGroup key={pn} paperNumber={Number(pn)} group={group} />;
                              })}
                          </View>
                        ))}
                    </View>
                  ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function PaperGroup({ paperNumber, group }: { paperNumber: number; group: any }) {
  const c = useColors();
  const { countCompleted, countIgnored } = useProgress();
  const [open, setOpen] = useState(false);

  const variants = group.variants || [];
  const variantIds = variants.map((v: any) => v.id);
  const done = countCompleted(variantIds);
  const ignored = countIgnored(variantIds);
  const effectiveTotal = variants.length - ignored;
  const isATP = group.paper_type === 'alternative_to_practical';

  return (
    <View style={[styles.group, { borderColor: c.border, backgroundColor: c.card }]}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.groupHeader}>
        <View style={styles.groupTitleRow}>
          <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={16} color={c.subtext} />
          <Text style={[styles.groupTitle, { color: c.text }]} numberOfLines={1}>
            {group.paper_label || `Paper ${paperNumber}`}
          </Text>
        </View>
        <View style={styles.groupBadges}>
          {variants.length > 0 ? (
            <Text style={[styles.groupVariants, { color: c.subtext }]}>
              V{Array.from(new Set(variants.map((v: any) => (v.variant_number != null ? v.variant_number : v.variant)))).join(' · V')}
            </Text>
          ) : null}
          {(group as any).verified === 1 ? (
            <Badge label="Verified" color={c.good} bg={c.good + '22'} />
          ) : (
            <Badge label="Unverified" color={c.subtext} bg={c.border} />
          )}
          {isATP && <Badge label="ATP" color={c.accent} bg={c.accentSoft} />}
          <View style={styles.growFlex} />
          <Text style={[styles.groupCount, { color: c.subtext }]}>
            {done}/{effectiveTotal}{ignored > 0 ? ` (${ignored})` : ''}
          </Text>
        </View>
      </Pressable>

      {open ? (
        <View style={styles.variants}>
          {variants.map((v: any) => (
            <PaperRow key={v.id} variant={v} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  subjectCode: { fontSize: 13, marginTop: 4 },
  desc: { fontSize: 13, marginTop: 8 },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 16 },
  statCard: { width: '48.5%', marginBottom: 0 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  ignoredBanner: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 16 },
  ignoredText: { fontSize: 13 },
  progressCard: { marginTop: 16, padding: 16 },
  yearHeader: { fontSize: 20, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  sessionHeader: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  group: { borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  groupHeader: { padding: 14 },
  groupTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  groupBadges: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  growFlex: { flexGrow: 1 },
  groupTitle: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  groupVariants: { fontSize: 12, fontWeight: '500' },
  groupCount: { fontSize: 12, fontWeight: '600' },
  variants: { padding: 12, paddingTop: 0 },
});
