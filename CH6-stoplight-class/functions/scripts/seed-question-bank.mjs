import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

function tokenizeCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') { row.push(field); field = ''; }
    else if (character === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += character;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function parseCsv(text) {
  const rows = tokenizeCsv(text.replace(/^\uFEFF/, ''));
  const headers = rows.shift().map((header) => header.trim());
  return rows.filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(headers.map((header, index) => [header, String(row[index] || '').trim()])));
}

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'demo-stoplight-class';
initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();
const csvPath = new URL('../../data/scenario_bank260423.csv', import.meta.url);
const rows = parseCsv(await fs.readFile(csvPath, 'utf8'));
const batch = db.batch();
let count = 0;

for (const [index, row] of rows.entries()) {
  const id = String(row.item_id || '').trim();
  const signal = String(row.signal || '').trim().toLowerCase();
  const tier = String(row.tier || '').trim().toLowerCase();
  if (!id || !['basic', 'advanced'].includes(tier) || !['red', 'yellow', 'green'].includes(signal) || !row.scenario_text) continue;
  batch.set(db.collection('questionBank').doc(id), {
    tier,
    signal,
    scenarioText: row.scenario_text,
    answerExplanation: row.answer_explanation || '',
    feedbackText: row.feedback_text || '',
    sourceOrder: index,
    version: '260423',
    active: true
  });
  count += 1;
}

await batch.commit();
process.stdout.write(`Seeded ${count} questions into ${projectId}.\n`);
