import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors, Card, Title, Subtitle, LoadingScreen, EmptyState, Badge } from '@/components/ui-kit';
import MainTabs from '@/components/main-tabs';
import { PaperRow } from '@/components/paper-row';
import { getFilters, getPapers } from '@/lib/api';
import type { Filters, PaperVariant } from '@/lib/types';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'subject', label: 'Subject' },
  { value: 'paper', label: 'Paper Number' },
];

interface ActiveFilters {
  qualification: string;
  subject: string;
  year: string;
  session: string;
  paper_number: string;
  paper_type: string;
  verification_status: string;
  status: string;
}

const EMPTY: ActiveFilters = {
  qualification: '',
  subject: '',
  year: '',
  session: '',
  paper_number: '',
  paper_type: '',
  verification_status: '',
  status: '',
};

export default function PapersScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [papers, setPapers] = useState<PaperVariant[]>([]);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(EMPTY);

  const searchRef = useRef(search);
  const filtersRef = useRef(activeFilters);
  const sortRef = useRef(sort);

  useEffect(() => {
    searchRef.current = search;
  }, [search]);
  useEffect(() => {
    filtersRef.current = activeFilters;
  }, [activeFilters]);
  useEffect(() => {
    sortRef.current = sort;
  }, [sort]);

  useEffect(() => {
    getFilters()
      .then(setFilters)
      .catch((err) => console.error('Failed to load filters:', err));
  }, []);

  useEffect(() => {
    loadPapers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeFilters, sort, page]);

  const loadPapers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { sort: sortRef.current, page, limit: 200 };
      const q = searchRef.current.trim();
      if (q) params.q = q;
      const af = filtersRef.current;
      if (af.qualification) params.qualification = af.qualification;
      if (af.subject) params.subject = af.subject;
      if (af.year) params.year = af.year;
      if (af.session) params.session = af.session;
      if (af.paper_number) params.paper_number = af.paper_number;
      if (af.paper_type) params.paper_type = af.paper_type;
      if (af.verification_status) params.verification_status = af.verification_status;
      if (af.status) params.status = af.status;
      const data = await getPapers(params);
      setPapers(data.papers);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load papers:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  const handleFilter = (key: keyof ActiveFilters, value: string) => {
    const next = { ...activeFilters, [key]: value };
    const cleaned: ActiveFilters = { ...EMPTY };
    (Object.keys(next) as (keyof ActiveFilters)[]).forEach((k) => {
      if (next[k]) cleaned[k] = next[k];
    });
    setActiveFilters(cleaned);
    setPage(1);
  };

  const clearFilters = () => {
    setActiveFilters(EMPTY);
    setSearch('');
    setPage(1);
  };

  const hasFilters = Object.values(activeFilters).some(Boolean);

  return (
    <View style={[styles.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Title>Past Papers</Title>
        <Subtitle>{total.toLocaleString()} papers found</Subtitle>

        <View style={[styles.searchRow, { borderColor: c.border, backgroundColor: c.inputBg }]}>
          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(1);
            }}
            placeholder="Search (e.g. Physics 5054 2026 Paper 2)..."
            placeholderTextColor={c.subtext}
            style={[styles.searchInput, { color: c.text }]}
            autoCapitalize="none"
          />
          <Pressable onPress={() => setShowFilters((s) => !s)} hitSlop={8}>
            <Text style={[styles.filterToggle, { color: showFilters || hasFilters ? c.accent : c.textMuted }]}>
              {showFilters ? 'Hide' : 'Filters'} {hasFilters ? '●' : ''}
            </Text>
          </Pressable>
        </View>

        {showFilters && filters ? (
          <Card style={styles.filterCard}>
            <View style={styles.filterHeader}>
              <Text style={[styles.filterTitle, { color: c.text }]}>Filters</Text>
              {hasFilters ? (
                <Pressable onPress={clearFilters}>
                  <Text style={[styles.clearLink, { color: c.accent }]}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
            <FilterSelect label="Qualification" value={activeFilters.qualification} onChange={(v) => handleFilter('qualification', v)} options={(filters.qualifications || []).map((x) => ({ value: x, label: x }))} />
            <FilterSelect label="Subject" value={activeFilters.subject} onChange={(v) => handleFilter('subject', v)} options={(filters.subjects || []).map((s) => ({ value: s.code, label: `${s.code} - ${s.name}` }))} />
            <FilterSelect label="Year" value={activeFilters.year} onChange={(v) => handleFilter('year', v)} options={(filters.years || []).map((y) => ({ value: String(y), label: String(y) }))} />
            <FilterSelect label="Session" value={activeFilters.session} onChange={(v) => handleFilter('session', v)} options={(filters.sessions || []).map((s) => ({ value: s, label: s === 'mj' ? 'May/June' : s === 'on' ? 'October/November' : s }))} />
            <FilterSelect label="Paper" value={activeFilters.paper_number} onChange={(v) => handleFilter('paper_number', v)} options={(filters.paperNumbers || []).map((p) => ({ value: String(p), label: `Paper ${p}` }))} />
            <FilterSelect label="Paper Type" value={activeFilters.paper_type} onChange={(v) => handleFilter('paper_type', v)} options={[{ value: 'theory', label: 'Theory' }, { value: 'practical', label: 'Practical' }, { value: 'alternative_to_practical', label: 'Alter. to Practical' }, { value: 'coursework', label: 'Coursework' }, { value: 'other', label: 'Other' }]} />
            <FilterSelect label="Status" value={activeFilters.status} onChange={(v) => handleFilter('status', v)} options={[{ value: 'completed', label: 'Completed' }, { value: 'not_completed', label: 'Not Completed' }]} />
            <FilterSelect label="Verification" value={activeFilters.verification_status} onChange={(v) => handleFilter('verification_status', v)} options={[{ value: 'verified', label: 'Verified' }, { value: 'unverified', label: 'Unverified' }]} />
          </Card>
        ) : null}

        <View style={[styles.sortRow, { borderColor: c.border, backgroundColor: c.inputBg }]}>
          <Text style={[styles.showing, { color: c.subtext }]}>Showing {papers.length} of {total.toLocaleString()}</Text>
          <View style={styles.chips}>
            {SORT_OPTIONS.map((o) => (
              <Pressable
                key={o.value}
                onPress={() => setSort(o.value)}
                style={[styles.sortChip, { backgroundColor: sort === o.value ? c.accentSoft : 'transparent' }]}
              >
                <Text style={{ color: sort === o.value ? c.accent : c.subtext, fontSize: 12, fontWeight: '600' }}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {loading ? (
          <LoadingScreen />
        ) : papers.length === 0 ? (
          <EmptyState icon="search" title="No papers found" subtitle="No papers matched your search or filters." />
        ) : (
          <View style={styles.results}>
            {groupBySubject(papers).map((group) => (
              <View key={group.code} style={styles.subjGroup}>
                <View style={styles.subjHeader}>
                  <Text style={[styles.subjName, { color: c.text }]} numberOfLines={1}>
                    {group.name}
                  </Text>
                  <Badge label={group.code} color={c.subtext} bg={c.border} />
                </View>
                {group.papers.map((p) => (
                  <PaperRow key={p.id} variant={p} />
                ))}
              </View>
            ))}
          </View>
        )}

        {total > 200 ? (
          <View style={styles.pagination}>
            <Pressable onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} hitSlop={8} style={[styles.pageBtn, { borderColor: c.border }]}>
              <Text style={{ color: page === 1 ? c.subtext : c.accent }}>Previous</Text>
            </Pressable>
            <Text style={{ color: c.subtext }}>Page {page}</Text>
            <Pressable onPress={() => setPage((p) => p + 1)} hitSlop={8} style={[styles.pageBtn, { borderColor: c.border }]}>
              <Text style={{ color: c.accent }}>Next</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
      <MainTabs />
    </View>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const c = useColors();
  return (
    <View style={styles.filterRow}>
      <Text style={[styles.filterLabel, { color: c.subtext }]}>{label}</Text>
      <View style={styles.filterOptions}>
        <Pressable onPress={() => onChange('')} style={[styles.optChip, { backgroundColor: !value ? c.accentSoft : c.border }]}>
          <Text style={{ color: !value ? c.accent : c.subtext, fontSize: 12 }}>All</Text>
        </Pressable>
        {options.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.optChip, { backgroundColor: value === o.value ? c.accentSoft : c.border }]}
          >
            <Text style={{ color: value === o.value ? c.accent : c.textMuted, fontSize: 12 }} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function groupBySubject(papers: PaperVariant[]): { code: string; name: string; papers: PaperVariant[] }[] {
  const map = new Map<string, { code: string; name: string; papers: PaperVariant[] }>();
  for (const p of papers) {
    const key = `${p.subject_id}`;
    if (!map.has(key)) {
      map.set(key, { code: p.subject_code, name: p.subject_name, papers: [] });
    }
    map.get(key)!.papers.push(p);
  }
  return [...map.values()];
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  searchRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, marginTop: 16 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  filterToggle: { fontSize: 13, fontWeight: '600', marginLeft: 8 },
  filterCard: { marginTop: 12 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  filterTitle: { fontSize: 14, fontWeight: '600' },
  clearLink: { fontSize: 13, fontWeight: '600' },
  filterRow: { marginBottom: 12 },
  filterLabel: { fontSize: 12, marginBottom: 6, fontWeight: '500' },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  optChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  sortRow: { borderRadius: 12, borderWidth: 1, padding: 10, marginTop: 12 },
  showing: { fontSize: 12, marginBottom: 8 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  sortChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  results: { marginTop: 12 },
  subjGroup: { marginBottom: 16 },
  subjHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  subjName: { fontSize: 15, fontWeight: '700', flex: 1 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 },
  pageBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
});
