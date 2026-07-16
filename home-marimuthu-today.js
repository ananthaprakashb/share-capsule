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
    const [pageResponse,recentResponse,batchesResponse]=await Promise.all([
      fetch(`/marimuthu/index.html?v=${stamp}`,{cache:'no-store'}),
      fetch(`/marimuthu-recent.js?v=${stamp}`,{cache:'no-store'}),
      fetch(`/marimuthu-batches.js?v=${stamp}`,{cache:'no-store'})
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
    return poems[(new Date().getDate()-1)%poems.length];
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
      coverEyebrow:'இன்றைய மாரிமுத்து பதிவு',
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
  }).catch(error=>console.error('Unable to show today’s Marimuthu article',error));
})();
