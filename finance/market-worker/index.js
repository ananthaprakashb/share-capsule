const POLYGON_BASE = 'https://api.polygon.io';
const SEC_BASE = 'https://data.sec.gov';
const CACHE_SECONDS = 120;
const ALLOWED_ORIGINS = new Set(['https://finance.sharecapsule.app', 'https://sharecapsule.app']);
const HIGH_WORDS = ['earnings','guidance','acquisition','acquire','merger','fda','lawsuit','investigation','bankruptcy','offering','buyback','repurchase','dividend','ceo','cfo','cyber','breach','recall','restatement','default','contract'];
const MEDIUM_WORDS = ['upgrade','downgrade','price target','analyst','partnership','launch','approval','forecast','restructuring','layoff','settlement'];
const HIGH_FORMS = new Set(['8-K','10-Q','10-K','S-1','S-3','424B2','424B3','424B4','424B5']);
const MEDIUM_FORMS = new Set(['DEF 14A','SC 13D','SC 13G','4']);

function cors(origin) {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : '';
  return {
    ...(allowed ? {'Access-Control-Allow-Origin': allowed} : {}),
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(body, status, origin, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...cors(origin),
      ...extra
    }
  });
}

async function polygon(path, apiKey) {
  const join = path.includes('?') ? '&' : '?';
  const response = await fetch(`${POLYGON_BASE}${path}${join}apiKey=${encodeURIComponent(apiKey)}`, {
    headers: {'Accept': 'application/json'},
    cf: {cacheTtl: 60, cacheEverything: true}
  });
  if (!response.ok) throw new Error(`Market provider returned ${response.status}`);
  return response.json();
}

function impactFromText(title, description) {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  const high = HIGH_WORDS.find(word => text.includes(word));
  if (high) return {impact: 'high', reason: `Contains a commonly market-sensitive event/topic: ${high}.`};
  const medium = MEDIUM_WORDS.find(word => text.includes(word));
  if (medium) return {impact: 'medium', reason: `Contains a potentially relevant investor catalyst: ${medium}.`};
  return {impact: 'low', reason: 'Recent ticker-linked coverage; no high-priority catalyst keyword was detected.'};
}

function normalizeNews(ticker, results) {
  return (Array.isArray(results) ? results : []).slice(0, 15).map(article => {
    const insight = Array.isArray(article.insights) ? article.insights.find(item => String(item.ticker || '').toUpperCase() === ticker) : null;
    const scored = impactFromText(article.title, article.description);
    return {
      id: article.id,
      title: article.title || 'Untitled article',
      summary: article.description || '',
      publisher: article.publisher?.name || 'Publisher',
      publishedAt: article.published_utc || null,
      url: article.article_url || article.amp_url || '',
      sentiment: String(insight?.sentiment || 'neutral').toLowerCase(),
      sentimentReason: insight?.sentiment_reasoning || '',
      impact: scored.impact,
      impactReason: scored.reason
    };
  }).filter(item => item.url);
}

function secFilingUrl(cik, accession, primaryDocument) {
  if (!cik || !accession || !primaryDocument) return '';
  const cikPath = String(Number(cik));
  const accessionPath = String(accession).replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${cikPath}/${accessionPath}/${encodeURIComponent(primaryDocument)}`;
}

async function secFilings(cik, userAgent) {
  if (!cik || !userAgent) return [];
  const padded = String(cik).padStart(10, '0');
  const response = await fetch(`${SEC_BASE}/submissions/CIK${padded}.json`, {
    headers: {'Accept': 'application/json', 'User-Agent': userAgent, 'Accept-Encoding': 'gzip, deflate'},
    cf: {cacheTtl: 60, cacheEverything: true}
  });
  if (!response.ok) return [];
  const data = await response.json();
  const recent = data.filings?.recent || {};
  const forms = recent.form || [];
  const accession = recent.accessionNumber || [];
  const docs = recent.primaryDocument || [];
  const dates = recent.filingDate || [];
  const descriptions = recent.primaryDocDescription || [];
  const accepted = recent.acceptanceDateTime || [];
  const filings = [];
  for (let i = 0; i < forms.length && filings.length < 12; i++) {
    const form = forms[i];
    if (!HIGH_FORMS.has(form) && !MEDIUM_FORMS.has(form)) continue;
    filings.push({
      form,
      filed: dates[i] || '',
      acceptedAt: accepted[i] || null,
      description: descriptions[i] || `SEC Form ${form}`,
      impact: HIGH_FORMS.has(form) ? 'high' : 'medium',
      url: secFilingUrl(cik, accession[i], docs[i])
    });
  }
  return filings;
}

function normalizedQuote(snapshot) {
  const ticker = snapshot?.ticker || {};
  const day = ticker.day || {};
  const price = ticker.lastTrade?.p ?? day.c ?? null;
  const updated = ticker.updated ? new Date(Number(ticker.updated) / 1e6).toISOString() : null;
  return {
    price,
    change: ticker.todaysChange ?? null,
    changePercent: ticker.todaysChangePerc ?? null,
    open: day.o ?? null,
    high: day.h ?? null,
    low: day.l ?? null,
    close: day.c ?? null,
    volume: day.v ?? null,
    asOf: updated
  };
}

async function buildPayload(symbol, env) {
  const [snapshot, news, details] = await Promise.all([
    polygon(`/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(symbol)}`, env.POLYGON_API_KEY),
    polygon(`/v2/reference/news?ticker=${encodeURIComponent(symbol)}&limit=15&sort=published_utc&order=desc`, env.POLYGON_API_KEY),
    polygon(`/v3/reference/tickers/${encodeURIComponent(symbol)}`, env.POLYGON_API_KEY)
  ]);
  const company = details?.results || {};
  const filings = await secFilings(company.cik, env.SEC_USER_AGENT);
  return {
    ticker: symbol,
    company: {name: company.name || symbol, exchange: company.primary_exchange || null, cik: company.cik || null},
    quote: normalizedQuote(snapshot),
    news: normalizeNews(symbol, news?.results),
    filings,
    generatedAt: new Date().toISOString(),
    privacy: 'Public market data response. No user finance data is accepted or stored by this application endpoint.'
  };
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors(origin)});
    if (request.method !== 'GET') return json({error: 'Method not allowed'}, 405, origin, {'Cache-Control':'no-store'});
    if (origin && !ALLOWED_ORIGINS.has(origin)) return json({error: 'Origin not allowed'}, 403, origin, {'Cache-Control':'no-store'});
    if (!env.POLYGON_API_KEY) return json({error: 'Market provider is not configured'}, 503, origin, {'Cache-Control':'no-store'});

    const url = new URL(request.url);
    if (url.pathname !== '/v1/ticker') return json({error: 'Not found'}, 404, origin, {'Cache-Control':'no-store'});
    const symbol = String(url.searchParams.get('symbol') || '').trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) return json({error: 'Invalid ticker symbol'}, 400, origin, {'Cache-Control':'no-store'});

    const cache = caches.default;
    const cacheKey = new Request(`https://public-market-cache.sharecapsule.invalid/v1/ticker/${encodeURIComponent(symbol)}`);
    const cached = await cache.match(cacheKey);
    if (cached) {
      const response = new Response(cached.body, cached);
      Object.entries(cors(origin)).forEach(([key,value]) => value && response.headers.set(key,value));
      response.headers.set('X-ShareCapsule-Cache', 'HIT');
      return response;
    }

    try {
      const payload = await buildPayload(symbol, env);
      const response = json(payload, 200, origin, {'Cache-Control':`public, max-age=60, s-maxage=${CACHE_SECONDS}`,'X-ShareCapsule-Cache':'MISS'});
      const cacheCopy = new Response(response.body, response);
      cacheCopy.headers.delete('Access-Control-Allow-Origin');
      cacheCopy.headers.delete('Vary');
      ctx.waitUntil(cache.put(cacheKey, cacheCopy.clone()));
      return response;
    } catch (error) {
      return json({error: error?.message || 'Unable to load public market data'}, 502, origin, {'Cache-Control':'no-store'});
    }
  }
};
