const MAX_QUERY_LENGTH = 5000;
const MAX_VIDEO_URL_LENGTH = 2048;
const CACHE_TTL_SECONDS = 21600;
const DAILY_LIMIT = 30;
const MAX_VARIANTS = 6;

function cleanText(value, maxLength) {
  return String(value ?? '').replace(/\u0000/g, '').replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, maxLength + 1);
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
  } catch { return null; }
}

function containsTamil(value) { return /[\u0B80-\u0BFF]/.test(value); }

function stripNoise(value) {
  return cleanText(value, MAX_QUERY_LENGTH)
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/(?:forwarded|forward|share|shared|viral|whatsapp|facebook|youtube|instagram|tiktok|urgent|breaking|please|kindly|உடனே பகிரவும்|அனைவருக்கும் பகிரவும்|பகிருங்கள்|வைரல்|வாட்ஸ்அப்)/gi, ' ')
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, ' ')
    .replace(/[•▪◾◆★☆►▶➡️]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function buildQueryVariants(value) {
  const original = stripNoise(value);
  if (!original) return [];
  const variants = [];
  const add = candidate => {
    const cleaned = cleanText(candidate, 500);
    if (cleaned.length >= 4 && !variants.some(item => item.toLowerCase() === cleaned.toLowerCase())) variants.push(cleaned);
  };
  add(original.slice(0, 500));
  original.split(/[.!?\n।]+/u).map(part => cleanText(part, 300)).filter(part => part.length >= 12).sort((a, b) => b.length - a.length).slice(0, 3).forEach(add);
  const words = original.split(/\s+/u).map(word => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(word => word.length >= 3);
  add(words.slice(0, 14).join(' '));
  if (words.length > 14) add(words.slice(-14).join(' '));
  return variants.slice(0, MAX_VARIANTS);
}

async function sha256(value) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function enforceRateLimit(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const key = new Request(`https://rate-limit.invalid/news-check/${await sha256(`${ip}:${day}`)}`);
  const current = await caches.default.match(key);
  const count = current ? Number(await current.text()) || 0 : 0;
  if (count >= DAILY_LIMIT) return false;
  await caches.default.put(key, new Response(String(count + 1), { headers: { 'Cache-Control': 'max-age=86400' } }));
  return true;
}

async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: request.headers.get('CF-Connecting-IP') || undefined }) });
  if (!response.ok) return false;
  return (await response.json())?.success === true;
}

function normalizeClaimReview(claim, review) {
  const url = safeHttpUrl(review?.url);
  if (!url) return null;
  const publisher = cleanText(review?.publisher?.name || url.hostname, 160);
  return { claim: cleanText(claim?.text, 1000), claimant: cleanText(claim?.claimant, 240), claimDate: cleanText(claim?.claimDate, 40), publisher, title: cleanText(review?.title || `${publisher} fact check`, 300), rating: cleanText(review?.textualRating, 160), reviewDate: cleanText(review?.reviewDate, 40), languageCode: cleanText(review?.languageCode, 20), url: url.toString() };
}

async function searchOneVariant(query, languageCode, env) {
  const params = new URLSearchParams({ query, pageSize: '20', key: env.GOOGLE_FACT_CHECK_API_KEY });
  if (languageCode) params.set('languageCode', languageCode);
  const response = await fetch(`https://factchecktools.googleapis.com/v1alpha1/claims:search?${params}`, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    const error = new Error(response.status === 429 ? 'Published fact-check search quota has been reached.' : 'Published fact-check search is temporarily unavailable.');
    error.status = response.status === 429 ? 429 : 502;
    throw error;
  }
  const data = await response.json();
  const matches = [];
  for (const claim of Array.isArray(data?.claims) ? data.claims : []) for (const review of Array.isArray(claim?.claimReview) ? claim.claimReview : []) {
    const normalized = normalizeClaimReview(claim, review);
    if (normalized) matches.push(normalized);
  }
  return matches;
}

async function searchPublishedFactChecks(query, env) {
  const variants = buildQueryVariants(query);
  const tamil = containsTamil(query);
  const cacheKey = new Request(`https://factcheck-cache.invalid/news-v1/${await sha256(JSON.stringify({ variants, tamil }))}`);
  const cached = await caches.default.match(cacheKey);
  if (cached) return { ...(await cached.json()), cached: true };
  const searches = [];
  for (const variant of variants) {
    if (tamil) searches.push(searchOneVariant(variant, 'ta', env));
    searches.push(searchOneVariant(variant, '', env));
    if (!tamil) searches.push(searchOneVariant(variant, 'en', env));
  }
  const settled = await Promise.allSettled(searches);
  const merged = new Map();
  let firstError = null;
  for (const item of settled) {
    if (item.status === 'rejected') { firstError ||= item.reason; continue; }
    for (const match of item.value) if (!merged.has(match.url)) merged.set(match.url, match);
  }
  if (!merged.size && firstError && settled.every(item => item.status === 'rejected')) throw firstError;
  const payload = { matches: [...merged.values()].slice(0, 30), variants, searchLanguage: tamil ? 'ta+all' : 'en+all' };
  await caches.default.put(cacheKey, new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json', 'Cache-Control': `max-age=${CACHE_TTL_SECONDS}` } }));
  return { ...payload, cached: false };
}

function extractDates(value) {
  const text = cleanText(value, MAX_QUERY_LENGTH);
  const patterns = [/\b(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])\b/g, /\b(?:0?[1-9]|[12]\d|3[01])[-/.](?:0?[1-9]|1[0-2])[-/.](?:19|20)?\d{2}\b/g, /\b(?:today|tomorrow|yesterday|இன்று|நாளை|நேற்று)\b/gi];
  return [...new Set(patterns.flatMap(pattern => text.match(pattern) || []))].slice(0, 10);
}

function classifyRiskSignals(value, hasSource) {
  const text = cleanText(value, MAX_QUERY_LENGTH);
  const signals = [];
  if (/forward|share|viral|பகிர|வைரல்/i.test(text)) signals.push('The message urges rapid sharing, a common misinformation pattern.');
  if (/urgent|immediately|warning|alert|அவசரம்|எச்சரிக்கை|உடனே/i.test(text)) signals.push('Urgent or alarming language is used.');
  if (/guaranteed|100%|cure|free money|இலவசம்|நிச்சயம்/i.test(text)) signals.push('The message contains absolute or promotional claims.');
  if (!hasSource) signals.push('No original source link was supplied.');
  if (text.length > 1000) signals.push('The submission contains multiple statements; each claim should be checked separately.');
  return signals;
}

function buildEvidenceReport(query, matches, hasSource) {
  const ratings = matches.map(m => m.rating.toLowerCase());
  const negative = ratings.filter(r => /false|mislead|incorrect|fake|தவறு|பொய்/.test(r)).length;
  const supportive = ratings.filter(r => /true|correct|accurate|உண்மை/.test(r)).length;
  let assessment = 'Insufficient published evidence';
  let evidenceLevel = matches.length ? 'Limited' : 'Weak';
  if (negative > supportive && negative > 0) { assessment = 'Published reviews raise misinformation concerns'; evidenceLevel = matches.length >= 2 ? 'Strong' : 'Moderate'; }
  else if (supportive > negative && supportive > 0) { assessment = 'Published reviews support parts of the claim'; evidenceLevel = matches.length >= 2 ? 'Strong' : 'Moderate'; }
  else if (matches.length >= 2) { assessment = 'Published reviews found; compare context carefully'; evidenceLevel = 'Moderate'; }
  return {
    assessment, evidenceLevel, datesFound: extractDates(query), riskSignals: classifyRiskSignals(query, hasSource),
    officialConfirmation: 'Not automatically confirmed. Use the official-source searches shown on the page.',
    aiGeneration: 'Not determined. Missing metadata or provenance is not proof that content was AI-generated.',
    recommendation: matches.length ? 'Open the original reviews and compare dates, wording, location, and media context before forwarding.' : 'Do not treat the claim as verified. Search official sources and reverse-search any attached image or video frame.'
  };
}

export async function handleFactCheck(request, env, json) {
  if (!env.GOOGLE_FACT_CHECK_API_KEY) return json(request, { error: 'Published fact-check search is not configured. Add GOOGLE_FACT_CHECK_API_KEY to the Worker secrets.' }, 503);
  if (Number(request.headers.get('content-length') || 0) > 32 * 1024) return json(request, { error: 'The submission is too large.' }, 413);
  let payload;
  try { payload = await request.json(); } catch { return json(request, { error: 'Request body must be valid JSON.' }, 400); }
  if (!(await verifyTurnstile(request, env, cleanText(payload?.turnstileToken, 2048)))) return json(request, { error: 'Human verification failed. Refresh and try again.' }, 403);
  if (!(await enforceRateLimit(request))) return json(request, { error: 'Daily search limit reached. Try again tomorrow.' }, 429);
  const claim = cleanText(payload?.claim, MAX_QUERY_LENGTH);
  const rawVideoUrl = cleanText(payload?.videoUrl, MAX_VIDEO_URL_LENGTH);
  const videoUrl = rawVideoUrl ? safeHttpUrl(rawVideoUrl) : null;
  const sourceUrl = cleanText(payload?.sourceUrl, MAX_VIDEO_URL_LENGTH);
  if (rawVideoUrl && !videoUrl) return json(request, { error: 'Provide a valid public HTTP or HTTPS video link.' }, 400);
  if (!claim && !videoUrl) return json(request, { error: 'Paste a claim or provide a public video link.' }, 400);
  const query = cleanText([claim, videoUrl ? videoUrl.toString() : ''].filter(Boolean).join(' '), MAX_QUERY_LENGTH);
  try {
    const result = await searchPublishedFactChecks(query, env);
    return json(request, { query, searchLanguage: result.searchLanguage, queryVariants: result.variants, matches: result.matches, matchCount: result.matches.length, cached: result.cached, report: buildEvidenceReport(query, result.matches, Boolean(sourceUrl || videoUrl)), checkedAt: new Date().toISOString(), disclaimer: 'This report organizes evidence and risk signals. It does not prove authenticity or AI generation by itself.' });
  } catch (error) {
    console.error('News verification search failed', error);
    return json(request, { error: cleanText(error?.message || 'News verification search failed.', 300) }, error?.status || 500);
  }
}
