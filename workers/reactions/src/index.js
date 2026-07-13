const ALLOWED_ORIGINS = new Set([
  "https://sharecapsule.app",
  "https://www.sharecapsule.app",
]);

const MAX_CLAPS_PER_VISITOR = 50;
const AUDIO_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const allowedOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://sharecapsule.app";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
}

function json(request, value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: corsHeaders(request),
  });
}

function validAudioId(audioId) {
  return (
    typeof audioId === "string" &&
    audioId.length >= 3 &&
    audioId.length <= 100 &&
    AUDIO_ID_PATTERN.test(audioId)
  );
}

function validVisitorId(visitorId) {
  return (
    typeof visitorId === "string" &&
    visitorId.length >= 10 &&
    visitorId.length <= 100 &&
    /^[A-Za-z0-9_-]+$/.test(visitorId)
  );
}

function parseRoute(pathname) {
  const match = pathname.match(
    /^\/api\/audio\/([^/]+)\/(reactions|clap|like)$/
  );

  if (!match) return null;

  const audioId = decodeURIComponent(match[1]);
  if (!validAudioId(audioId)) return null;

  return { audioId, action: match[2] };
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function getReactionState(env, audioId, visitorId = null) {
  const globalRow = await env.DB.prepare(
    `SELECT clap_count, like_count
     FROM audio_reactions
     WHERE audio_id = ?`
  )
    .bind(audioId)
    .first();

  let userRow = null;

  if (visitorId && validVisitorId(visitorId)) {
    userRow = await env.DB.prepare(
      `SELECT clap_count, liked
       FROM user_reactions
       WHERE audio_id = ? AND visitor_id = ?`
    )
      .bind(audioId, visitorId)
      .first();
  }

  return {
    audioId,
    claps: Number(globalRow?.clap_count ?? 0),
    likes: Number(globalRow?.like_count ?? 0),
    yourClaps: Number(userRow?.clap_count ?? 0),
    yourLike: Boolean(userRow?.liked ?? 0),
  };
}

async function handleGet(request, env, audioId, url) {
  const visitorId = url.searchParams.get("visitorId");
  return json(request, await getReactionState(env, audioId, visitorId));
}

async function handleClap(request, env, audioId) {
  const body = await readJson(request);
  const visitorId = body.visitorId;
  const amount = Number(body.amount ?? 1);

  if (!validVisitorId(visitorId)) {
    return json(request, { error: "Invalid visitor ID" }, 400);
  }

  if (!Number.isInteger(amount) || amount < 1 || amount > 5) {
    return json(request, { error: "Clap amount must be 1-5" }, 400);
  }

  const existing = await env.DB.prepare(
    `SELECT clap_count
     FROM user_reactions
     WHERE audio_id = ? AND visitor_id = ?`
  )
    .bind(audioId, visitorId)
    .first();

  const current = Number(existing?.clap_count ?? 0);
  const allowedAmount = Math.min(amount, MAX_CLAPS_PER_VISITOR - current);

  if (allowedAmount <= 0) {
    return json(request, await getReactionState(env, audioId, visitorId));
  }

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO user_reactions (
         audio_id, visitor_id, clap_count, liked, updated_at
       )
       VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
       ON CONFLICT(audio_id, visitor_id)
       DO UPDATE SET
         clap_count = clap_count + excluded.clap_count,
         updated_at = CURRENT_TIMESTAMP`
    ).bind(audioId, visitorId, allowedAmount),

    env.DB.prepare(
      `INSERT INTO audio_reactions (
         audio_id, clap_count, like_count, updated_at
       )
       VALUES (?, ?, 0, CURRENT_TIMESTAMP)
       ON CONFLICT(audio_id)
       DO UPDATE SET
         clap_count = clap_count + excluded.clap_count,
         updated_at = CURRENT_TIMESTAMP`
    ).bind(audioId, allowedAmount),
  ]);

  return json(request, await getReactionState(env, audioId, visitorId));
}

async function handleLike(request, env, audioId) {
  const body = await readJson(request);
  const visitorId = body.visitorId;

  if (!validVisitorId(visitorId)) {
    return json(request, { error: "Invalid visitor ID" }, 400);
  }

  const existing = await env.DB.prepare(
    `SELECT liked
     FROM user_reactions
     WHERE audio_id = ? AND visitor_id = ?`
  )
    .bind(audioId, visitorId)
    .first();

  const nextLike = existing?.liked ? 0 : 1;
  const increment = nextLike ? 1 : -1;

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO user_reactions (
         audio_id, visitor_id, clap_count, liked, updated_at
       )
       VALUES (?, ?, 0, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(audio_id, visitor_id)
       DO UPDATE SET
         liked = excluded.liked,
         updated_at = CURRENT_TIMESTAMP`
    ).bind(audioId, visitorId, nextLike),

    env.DB.prepare(
      `INSERT INTO audio_reactions (
         audio_id, clap_count, like_count, updated_at
       )
       VALUES (?, 0, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(audio_id)
       DO UPDATE SET
         like_count = MAX(0, like_count + ?),
         updated_at = CURRENT_TIMESTAMP`
    ).bind(audioId, nextLike, increment),
  ]);

  return json(request, await getReactionState(env, audioId, visitorId));
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/") {
      return json(request, {
        service: "Share Capsule reactions API",
        status: "ok",
        genericAudioIds: true,
      });
    }

    const route = parseRoute(url.pathname);
    if (!route) {
      return json(request, { error: "Invalid reaction route" }, 404);
    }

    try {
      if (request.method === "GET" && route.action === "reactions") {
        return await handleGet(request, env, route.audioId, url);
      }

      if (request.method === "POST" && route.action === "clap") {
        return await handleClap(request, env, route.audioId);
      }

      if (request.method === "POST" && route.action === "like") {
        return await handleLike(request, env, route.audioId);
      }

      return json(request, { error: "Method not allowed" }, 405);
    } catch (error) {
      console.error(error);
      return json(request, { error: "Internal server error" }, 500);
    }
  },
};
