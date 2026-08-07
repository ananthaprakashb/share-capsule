const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

const SYSTEM_PROMPT = `You are a master Tamil poet (தமிழ் கவிஞர்).
Write expressive, emotionally resonant Tamil poems (புதுக்கவிதை) using rich imagery, traditional metaphors, and proper Tamil script.
Ensure line breaks feel musical and natural.`;

const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });

async function handlePost(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }

  // Accept the current UI payload (`prompt`) and the older backend payload (`user_prompt`).
  const prompt = typeof body?.prompt === 'string'
    ? body.prompt.trim()
    : typeof body?.user_prompt === 'string'
      ? body.user_prompt.trim()
      : '';

  if (!prompt) return json({ error: 'Please enter a poem prompt.' }, 400);
  if (prompt.length > 1200) return json({ error: 'Prompt must be 1200 characters or fewer.' }, 400);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    // Preferred path: an Ollama-compatible service using the originally requested qwen2.5:3b model.
    if (env.OLLAMA_BASE_URL) {
      const baseUrl = env.OLLAMA_BASE_URL.replace(/\/$/, '');
      const model = env.OLLAMA_MODEL || 'qwen2.5:3b';
      const headers = { 'content-type': 'application/json' };
      if (env.OLLAMA_API_KEY) headers.authorization = `Bearer ${env.OLLAMA_API_KEY}`;

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
          options: { temperature: 0.8, top_p: 0.9 },
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return json({ error: payload?.error || `SLM request failed with status ${response.status}.` }, 502);
      }

      const poem = payload?.message?.content?.trim();
      if (!poem) return json({ error: 'The SLM returned an empty response.' }, 502);
      return json({ poem, model });
    }

    // Optional fallback for the currently configured Groq/OpenAI-compatible endpoint.
    if (env.GROQ_API_KEY) {
      const baseUrl = (env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
      const model = env.GROQ_MODEL || env.OLLAMA_MODEL || 'llama-3.3-70b-versatile';
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return json({ error: payload?.error?.message || `Inference failed with status ${response.status}.` }, 502);
      }

      const poem = payload?.choices?.[0]?.message?.content?.trim();
      if (!poem) return json({ error: 'The model returned an empty response.' }, 502);
      return json({ poem, model });
    }

    return json({
      error: 'Tamil poem generation is not configured. Set OLLAMA_BASE_URL or GROQ_API_KEY in Cloudflare Pages.',
    }, 503);
  } catch (error) {
    if (error?.name === 'AbortError') {
      return json({ error: 'The model took too long to respond. Please try again.' }, 504);
    }
    return json({ error: 'Unable to reach the configured model service.' }, 502);
  } finally {
    clearTimeout(timeout);
  }
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'POST') return handlePost(request, env);

  if (request.method === 'GET') {
    return json({
      service: 'Tamil poem generator',
      method: 'POST',
      body: { prompt: 'இயற்கை மற்றும் மழை பற்றிய 4 வரி தமிழ் கவிதை எழுதுக' },
    });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        allow: 'GET, POST, OPTIONS',
        'cache-control': 'no-store',
      },
    });
  }

  return json({ error: 'Method not allowed.' }, 405, { allow: 'GET, POST, OPTIONS' });
}
