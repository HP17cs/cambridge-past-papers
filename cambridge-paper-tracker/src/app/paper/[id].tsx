import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useColors, Card, Header, Button, VerifiedBadge, LoadingScreen, EmptyState } from '@/components/ui-kit';
import { useProgress } from '@/contexts/ProgressContext';
import { openUrl } from '@/components/paper-row';
import { getPaperDetail } from '@/lib/api';
import { sessionLabel } from '@/lib/format';
import type { PaperDetailResponse, PaperResource } from '@/lib/types';

export default function PaperDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const paperId = Number(id);
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isCompleted, isIgnored, togglePaper, toggleIgnore } = useProgress();
  const [data, setData] = useState<PaperDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getPaperDetail(paperId);
        if (active) setData(res);
      } catch (err) {
        console.error('Failed to load paper:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperId]);

  const handleToggle = useCallback(() => togglePaper(paperId).catch(() => {}), [paperId, togglePaper]);
  const handleIgnore = useCallback(() => toggleIgnore(paperId).catch(() => {}), [paperId, toggleIgnore]);

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <Header title="Paper" onBack={() => router.back()} />
        <LoadingScreen />
      </View>
    );
  }

  if (!data || !data.variant) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <Header title="Paper" onBack={() => router.back()} />
        <EmptyState icon="warning-outline" title="Paper not found" subtitle="This paper does not exist or has been removed." />
      </View>
    );
  }

  const v = data.variant;
  const completed = isCompleted(v.id);
  const ignored = isIgnored(v.id);
  const verified = v.variant_verified === 1 || v.component_verified === 1;
  const resources = data.resources || [];
  const qp = resources.find((r) => r.resource_type === 'question_paper');
  const ms = resources.find((r) => r.resource_type === 'mark_scheme');
  const er = resources.find((r) => r.resource_type === 'examiner_report');

  return (
    <View style={[styles.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <Header title={v.subject_name ?? 'Paper'} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.subjectCode, { color: c.subtext }]}>
          {v.subject_code}
          {v.qualification_short_name ? ` · ${v.qualification_short_name}` : v.qualification_name ? ` · ${v.qualification_name}` : ''}
        </Text>

        <Card style={styles.infoCard}>
          <InfoRow label="Year" value={String(v.year)} />
          <InfoRow label="Session" value={sessionLabel(v.session)} />
          <InfoRow label="Paper" value={v.component_code ?? ''} />
          {v.paper_label ? <InfoRow label="Description" value={v.paper_label} /> : null}
          {v.paper_type ? <InfoRow label="Type" value={v.paper_type.replace(/_/g, ' ')} capitalize /> : null}
          {v.series_code && v.variant != null ? (
            <InfoRow label="File" value={`${v.series_code}_qp_${v.variant}.pdf`} mono />
          ) : null}
          <View style={styles.statusRow}>
            <Text style={[styles.infoLabel, { color: c.subtext }]}>Status</Text>
            <VerifiedBadge verified={verified} />
          </View>
        </Card>

        <Text style={[styles.docHeader, { color: c.text }]}>Documents</Text>
        <ResourceRow resource={qp} label="Question Paper" onOpen={() => openUrl(qp!.url)} c={c} />
        <ResourceRow resource={ms} label="Mark Scheme" onOpen={() => openUrl(ms!.url)} c={c} />
        <ResourceRow resource={er} label="Examiner Report" onOpen={() => openUrl(er!.url)} c={c} />

        <View style={styles.actions}>
          <Button
            title={ignored ? 'Ignored — excluded from progress' : completed ? 'Completed — Tap to Unmark' : 'Mark as Completed'}
            onPress={handleToggle}
            variant={ignored ? 'outline' : completed ? 'successSoft' : 'primary'}
            disabled={ignored}
          />
          <Button
            title={ignored ? 'Restore this paper' : 'Ignore this paper (exclude)'}
            onPress={handleIgnore}
            variant={ignored ? 'primary' : 'outline'}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, mono, capitalize }: { label: string; value: string; mono?: boolean; capitalize?: boolean }) {
  const c = useColors();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: c.subtext }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: c.text }, mono && styles.mono]} numberOfLines={2}>
        {capitalize ? capitalizeFirst(value) : value}
      </Text>
    </View>
  );
}

function ResourceRow({ resource, label, onOpen, c }: { resource?: PaperResource | null; label: string; onOpen: () => void; c: any }) {
  const available = !!resource?.url;
  return (
    <Pressable onPress={available ? onOpen : undefined} style={[styles.resourceRow, { borderColor: c.border, backgroundColor: available ? c.card : c.inputBg }]}>
      <View style={[styles.resourceIcon, { backgroundColor: available ? c.accentSoft : c.border }]}>
        <Ionicons name="document-text-outline" size={20} color={available ? c.accent : c.subtext} />
      </View>
      <View style={styles.flex1}>
        <Text style={[styles.resourceLabel, { color: available ? c.text : c.subtext }]}>{label}</Text>
        <Text style={{ color: c.subtext, fontSize: 12 }}>{available ? 'Open PDF' : 'Not yet available'}</Text>
      </View>
    </Pressable>
  );
}

function capitalizeFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  subjectCode: { fontSize: 13, marginTop: 4 },
  infoCard: { marginTop: 16 },
  infoRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' },
  infoLabel: { width: 96, fontSize: 13 },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '500' },
  mono: { fontVariant: ['tabular-nums'] },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  docHeader: { fontSize: 15, fontWeight: '600', marginTop: 20, marginBottom: 10 },
  resourceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  resourceIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  resourceLabel: { fontSize: 14, fontWeight: '500' },
  flex1: { flex: 1 },
  actions: { marginTop: 20, gap: 10 },
});
