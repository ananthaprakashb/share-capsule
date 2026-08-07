const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

const SYSTEM_PROMPT = `You are a master Tamil poet (தமிழ் கவிஞர்).
Write expressive, emotionally resonant Tamil poems (புதுக்கவிதை) using rich imagery, traditional metaphors, and proper Tamil script.
Ensure line breaks feel musical and natural.`;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }

  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return json({ error: 'Please enter a poem prompt.' }, 400);
  if (prompt.length > 1200) return json({ error: 'Prompt must be 1200 characters or fewer.' }, 400);

  const baseUrl = (env.OLLAMA_BASE_URL || '').replace(/\/$/, '');
  if (!baseUrl) {
    return json({
      error: 'Tamil poem generation is not configured yet. Set OLLAMA_BASE_URL for this Cloudflare Pages project.',
    }, 503);
  }

  const model = env.OLLAMA_MODEL || 'qwen2.5:3b';
  const headers = { 'content-type': 'application/json' };
  if (env.OLLAMA_API_KEY) headers.authorization = `Bearer ${env.OLLAMA_API_KEY}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        options: {
          temperature: 0.8,
          top_p: 0.9,
        },
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return json({
        error: payload?.error || `SLM request failed with status ${response.status}.`,
      }, 502);
    }

    const poem = payload?.message?.content?.trim();
    if (!poem) return json({ error: 'The SLM returned an empty response.' }, 502);

    return json({ poem, model });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return json({ error: 'The SLM took too long to respond. Please try again.' }, 504);
    }
    return json({ error: 'Unable to reach the configured SLM service.' }, 502);
  } finally {
    clearTimeout(timeout);
  }
}

export function onRequestGet() {
  return json({
    service: 'Tamil poem generator',
    method: 'POST',
    body: { prompt: 'இயற்கை மற்றும் மழை பற்றிய 4 வரி தமிழ் கவிதை எழுதுக' },
  });
}
