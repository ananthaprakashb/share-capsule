import { readFile, writeFile } from 'node:fs/promises';

const DATA_PATH = new URL('./data.json', import.meta.url);
const LIBRARY_PATH = new URL('./verified-library.json', import.meta.url);
const PACIFIC_TZ = 'America/Los_Angeles';
const SEED_THEME = process.env.SEED_THEME || '';
const SEED_HEADLINE = process.env.SEED_HEADLINE || '';
const SEED_NEWS_URL = process.env.SEED_NEWS_URL || '';

const normalize = value => String(value || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function pacificDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PACIFIC_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

async function fetchNews() {
  if (SEED_THEME) {
    return {
      themeText: `${SEED_THEME} ${SEED_HEADLINE}`,
      headline: SEED_HEADLINE || 'Today’s verified news theme',
      newsUrl: SEED_NEWS_URL,
      source: 'Seeded verified news context'
    };
  }

  const query = encodeURIComponent('(world OR technology OR economy OR science OR climate OR health) sourcelang:english');
  const endpoint = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=50&format=json&timespan=1d&sort=hybridrel`;
  const response = await fetch(endpoint, { headers: { 'user-agent': 'share-capsule-daily-quote/1.0' } });
  if (!response.ok) throw new Error(`News feed HTTP ${response.status}`);
  const payload = await response.json();
  const articles = Array.isArray(payload.articles) ? payload.articles : [];
  if (!articles.length) throw new Error('No current news articles were returned');

  const trusted = articles.filter(article => {
    try {
      const host = new URL(article.url).hostname.toLowerCase();
      return ['reuters.com','apnews.com','bbc.com','bbc.co.uk','npr.org','theguardian.com','aljazeera.com'].some(domain => host === domain || host.endsWith(`.${domain}`));
    } catch {
      return false;
    }
  });
  const pool = trusted.length ? trusted : articles;
  const selected = pool.slice(0, 12);
  return {
    themeText: selected.map(article => `${article.title || ''} ${article.seendate || ''}`).join(' '),
    headline: selected[0]?.title || 'Today’s leading news themes',
    newsUrl: selected[0]?.url || '',
    source: selected[0]?.domain || 'GDELT indexed news'
  };
}

async function verifyQuote(entry) {
  const response = await fetch(entry.sourceUrl, { headers: { 'user-agent': 'share-capsule-quote-verifier/1.0' } });
  if (!response.ok) return false;
  const sourceText = normalize(await response.text());
  const quoteText = normalize(entry.quote);
  return sourceText.includes(quoteText);
}

function scoreQuote(entry, context, recentIds) {
  const haystack = normalize(context.themeText);
  const themeScore = (entry.themes || []).reduce((score, theme) => score + (haystack.includes(normalize(theme)) ? 3 : 0), 0);
  const recencyPenalty = recentIds.has(entry.id) ? 100 : 0;
  return themeScore - recencyPenalty;
}

const [data, library] = await Promise.all([
  readFile(DATA_PATH, 'utf8').then(JSON.parse),
  readFile(LIBRARY_PATH, 'utf8').then(JSON.parse)
]);

const today = pacificDate();
if ((data.quotes || []).some(item => item.date === today)) {
  console.log(`Quote already exists for ${today}; nothing to publish.`);
  process.exit(0);
}

const context = await fetchNews();
const recentIds = new Set((data.quotes || []).slice(0, 30).map(item => item.libraryId).filter(Boolean));
const ranked = [...(library.quotes || [])].sort((a, b) => scoreQuote(b, context, recentIds) - scoreQuote(a, context, recentIds));

let selected = null;
for (const entry of ranked) {
  if (await verifyQuote(entry)) {
    selected = entry;
    break;
  }
}
if (!selected) throw new Error('No quote passed source verification');

const published = {
  date: today,
  quote: selected.quote,
  author: selected.author,
  authorBio: selected.authorBio,
  authorEncyclopediaUrl: selected.authorEncyclopediaUrl,
  sourceTitle: selected.sourceTitle,
  sourceUrl: selected.sourceUrl,
  sourceType: selected.sourceType,
  verificationNote: selected.verificationNote,
  verifiedOn: today,
  libraryId: selected.id,
  newsFit: {
    headline: context.headline,
    newsUrl: context.newsUrl,
    source: context.source,
    explanation: `Selected because today’s leading news context matched the quote themes: ${(selected.themes || []).join(', ')}.`
  }
};

data.quotes = [published, ...(data.quotes || [])];
await writeFile(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`Published ${selected.id} for ${today}: ${context.headline}`);
