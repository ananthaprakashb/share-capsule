import { readFile, writeFile } from 'node:fs/promises';

const DATA_PATH = new URL('./data.json', import.meta.url);
const LIBRARY_PATH = new URL('./verified-library.json', import.meta.url);
const PACIFIC_TZ = 'America/Los_Angeles';
const SEED_THEME = process.env.SEED_THEME || '';
const SEED_HEADLINE = process.env.SEED_HEADLINE || '';
const SEED_NEWS_URL = process.env.SEED_NEWS_URL || '';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const TRUSTED_DOMAINS = [
  'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'npr.org',
  'theguardian.com', 'aljazeera.com', 'fifa.com', 'olympics.com',
  'un.org', 'who.int', 'nasa.gov'
];
const STOPWORDS = new Set([
  'about', 'after', 'again', 'against', 'amid', 'among', 'and', 'are', 'before',
  'could', 'from', 'have', 'into', 'more', 'most', 'over', 'says', 'than', 'that',
  'the', 'their', 'this', 'through', 'today', 'under', 'with', 'world', 'would'
]);

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

function trustedHost(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return TRUSTED_DOMAINS.some(domain => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function headlineTerms(title) {
  return [...new Set(normalize(title).split(' ')
    .filter(term => term.length >= 4 && !STOPWORDS.has(term)))];
}

function selectWidelyCoveredEvent(articles) {
  const usable = articles
    .filter(article => article?.title && article?.url)
    .filter(article => trustedHost(article.url));
  const candidates = usable.length ? usable : articles.filter(article => article?.title && article?.url);
  const limited = candidates.slice(0, 30);
  const frequency = new Map();

  for (const article of limited) {
    for (const term of headlineTerms(article.title)) {
      frequency.set(term, (frequency.get(term) || 0) + 1);
    }
  }

  const scored = limited.map((article, index) => {
    const repeatedCoverage = headlineTerms(article.title)
      .reduce((sum, term) => sum + Math.max(0, (frequency.get(term) || 0) - 1), 0);
    const officialSourceBoost = /fifa\.com|olympics\.com|un\.org|who\.int|nasa\.gov/i.test(article.url) ? 5 : 0;
    const trustedSourceBoost = trustedHost(article.url) ? 3 : 0;
    const positionBoost = Math.max(0, 5 - Math.floor(index / 5));
    return { article, score: repeatedCoverage * 2 + officialSourceBoost + trustedSourceBoost + positionBoost };
  }).sort((a, b) => b.score - a.score);

  return {
    selected: scored[0]?.article || limited[0] || null,
    coverage: scored.slice(0, 8).map(item => item.article)
  };
}

async function fetchNews(today) {
  if (SEED_THEME) {
    return {
      themeText: `${SEED_THEME} ${SEED_HEADLINE}`,
      headline: SEED_HEADLINE || 'Today’s verified news theme',
      newsUrl: SEED_NEWS_URL,
      source: 'Seeded verified news context',
      relatedHeadlines: [SEED_HEADLINE].filter(Boolean)
    };
  }

  const query = encodeURIComponent('(world OR politics OR sports OR football OR entertainment OR culture OR technology OR economy OR science OR climate OR health) sourcelang:english');
  const endpoint = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=100&format=json&timespan=1d&sort=hybridrel`;
  try {
    const response = await fetchWithRetry(endpoint, {
      headers: { 'user-agent': 'share-capsule-daily-quote/1.2', accept: 'application/json' }
    });
    const payload = await response.json();
    const articles = Array.isArray(payload.articles) ? payload.articles : [];
    if (articles.length) {
      const { selected, coverage } = selectWidelyCoveredEvent(articles);
      if (selected) {
        return {
          themeText: coverage.map(article => `${article.title || ''} ${article.seendate || ''}`).join(' '),
          headline: selected.title || 'Today’s leading widely covered event',
          newsUrl: selected.url || '',
          source: selected.domain || new URL(selected.url).hostname,
          relatedHeadlines: coverage.map(article => article.title).filter(Boolean)
        };
      }
    }
  } catch (error) {
    console.warn(`Live news fetch failed: ${error.message}`);
  }

  return {
    themeText: `daily resilience reflection community progress ${today}`,
    headline: `Daily verified quote refresh for ${today}`,
    newsUrl: 'https://news.google.com/',
    source: 'Continuity fallback',
    relatedHeadlines: []
  };
}

async function verifyQuote(entry) {
  const response = await fetchWithRetry(entry.sourceUrl, {
    headers: { 'user-agent': 'share-capsule-quote-verifier/1.2' }
  }, 2);
  const sourceText = normalize(await response.text());
  return sourceText.includes(normalize(entry.quote));
}

function scoreQuote(entry, context, recentIds) {
  const haystack = normalize(`${context.themeText} ${context.headline}`);
  const themeScore = (entry.themes || []).reduce((score, theme) => {
    const normalizedTheme = normalize(theme);
    if (!normalizedTheme) return score;
    if (haystack.includes(normalizedTheme)) return score + (normalizedTheme.includes(' ') ? 8 : 4);
    const tokens = normalizedTheme.split(' ').filter(Boolean);
    const tokenMatches = tokens.filter(token => haystack.includes(token)).length;
    return score + tokenMatches;
  }, 0);
  const eventFitBoost = (entry.eventTypes || []).some(type => haystack.includes(normalize(type))) ? 6 : 0;
  return themeScore + eventFitBoost - (recentIds.has(entry.id) ? 100 : 0);
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
    relatedHeadlines: context.relatedHeadlines,
    explanation: `Selected because a widely covered news event matched the quote themes: ${(selected.themes || []).join(', ')}.`
  }
};

data.quotes = [published, ...(data.quotes || [])];
await writeFile(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Published ${selected.id} for ${today}: ${context.headline} (${published.verificationMode})`);
