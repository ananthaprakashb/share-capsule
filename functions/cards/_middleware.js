const protectedPath = pathname => pathname === '/cards' || pathname === '/cards/' || pathname.startsWith('/cards/api/');

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Existing public card routes such as /cards/daily remain public.
  if (!protectedPath(url.pathname)) return next();

  // Cloudflare Access injects this assertion after successful identity login.
  const accessJwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (accessJwt) return next();

  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in required | ShareCapsule</title><style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:#faf5fc;color:#24152b;font:16px/1.6 system-ui,sans-serif}.box{width:min(560px,calc(100% - 30px));padding:30px;border:1px solid #eadff0;border-radius:24px;background:#fff;box-shadow:0 18px 55px rgba(75,40,88,.1)}h1{margin:0 0 10px;font-size:32px}p{color:#77687f}code{background:#f6eff8;padding:2px 6px;border-radius:6px}</style></head><body><main class="box"><h1>Social sign-in required</h1><p>This ShareCapsule Cards area is protected. Configure Cloudflare Access for <code>/cards</code> and <code>/cards/api/*</code> with a social identity provider such as Google or GitHub. Once Access is enabled, unauthenticated visitors will be sent to the provider login screen automatically.</p></main></body></html>`, {
    status: 401,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
