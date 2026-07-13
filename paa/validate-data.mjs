import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile(new URL('./data.json', import.meta.url), 'utf8'));
const poems = data.poems || [];
const allowedSourceHosts = new Set(['ta.wikisource.org', 'ta.wikipedia.org', 'uyirmmai.com']);
const seenIds = new Set();
const seenDates = new Set();
const errors = [];

function validHttpsUrl(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function sourceAllowed(raw) {
  try {
    const url = new URL(raw);
    return allowedSourceHosts.has(url.hostname);
  } catch {
    return false;
  }
}

for (const poem of poems) {
  const label = poem.id || poem.title || 'unknown poem';
  if (!poem.id || seenIds.has(poem.id)) errors.push(`${label}: duplicate or missing id`);
  seenIds.add(poem.id);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(poem.date || '') || seenDates.has(poem.date)) {
    errors.push(`${label}: invalid or duplicate date`);
  }
  seenDates.add(poem.date);

  for (const field of ['title', 'author', 'authorDisplay', 'authorBio', 'sourceTitle', 'sourceType', 'verificationNote', 'verifiedOn', 'rightsNote']) {
    if (!String(poem[field] || '').trim()) errors.push(`${label}: missing ${field}`);
  }

  if (!validHttpsUrl(poem.sourceUrl) || !sourceAllowed(poem.sourceUrl)) {
    errors.push(`${label}: sourceUrl must be an allowlisted HTTPS source`);
  }
  if (!validHttpsUrl(poem.authorEncyclopediaUrl)) {
    errors.push(`${label}: missing valid author reference URL`);
  }

  const lines = poem.excerptLines || [];
  if (poem.contentType === 'collection-introduction' && lines.some(line => String(line).trim())) {
    errors.push(`${label}: copyrighted collection introduction must not include poem text`);
  }
  if (poem.contentType === 'public-domain-excerpt') {
    if (!lines.some(line => String(line).trim())) errors.push(`${label}: public-domain excerpt has no text`);
    if (!/பொது|பொதுரிமை|public domain|படைப்பாக்கப் பொதுமங்கள்/i.test(poem.rightsNote || '')) {
      errors.push(`${label}: rightsNote does not explain shareability`);
    }
  }
}

if (!poems.some(poem => poem.era === '21st-century')) errors.push('No 21st-century poetry entry remains');
if (!poems.some(poem => poem.era === 'heritage')) errors.push('No heritage poetry entry remains');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Validated ${poems.length} Tamil poetry entries: unique IDs/dates, author details, sources and shareability metadata are present.`);
