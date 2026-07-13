const visitorKey = 'sharecapsule.visitorId';
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
  apiBase=String(config.jobTrackingApiBaseUrl||'').replace(//$/,'');
  const observer=new MutationObserver(()=>{clearTimeout(observerTimer);observerTimer=setTimeout(refreshVisible,120)});
  observer.observe(document.getElementById('grid'),{childList:true,subtree:true});
  refreshVisible();
}catch(error){ console.warn('Job tracking unavailable', error); }
