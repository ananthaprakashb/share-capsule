const TRUSTED_FACT_CHECKERS = [
  'reuters.com',
  'apnews.com',
  'snopes.com',
  'politifact.com',
  'factcheck.org',
  'factcheck.afp.com',
  'fullfact.org'
];

const SYSTEM_PROMPT = `You are a neutral, evidence-first fact-checking researcher.

You MUST use web search before answering. Do not answer from memory alone.

For every claim or image description:
1. Search the claim directly and cross-reference it with trusted fact-checking organizations when relevant, especially Reuters Fact Check, AP Fact Check, Snopes, PolitiFact, FactCheck.org, AFP Fact Check, and Full Fact.
2. Look for the earliest or original source and publication date of the underlying news, image, quote, statistic, or event. Check whether old material is being recirculated, cropped, miscaptioned, or taken out of context.
3. Prefer primary sources for the underlying facts, while using reputable fact-checkers and high-quality reporting to corroborate the conclusion.
4. Use only evidence you can verify from the web search. If evidence is insufficient, conflicting, inaccessible, or not specific enough to support a conclusion, use [UNVERIFIED].
5. Remain neutral and objective. Do not speculate about motives or intent.

Verdict definitions:
[TRUE] — the central claim is supported by strong, current evidence.
[FALSE] — the central claim is contradicted by strong evidence.
[MISLEADING] — the claim contains some truth but omits important context, uses outdated material, or presents evidence in a materially deceptive way.
[UNVERIFIED] — available evidence is not sufficient to confirm or refute the claim.

Return exactly this format:
First line: one of [TRUE], [FALSE], [MISLEADING], or [UNVERIFIED].
Then: a brief explanation of only 2-3 sentences. Mention the original date or context when it materially affects the verdict. Do not add a heading, source list, or raw URLs; citations will be rendered separately from the web-search evidence.`;

function normalizeHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isTrustedFactChecker(url) {
  const hostname = normalizeHostname(url);
  return TRUSTED_FACT_CHECKERS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
}

function addSource(sources, seen, source) {
  const url = source?.url;
  if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) return;

  seen.add(url);
  sources.push({
    title: source?.title || normalizeHostname(url) || 'Source',
    url,
    domain: normalizeHostname(url),
    trustedFactChecker: isTrustedFactChecker(url)
  });
}

function extractResult(openAIResponse) {
  const textParts = [];
  const sources = [];
  const seen = new Set();
  let searched = false;

  for (const item of openAIResponse?.output || []) {
    if (item?.type === 'web_search_call') {
      searched = true;
      for (const source of item?.action?.sources || []) addSource(sources, seen, source);
    }

    if (item?.type !== 'message') continue;

    for (const part of item?.content || []) {
      if (part?.type !== 'output_text') continue;
      if (part?.text) textParts.push(part.text);
      for (const annotation of part?.annotations || []) {
        if (annotation?.type === 'url_citation') addSource(sources, seen, annotation);
      }
    }
  }

  const fullText = textParts.join('\n').trim();
  const verdictMatch = fullText.match(/^\s*\[(TRUE|FALSE|MISLEADING|UNVERIFIED)\]\s*/i);
  const verdict = verdictMatch ? verdictMatch[1].toUpperCase() : 'UNVERIFIED';
  const explanation = verdictMatch
    ? fullText.slice(verdictMatch[0].length).trim()
    : fullText || 'The available evidence was not sufficient to produce a verified conclusion.';

  sources.sort((a, b) => Number(b.trustedFactChecker) - Number(a.trustedFactChecker));

  return { verdict, explanation, sources, searched };
}

export async function handleFactCheck(request, env, json) {
  if (!env.OPENAI_API_KEY) {
    return json(request, { error: 'Fact-check service is not configured. Add OPENAI_API_KEY to the sharecapsule-reactions Worker secrets.' }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(request, { error: 'Request body must be valid JSON.' }, 400);
  }

  const claim = String(payload?.claim || '').trim();
  if (!claim) return json(request, { error: 'Provide a claim or image description to fact-check.' }, 400);
  if (claim.length > 5000) return json(request, { error: 'The claim is too long. Keep it under 5,000 characters.' }, 413);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const openAIResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-5.5',
        instructions: SYSTEM_PROMPT,
        tools: [{ type: 'web_search', search_context_size: 'medium' }],
        tool_choice: 'auto',
        include: ['web_search_call.action.sources'],
        max_output_tokens: 700,
        input: `Claim or image description:\n${claim}`
      }),
      signal: controller.signal
    });

    if (!openAIResponse.ok) {
      const providerError = await openAIResponse.text();
      console.error('OpenAI fact-check request failed', openAIResponse.status, providerError);
      return json(request, { error: 'The fact-check provider is temporarily unavailable. Please try again.' }, 502);
    }

    const providerData = await openAIResponse.json();
    const result = extractResult(providerData);

    if (!result.searched) {
      console.error('Fact-check response completed without a web search call');
      return json(request, { error: 'The fact-check could not complete a required web search. Please try again.' }, 502);
    }

    return json(request, {
      verdict: result.verdict,
      explanation: result.explanation,
      sources: result.sources,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    if (error?.name === 'AbortError') return json(request, { error: 'The fact-check timed out. Please try again.' }, 504);
    console.error('Unexpected fact-check error', error);
    return json(request, { error: 'The fact-check could not be completed. Please try again.' }, 500);
  } finally {
    clearTimeout(timeout);
  }
}
