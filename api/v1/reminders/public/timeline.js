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

function upstreamUrl() {
  const explicit = process.env.CHECKLIST_TIMELINE_API_URL?.trim();
  if (explicit) return explicit;

  const base = process.env.CHECKLIST_API_BASE_URL?.trim()?.replace(/\/$/, '');
  if (base) return `${base}${DEFAULT_PATH}`;

  return null;
}

function parseBody(request) {
  if (!request.body) return {};
  if (typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }
  return {};
}

function addInput(url, input) {
  const allowed = ['country', 'state', 'county', 'city', 'timezone'];
  for (const key of allowed) {
    const value = input?.[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      url.searchParams.set(key, String(value));
    }
  }

  const categories = input?.categories;
  if (Array.isArray(categories) && categories.length) {
    url.searchParams.set('categories', categories.join(','));
  } else if (typeof categories === 'string' && categories.trim()) {
    url.searchParams.set('categories', categories);
  }
}

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') return sendJson(response, 204, {});
  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('allow', 'GET, POST, OPTIONS');
    return sendJson(response, 405, { error: 'method_not_allowed' });
  }

  const target = upstreamUrl();
  if (!target) {
    return sendJson(response, 503, {
      error: 'checklist_api_not_configured',
      message: 'Configure CHECKLIST_TIMELINE_API_URL or CHECKLIST_API_BASE_URL in the ShareCapsule Vercel project.',
      expected_path: DEFAULT_PATH
    });
  }

  try {
    const url = new URL(target);
    const input = request.method === 'POST' ? parseBody(request) : request.query ?? {};
    addInput(url, input);

    // The public ShareCapsule route accepts both GET and POST. The Checklist
    // service is queried through its idempotent GET contract to avoid proxies
    // or redirects rejecting or rewriting POST requests.
    const upstream = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
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
