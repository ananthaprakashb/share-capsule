(()=>{
  const BATCHES=['/marimuthu-batch-2026-07-22.json'];
  const load=src=>{if(document.querySelector(`script[src="${src}"]`))return;const script=document.createElement('script');script.src=src;script.defer=true;document.body.appendChild(script)};
  const normalize=value=>String(value||'').normalize('NFC').replace(/\s+/g,' ').trim().replace(/[.।]+$/u,'');
  const applyBatch=async()=>{
    if(!/^\/marimuthu(?:\/|$)/i.test(location.pathname))return;
    try{
      const response=await fetch(`${BATCHES[0]}?v=${Date.now()}`,{cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const incoming=await response.json();
      if(typeof poems==='undefined'||!Array.isArray(poems)||!Array.isArray(incoming))return;
      const existing=new Set(poems.map(poem=>`${normalize(poem.book)}|${normalize(poem.text)}`));
      for(const poem of incoming){
        const key=`${normalize(poem.book)}|${normalize(poem.text)}`;
        if(!poem?.text||existing.has(key))continue;
        existing.add(key);
        poems.push(poem);
      }
      if(typeof render==='function'&&typeof index!=='undefined'){
        const query=new URLSearchParams(location.search);
        const selected=query.get('poem')?poems.findIndex(poem=>poem.number===query.get('poem')&&(!query.get('book')||poem.book===query.get('book'))):-1;
        if(selected>=0)index=selected;
        else if(!query.has('book')&&!query.has('poem')){
          const featured=poems.findIndex(poem=>poem.book==='மூதுரை'&&poem.number==='மூதுரை 01');
          if(featured>=0)index=featured;
        }
        render();
      }
    }catch(error){console.error('Unable to load latest Marimuthu poems',error)}
  };
  load('https://cdn.jsdelivr.net/gh/ananthaprakashb/share-capsule@ea119fa6f6143a7fb733cbba9a8580cdfc3c441b/marimuthu-batches.js');
  load('/marimuthu-validation.js');
  load('/marimuthu-routing-fix.js');
  load('/marimuthu-side-navigation.js');
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyBatch,{once:true});
  else applyBatch();
})();