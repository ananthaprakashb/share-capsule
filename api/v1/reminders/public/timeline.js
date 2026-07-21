const DEFAULT_PATH = '/api/v1/reminders/public/timeline';

function sendJson(response, status, payload) {
  response.status(status);
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  response.setHeader('access-control-allow-origin', '*');
  response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  response.setHeader('access-control-allow-headers', 'content-type');
  return response.json(payload);
}

function upstreamUrl(request) {
  const explicit = process.env.CHECKLIST_TIMELINE_API_URL?.trim();
  if (explicit) return explicit;

  const base = process.env.CHECKLIST_API_BASE_URL?.trim()?.replace(/\/$/, '');
  if (base) return `${base}${DEFAULT_PATH}`;

  return null;
}

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') return sendJson(response, 204, {});
  if (!['GET', 'POST'].includes(request.method)) {
    return sendJson(response, 405, { error: 'method_not_allowed' });
  }

  const target = upstreamUrl(request);
  if (!target) {
    return sendJson(response, 503, {
      error: 'checklist_api_not_configured',
      message: 'Configure CHECKLIST_TIMELINE_API_URL or CHECKLIST_API_BASE_URL in the ShareCapsule Vercel project.',
      expected_path: DEFAULT_PATH
    });
  }

  try {
    const headers = { accept: 'application/json' };
    let body;

    if (request.method === 'POST') {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(request.body ?? {});
    }

    const url = new URL(target);
    if (request.method === 'GET') {
      for (const [key, value] of Object.entries(request.query ?? {})) {
        if (Array.isArray(value)) value.forEach(item => url.searchParams.append(key, item));
        else if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }

    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body,
      redirect: 'follow'
    });

    const text = await upstream.text();
    response.status(upstream.status);
    response.setHeader('content-type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    response.setHeader('cache-control', 'no-store');
    response.setHeader('access-control-allow-origin', '*');
    return response.send(text);
  } catch (error) {
    return sendJson(response, 502, {
      error: 'checklist_api_unreachable',
      message: error.message
    });
  }
}
