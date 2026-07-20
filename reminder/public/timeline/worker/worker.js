const DATA_URL = 'https://sharecapsule.app/reminder/public/timeline/data/california.json';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=900'
};

const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function nextDate(item, now) {
  if (item.date) return new Date(`${item.date}T12:00:00-07:00`);
  const year = now.getFullYear();
  let candidate = new Date(year, item.month - 1, item.day, 12);
  if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) candidate = new Date(year + 1, item.month - 1, item.day, 12);
  return candidate;
}

function resolveCounty(data, city, requestedCounty) {
  const countyKey = normalize(requestedCounty);
  if (countyKey) {
    const exact = data.counties.find(c => normalize(c.name) === countyKey || normalize(c.id) === countyKey);
    if (exact) return exact;
  }
  const cityKey = normalize(city);
  if (!cityKey) return null;
  return data.counties.find(c => c.cities.some(name => normalize(name) === cityKey)) || null;
}

async function loadData() {
  const response = await fetch(DATA_URL, { cf: { cacheTtl: 900, cacheEverything: true } });
  if (!response.ok) throw new Error(`Timeline registry unavailable: ${response.status}`);
  return response.json();
}

async function parseInput(request) {
  const url = new URL(request.url);
  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    return {
      city: body.city || request.cf?.city || '',
      county: body.county || '',
      state: body.state || request.cf?.regionCode || '',
      country: body.country || request.cf?.country || '',
      timezone: body.timezone || request.cf?.timezone || ''
    };
  }
  return {
    city: url.searchParams.get('city') || request.cf?.city || '',
    county: url.searchParams.get('county') || '',
    state: url.searchParams.get('state') || request.cf?.regionCode || '',
    country: request.cf?.country || '',
    timezone: request.cf?.timezone || ''
  };
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(request.url);
    if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed' }, 405);
    if (!url.pathname.endsWith('/api/timeline') && url.pathname !== '/api/reminder/public/timeline') return json({ service: 'ShareCapsule public timeline', endpoints: ['/api/timeline', '/api/reminder/public/timeline'] });

    try {
      const [data, input] = await Promise.all([loadData(), parseInput(request)]);
      if (input.country && input.country !== 'US') return json({ supported: false, reason: 'California is the first supported region.', detected: input });
      if (input.state && !['CA', 'California'].includes(input.state)) return json({ supported: false, reason: 'California is the first supported state.', detected: input });

      const county = resolveCounty(data, input.city, input.county);
      const now = new Date();
      const items = data.deadlines.map(item => {
        const date = nextDate(item, now);
        const source = item.source === 'county' ? (county?.taxSource || 'https://www.boe.ca.gov/proptaxes/calendar.htm') : item.source;
        return { ...item, source, date: date.toISOString().slice(0, 10), daysAway: Math.ceil((date - now) / 86400000) };
      }).filter(item => item.daysAway >= -1).sort((a, b) => a.date.localeCompare(b.date));

      return json({
        supported: true,
        generatedAt: new Date().toISOString(),
        detected: input,
        region: { state: 'California', county: county?.name || null, city: input.city || null, confidence: county ? 'city-or-selection-match' : 'state-only' },
        notice: data.notice,
        deadlines: items,
        conditional: data.conditional,
        countyOptions: data.counties.map(c => ({ id: c.id, name: c.name, cities: c.cities }))
      });
    } catch (error) {
      return json({ error: 'Unable to build timeline', detail: error.message }, 500);
    }
  }
};