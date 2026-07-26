const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const validPlaceId=value=>typeof value==='string'&&/^[a-z0-9-]{2,80}$/.test(value);
const validToken=value=>typeof value==='string'&&value.length>=16&&value.length<=160;
async function hashToken(token){const bytes=new TextEncoder().encode(token);const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function sameOrigin(request){const origin=request.headers.get('origin');if(!origin)return true;try{return new URL(origin).host===new URL(request.url).host}catch{return false}}
export async function onRequestPost({env,request,params}){
  if(!env.PLACE_VOTES_DB)return json({error:'PLACE_VOTES_DB binding is not configured'},503);
  if(!sameOrigin(request))return json({error:'Origin not allowed'},403);
  const placeId=params.placeId;
  if(!validPlaceId(placeId))return json({error:'Invalid place id'},400);
  let body;try{body=await request.json()}catch{return json({error:'Invalid JSON body'},400)}
  if(body?.action!=='add'||!validToken(body?.voterToken))return json({error:'Invalid vote request'},400);
  const voterHash=await hashToken(body.voterToken);
  const existing=await env.PLACE_VOTES_DB.prepare('SELECT 1 FROM place_vote_receipts WHERE place_id = ? AND voter_hash = ?').bind(placeId,voterHash).first();
  await env.PLACE_VOTES_DB.batch([
    env.PLACE_VOTES_DB.prepare('INSERT OR IGNORE INTO place_votes(place_id,vote_count,updated_at) VALUES(?,0,CURRENT_TIMESTAMP)').bind(placeId),
    env.PLACE_VOTES_DB.prepare('INSERT OR IGNORE INTO place_vote_receipts(place_id,voter_hash,created_at) VALUES(?,?,CURRENT_TIMESTAMP)').bind(placeId,voterHash),
    env.PLACE_VOTES_DB.prepare('UPDATE place_votes SET vote_count=(SELECT COUNT(*) FROM place_vote_receipts WHERE place_id=?),updated_at=CURRENT_TIMESTAMP WHERE place_id=?').bind(placeId,placeId)
  ]);
  const row=await env.PLACE_VOTES_DB.prepare('SELECT vote_count AS count FROM place_votes WHERE place_id=?').bind(placeId).first();
  return json({placeId,count:Number(row?.count)||0,voted:true,alreadyVoted:Boolean(existing)});
}
