import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

import { useColors, Checkbox, Badge } from './ui-kit';
import { useProgress } from '@/contexts/ProgressContext';
import type { PaperVariant } from '@/lib/types';
import { variantNumber, paperNumberValue, seriesLabel } from '@/lib/format';

export function openUrl(url: string) {
  WebBrowser.openBrowserAsync(url).catch(() => {});
}

export function PaperRow({ variant, compact = false }: { variant: PaperVariant; compact?: boolean }) {
  const c = useColors();
  const { isCompleted, isIgnored, togglePaper, toggleIgnore } = useProgress();
  const completed = isCompleted(variant.id);
  const ignored = isIgnored(variant.id);

  const vn = variantNumber(variant);
  const pn = paperNumberValue(variant);
  const label = `Paper ${pn || '?'}${vn != null ? ` — Variant ${vn}` : ''}`;
  const verified = variant.component_verified === 1 || variant.verified === 1;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          opacity: ignored ? 0.55 : 1,
        },
      ]}
    >
      <Checkbox
        checked={completed}
        onPress={() => {
          if (!ignored) togglePaper(variant.id).catch(() => {});
        }}
      />

      <View style={styles.main}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: c.text }, ignored && styles.mutedText]} numberOfLines={1}>
            {label}
          </Text>
          {verified ? (
            <Badge label="Verified" color={c.good} bg={c.good + '22'} />
          ) : (
            <Badge label="Unverified" color={c.subtext} bg={c.border} />
          )}
          {ignored && <Badge label="Ignored" color={c.warn} bg={c.warn + '22'} />}
        </View>

        {variant.component_code ? (
          <Text style={[styles.meta, { color: c.subtext }]} numberOfLines={1}>
            {variant.component_code}
            {variant.series_code && vn != null ? ` · ${seriesLabel(variant)}` : ''}
          </Text>
        ) : null}

        {!compact && (
          <View style={styles.openRow}>
            {variant.question_paper_url ? (
              <Pressable onPress={() => openUrl(variant.question_paper_url!)} style={[styles.qpBtn, { backgroundColor: c.accentSoft }]}>
                <Text style={[styles.qpText, { color: c.accent }]}>Question Paper</Text>
              </Pressable>
            ) : null}
            {variant.mark_scheme_url ? (
              <Pressable onPress={() => openUrl(variant.mark_scheme_url!)} style={[styles.docBtn, { borderColor: c.border }]}>
                <Text style={[styles.docText, { color: c.textMuted }]}>Mark Scheme</Text>
              </Pressable>
            ) : null}
            {variant.examiner_report_url ? (
              <Pressable onPress={() => openUrl(variant.examiner_report_url!)} style={[styles.docBtn, { borderColor: c.border }]}>
                <Text style={[styles.docText, { color: c.textMuted }]}>Report</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

        <Pressable
          onPress={() => toggleIgnore(variant.id).catch(() => {})}
          hitSlop={8}
          style={[
            styles.ignoreBtn,
            { borderColor: c.border, backgroundColor: ignored ? c.warn + '22' : c.inputBg },
            ignored && { borderColor: c.warn },
          ]}
        >
          <Ionicons name={ignored ? 'eye' : 'eye-off'} size={16} color={ignored ? c.warn : c.subtext} />
        </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  main: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  title: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  mutedText: { textDecorationLine: 'line-through', color: '#9aa3bd' },
  meta: { fontSize: 12, marginTop: 4, fontVariant: ['tabular-nums'] },
  openRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  qpBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  qpText: { fontSize: 12, fontWeight: '600' },
  docBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  docText: { fontSize: 12 },
  ignoreBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  ignoreIcon: { fontSize: 15 },
});
