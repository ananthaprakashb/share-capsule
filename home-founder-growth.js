(()=>{
  const ENDPOINT='/business/founder/in/';
  const DATA='/business/founder/in/data.json';
  const TN_ENDPOINT='/business/founder/in/tn/';
  const TN_DATA='/business/founder/in/tn/data.json';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const installStyles=()=>{
    if(document.getElementById('homeFounderGrowthStyles'))return;
    const style=document.createElement('style');
    style.id='homeFounderGrowthStyles';
    style.textContent='.homeFounderGrowth{margin:0 0 20px;padding:24px;border-radius:28px;background:linear-gradient(145deg,#3a2110,#a15422);color:#fff;box-shadow:0 18px 48px rgba(100,55,20,.22);position:relative;overflow:hidden}.homeFounderGrowth:after{content:"";position:absolute;width:210px;height:210px;border:1px solid rgba(255,255,255,.17);border-radius:50%;right:-85px;top:-105px}.homeFounderGrowth>*{position:relative;z-index:1}.homeFounderGrowthEyebrow{margin:0 0 8px;font-size:10px;font-weight:950;letter-spacing:.15em;text-transform:uppercase;opacity:.76}.homeFounderGrowth h2{margin:0;max-width:620px;font-size:clamp(29px,6vw,43px);line-height:.98;letter-spacing:-.055em}.homeFounderGrowthIntro{max-width:650px;margin:14px 0 0;color:rgba(255,255,255,.84);font-size:14px;line-height:1.58}.homeFounderGrowthTopics{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px}.homeFounderGrowthTopics span{padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.11);font-size:11px;font-weight:850}.homeFounderGrowthResources{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:17px}.homeFounderGrowthResource{padding:11px 12px;border:1px solid rgba(255,255,255,.15);border-radius:15px;background:rgba(255,255,255,.08);font-size:12px;font-weight:800}.homeFounderGrowthAction{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-top:19px;padding:15px 16px;border-radius:16px;background:#fff;color:#351f11;text-decoration:none;font-size:13px;font-weight:950}.homeFounderTN{display:block;margin-top:17px;padding:18px;border:1px solid rgba(255,255,255,.2);border-radius:20px;background:linear-gradient(145deg,rgba(23,91,65,.92),rgba(30,123,91,.88));color:#fff;text-decoration:none}.homeFounderTNHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.homeFounderTN h3{margin:0;font-size:23px;line-height:1.05;letter-spacing:-.04em}.homeFounderTNBadge{white-space:nowrap;padding:6px 9px;border-radius:999px;background:#fff;color:#175943;font-size:10px;font-weight:950}.homeFounderTN p{margin:9px 0 0;color:rgba(255,255,255,.84);font-size:13px;line-height:1.5}.homeFounderTNItems{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.homeFounderTNItems span{padding:6px 8px;border-radius:999px;background:rgba(0,0,0,.14);font-size:10px;font-weight:850}.homeFounderTNOpen{display:flex;justify-content:space-between;gap:10px;margin-top:13px;padding-top:12px;border-top:1px solid rgba(255,255,255,.18);font-size:12px;font-weight:950}.homeFounderGrowthNote{margin:10px 2px 0;color:rgba(255,255,255,.67);font-size:10px}@media(max-width:520px){.homeFounderGrowthResources{grid-template-columns:1fr}.homeFounderTNHead{display:block}.homeFounderTNBadge{display:inline-block;margin-top:10px}}';
    document.head.appendChild(style);
  };
  const render=(data,tnData)=>{
    if(location.pathname!=='/'||new URLSearchParams(location.search).has('release'))return;
    const toolbar=document.querySelector('#app .toolbar');
    if(!toolbar||document.getElementById('homeFounderGrowth'))return;
    const resources=Array.isArray(data?.resources)?data.resources:[];
    const tn=Array.isArray(tnData?.opportunities)?tnData.opportunities:[];
    const preview=resources.slice(0,4).map(item=>`<div class="homeFounderGrowthResource">${esc(item.name)}</div>`).join('');
    const tnTopics=tn.slice(0,4).map(item=>`<span>${esc(item.name)}</span>`).join('');
    const section=document.createElement('section');
    section.id='homeFounderGrowth';
    section.className='homeFounderGrowth';
    section.innerHTML=`<p class="homeFounderGrowthEyebrow">Founder growth guide · India</p><h2>Running a small business—and ready to break through your next growth barrier?</h2><p class="homeFounderGrowthIntro">Find practical pathways for expansion capital, invoice liquidity, technology modernization, government support, industrial approvals, mentoring and corporate market access.</p><div class="homeFounderGrowthTopics"><span>💰 Capital</span><span>⚡ Working capital</span><span>🏭 Modernization</span><span>🤝 Market access</span><span>🗓 90-day roadmap</span></div><div class="homeFounderGrowthResources">${preview}</div><a class="homeFounderTN" href="${TN_ENDPOINT}"><div class="homeFounderTNHead"><h3>Doing business in Tamil Nadu? Your next growth route may already exist.</h3><span class="homeFounderTNBadge">${tn.length} verified routes</span></div><p>Check state capital subsidy, power-tariff support, inclusive entrepreneurship programmes, TIIC finance, FaMe TN services and the Single Window approval system.</p><div class="homeFounderTNItems">${tnTopics}</div><div class="homeFounderTNOpen"><span>Match your business to Tamil Nadu opportunities</span><span>Open →</span></div></a><a class="homeFounderGrowthAction" href="${ENDPOINT}"><span>Build your India-wide business growth roadmap</span><span>Explore →</span></a><div class="homeFounderGrowthNote">Tamil Nadu sources were checked on ${esc(tnData?.verifiedOn||'a recent date')}. Programme terms and eligibility can change; confirm the current rules on each official portal.</div>`;
    toolbar.insertAdjacentElement('beforebegin',section);
  };
  const fetchJson=url=>fetch(`${url}?v=${Date.now()}`,{cache:'no-store'}).then(response=>response.ok?response.json():Promise.reject(new Error(`${url}: HTTP ${response.status}`)));
  const refresh=()=>Promise.all([fetchJson(DATA),fetchJson(TN_DATA)]).then(([data,tnData])=>{window.__founderGrowthHomeData=data;window.__founderTNHomeData=tnData;render(data,tnData)}).catch(error=>console.error('Unable to show founder growth guide on home',error));
  installStyles();
  const observer=new MutationObserver(()=>window.__founderGrowthHomeData&&window.__founderTNHomeData&&render(window.__founderGrowthHomeData,window.__founderTNHomeData));
  observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  refresh();
  window.addEventListener('popstate',()=>setTimeout(()=>window.__founderGrowthHomeData&&window.__founderTNHomeData&&render(window.__founderGrowthHomeData,window.__founderTNHomeData),0));
})();

(()=>{
  const installStyles=()=>{
    if(document.getElementById('homeTaskTemplatesStyles'))return;
    const style=document.createElement('style');
    style.id='homeTaskTemplatesStyles';
    style.textContent='.homeTaskTemplates{margin:0 0 20px;padding:25px;border-radius:28px;background:linear-gradient(145deg,#203f9f,#4169e1);color:#fff;box-shadow:0 18px 48px rgba(45,75,170,.23);position:relative;overflow:hidden}.homeTaskTemplates:after{content:"";position:absolute;width:250px;height:250px;border:1px solid rgba(255,255,255,.18);border-radius:50%;right:-105px;top:-120px}.homeTaskTemplates>*{position:relative;z-index:1}.homeTaskTemplatesEyebrow{margin:0 0 8px;font-size:10px;font-weight:950;letter-spacing:.15em;text-transform:uppercase;opacity:.78}.homeTaskTemplates h2{margin:0;max-width:650px;font-size:clamp(30px,6vw,45px);line-height:.98;letter-spacing:-.055em}.homeTaskTemplatesIntro{max-width:650px;margin:14px 0 0;color:rgba(255,255,255,.85);font-size:14px;line-height:1.58}.homeTaskTemplatesExamples{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px}.homeTaskTemplatesExamples span{padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.12);font-size:11px;font-weight:850}.homeTaskTemplatesFlow{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:18px}.homeTaskTemplatesStep{padding:11px;border:1px solid rgba(255,255,255,.16);border-radius:15px;background:rgba(255,255,255,.08);font-size:11px;font-weight:900;text-align:center}.homeTaskTemplatesActions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:19px}.homeTaskTemplatesAction{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:15px 16px;border-radius:16px;background:#fff;color:#20356f;text-decoration:none;font-size:13px;font-weight:950}.homeTaskTemplatesAction.secondary{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:#fff}@media(max-width:520px){.homeTaskTemplatesFlow{grid-template-columns:1fr 1fr}.homeTaskTemplatesActions{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  };
  const render=()=>{
    if(location.pathname!=='/'||new URLSearchParams(location.search).has('release'))return;
    const toolbar=document.querySelector('#app .toolbar');
    if(!toolbar||document.getElementById('homeTaskTemplates'))return;
    const section=document.createElement('section');
    section.id='homeTaskTemplates';
    section.className='homeTaskTemplates';
    section.innerHTML='<p class="homeTaskTemplatesEyebrow">Plan larger goals with confidence</p><h2>Do you need to plan a bigger event or a larger goal? We can help.</h2><p class="homeTaskTemplatesIntro">Do not start from a blank page. Browse ready-made task templates for travel, finance, health, projects, major life events and daily routines—then add the useful tasks to your personal board.</p><div class="homeTaskTemplatesExamples"><span>✈ Travel</span><span>⌂ Moving</span><span>★ Events</span><span>$ Finance</span><span>↗ Career</span><span>✓ Daily habits</span></div><div class="homeTaskTemplatesFlow"><div class="homeTaskTemplatesStep">1. Browse</div><div class="homeTaskTemplatesStep">2. Import</div><div class="homeTaskTemplatesStep">3. Prioritize</div><div class="homeTaskTemplatesStep">4. Complete</div></div><div class="homeTaskTemplatesActions"><a class="homeTaskTemplatesAction" href="/checklist/"><span>Browse task templates</span><span>Open →</span></a><a class="homeTaskTemplatesAction secondary" href="/tasks/"><span>Open my Task Board</span><span>Go →</span></a></div>';
    toolbar.insertAdjacentElement('beforebegin',section);
  };
  installStyles();
  const observer=new MutationObserver(render);
  observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  render();
  window.addEventListener('popstate',()=>setTimeout(render,0));
})();

(()=>{
  const AUDIO_URL='https://pub-7cc02c56240d42c98154d45ae3b67481.r2.dev/Focus_on_the_vital_twenty_percent.m4a';
  const installStyles=()=>{
    if(document.getElementById('homeFocusAudioStyles'))return;
    const style=document.createElement('style');
    style.id='homeFocusAudioStyles';
    style.textContent='.homeFocusAudio{margin:0 0 20px;padding:24px;border:1px solid #d8e0ef;border-radius:26px;background:linear-gradient(145deg,#f7f9ff,#fff);box-shadow:0 16px 44px rgba(30,48,90,.09)}.homeFocusAudioEyebrow{margin:0 0 7px;color:#3157d5;font-size:10px;font-weight:950;letter-spacing:.14em;text-transform:uppercase}.homeFocusAudio h2{margin:0;font-size:clamp(27px,5vw,39px);line-height:1.02;letter-spacing:-.045em}.homeFocusAudio p{max-width:720px;margin:11px 0 16px;color:#667085;font-size:14px;line-height:1.58}.homeFocusAudio audio{display:block;width:100%;max-width:760px}.homeFocusAudio a{display:inline-flex;margin-top:12px;color:#3157d5;text-decoration:none;font-size:12px;font-weight:900}.homeFocusAudio a:hover{text-decoration:underline}';
    document.head.appendChild(style);
  };
  const render=()=>{
    if(location.pathname!=='/'||new URLSearchParams(location.search).has('release'))return;
    const toolbar=document.querySelector('#app .toolbar');
    if(!toolbar||document.getElementById('homeFocusAudio'))return;
    const section=document.createElement('section');
    section.id='homeFocusAudio';
    section.className='homeFocusAudio';
    section.innerHTML=`<p class="homeFocusAudioEyebrow">Featured audio</p><h2>Focus on the vital twenty percent.</h2><p>Listen to this short guide on identifying the small number of tasks that create most of the value, then open the Task Board to act on them.</p><audio controls preload="metadata"><source src="${AUDIO_URL}" type="audio/mp4">Your browser does not support embedded audio.</audio><a href="${AUDIO_URL}" target="_blank" rel="noopener noreferrer">Open audio in a new tab →</a>`;
    toolbar.insertAdjacentElement('beforebegin',section);
  };
  installStyles();
  const observer=new MutationObserver(render);
  observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  render();
  window.addEventListener('popstate',()=>setTimeout(render,0));
})();