(()=>{
  const SPECIAL_SLUG='marimuthu-today';
  const normalize=value=>String(value||'').normalize('NFC').replace(/\s+/g,' ').trim().replace(/[.।]+$/u,'');
  const parseArray=(source,pattern)=>{
    const match=source.match(pattern);
    if(!match)throw new Error('Unable to find Marimuthu poem data');
    return JSON.parse(match[1]);
  };
  const mergePoems=groups=>{
    const merged=[];
    const positions=new Map();
    for(const group of groups){
      for(const poem of group||[]){
        if(!poem?.text)continue;
        const key=`${normalize(poem.book)}|${normalize(poem.text)}`;
        if(positions.has(key)){
          const current=merged[positions.get(key)];
          current.author=poem.author||current.author;
          current.number=poem.number||current.number;
          current.meaning=poem.meaning||current.meaning;
        }else{
          positions.set(key,merged.length);
          merged.push({...poem});
        }
      }
    }
    return merged;
  };
  const loadToday=async()=>{
    const stamp=Date.now();
    const [pageResponse,recentResponse,batchesResponse,todayResponse]=await Promise.all([
      fetch(`/marimuthu/index.html?v=${stamp}`,{cache:'no-store'}),
      fetch(`/marimuthu-recent.js?v=${stamp}`,{cache:'no-store'}),
      fetch(`/marimuthu-batches.js?v=${stamp}`,{cache:'no-store'}),
      fetch(`/marimuthu/today.json?v=${stamp}`,{cache:'no-store'})
    ]);
    if(!pageResponse.ok)throw new Error('Unable to load Marimuthu page');
    const pageText=await pageResponse.text();
    const base=parseArray(pageText,/const poems=(\[[\s\S]*?\]);let index=/);
    const groups=[base];
    if(recentResponse.ok){
      const recentText=await recentResponse.text();
      try{groups.push(parseArray(recentText,/const RECENT_POEMS=(\[[\s\S]*?\]);/))}catch{}
    }
    if(batchesResponse.ok){
      const batchesText=await batchesResponse.text();
      const match=batchesText.match(/const BATCHES=(\[[^;]+\]);/);
      if(match){
        const urls=JSON.parse(match[1].replace(/'/g,'"'));
        const loaded=await Promise.all(urls.map(async url=>{
          const response=await fetch(`${url}?v=${stamp}`,{cache:'no-store'});
          return response.ok?response.json():[];
        }));
        groups.push(...loaded);
      }
    }
    const poems=mergePoems(groups);
    if(!poems.length)throw new Error('No Marimuthu poems found');
    const configured=todayResponse.ok?await todayResponse.json():null;
    const selected=configured?.number?poems.find(poem=>poem.number===String(configured.number)&&(!configured.book||poem.book===configured.book)):null;
    return selected||poems[(new Date().getDate()-1)%poems.length];
  };
  const asRelease=poem=>{
    const lines=String(poem.text||'').split(/\n+/).map(line=>line.trim()).filter(Boolean);
    const title=lines[0]||poem.book||'இன்றைய பாடல்';
    const params=new URLSearchParams();
    if(poem.book)params.set('book',poem.book);
    if(poem.number)params.set('poem',poem.number);
    window.__marimuthuTodayUrl=`/marimuthu/${params.toString()?`?${params}`:''}`;
    return {
      slug:SPECIAL_SLUG,
      title,
      artist:`சுப மாரிமுத்து${poem.author?` · ${poem.author}`:''}`,
      category:poem.book||'தமிழ் நீதி இலக்கியம்',
      language:'Tamil',
      description:poem.meaning||'',
      coverEyebrow:'இன்றைய பாடல்',
      coverLines:lines.slice(0,2),
      coverBackground:'linear-gradient(145deg,#173d2a,#2f6544)',
      publishedAt:new Date().toISOString().slice(0,10),
      __marimuthuToday:true
    };
  };
  const install=()=>{
    if(typeof renderCards!=='function'||typeof renderCatalog!=='function')return false;
    const originalRenderCards=renderCards;
    renderCards=function(items){
      const list=Array.isArray(items)?items:[];
      const today=window.__marimuthuTodayRelease;
      originalRenderCards(today?[today,...list.filter(item=>item?.slug!==SPECIAL_SLUG)]:list);
    };
    document.addEventListener('click',event=>{
      const link=event.target.closest?.(`[data-release="${SPECIAL_SLUG}"]`);
      if(!link)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      location.assign(window.__marimuthuTodayUrl||'/marimuthu/');
    },true);
    return true;
  };
  const installed=install();
  loadToday().then(poem=>{
    window.__marimuthuTodayRelease=asRelease(poem);
    if(!new URLSearchParams(location.search).has('release')&&typeof state!=='undefined'&&state.data&&installed)renderCatalog();
  }).catch(error=>console.error('Unable to show today’s Marimuthu poem',error));
})();

(()=>{
  const ENDPOINT='/schemes/govt/in/';
  const DATA='/schemes/govt/in/data.json';
  const STUDENT_ENDPOINT='/schemes/govt/in/students/';
  const STUDENT_DATA='/schemes/govt/in/students/data.json';
  const escText=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const installStyles=()=>{
    if(document.getElementById('homeIndiaSchemesStyles'))return;
    const style=document.createElement('style');
    style.id='homeIndiaSchemesStyles';
    style.textContent='.homeIndiaSchemes{margin:0 0 20px;padding:22px;border-radius:26px;background:linear-gradient(145deg,#102f25,#176b4d);color:#fff;box-shadow:0 16px 44px rgba(20,70,50,.18)}.homeIndiaSchemesTop{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.homeIndiaSchemesEyebrow{margin:0 0 7px;font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;opacity:.76}.homeIndiaSchemes h2{margin:0;font-size:27px;line-height:1.04;letter-spacing:-.045em}.homeIndiaSchemesCount{flex:0 0 auto;padding:7px 10px;border:1px solid rgba(255,255,255,.24);border-radius:999px;font-size:11px;font-weight:850}.homeIndiaSchemesIntro{margin:12px 0 0;color:rgba(255,255,255,.82);font-size:14px;line-height:1.55}.homeIndiaSchemesList{display:flex;flex-wrap:wrap;gap:7px;margin:15px 0 0;padding:0;list-style:none}.homeIndiaSchemesList li{padding:7px 9px;border-radius:999px;background:rgba(255,255,255,.1);font-size:11px;font-weight:800}.homeStudentSchemes{display:block;margin-top:18px;padding:17px;border:1px solid rgba(255,255,255,.2);border-radius:19px;background:rgba(255,255,255,.1);color:#fff;text-decoration:none}.homeStudentSchemesHead{display:flex;align-items:center;justify-content:space-between;gap:12px}.homeStudentSchemes h3{margin:0;font-size:20px;line-height:1.1;letter-spacing:-.035em}.homeStudentSchemesBadge{white-space:nowrap;padding:6px 9px;border-radius:999px;background:#fff;color:#14513d;font-size:10px;font-weight:900}.homeStudentSchemes p{margin:8px 0 0;color:rgba(255,255,255,.82);font-size:13px;line-height:1.5}.homeStudentSchemesTopics{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px}.homeStudentSchemesTopics span{padding:5px 8px;border-radius:999px;background:rgba(0,0,0,.14);font-size:10px;font-weight:800}.homeStudentSchemesOpen{display:flex;justify-content:space-between;gap:10px;margin-top:13px;padding-top:12px;border-top:1px solid rgba(255,255,255,.17);font-size:12px;font-weight:900}.homeIndiaSchemesAction{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-top:18px;padding-top:15px;border-top:1px solid rgba(255,255,255,.18);color:#fff;text-decoration:none;font-size:13px;font-weight:900}.homeIndiaSchemesNote{margin-top:9px;font-size:10px;color:rgba(255,255,255,.65)}@media(max-width:520px){.homeIndiaSchemesTop{display:block}.homeIndiaSchemesCount{display:inline-block;margin-top:12px}.homeStudentSchemesHead{align-items:flex-start}}';
    document.head.appendChild(style);
  };
  const render=(data,studentData)=>{
    if(location.pathname!=='/'||new URLSearchParams(location.search).has('release'))return;
    const toolbar=document.querySelector('#app .toolbar');
    if(!toolbar||document.getElementById('homeIndiaSchemes'))return;
    const schemes=Array.isArray(data?.schemes)?data.schemes:[];
    const students=Array.isArray(studentData?.schemes)?studentData.schemes:[];
    const featured=schemes.slice(0,6).map(s=>`<li>${escText(s.name)}</li>`).join('');
    const section=document.createElement('section');
    section.id='homeIndiaSchemes';
    section.className='homeIndiaSchemes';
    section.innerHTML=`<div class="homeIndiaSchemesTop"><div><p class="homeIndiaSchemesEyebrow">Official Government of India sources</p><h2>India government schemes</h2></div><span class="homeIndiaSchemesCount">${schemes.length} verified routes</span></div><p class="homeIndiaSchemesIntro">Find practical details about farming support, urban housing, LPG connections, basic banking, low-cost insurance, pensions and small-business credit. Each scheme includes who may benefit, how to begin and a direct official source.</p><ul class="homeIndiaSchemesList">${featured}</ul><a class="homeStudentSchemes" href="${STUDENT_ENDPOINT}"><div class="homeStudentSchemesHead"><h3>🎓 Central schemes for students</h3><span class="homeStudentSchemesBadge">${students.length} verified</span></div><p>School, college and research support including scholarships, PM POSHAN, education loans, science opportunities and targeted assistance for eligible student groups.</p><div class="homeStudentSchemesTopics"><span>School</span><span>College</span><span>Scholarships</span><span>Education loans</span><span>Research</span></div><div class="homeStudentSchemesOpen"><span>See eligibility and official references</span><span>Open →</span></div></a><a class="homeIndiaSchemesAction" href="${ENDPOINT}"><span>Check all India scheme details</span><span>Open schemes →</span></a><div class="homeIndiaSchemesNote">Student sources revalidated ${escText(studentData?.verifiedOn||'recently')}; general schemes revalidated ${escText(data?.verifiedOn||'recently')}. Confirm current intake and document requirements on the linked government portal before applying.</div>`;
    toolbar.insertAdjacentElement('beforebegin',section);
  };
  const fetchJson=url=>fetch(`${url}?v=${Date.now()}`,{cache:'no-store'}).then(response=>response.ok?response.json():Promise.reject(new Error(`${url}: HTTP ${response.status}`)));
  const refresh=()=>Promise.all([fetchJson(DATA),fetchJson(STUDENT_DATA)]).then(([data,studentData])=>{window.__indiaSchemesHomeData=data;window.__studentSchemesHomeData=studentData;render(data,studentData)}).catch(error=>console.error('Unable to show India government schemes on home',error));
  installStyles();
  const observer=new MutationObserver(()=>{if(window.__indiaSchemesHomeData&&window.__studentSchemesHomeData)render(window.__indiaSchemesHomeData,window.__studentSchemesHomeData)});
  observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  refresh();
  window.addEventListener('popstate',()=>setTimeout(()=>window.__indiaSchemesHomeData&&window.__studentSchemesHomeData&&render(window.__indiaSchemesHomeData,window.__studentSchemesHomeData),0));
})();
