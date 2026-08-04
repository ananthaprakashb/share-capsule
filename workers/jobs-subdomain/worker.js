const ORIGIN = 'https://sharecapsule.app';

const ROUTES = new Map([
  ['/', '/jobs/'],
  ['/engineering', '/jobs/engineering/'],
  ['/engineering/', '/jobs/engineering/'],
  ['/truck', '/jobs/truck/'],
  ['/truck/', '/jobs/truck/'],
  ['/warehouse', '/jobs/warehouse/'],
  ['/warehouse/', '/jobs/warehouse/'],
  ['/chef', '/jobs/chef/'],
  ['/chef/', '/jobs/chef/'],
  ['/personalize', '/jobs/personalize/'],
  ['/personalize/', '/jobs/personalize/'],
  ['/snapshot.json', '/jobs/snapshot.json'],
  ['/in', '/jobs_in/'],
  ['/in/', '/jobs_in/'],
  ['/india', '/jobs_in/'],
  ['/india/', '/jobs_in/'],
  ['/in/engineering', '/jobs_in/engineering/'],
  ['/in/engineering/', '/jobs_in/engineering/'],
  ['/india/engineering', '/jobs_in/engineering/'],
  ['/india/engineering/', '/jobs_in/engineering/'],
  ['/in/management', '/jobs_in/management/'],
  ['/in/management/', '/jobs_in/management/'],
  ['/india/management', '/jobs_in/management/'],
  ['/india/management/', '/jobs_in/management/'],
  ['/in/personalize', '/jobs_in/personalize/'],
  ['/in/personalize/', '/jobs_in/personalize/'],
  ['/india/personalize', '/jobs_in/personalize/'],
  ['/india/personalize/', '/jobs_in/personalize/'],
]);

function mapPath(pathname) {
  const exact = ROUTES.get(pathname);
  if (exact) return exact;

  if (pathname.startsWith('/assets/')) return pathname;
  if (pathname === '/favicon.svg' || pathname === '/manifest.webmanifest') return pathname;

  return null;
}

function rewriteHtml(html) {
  return html
    .replaceAll('https://sharecapsule.app/jobs/engineering/', 'https://jobs.sharecapsule.app/engineering/')
    .replaceAll('https://sharecapsule.app/jobs/truck/', 'https://jobs.sharecapsule.app/truck/')
    .replaceAll('https://sharecapsule.app/jobs/warehouse/', 'https://jobs.sharecapsule.app/warehouse/')
    .replaceAll('https://sharecapsule.app/jobs/chef/', 'https://jobs.sharecapsule.app/chef/')
    .replaceAll('https://sharecapsule.app/jobs/personalize/', 'https://jobs.sharecapsule.app/personalize/')
    .replaceAll('https://sharecapsule.app/jobs/', 'https://jobs.sharecapsule.app/')
    .replaceAll('https://sharecapsule.app/jobs_in/engineering/', 'https://jobs.sharecapsule.app/in/engineering/')
    .replaceAll('https://sharecapsule.app/jobs_in/management/', 'https://jobs.sharecapsule.app/in/management/')
    .replaceAll('https://sharecapsule.app/jobs_in/personalize/', 'https://jobs.sharecapsule.app/in/personalize/')
    .replaceAll('https://sharecapsule.app/jobs_in/', 'https://jobs.sharecapsule.app/in/')
    .replaceAll('href="/jobs/engineering/"', 'href="/engineering/"')
    .replaceAll('href="/jobs/truck/"', 'href="/truck/"')
    .replaceAll('href="/jobs/warehouse/"', 'href="/warehouse/"')
    .replaceAll('href="/jobs/chef/"', 'href="/chef/"')
    .replaceAll('href="/jobs/personalize/"', 'href="/personalize/"')
    .replaceAll('href="/jobs/"', 'href="/"')
    .replaceAll('href="/jobs_in/engineering/"', 'href="/in/engineering/"')
    .replaceAll('href="/jobs_in/management/"', 'href="/in/management/"')
    .replaceAll('href="/jobs_in/personalize/"', 'href="/in/personalize/"')
    .replaceAll('href="/jobs_in/"', 'href="/in/"')
    .replaceAll("fetch('../snapshot.json", "fetch('/snapshot.json")
    .replaceAll("fetch('snapshot.json", "fetch('/snapshot.json")
    .replace(/<script\s+src="\/site-shell\.js"\s+defer><\/script>/gi, '')
    .replace(/<script\s+src="\/pwa\.js"\s+defer><\/script>/gi, '')
    .replaceAll('href="/">All releases</a>', 'href="https://sharecapsule.app/">Share Capsule</a>');
}

function securityHeaders(headers) {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Cross-Origin-Resource-Policy', 'same-site');
  return headers;
}

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const originPath = mapPath(incoming.pathname);

    if (!originPath) {
      return new Response('Job page not found', {
        status: 404,
        headers: securityHeaders(new Headers({ 'content-type': 'text/plain; charset=utf-8' })),
      });
    }

    const upstreamUrl = new URL(originPath, ORIGIN);
    upstreamUrl.search = incoming.search;

    const upstream = await fetch(new Request(upstreamUrl, request), {
      cf: { cacheEverything: true, cacheTtl: 300 },
    });

    const headers = securityHeaders(new Headers(upstream.headers));
    headers.set('Cache-Control', upstreamUrl.pathname.endsWith('.json')
      ? 'public, max-age=300, stale-while-revalidate=900'
      : 'public, max-age=120, stale-while-revalidate=600');

    const contentType = headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const html = rewriteHtml(await upstream.text());
      headers.delete('content-length');
      headers.set('content-type', 'text/html; charset=utf-8');
      return new Response(html, { status: upstream.status, headers });
    }

    return new Response(upstream.body, { status: upstream.status, headers });
  },
};
