import { getLocalNews } from "./local-news.js";
import { handleFactCheck } from "./factcheck.js";
import { handlePushPublicKey, handlePushSubscribe, handlePushUnsubscribe } from "./push-subscriptions.js";

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

function validJobKey(value){return typeof value==='string'&&value.length>=3&&value.length<=180&&/^[a-z0-9_-]+:[a-zA-Z0-9_-]+$/.test(value)}
function jobStatus(confirmCount,invalidCount){if(invalidCount>=3&&invalidCount>confirmCount)return'hidden';if(invalidCount>0)return'needs_review';return'active'}
async function jobVerdictState(env,jobKey,visitorId){const row=await env.DB.prepare('SELECT confirm_count, invalid_count, status, last_reported_at FROM job_verdicts WHERE job_key=?').bind(jobKey).first();let mine=null;if(visitorId&&validVisitorId(visitorId))mine=await env.DB.prepare('SELECT verdict, reason, updated_at FROM job_verdict_events WHERE job_key=? AND visitor_id=?').bind(jobKey,visitorId).first();return{jobKey,confirmCount:Number(row?.confirm_count||0),invalidCount:Number(row?.invalid_count||0),status:row?.status||'active',lastReportedAt:row?.last_reported_at||null,yourVerdict:mine?.verdict||null,yourReason:mine?.reason||''}}
async function handleJobVerdictBatch(request,env){const body=await readJson(request);const keys=Array.isArray(body.jobKeys)?body.jobKeys.filter(validJobKey).slice(0,500):[];if(!keys.length)return json(request,{verdicts:{}});const placeholders=keys.map(()=>'?').join(',');const result=await env.DB.prepare('SELECT job_key,confirm_count,invalid_count,status,last_reported_at FROM job_verdicts WHERE job_key IN ('+placeholders+')').bind(...keys).all();const verdicts={};for(const key of keys)verdicts[key]={jobKey:key,confirmCount:0,invalidCount:0,status:'active',lastReportedAt:null};for(const row of result.results||[])verdicts[row.job_key]={jobKey:row.job_key,confirmCount:Number(row.confirm_count||0),invalidCount:Number(row.invalid_count||0),status:row.status||'active',lastReportedAt:row.last_reported_at||null};return json(request,{verdicts})}
async function handleJobVerdict(request,env,jobKey){const body=await readJson(request);const visitorId=body.visitorId,verdict=body.verdict,reason=String(body.reason||'').slice(0,500);if(!validVisitorId(visitorId)||!['confirm','invalid'].includes(verdict))return json(request,{error:'Invalid job verdict request'},400);const previous=await env.DB.prepare('SELECT verdict FROM job_verdict_events WHERE job_key=? AND visitor_id=?').bind(jobKey,visitorId).first();let confirms=0,invalids=0;if(previous?.verdict==='confirm')confirms--;if(previous?.verdict==='invalid')invalids--;if(verdict==='confirm')confirms++;else invalids++;await env.DB.batch([env.DB.prepare("INSERT INTO job_verdicts(job_key,company,title,location,url,confirm_count,invalid_count,status,first_reported_at,last_reported_at,updated_at) VALUES(?,?,?,?,?,?,?,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(job_key) DO UPDATE SET company=excluded.company,title=excluded.title,location=excluded.location,url=excluded.url,confirm_count=MAX(0,confirm_count+?),invalid_count=MAX(0,invalid_count+?),last_reported_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP").bind(jobKey,String(body.company||'').slice(0,160),String(body.title||'').slice(0,240),String(body.location||'').slice(0,180),String(body.url||'').slice(0,1000),Math.max(confirms,0),Math.max(invalids,0),confirms,invalids),env.DB.prepare("INSERT INTO job_verdict_events(job_key,visitor_id,verdict,reason,created_at,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(job_key,visitor_id) DO UPDATE SET verdict=excluded.verdict,reason=excluded.reason,updated_at=CURRENT_TIMESTAMP").bind(jobKey,visitorId,verdict,reason)]);const counts=await env.DB.prepare('SELECT confirm_count,invalid_count FROM job_verdicts WHERE job_key=?').bind(jobKey).first();const status=jobStatus(Number(counts?.confirm_count||0),Number(counts?.invalid_count||0));await env.DB.prepare('UPDATE job_verdicts SET status=? WHERE job_key=?').bind(status,jobKey).run();return json(request,await jobVerdictState(env,jobKey,visitorId))}
async function handleJobFollowUp(request,env){const result=await env.DB.prepare("SELECT job_key,company,title,location,url,confirm_count,invalid_count,status,first_reported_at,last_reported_at FROM job_verdicts WHERE status IN ('needs_review','hidden') ORDER BY invalid_count DESC,last_reported_at DESC LIMIT 500").all();return json(request,{generatedAt:new Date().toISOString(),jobs:result.results||[]})}

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

    const pathname = url.pathname;
    if (request.method === "GET" && (pathname === "/api/local-news" || pathname === "/api/local-news/")) {
      const result = await getLocalNews(request);
      return json(request, result.body, result.status);
    }
    if (request.method === 'GET' && (pathname === '/api/push/public-key' || pathname === '/api/push/public-key/')) return handlePushPublicKey(request, env, json);
    if (request.method === 'POST' && (pathname === '/api/push/subscribe' || pathname === '/api/push/subscribe/')) return handlePushSubscribe(request, env, json);
    if (request.method === 'POST' && (pathname === '/api/push/unsubscribe' || pathname === '/api/push/unsubscribe/')) return handlePushUnsubscribe(request, env, json);
    if (request.method === 'POST' && (pathname === '/api/factcheck' || pathname === '/api/factcheck/')) {
      return await handleFactCheck(request, env, json);
    }
    if (request.method === 'POST' && pathname === '/api/jobs/verdicts/batch') {
      return await handleJobVerdictBatch(request, env);
    }
    if (request.method === 'GET' && pathname === '/api/jobs/follow-up') {
      return await handleJobFollowUp(request, env);
    }
    const jobMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/verdict$/);
    if (request.method === 'POST' && jobMatch) {
      const jobKey = decodeURIComponent(jobMatch[1]);
      if (!validJobKey(jobKey)) return json(request, { error: 'Invalid job key' }, 400);
      return await handleJobVerdict(request, env, jobKey);
    }

    const route = parseRoute(pathname);
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
