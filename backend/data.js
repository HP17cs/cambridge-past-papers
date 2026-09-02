// Data-driven Cambridge catalogue.
//
// IMPORTANT DESIGN RULES (per the 28-point rebuild):
//   * The database is the single source of truth. Nothing here is generated
//     algorithmically and no variant pattern is shared across subjects or
//     sessions.
//   * A `component` = one Paper within a subject/session, identified by
//     (paper_number, paper_type). paper_type is genuine syllabus knowledge
//     for the subject, NOT copied from other subjects.
//   * A `variant` = a specific variant (e.g. 12) of a component. Variants are
//     only authored where there is explicit knowledge (web-verified) or where
//     they are stated per-subject. If a component's per-session variant list
//     is unknown it is omitted; absent data is never invented.
//   * `verified: true` is set ONLY for structures confirmed against
//     authoritative sources. Everything else is left unverified so it appears
//     in the final review list.
//
// Session field values: 'mj' = May/June, 'on' = October/November.

const qualifications = [
  { name: 'Cambridge O Level', short_name: 'O Level' },
  { name: 'Cambridge IGCSE', short_name: 'IGCSE' },
  { name: 'Cambridge AS Level', short_name: 'AS Level' },
  { name: 'Cambridge A Level', short_name: 'A Level' },
];

const SESSIONS = ['mj', 'on'];
const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

// ---------------------------------------------------------------------------
// Per-session structures that have been VERIFIED against authoritative/web
// sources during the audit. Key: `${code}|${year}|${session}`.
// Value: array of { paperNumber, paperType, variants, verified: true }.
// ---------------------------------------------------------------------------
const VERIFIED = {
  // ---- O Level Mathematics (Syllabus D) 4024 ----
  '4024|2025|mj': [
    { paperNumber: 1, paperType: 'theory', variants: [12, 13] },
    { paperNumber: 2, paperType: 'theory', variants: [22, 23] },
  ],
  '4024|2025|on': [
    { paperNumber: 1, paperType: 'theory', variants: [11, 12] },
    { paperNumber: 2, paperType: 'theory', variants: [21, 22] },
  ],
  // ---- IGCSE Physics 0625 ----
  '0625|2025|mj': [
    { paperNumber: 1, paperType: 'theory', variants: [11, 12, 13] },
    { paperNumber: 2, paperType: 'theory', variants: [21, 22, 23] },
    { paperNumber: 3, paperType: 'theory', variants: [31, 32, 33] },
    { paperNumber: 4, paperType: 'theory', variants: [41, 42, 43] },
    { paperNumber: 5, paperType: 'practical', variants: [51, 52, 53] },
    { paperNumber: 6, paperType: 'alternative_to_practical', variants: [61, 62, 63] },
  ],
  // ---- IGCSE Chemistry 0620 ----
  '0620|2025|on': [
    { paperNumber: 1, paperType: 'theory', variants: [11, 12, 13] },
    { paperNumber: 2, paperType: 'theory', variants: [21, 22, 23] },
    { paperNumber: 3, paperType: 'theory', variants: [31, 32, 33] },
    { paperNumber: 4, paperType: 'theory', variants: [41, 42, 43] },
    { paperNumber: 5, paperType: 'practical', variants: [52] },
    { paperNumber: 6, paperType: 'alternative_to_practical', variants: [61, 62, 63] },
  ],
  // ---- O Level Physics 5054 (Paper 3 = Practical Test) ----
  '5054|2025|mj': [
    { paperNumber: 1, paperType: 'theory', variants: [11, 12] },
    { paperNumber: 2, paperType: 'theory', variants: [21, 22] },
    { paperNumber: 3, paperType: 'practical', variants: [31, 32] },
  ],
  // ---- O Level Chemistry 5070 (Paper 4 = Alternative to Practical) ----
  '5070|2025|mj': [
    { paperNumber: 1, paperType: 'theory', variants: [11, 12] },
    { paperNumber: 2, paperType: 'theory', variants: [21, 22] },
    { paperNumber: 3, paperType: 'theory', variants: [31, 32] },
    { paperNumber: 4, paperType: 'alternative_to_practical', variants: [41, 42] },
  ],
  // ---- IGCSE Mathematics 0580 (Papers 1-4, all theory; Core/Extended) ----
  '0580|2025|mj': [
    { paperNumber: 1, paperType: 'theory', variants: [11, 12, 13] },
    { paperNumber: 2, paperType: 'theory', variants: [21, 22, 23] },
    { paperNumber: 3, paperType: 'theory', variants: [31, 32, 33] },
    { paperNumber: 4, paperType: 'theory', variants: [41, 42, 43] },
  ],
  // ---- IGCSE Physics 0625 - 2024 October/November ----
  '0625|2024|on': [
    { paperNumber: 1, paperType: 'theory', variants: [11, 12, 13] },
    { paperNumber: 2, paperType: 'theory', variants: [21, 22, 23] },
    { paperNumber: 3, paperType: 'theory', variants: [31, 32, 33] },
    { paperNumber: 4, paperType: 'theory', variants: [41, 42, 43] },
    { paperNumber: 5, paperType: 'practical', variants: [51, 52, 53] },
    { paperNumber: 6, paperType: 'alternative_to_practical', variants: [61, 62, 63] },
  ],
  // ---- IGCSE Physics 0625 - 2025 October/November ----
  '0625|2025|on': [
    { paperNumber: 1, paperType: 'theory', variants: [11, 12, 13] },
    { paperNumber: 2, paperType: 'theory', variants: [21, 22, 23] },
    { paperNumber: 3, paperType: 'theory', variants: [31, 32, 33] },
    { paperNumber: 4, paperType: 'theory', variants: [41, 42, 43] },
    { paperNumber: 5, paperType: 'practical', variants: [51, 52, 53] },
    { paperNumber: 6, paperType: 'alternative_to_practical', variants: [61, 62, 63] },
  ],
  // ---- IGCSE Biology 0610 - 2025 May/June ----
  '0610|2025|mj': [
    { paperNumber: 1, paperType: 'theory', variants: [11, 12, 13] },
    { paperNumber: 2, paperType: 'theory', variants: [21, 22, 23] },
    { paperNumber: 3, paperType: 'theory', variants: [31, 32, 33] },
    { paperNumber: 4, paperType: 'theory', variants: [41, 42, 43] },
    { paperNumber: 5, paperType: 'practical', variants: [51, 52, 53] },
    { paperNumber: 6, paperType: 'alternative_to_practical', variants: [61, 62, 63] },
  ],
};

// ---------------------------------------------------------------------------
// Subjects plus their syllabus-level component catalogue.
//
// `paperTypes`: map of paperNumber -> paper_type for the whole syllabus. This
// is genuine syllabus knowledge for the specific subject (not copied across
// subjects) and is used only to author the UNVERIFIED component rows that make
// up a subject's expected structure. VERIFIED sessions override these.
//
// `knownVariants`: optional explicit per-session variant knowledge that is
// subject-specific but not yet web-verified. Kept empty unless actually known.
// ---------------------------------------------------------------------------
const SUBJECTS = [
  {
    name: 'Mathematics (Syllabus D)', code: '4024', qualification: 'O Level',
    description: 'Cambridge O Level Mathematics develops logical reasoning and problem-solving skills.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Additional Mathematics', code: '4037', qualification: 'O Level',
    description: 'Cambridge O Level Additional Mathematics introduces calculus and further algebra.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Physics', code: '5054', qualification: 'O Level',
    description: 'Cambridge O Level Physics develops understanding of the physical world.',
    paperTypes: { 1: 'theory', 2: 'theory', 3: 'practical' },
  },
  {
    name: 'Chemistry', code: '5070', qualification: 'O Level',
    description: 'Cambridge O Level Chemistry helps learners understand the chemical world.',
    paperTypes: { 1: 'theory', 2: 'theory', 3: 'theory', 4: 'alternative_to_practical' },
  },
  {
    name: 'Biology', code: '5090', qualification: 'O Level',
    description: 'Cambridge O Level Biology develops ideas about life processes.',
    paperTypes: { 1: 'theory', 2: 'theory', 3: 'practical' },
  },
  {
    name: 'English Language', code: '1120', qualification: 'O Level',
    description: 'Cambridge O Level English Language develops reading, writing, and critical thinking.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'English Literature', code: '2010', qualification: 'O Level',
    description: 'Cambridge O Level English Literature encourages exploration of literary texts.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'French Language', code: '3010', qualification: 'O Level',
    description: 'Cambridge O Level French develops language skills for communication.',
    paperTypes: { 1: 'theory', 2: 'theory', 3: 'listening' },
  },
  {
    name: 'Geography', code: '2048', qualification: 'O Level',
    description: 'Cambridge O Level Geography explores the relationship between people and environment.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'History', code: '2172', qualification: 'O Level',
    description: 'Cambridge O Level History develops knowledge of historical events.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Computer Studies', code: '7010', qualification: 'O Level',
    description: 'Cambridge O Level Computer Studies develops understanding of computer principles.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Economics', code: '2281', qualification: 'O Level',
    description: 'Cambridge O Level Economics provides grounding in economic theory.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Business Studies', code: '7115', qualification: 'O Level',
    description: 'Cambridge O Level Business Studies introduces learners to business.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Commerce', code: '7100', qualification: 'O Level',
    description: 'Cambridge O Level Commerce covers trade, industry, and business activities.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Art and Design', code: '6010', qualification: 'O Level',
    description: 'Cambridge O Level Art and Design develops creative skills.',
    paperTypes: { 1: 'theory', 2: 'coursework' },
  },
  {
    name: 'Design and Technology', code: '6050', qualification: 'O Level',
    description: 'Cambridge O Level Design and Technology develops designing and making skills.',
    paperTypes: { 1: 'theory', 2: 'coursework' },
  },
  {
    name: 'Food and Nutrition', code: '6065', qualification: 'O Level',
    description: 'Cambridge O Level Food and Nutrition develops understanding of food and health.',
    paperTypes: { 1: 'theory', 2: 'practical' },
  },
  {
    name: 'Physical Education', code: '6005', qualification: 'O Level',
    description: 'Cambridge O Level Physical Education promotes healthy lifestyles.',
    paperTypes: { 1: 'theory', 2: 'coursework' },
  },
  {
    name: 'Agricultural Science', code: '5038', qualification: 'O Level',
    description: 'Cambridge O Level Agricultural Science covers farming and crop production.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Islamic Religious Studies', code: '2068', qualification: 'O Level',
    description: 'Cambridge O Level Islamic Religious Studies explores Islamic beliefs and practices.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  // ------------------------------- IGCSE -------------------------------
  {
    name: 'Mathematics', code: '0580', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Mathematics builds foundational mathematical skills.',
    paperTypes: { 1: 'theory', 2: 'theory', 3: 'theory', 4: 'theory' },
  },
  {
    name: 'Additional Mathematics', code: '0606', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Additional Mathematics introduces calculus and further topics.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Physics', code: '0625', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Physics develops understanding of the physical world.',
    paperTypes: { 1: 'theory', 2: 'theory', 3: 'theory', 4: 'theory', 5: 'practical', 6: 'alternative_to_practical' },
  },
  {
    name: 'Chemistry', code: '0620', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Chemistry helps learners understand the chemical world.',
    paperTypes: { 1: 'theory', 2: 'theory', 3: 'theory', 4: 'theory', 5: 'practical', 6: 'alternative_to_practical' },
  },
  {
    name: 'Biology', code: '0610', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Biology develops understanding of the living world.',
    paperTypes: { 1: 'theory', 2: 'theory', 3: 'theory', 4: 'theory', 5: 'practical', 6: 'alternative_to_practical' },
  },
  {
    name: 'English Language', code: '0510', qualification: 'IGCSE',
    description: 'Cambridge IGCSE English Language develops communication skills.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'English as a Second Language', code: '0511', qualification: 'IGCSE',
    description: 'Cambridge IGCSE English as a Second Language develops competence in English.',
    paperTypes: { 1: 'theory', 2: 'theory', 3: 'oral' },
  },
  {
    name: 'First Language English', code: '0990', qualification: 'IGCSE',
    description: 'Cambridge IGCSE First Language English develops high-level communication skills.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'English Literature', code: '0486', qualification: 'IGCSE',
    description: 'Cambridge IGCSE English Literature encourages critical reading.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Computer Science', code: '0478', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Computer Science covers computational thinking and programming.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Information and Communication Technology', code: '0417', qualification: 'IGCSE',
    description: 'Cambridge IGCSE ICT develops understanding of technology in society.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Economics', code: '0455', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Economics provides understanding of economic principles.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Business Studies', code: '0450', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Business Studies introduces business concepts.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Accounting', code: '0452', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Accounting develops skills in financial recording.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'French', code: '0520', qualification: 'IGCSE',
    description: 'Cambridge IGCSE French develops communication skills in French.',
    paperTypes: { 1: 'theory', 2: 'theory', 3: 'listening' },
  },
  {
    name: 'Geography', code: '0460', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Geography explores places, people, and the environment.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'History', code: '0470', qualification: 'IGCSE',
    description: 'Cambridge IGCSE History develops understanding of historical events.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Art and Design', code: '0400', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Art and Design develops creative and visual skills.',
    paperTypes: { 1: 'theory', 2: 'coursework' },
  },
  {
    name: 'Design and Technology', code: '0445', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Design and Technology develops problem-solving through design.',
    paperTypes: { 1: 'theory', 2: 'coursework' },
  },
  {
    name: 'Physical Education', code: '0413', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Physical Education promotes active lifestyles.',
    paperTypes: { 1: 'theory', 2: 'coursework' },
  },
  {
    name: 'Travel and Tourism', code: '0471', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Travel and Tourism covers the travel industry.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Environmental Management', code: '0680', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Environmental Management covers environmental issues.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Sociology', code: '0495', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Sociology explores social structures and issues.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Global Perspectives', code: '0457', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Global Perspectives develops critical thinking about global issues.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Enterprise', code: '0346', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Enterprise develops understanding of business enterprise.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
  {
    name: 'Islamic Studies', code: '0493', qualification: 'IGCSE',
    description: 'Cambridge IGCSE Islamic Studies explores Islamic beliefs and practices.',
    paperTypes: { 1: 'theory', 2: 'theory' },
  },
];

function sessionSeries(year, session) {
  const s = session === 'mj' ? 's' : 'w';
  const yy = String(year).slice(2);
  return `${s}${yy}`;
}

module.exports = {
  qualifications,
  SESSIONS,
  YEARS,
  SUBJECTS,
  VERIFIED,
  sessionSeries,
};
