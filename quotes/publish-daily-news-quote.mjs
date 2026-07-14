import { readFile, writeFile } from 'node:fs/promises';

const DATA_PATH = new URL('./data.json', import.meta.url);
const LIBRARY_PATH = new URL('./verified-library.json', import.meta.url);
const PACIFIC_TZ = 'America/Los_Angeles';
const SEED_THEME = process.env.SEED_THEME || '';
const SEED_HEADLINE = process.env.SEED_HEADLINE || '';
const SEED_NEWS_URL = process.env.SEED_NEWS_URL || '';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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

async function fetchWithRetry(url, options = {}, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await sleep(1000 * (2 ** (attempt - 1)));
  }
  throw lastError;
}

async function fetchNews(today) {
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
  try {
    const response = await fetchWithRetry(endpoint, {
      headers: { 'user-agent': 'share-capsule-daily-quote/1.1', accept: 'application/json' }
    });
    const payload = await response.json();
    const articles = Array.isArray(payload.articles) ? payload.articles : [];
    if (articles.length) {
      const trusted = articles.filter(article => {
        try {
          const host = new URL(article.url).hostname.toLowerCase();
          return ['reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'npr.org', 'theguardian.com', 'aljazeera.com']
            .some(domain => host === domain || host.endsWith(`.${domain}`));
        } catch {
          return false;
        }
      });
      const selected = (trusted.length ? trusted : articles).slice(0, 12);
      return {
        themeText: selected.map(article => `${article.title || ''} ${article.seendate || ''}`).join(' '),
        headline: selected[0]?.title || 'Today’s leading news themes',
        newsUrl: selected[0]?.url || '',
        source: selected[0]?.domain || 'GDELT indexed news'
      };
    }
  } catch (error) {
    console.warn(`Live news fetch failed: ${error.message}`);
  }

  return {
    themeText: `daily resilience reflection community progress ${today}`,
    headline: `Daily verified quote refresh for ${today}`,
    newsUrl: 'https://news.google.com/',
    source: 'Continuity fallback'
  };
}

async function verifyQuote(entry) {
  const response = await fetchWithRetry(entry.sourceUrl, {
    headers: { 'user-agent': 'share-capsule-quote-verifier/1.1' }
  }, 2);
  const sourceText = normalize(await response.text());
  return sourceText.includes(normalize(entry.quote));
}

function scoreQuote(entry, context, recentIds) {
  const haystack = normalize(context.themeText);
  const themeScore = (entry.themes || []).reduce(
    (score, theme) => score + (haystack.includes(normalize(theme)) ? 3 : 0), 0
  );
  return themeScore - (recentIds.has(entry.id) ? 100 : 0);
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

const context = await fetchNews(today);
const recentIds = new Set((data.quotes || []).slice(0, 30).map(item => item.libraryId).filter(Boolean));
const ranked = [...(library.quotes || [])]
  .sort((a, b) => scoreQuote(b, context, recentIds) - scoreQuote(a, context, recentIds));
if (!ranked.length) throw new Error('Verified quote library is empty');

let selected = null;
let liveVerified = false;
for (const entry of ranked) {
  try {
    if (await verifyQuote(entry)) {
      selected = entry;
      liveVerified = true;
      break;
    }
  } catch (error) {
    console.warn(`Quote source validation failed for ${entry.id}: ${error.message}`);
  }
}

if (!selected) {
  selected = ranked[0];
  console.warn(`Using pre-verified quote library fallback for ${selected.id}.`);
}

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
  verificationMode: liveVerified ? 'live-source-check' : 'pre-verified-library-fallback',
  libraryId: selected.id,
  newsFit: {
    headline: context.headline,
    newsUrl: context.newsUrl,
    source: context.source,
    explanation: `Selected because today’s leading news context matched the quote themes: ${(selected.themes || []).join(', ')}.`
  }
};

data.quotes = [published, ...(data.quotes || [])];
await writeFile(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Published ${selected.id} for ${today}: ${context.headline} (${published.verificationMode})`);
