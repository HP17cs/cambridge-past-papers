const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'cambridge.db');
const buf = fs.readFileSync(dbPath);

console.log(`DB file size: ${buf.length} bytes`);

// Heuristic: look for ASCII runs that look like old paper records.
// Cambridge component codes like "4024/23" or series codes like "4024_s25".
const codeRe = /\b\d{4}\/\d{1,2}\b/g;
const seriesRe = /\b\d{4}[_](?:s|w|m|f)\d{2}\b/g;
const qpRe = /\b\d{4}[_](?:s|w|m|f)\d{2}[_]qp[_]\d{2,3}\b/g;

const matches = [];
for (let i = 0; i < buf.length; i++) {
  if (i % 100000 === 0) process.stdout.write('.');
}

// Sliding: search by decoding ASCII chunks
let chunk = buf.toString('latin1');
const codeMatches = chunk.match(codeRe) || [];
const msMatches = chunk.match(/\b\d{4}[_](?:s|w|m|f)\d{2}[_](?:ms|qp|er)[_]\d{2,3}\b/g) || [];
const yearMatch = chunk.match(/\b(202[0-9])\b/g) || [];

console.log('\n--- diagnostic counts of substring hits in DB file ---');
console.log('bare 4-digit/component patterns (XXXX/YY):', codeMatches.length);
console.log('sample:', codeMatches.slice(0, 20));
console.log('series-like patterns (XXXX_s25_ms_12):', msMatches.length);
console.log('sample:', msMatches.slice(0, 20));
console.log('year tokens 2020-2026:', yearMatch.length);
