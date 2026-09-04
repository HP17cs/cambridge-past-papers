import type { PaperVariant } from './types';

export function sessionLabel(session?: string): string {
  if (session === 'mj') return 'May/June';
  if (session === 'on') return 'October/November';
  return session ?? '';
}

export const PAPER_TYPE_LABELS: Record<string, string> = {
  theory: 'Theory',
  practical: 'Practical',
  alternative_to_practical: 'Alternative to Practical',
  coursework: 'Coursework',
  oral: 'Oral',
  listening: 'Listening',
  speaking: 'Speaking',
  other: 'Other',
};

export function paperTypeLabel(type?: string): string | null {
  if (!type) return null;
  if (type === 'alternative_to_practical') return 'Alternative to Practical';
  if (type === 'practical') return 'Practical';
  return null;
}

export function variantNumber(p: PaperVariant): number | null {
  return p.variant != null ? p.variant : p.variant_number != null ? p.variant_number : null;
}

export function paperNumberValue(p: PaperVariant): number {
  if (p.paper_number != null) return p.paper_number;
  if (p.component_code) {
    const n = Number(p.component_code.split('/').pop());
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

export function variantName(p: PaperVariant): string {
  const pn = paperNumberValue(p);
  const vn = variantNumber(p);
  return `Paper ${pn || '?'}${vn != null ? ` — Variant ${vn}` : ''}`;
}

export function seriesLabel(p: PaperVariant): string {
  const vn = variantNumber(p);
  if (p.series_code && vn != null) return `${p.series_code}_qp_${vn}.pdf`;
  return `qp_${vn != null ? vn : paperNumberValue(p)}`;
}

export function isVerified(p: PaperVariant): boolean {
  return p.component_verified === 1 || (p.component_verified as unknown as boolean) === true || p.verified === 1;
}

export function formatDate(input?: string | null): string {
  if (!input) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}
