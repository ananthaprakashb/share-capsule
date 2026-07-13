import { readFile, writeFile, mkdir } from 'node:fs/promises';

const jobsPath = 'jobs/index.html';
const sourcesPath = 'jobs/sources.json';
const workerPath = 'workers/reactions/src/index.js';
const read = path => readFile(path, 'utf8');

const sources = JSON.parse(await read(sourcesPath));
sources.jobTrackingApiBaseUrl = sources.jobTrackingApiBaseUrl || 'https://sharecapsule-reactions.subhafash-86.workers.dev';
sources.jobTrackingNote = 'Shared D1-backed confirmation and invalid-report tracking. Three net invalid reports place a job in the follow-up queue and hide it by default.';
await writeFile(sourcesPath, JSON.stringify(sources, null, 2) + '\n');

let html = await read(jobsPath);
if (!html.includes('./verdict-tracking.mjs')) {
  html = html.replace(
    "  <!-- Cloudflare Web Analytics -->",
    "  <script type=\"module\" src=\"./verdict-tracking.mjs\"></script>\n  <!-- Cloudflare Web Analytics -->"
  );
}
await writeFile(jobsPath, html);

await writeFile('jobs/verdict-tracking.mjs', `const visitorKey = 'sharecapsule.visitorId';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let apiBase = '';
let observerTimer;

function visitorId(){
  let value = localStorage.getItem(visitorKey);
  if(!value){ value = crypto.randomUUID(); localStorage.setItem(visitorKey, value); }
  return value;
}

async function request(path, options={}){
  if(!apiBase) throw new Error('Job tracking API is not configured');
  const response = await fetch(apiBase + path, options);
  if(!response.ok){ let detail=''; try{ detail=(await response.json()).error||''; }catch{} throw new Error(detail || 'Tracking service returned HTTP ' + response.status); }
  return response.json();
}

function jobFromButton(button){
  const card = button.closest('.job');
  return {
    jobKey: button.dataset.valid || button.dataset.invalid,
    title: card?.querySelector('h2')?.textContent?.trim() || '',
    company: card?.querySelector('.company')?.textContent?.trim() || '',
    location: card?.querySelector('.meta')?.textContent?.trim() || '',
    url: card?.querySelector('.apply')?.href || ''
  };
}

function applyState(button, state){
  const card = button.closest('.job');
  if(!card) return;
  let summary = card.querySelector('.communityVerdict');
  if(!summary){ summary = document.createElement('div'); summary.className='communityVerdict'; summary.style.cssText='margin-top:10px;font-size:12px;color:#64716b;line-height:1.5'; card.querySelector('.actions')?.before(summary); }
  summary.innerHTML = '<strong>Community checks:</strong> ' + Number(state.confirmCount||0) + ' confirmed · ' + Number(state.invalidCount||0) + ' invalid' + (state.status==='needs_review'?' · <span style="color:#9b671d">follow-up needed</span>':'') + (state.status==='hidden'?' · <span style="color:#a33c35">hidden after repeated reports</span>':'');
  card.dataset.communityStatus = state.status || 'active';
  if(state.status==='hidden') card.style.display='none';
}

async function refreshVisible(){
  const buttons=[...document.querySelectorAll('[data-valid]')];
  const keys=[...new Set(buttons.map(b=>b.dataset.valid).filter(Boolean))];
  if(!keys.length || !apiBase) return;
  try{
    const data=await request('/api/jobs/verdicts/batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jobKeys:keys,visitorId:visitorId()})});
    for(const button of buttons){ if(data.verdicts?.[button.dataset.valid]) applyState(button,data.verdicts[button.dataset.valid]); }
  }catch(error){ console.warn('Unable to load shared job verdicts', error); }
}

async function submit(button, verdict){
  const job=jobFromButton(button);
  const reason = verdict==='invalid' ? (prompt('Why is this job invalid? Example: closed link, no longer listed, wrong location, duplicate') || 'User marked invalid') : 'User confirmed the official posting is open';
  button.disabled=true;
  try{
    const data=await request('/api/jobs/' + encodeURIComponent(job.jobKey) + '/verdict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...job,visitorId:visitorId(),verdict,reason})});
    applyState(button,data);
    button.textContent = verdict==='confirm' ? 'Confirmed open ✓' : 'Reported for follow-up ✓';
  }catch(error){ alert(error.message); }
  finally{ button.disabled=false; }
}

document.addEventListener('click', event=>{
  const valid=event.target.closest('[data-valid]');
  const invalid=event.target.closest('[data-invalid]');
  const button=valid||invalid;
  if(!button) return;
  event.preventDefault(); event.stopImmediatePropagation();
  submit(button, valid?'confirm':'invalid');
}, true);

try{
  const config=await fetch('./sources.json',{cache:'no-store'}).then(r=>r.json());
  apiBase=String(config.jobTrackingApiBaseUrl||'').replace(/\/$/,'');
  const observer=new MutationObserver(()=>{clearTimeout(observerTimer);observerTimer=setTimeout(refreshVisible,120)});
  observer.observe(document.getElementById('grid'),{childList:true,subtree:true});
  refreshVisible();
}catch(error){ console.warn('Job tracking unavailable', error); }
`);

await mkdir('workers/reactions/migrations', { recursive: true });
await writeFile('workers/reactions/migrations/0002_job_verdicts.sql', `CREATE TABLE IF NOT EXISTS job_verdicts (
  job_key TEXT PRIMARY KEY,
  company TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  confirm_count INTEGER NOT NULL DEFAULT 0,
  invalid_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  first_reported_at TEXT,
  last_reported_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_verdict_events (
  job_key TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('confirm','invalid')),
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (job_key, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_job_verdicts_status ON job_verdicts(status);
CREATE INDEX IF NOT EXISTS idx_job_events_job_key ON job_verdict_events(job_key);
`);

let worker = await read(workerPath);
if (!worker.includes('handleJobVerdictBatch')) {
  const marker = 'export default {';
  const insert = `
function validJobKey(value){return typeof value==='string'&&value.length>=3&&value.length<=180&&/^[a-z0-9_-]+:[a-zA-Z0-9_-]+$/.test(value)}
function jobStatus(confirmCount,invalidCount){if(invalidCount>=3&&invalidCount>confirmCount)return'hidden';if(invalidCount>0)return'needs_review';return'active'}
async function jobVerdictState(env,jobKey,visitorId){const row=await env.DB.prepare('SELECT confirm_count, invalid_count, status, last_reported_at FROM job_verdicts WHERE job_key=?').bind(jobKey).first();let mine=null;if(visitorId&&validVisitorId(visitorId))mine=await env.DB.prepare('SELECT verdict, reason, updated_at FROM job_verdict_events WHERE job_key=? AND visitor_id=?').bind(jobKey,visitorId).first();return{jobKey,confirmCount:Number(row?.confirm_count||0),invalidCount:Number(row?.invalid_count||0),status:row?.status||'active',lastReportedAt:row?.last_reported_at||null,yourVerdict:mine?.verdict||null,yourReason:mine?.reason||''}}
async function handleJobVerdictBatch(request,env){const body=await readJson(request);const keys=Array.isArray(body.jobKeys)?body.jobKeys.filter(validJobKey).slice(0,500):[];if(!keys.length)return json(request,{verdicts:{}});const placeholders=keys.map(()=>'?').join(',');const result=await env.DB.prepare('SELECT job_key,confirm_count,invalid_count,status,last_reported_at FROM job_verdicts WHERE job_key IN ('+placeholders+')').bind(...keys).all();const verdicts={};for(const key of keys)verdicts[key]={jobKey:key,confirmCount:0,invalidCount:0,status:'active',lastReportedAt:null};for(const row of result.results||[])verdicts[row.job_key]={jobKey:row.job_key,confirmCount:Number(row.confirm_count||0),invalidCount:Number(row.invalid_count||0),status:row.status||'active',lastReportedAt:row.last_reported_at||null};return json(request,{verdicts})}
async function handleJobVerdict(request,env,jobKey){const body=await readJson(request);const visitorId=body.visitorId,verdict=body.verdict,reason=String(body.reason||'').slice(0,500);if(!validVisitorId(visitorId)||!['confirm','invalid'].includes(verdict))return json(request,{error:'Invalid job verdict request'},400);const previous=await env.DB.prepare('SELECT verdict FROM job_verdict_events WHERE job_key=? AND visitor_id=?').bind(jobKey,visitorId).first();let confirms=0,invalids=0;if(previous?.verdict==='confirm')confirms--;if(previous?.verdict==='invalid')invalids--;if(verdict==='confirm')confirms++;else invalids++;await env.DB.batch([env.DB.prepare("INSERT INTO job_verdicts(job_key,company,title,location,url,confirm_count,invalid_count,status,first_reported_at,last_reported_at,updated_at) VALUES(?,?,?,?,?,?,?,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(job_key) DO UPDATE SET company=excluded.company,title=excluded.title,location=excluded.location,url=excluded.url,confirm_count=MAX(0,confirm_count+?),invalid_count=MAX(0,invalid_count+?),last_reported_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP").bind(jobKey,String(body.company||'').slice(0,160),String(body.title||'').slice(0,240),String(body.location||'').slice(0,180),String(body.url||'').slice(0,1000),Math.max(confirms,0),Math.max(invalids,0),confirms,invalids),env.DB.prepare("INSERT INTO job_verdict_events(job_key,visitor_id,verdict,reason,created_at,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(job_key,visitor_id) DO UPDATE SET verdict=excluded.verdict,reason=excluded.reason,updated_at=CURRENT_TIMESTAMP").bind(jobKey,visitorId,verdict,reason)]);const counts=await env.DB.prepare('SELECT confirm_count,invalid_count FROM job_verdicts WHERE job_key=?').bind(jobKey).first();const status=jobStatus(Number(counts?.confirm_count||0),Number(counts?.invalid_count||0));await env.DB.prepare('UPDATE job_verdicts SET status=? WHERE job_key=?').bind(status,jobKey).run();return json(request,await jobVerdictState(env,jobKey,visitorId))}
async function handleJobFollowUp(request,env){const result=await env.DB.prepare("SELECT job_key,company,title,location,url,confirm_count,invalid_count,status,first_reported_at,last_reported_at FROM job_verdicts WHERE status IN ('needs_review','hidden') ORDER BY invalid_count DESC,last_reported_at DESC LIMIT 500").all();return json(request,{generatedAt:new Date().toISOString(),jobs:result.results||[]})}

`;
  worker = worker.replace(marker, insert + marker);
  const routeMarker = "    const audioId = getAudioId(pathname);";
  const routes = `    if(request.method==='POST'&&pathname==='/api/jobs/verdicts/batch')return handleJobVerdictBatch(request,env);\n    if(request.method==='GET'&&pathname==='/api/jobs/follow-up')return handleJobFollowUp(request,env);\n    const jobMatch=pathname.match(/^\\/api\\/jobs\\/([^/]+)\\/verdict$/);\n    if(request.method==='POST'&&jobMatch){const jobKey=decodeURIComponent(jobMatch[1]);if(!validJobKey(jobKey))return json(request,{error:'Invalid job key'},400);return handleJobVerdict(request,env,jobKey);}\n\n`;
  worker = worker.replace(routeMarker, routes + routeMarker);
}
await writeFile(workerPath, worker);

let readme = await read('workers/reactions/README.md');
if (!readme.includes('Job verdict tracking')) readme += `\n## Job verdict tracking\n\nRun migration \`workers/reactions/migrations/0002_job_verdicts.sql\` against the same D1 database, then redeploy \`workers/reactions/src/index.js\`. The jobs page uses batch reads and one shared verdict per browser/job. Invalid reports enter follow-up immediately and are hidden by default after three net invalid reports.\n`;
await writeFile('workers/reactions/README.md', readme);
