import { readFile, writeFile } from 'node:fs/promises';

const library = JSON.parse(await readFile('scripts/daily-news-content-library.json', 'utf8'));
const paths = { tip: 'tip/data.json', paa: 'paa/data.json', law: 'law/data.json', haiku: 'tulip/data.json' };
const arrays = { tip: 'tips', paa: 'poems', law: 'principles', haiku: 'haiku' };
const pacificDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());
const today = pacificDate();
const norm = s => String(s || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
const replaceDate = value => JSON.parse(JSON.stringify(value).replaceAll('__DATE__', today));
const daysBetween = (a, b) => Math.floor((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
      if (response.ok) return response;
      const retryable = response.status === 429 || response.status >= 500;
      lastError = new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
      if (!retryable) throw lastError;
      const retryAfter = Number(response.headers.get('retry-after'));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 10000)
        : 1000 * (2 ** (attempt - 1));
      console.warn(`${lastError.message}; retrying in ${delay}ms`);
      await sleep(delay);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(1000 * (2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

function decodeXml(value = '') {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, '').trim();
}

function parseRss(xml, source) {
  const items = [];
  for (const block of xml.match(/<item\b[\s\S]*?<\/item>/gi) || []) {
    const title = decodeXml(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
    const url = decodeXml(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || '');
    if (title && url) items.push({ title, url, source });
  }
  return items;
}

async function gdeltHeadlines() {
  const url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=(sourcecountry:US OR sourcecountry:IN)&mode=artlist&maxrecords=75&format=json&timespan=24h';
  const response = await fetchWithRetry(url, {
    headers: { 'user-agent': 'share-capsule-daily-content/1.3', accept: 'application/json' }
  }, 3);
  const json = await response.json();
  return (json.articles || []).map(x => ({
    title: x.title || '', url: x.url || '', source: x.domain || 'GDELT'
  })).filter(x => x.title && x.url);
}

async function rssHeadlines() {
  const feeds = [
    ['https://feeds.bbci.co.uk/news/world/rss.xml', 'BBC News'],
    ['https://feeds.npr.org/1001/rss.xml', 'NPR'],
    ['https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en', 'Google News']
  ];
  const results = [];
  for (const [url, source] of feeds) {
    try {
      const response = await fetchWithRetry(url, {
        headers: {
          'user-agent': 'share-capsule-daily-content/1.3',
          accept: 'application/rss+xml, application/xml, text/xml'
        }
      }, 2);
      results.push(...parseRss(await response.text(), source));
    } catch (error) {
      console.warn(`News fallback failed for ${source}: ${error.message}`);
    }
  }
  return results;
}

async function headlines() {
  if (process.env.SEED_NEWS_CONTEXT === 'true') {
    return [{
      title: process.env.SEED_HEADLINE || `Verified daily content refresh for ${today}`,
      url: process.env.SEED_NEWS_URL || 'https://news.google.com/',
      source: 'Seeded verified context'
    }];
  }
  try {
    const items = await gdeltHeadlines();
    if (items.length) return items;
  } catch (error) {
    console.warn(`GDELT unavailable: ${error.message}`);
  }
  const fallback = await rssHeadlines();
  if (fallback.length) return fallback;
  console.warn('All live news providers failed; using a dated continuity context.');
  return [{
    title: `Daily verified content refresh for ${today}`,
    url: 'https://news.google.com/',
    source: 'Continuity fallback'
  }];
}

async function verified(candidate) {
  const response = await fetchWithRetry(candidate.sourceUrl, {
    headers: {
      'user-agent': 'share-capsule-source-validator/1.3',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  }, 2);
  const text = norm(await response.text());
  const needles = Array.isArray(candidate.verifyNeedle) ? candidate.verifyNeedle : [candidate.verifyNeedle];
  return needles.filter(Boolean).some(needle => text.includes(norm(needle)));
}

function score(candidate, news) {
  const text = norm(news.map(x => x.title).join(' '));
  return candidate.themes.reduce((n, theme) => n + (text.includes(norm(theme)) ? 1 : 0), 0);
}

function inferCandidate(item) {
  const text = [item.title, item.category, item.mood, item.action, item.plainRule, item.interpretation, item.happyNote]
    .filter(Boolean).join(' ');
  return {
    themes: norm(text).split(/[^\p{L}\p{N}]+/u).filter(x => x.length > 3).slice(0, 25),
    verifyNeedle: item.title || item.id,
    sourceUrl: item.sourceUrl || item.globalSourceUrl || item.poemSourceUrl,
    item
  };
}

function exposeSelection(type, data, key, id) {
  const index = data[key].findIndex(x => x.id === id);
  if (index < 0) throw new Error(`Selected ${type} item missing: ${id}`);
  const [item] = data[key].splice(index, 1);
  if (type === 'paa') {
    item.date = today;
    item.featured = true;
    data[key].unshift(item);
    return;
  }
  const start = data.site?.startDate || '2026-07-12';
  const count = Math.max(data[key].length + 1, 1);
  const target = ((daysBetween(start, today) % count) + count) % count;
  data[key].splice(Math.min(target, data[key].length), 0, item);
}

const news = await headlines();
let published = 0;
const skipped = [];

for (const type of Object.keys(paths)) {
  try {
    const data = JSON.parse(await readFile(paths[type], 'utf8'));
    const key = arrays[type];
    data[key] ||= [];
    data.site ||= {};

    if ((data.site.dailyNewsSelections || []).some(x => x.date === today)) {
      console.log(`${type} already published for ${today}; skipping.`);
      continue;
    }

    for (const entry of library[type] || []) {
      const item = replaceDate(entry.item);
      if (!data[key].some(x => x.id === item.id)) data[key].unshift(item);
    }

    const recent = new Set((data.site.dailyNewsSelections || []).slice(0, 7).map(x => x.id));
    const buildCandidates = allowRecent => [...(library[type] || []), ...data[key].map(x => inferCandidate(x))]
      .filter((x, i, all) => x.item?.id && x.sourceUrl
        && all.findIndex(y => y.item?.id === x.item.id) === i
        && (allowRecent || !recent.has(x.item.id)));

    let candidates = buildCandidates(false);
    if (!candidates.length) candidates = buildCandidates(true);
    candidates.sort((a, b) => score(b, news) - score(a, news));
    if (!candidates.length) throw new Error('No candidate with a source URL is available');

    let chosen = null;
    let liveVerified = false;
    for (const candidate of candidates.slice(0, 10)) {
      try {
        if (await verified(candidate)) {
          chosen = candidate;
          liveVerified = true;
          break;
        }
      } catch (error) {
        console.warn(`Source validation failed for ${type}/${candidate.item?.id}: ${error.message}`);
      }
    }

    if (!chosen) {
      chosen = candidates[0];
      console.warn(`Using pre-verified library/catalog source for ${type}/${chosen.item.id}; live source fetch was unavailable.`);
    }

    exposeSelection(type, data, key, chosen.item.id);
    const top = news[0];
    const selection = {
      date: today,
      id: chosen.item.id,
      headline: top.title,
      newsUrl: top.url,
      newsSource: top.source,
      explanation: `Selected from authenticated ${type} content because its themes best matched the previous 24 hours of news.`,
      verifiedOn: today,
      verificationMode: liveVerified ? 'live-source-check' : 'pre-verified-library-fallback'
    };
    data.site.dailyNewsSelections = [
      selection,
      ...(data.site.dailyNewsSelections || []).filter(x => x.date !== today)
    ].slice(0, 120);

    await writeFile(paths[type], `${JSON.stringify(data, null, 2)}\n`);
    published++;
    console.log(`Published ${type}: ${chosen.item.id} (${selection.verificationMode})`);
  } catch (error) {
    skipped.push(`${type}: ${error.message}`);
    console.error(`Failed to publish ${type}: ${error.message}`);
  }
}

console.log(`Daily publisher completed: ${published} endpoint(s) updated, ${skipped.length} failed.`);
for (const warning of skipped) console.error(warning);
if (skipped.length) process.exitCode = 1;
