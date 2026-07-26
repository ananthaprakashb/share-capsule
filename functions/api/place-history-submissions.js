const JSON_HEADERS={
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
  'referrer-policy':'no-referrer'
};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:JSON_HEADERS});
const LIMITS={placeName:120,district:120,historyDetails:5000,referencesText:3500,proofLinks:2500,contributorName:120,contributorEmail:254};
const cleanText=(value,max)=>String(value??'')
  .normalize('NFC')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'')
  .replace(/\r\n?/g,'\n')
  .replace(/[ \t]+\n/g,'\n')
  .replace(/\n{4,}/g,'\n\n\n')
  .trim()
  .slice(0,max);
const validEmail=value=>!value||/^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[^\s@<>]{2,63}$/.test(value);
const sameOrigin=request=>{const origin=request.headers.get('origin');if(!origin)return false;try{return new URL(origin).host===new URL(request.url).host}catch{return false}};
const hash=async value=>{const bytes=new TextEncoder().encode(value);const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('')};
const proofUrls=value=>value.split(/\s+/).map(item=>item.trim()).filter(Boolean).filter(item=>{try{const url=new URL(item);return url.protocol==='https:'||url.protocol==='http:'}catch{return false}});
const safeSubject=value=>value.replace(/[\r\n]/g,' ').slice(0,140);

export async function onRequestPost({env,request}){
  if(!env.PLACE_VOTES_DB)return json({error:'Submission storage is not configured'},503);
  if(!sameOrigin(request))return json({error:'Origin not allowed'},403);
  const type=request.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('application/json'))return json({error:'JSON content type required'},415);
  const contentLength=Number(request.headers.get('content-length')||0);
  if(contentLength>16000)return json({error:'Submission is too large'},413);

  let body;
  try{body=await request.json()}catch{return json({error:'Invalid JSON body'},400)}
  if(body?.website)return json({ok:true,reference:'received'}); // honeypot

  const placeName=cleanText(body?.placeName,LIMITS.placeName);
  const district=cleanText(body?.district,LIMITS.district);
  const historyDetails=cleanText(body?.historyDetails,LIMITS.historyDetails);
  const referencesText=cleanText(body?.referencesText,LIMITS.referencesText);
  const linksRaw=cleanText(body?.proofLinks,LIMITS.proofLinks);
  const links=proofUrls(linksRaw);
  const contributorName=cleanText(body?.contributorName,LIMITS.contributorName);
  const contributorEmail=cleanText(body?.contributorEmail,LIMITS.contributorEmail).toLowerCase();

  if(placeName.length<2||district.length<2)return json({error:'Place name and district are required'},400);
  if(historyDetails.length<80)return json({error:'Please provide at least 80 characters of historical detail'},400);
  if(referencesText.length<20&&links.length===0)return json({error:'At least one meaningful reference or proof link is required'},400);
  if(!validEmail(contributorEmail))return json({error:'Contributor email is not valid'},400);

  const ip=request.headers.get('cf-connecting-ip')||'unknown';
  const ua=cleanText(request.headers.get('user-agent'),300);
  const sourceHash=await hash(`${ip}|${ua}`);
  const recent=await env.PLACE_VOTES_DB.prepare("SELECT COUNT(*) AS count FROM place_history_submissions WHERE source_hash=? AND created_at>=datetime('now','-1 hour')").bind(sourceHash).first();
  if(Number(recent?.count||0)>=3)return json({error:'Too many submissions. Please try again later.'},429);

  const id=crypto.randomUUID();
  const normalizedLinks=links.slice(0,12).join('\n');
  await env.PLACE_VOTES_DB.prepare(`INSERT INTO place_history_submissions
    (id,place_name,district,history_details,references_text,proof_links,contributor_name,contributor_email,source_hash,email_status)
    VALUES(?,?,?,?,?,?,?,?,?,'pending')`)
    .bind(id,placeName,district,historyDetails,referencesText,normalizedLinks,contributorName||null,contributorEmail||null,sourceHash)
    .run();

  let emailStatus='not-configured';
  if(env.EDITOR_EMAIL?.send){
    const text=[
      'New Tamil Nadu place-name history submission',
      '',`Reference ID: ${id}`,`Place: ${placeName}`,`District: ${district}`,
      '', 'History details:', historyDetails,
      '', 'References:', referencesText,
      '', 'Proof links:', normalizedLinks||'(none provided)',
      '', `Contributor: ${contributorName||'(not provided)'}`,
      `Contributor email: ${contributorEmail||'(not provided)'}`,
      '', 'Review all claims and sources before publication.'
    ].join('\n');
    try{
      await env.EDITOR_EMAIL.send({
        to:'editor@sharecapsule.app',
        from:'submissions@sharecapsule.app',
        subject:safeSubject(`Place history submission: ${placeName}`),
        text,
        ...(contributorEmail?{replyTo:contributorEmail}:{})
      });
      emailStatus='sent';
    }catch(error){
      console.error('Unable to notify editor',error?.code,error?.message);
      emailStatus='failed';
    }
    await env.PLACE_VOTES_DB.prepare('UPDATE place_history_submissions SET email_status=? WHERE id=?').bind(emailStatus,id).run();
  }

  return json({ok:true,reference:id,emailStatus},201);
}
