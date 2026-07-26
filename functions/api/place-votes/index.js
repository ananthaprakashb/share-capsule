const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const validToken=value=>typeof value==='string'&&value.length>=16&&value.length<=160;
async function hashToken(token){const bytes=new TextEncoder().encode(token);const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function onRequestGet({env,request}){
  if(!env.PLACE_VOTES_DB)return json({error:'PLACE_VOTES_DB binding is not configured'},503);
  const token=request.headers.get('x-voter-token');
  const voterHash=validToken(token)?await hashToken(token):null;
  const voteRows=await env.PLACE_VOTES_DB.prepare(`
    SELECT p.place_id AS placeId, COUNT(r.voter_hash) AS count
    FROM place_votes p
    LEFT JOIN place_vote_receipts r ON r.place_id=p.place_id
    GROUP BY p.place_id
    ORDER BY p.place_id
  `).all();
  let voted=[];
  if(voterHash){const receiptRows=await env.PLACE_VOTES_DB.prepare('SELECT place_id AS placeId FROM place_vote_receipts WHERE voter_hash = ?').bind(voterHash).all();voted=(receiptRows.results||[]).map(row=>row.placeId)}
  return json({votes:(voteRows.results||[]).map(row=>({placeId:row.placeId,count:Number(row.count)||0})),voted});
}
