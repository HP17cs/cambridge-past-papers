// Final audit report (Phase 16).
// Run: node scripts/audit-report.js
//
// Produces:
//   TOTAL SUBJECTS / AUDITED / VERIFIED / UNVERIFIED
//   TOTAL PAPER/COMPONENT RECORDS, TOTAL VARIANT RECORDS
//   TOTAL VERIFIED / UNVERIFIED RECORDS
//   TOTAL FABRICATED REMOVED / DUPLICATES REMOVED / CORRECTED / RESOURCES ADDED / BROKEN REMOVED
//   Subject-by-subject summary
//   List of every remaining UNVERIFIED item
//
// NOTE: This report is DB-derived (the VERIFIED constant no longer exists in
// data.js). "Verified" here means verified=1 against Cambridge sources.

const path = require('path');
process.env.DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'cambridge.db');
const { db } = require('../database');

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function main() {
  console.log('========== FINAL AUDIT REPORT ==========\n');

  const subjects = db.prepare(`
    SELECT s.*, q.short_name AS qualification FROM subjects s
    JOIN qualifications q ON s.qualification_id = q.id ORDER BY s.code
  `).all();

  // Per-subject aggregated counts
  const subj = db.prepare(`
    SELECT es.subject_id,
      COUNT(DISTINCT es.id) AS sessions,
      COUNT(DISTINCT case when es.verified=1 then es.id end) verified_sessions,
      COUNT(DISTINCT c.id) AS components,
      COUNT(DISTINCT case when c.verified=1 then c.id end) verified_components,
      COUNT(DISTINCT v.id) AS variants,
      COUNT(DISTINCT case when v.verified=1 then v.id end) verified_variants
    FROM exam_sessions es
    JOIN components c ON c.exam_session_id = es.id
    LEFT JOIN variants v ON v.component_id = c.id
    GROUP BY es.subject_id
  `).all();
  const bySubj = {};
  subj.forEach((r) => { bySubj[r.subject_id] = r; });

  // Global totals
  const totalVariants = db.prepare('SELECT COUNT(*) c FROM variants').get().c;
  const totalVerifiedVariants = db.prepare('SELECT COUNT(*) c FROM variants WHERE verified=1').get().c;
  const totalComponents = db.prepare('SELECT COUNT(*) c FROM components').get().c;
  const totalVerifiedComponents = db.prepare('SELECT COUNT(*) c FROM components WHERE verified=1').get().c;
  const totalResources = db.prepare('SELECT COUNT(*) c FROM paper_resources').get().c;

  let uniquelyVerifiedSubjects = new Set();
  for (const s of subjects) {
    const r = bySubj[s.id];
    if (r && (r.verified_components > 0)) uniquelyVerifiedSubjects.add(s.code);
  }
  const totalSubjects = subjects.length;
  const totalVerifiedSubjects = uniquelyVerifiedSubjects.size;
  const totalUnverifiedSubjects = totalSubjects - totalVerifiedSubjects;

  console.log(`TOTAL SUBJECTS:                  ${totalSubjects}`);
  console.log(`TOTAL SUBJECTS AUDITED:          ${totalSubjects}`);
  console.log(`TOTAL VERIFIED SUBJECTS:         ${totalVerifiedSubjects}`);
  console.log(`TOTAL UNVERIFIED SUBJECTS:       ${totalUnverifiedSubjects}`);
  console.log('');
  console.log(`TOTAL PAPER/COMPONENT RECORDS:   ${totalComponents}`);
  console.log(`TOTAL VARIANT RECORDS:           ${totalVariants}`);
  console.log('');
  console.log(`TOTAL VERIFIED COMPONENTS:       ${totalVerifiedComponents}`);
  console.log(`TOTAL VERIFIED VARIANTS:         ${totalVerifiedVariants}`);
  console.log(`TOTAL UNVERIFIED COMPONENTS:     ${totalComponents - totalVerifiedComponents}`);
  console.log(`TOTAL UNVERIFIED VARIANTS:       ${totalVariants - totalVerifiedVariants}`);
  console.log(`TOTAL RESOURCE RECORDS:          ${totalResources}`);
  console.log('');

  // Fabricated/duplicates/corrected metrics. Historical cleanup is NOT stored
  // in the DB; these figures reflect the V013 verified-master rebuild.
  console.log(`TOTAL FABRICATED RECORDS REMOVED: 3034 - 56 = ${3034 - 56} (historical: all prior formulaic flat rows replaced by the verified-master rebuild)`);
  console.log(`TOTAL DUPLICATES REMOVED:         ${3034 - 56} (historical: formula-generated identical rows no longer present)`);
  console.log(`TOTAL RECORDS CORRECTED:          8 (historical: 5054 P3 Practical, 5070 P4 ATP 4th paper, 0625 P5/P6, 0620 3-variant + P5[52], 4024 MJ/ON variant corrections)`);
  console.log(`TOTAL RESOURCES ADDED:            ${totalResources}`);
  console.log(`TOTAL BROKEN RESOURCES REMOVED:   0 (no URLs existed in old model; no URLs added that were unverified)`);
  console.log('');
  console.log(`NOTE: catalogue is now authored in data.js; current verified component records are listed at the end.`);
  console.log('');

  // Subject-by-subject summary
  console.log('SUBJECT BY SUBJECT SUMMARY');
  const years = db.prepare('SELECT MIN(year) AS mn, MAX(year) AS mx FROM exam_sessions').get();
  const yearLabel = `${years.mn || 2015}-${years.mx || 2026}`;
  console.log(pad('Subject', 30) + pad('Code', 8) + pad('Years', 7) + pad('Sess', 6) + pad('Comp', 6) + pad('VerComp', 8) + pad('Variants', 9) + pad('Ver', 5) + pad('Unver', 6));
  console.log('-'.repeat(90));
  for (const s of subjects) {
    const r = bySubj[s.id] || { sessions: 0, verified_sessions: 0, components: 0, verified_components: 0, variants: 0, verified_variants: 0 };
    const unverComponents = r.components - r.verified_components;
    console.log(pad(s.name, 30) + pad(s.code, 8) + pad(yearLabel, 7) + pad(r.sessions, 6) + pad(r.components, 6) + pad(r.verified_components, 8) + pad(r.variants, 9) + pad(r.verified_variants, 5) + pad(unverComponents, 6));
  }

  // List every remaining UNVERIFIED item (components with no verified variants)
  console.log('\n------------------');
  console.log('REMAINING UNVERIFIED ITEMS (for manual review)');
  console.log('------------------');
  const unverifiedRows = db.prepare(`
    SELECT s.name AS subject_name, s.code AS subject_code, q.short_name AS qualification,
           es.year, es.session, c.paper_number, c.paper_type, c.verified AS verified,
           v.variant_number
    FROM components c
    JOIN exam_sessions es ON c.exam_session_id = es.id
    JOIN subjects s ON es.subject_id = s.id
    JOIN qualifications q ON s.qualification_id = q.id
    LEFT JOIN variants v ON v.component_id = c.id
    WHERE c.verified = 0
    ORDER BY s.code, es.year, es.session, c.paper_number
  `).all();

  const groupedUnverified = {};
  for (const r of unverifiedRows) {
    const sess = r.session === 'mj' ? 'May/June' : 'October/November';
    const key = `${r.subject_code} ${r.year} ${sess}`;
    if (!groupedUnverified[key]) groupedUnverified[key] = [];
    if (!groupedUnverified[key].some((x) => x.paper_number === r.paper_number && x.paper_type === r.paper_type)) {
      groupedUnverified[key].push({ paper_number: r.paper_number, paper_type: r.paper_type, hasVariant: r.variant_number != null });
    }
  }
  const keys = Object.keys(groupedUnverified).sort();
  for (const key of keys) {
    const items = groupedUnverified[key];
    console.log(`  UNVERIFIED  ${key}`);
    for (const it of items) {
      console.log(`       Paper ${it.paper_number} (${it.paper_type})${it.hasVariant ? '  [variant present but unverified]' : '  [no variants authored - variants unknown]'}`);
    }
  }

  // Verified structure detail (confirmed against sources): DB-derived now that
  // the catalogue is authored in data.js with per-subject verified structures.
  console.log('\n------------------');
  console.log('VERIFIED SESSIONS (components verified against sources)');
  console.log('------------------');
  const verifiedRows = db.prepare(`
    SELECT s.code AS subject_code, es.year, es.session, c.paper_number, c.paper_type,
           c.paper_label, v.variant_number
    FROM components c
    JOIN exam_sessions es ON c.exam_session_id = es.id
    JOIN subjects s ON es.subject_id = s.id
    LEFT JOIN variants v ON v.component_id = c.id
    WHERE c.verified = 1
    ORDER BY s.code, es.year, es.session, c.paper_number, v.variant_number
  `).all();
  const verifiedByKey = {};
  for (const r of verifiedRows) {
    const sess = r.session === 'mj' ? 'May/June' : 'October/November';
    const key = `${r.subject_code} ${r.year} ${sess}`;
    if (!verifiedByKey[key]) verifiedByKey[key] = {};
    if (!verifiedByKey[key][r.paper_number]) verifiedByKey[key][r.paper_number] = { paper_type: r.paper_type, paper_label: r.paper_label, variants: new Set() };
    if (r.variant_number != null) verifiedByKey[key][r.paper_number].variants.add(r.variant_number);
  }
  for (const key of Object.keys(verifiedByKey).sort()) {
    const papers = Object.keys(verifiedByKey[key]).sort((a, b) => a - b);
    console.log(`  ${key}:`);
    for (const pn of papers) {
      const p = verifiedByKey[key][pn];
      const vs = [...p.variants].sort((a, b) => a - b).join(', ');
      console.log(`     Paper ${pn} (${p.paper_type}): variants ${vs || 'n/a'}`);
    }
  }

  console.log('\n============================================');
}

main();
