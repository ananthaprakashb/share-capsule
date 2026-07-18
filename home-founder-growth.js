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