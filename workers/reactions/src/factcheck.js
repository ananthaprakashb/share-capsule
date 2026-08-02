const MAX_QUERY_LENGTH = 5000;
const MAX_VIDEO_URL_LENGTH = 2048;
const CACHE_TTL_SECONDS = 21600;
const DAILY_LIMIT = 30;

function cleanText(value, maxLength) {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength + 1);
}

function safeHttpUrl(value) {
  const raw = cleanText(value, MAX_VIDEO_URL_LENGTH);
  if (!raw || raw.length > MAX_VIDEO_URL_LENGTH) return null;
  try {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    if (url.port && !['80', '443'].includes(url.port)) return null;
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (!host || host === 'localhost' || host.endsWith('.local') || /^127\.|^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return null;
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

function safeResultUrl(value) {
  const url = safeHttpUrl(value);
  return url ? url.toString() : '';
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function enforceRateLimit(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const key = new Request(`https://rate-limit.invalid/factcheck/${await sha256(`${ip}:${day}`)}`);
  const cache = caches.default;
  const current = await cache.match(key);
  const count = current ? Number(await current.text()) || 0 : 0;
  if (count >= DAILY_LIMIT) return false;
  await cache.put(key, new Response(String(count + 1), { headers: { 'Cache-Control': 'max-age=86400' } }));
  return true;
}

async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: request.headers.get('CF-Connecting-IP') || undefined
    })
  });
  if (!response.ok) return false;
  const result = await response.json();
  return result?.success === true;
}

function normalizeClaimReview(claim, review) {
  const url = safeResultUrl(review?.url);
  if (!url) return null;
  const publisher = cleanText(review?.publisher?.name || new URL(url).hostname, 160);
  return {
    claim: cleanText(claim?.text, 1000),
    claimant: cleanText(claim?.claimant, 240),
    claimDate: cleanText(claim?.claimDate, 40),
    publisher,
    publisherSite: cleanText(review?.publisher?.site, 200),
    title: cleanText(review?.title || `${publisher} fact check`, 300),
    rating: cleanText(review?.textualRating, 160),
    reviewDate: cleanText(review?.reviewDate, 40),
    languageCode: cleanText(review?.languageCode, 20),
    url
  };
}

function normalizeGoogleResponse(data) {
  const matches = [];
  for (const claim of Array.isArray(data?.claims) ? data.claims : []) {
    for (const review of Array.isArray(claim?.claimReview) ? claim.claimReview : []) {
      const normalized = normalizeClaimReview(claim, review);
      if (normalized) matches.push(normalized);
    }
  }
  return matches.slice(0, 20);
}

async function searchPublishedFactChecks(query, env) {
  const params = new URLSearchParams({
    query,
    languageCode: 'en',
    pageSize: '20',
    key: env.GOOGLE_FACT_CHECK_API_KEY
  });
  const cacheKey = new Request(`https://factcheck-cache.invalid/search/${await sha256(query.toLowerCase())}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return { matches: await cached.json(), cached: true };

  const response = await fetch(`https://factchecktools.googleapis.com/v1alpha1/claims:search?${params}`, {
    headers: { accept: 'application/json' }
  });
  if (!response.ok) {
    let message = 'Published fact-check search is temporarily unavailable.';
    try {
      const body = await response.json();
      if (response.status === 403) message = 'Google Fact Check API access is not configured correctly.';
      else if (response.status === 429) message = 'Published fact-check search quota has been reached. Please try again later.';
      console.error('Google Fact Check API error', response.status, body?.error?.status, body?.error?.message);
    } catch {}
    const error = new Error(message);
    error.status = response.status === 429 ? 429 : 502;
    throw error;
  }

  const matches = normalizeGoogleResponse(await response.json());
  await cache.put(cacheKey, new Response(JSON.stringify(matches), {
    headers: { 'content-type': 'application/json', 'Cache-Control': `max-age=${CACHE_TTL_SECONDS}` }
  }));
  return { matches, cached: false };
}

export async function handleFactCheck(request, env, json) {
  if (!env.GOOGLE_FACT_CHECK_API_KEY) {
    return json(request, { error: 'Published fact-check search is not configured. Add GOOGLE_FACT_CHECK_API_KEY to the Worker secrets.' }, 503);
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 32 * 1024) return json(request, { error: 'The submission is too large.' }, 413);

  let payload;
  try { payload = await request.json(); } catch { return json(request, { error: 'Request body must be valid JSON.' }, 400); }

  if (!(await verifyTurnstile(request, env, cleanText(payload?.turnstileToken, 2048)))) {
    return json(request, { error: 'Human verification failed. Refresh the page and try again.' }, 403);
  }
  if (!(await enforceRateLimit(request))) {
    return json(request, { error: `Daily search limit reached. Try again tomorrow.` }, 429);
  }

  const claim = cleanText(payload?.claim, MAX_QUERY_LENGTH);
  const rawVideoUrl = cleanText(payload?.videoUrl, MAX_VIDEO_URL_LENGTH);
  const videoUrl = rawVideoUrl ? safeHttpUrl(rawVideoUrl) : null;

  if (claim.length > MAX_QUERY_LENGTH) return json(request, { error: 'Keep the search text under 5,000 characters.' }, 413);
  if (rawVideoUrl && !videoUrl) return json(request, { error: 'Provide a valid public HTTP or HTTPS video link.' }, 400);
  if (!claim && !videoUrl) return json(request, { error: 'Paste a claim or provide a public video link.' }, 400);

  const query = cleanText([claim, videoUrl ? videoUrl.toString() : ''].filter(Boolean).join(' '), MAX_QUERY_LENGTH);
  try {
    const result = await searchPublishedFactChecks(query, env);
    return json(request, {
      query,
      matches: result.matches,
      matchCount: result.matches.length,
      cached: result.cached,
      checkedAt: new Date().toISOString(),
      disclaimer: 'These are published fact-check reviews. No match does not prove that a claim is true or false.'
    });
  } catch (error) {
    console.error('Published fact-check search failed', error);
    return json(request, { error: cleanText(error?.message || 'Published fact-check search failed.', 300) }, error?.status || 500);
  }
}
