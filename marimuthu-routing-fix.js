(()=>{
  const normalize=value=>String(value||'').normalize('NFC').replace(/\s+/g,' ').trim().replace(/[.।]+$/u,'');
  const HISTORY='/marimuthu/daily-history.json';
  const TODAY='/marimuthu/today.json';

  const findPoem=(entry,query)=>{
    if(typeof poems==='undefined'||!Array.isArray(poems))return -1;
    const book=normalize(entry?.book||query.get('book'));
    const number=normalize(entry?.number||query.get('poem'));
    const text=normalize(entry?.text||query.get('text'));
    for(let i=poems.length-1;i>=0;i--){
      const poem=poems[i];
      if(book&&normalize(poem.book)!==book)continue;
      if(text&&normalize(poem.text)===text)return i;
      if(!text&&number&&normalize(poem.number)===number)return i;
    }
    return -1;
  };

  const renderIndex=(position,updateUrl=true)=>{
    if(position<0||typeof render!=='function'||typeof index==='undefined')return false;
    index=position;
    render();
    if(updateUrl){
      const poem=poems[position];
      const params=new URLSearchParams({book:poem.book,poem:poem.number});
      history.replaceState(null,'',`/marimuthu/?${params}`);
    }
    return true;
  };

  const loadJson=url=>fetch(`${url}?v=${Date.now()}`,{cache:'no-store'}).then(response=>response.ok?response.json():null).catch(()=>null);

  const apply=async()=>{
    const originalQuery=new URLSearchParams(location.search);
    const [historyData,todayData]=await Promise.all([loadJson(HISTORY),loadJson(TODAY)]);
    const entries=Array.isArray(historyData?.entries)?historyData.entries:[];
    const dailyId=originalQuery.get('daily');
    const requestedEntry=dailyId?entries.find(item=>item.id===dailyId):null;
    const target=requestedEntry||(!originalQuery.has('book')&&!originalQuery.has('poem')?todayData:null);
    const hasExplicitSelection=Boolean(target||originalQuery.has('book')||originalQuery.has('poem'));

    let attempts=0,stable=0,lastLength=-1;
    const enforce=()=>{
      attempts+=1;
      const position=findPoem(target,originalQuery);
      if(position>=0){
        const displayedBook=normalize(document.getElementById('book')?.textContent);
        const displayedNumber=normalize(document.getElementById('number')?.textContent).replace(/^பாடல்\s*/,'');
        const wanted=poems[position];
        const correct=displayedBook===normalize(wanted.book)&&displayedNumber===normalize(wanted.number);
        if(!correct||index!==position)renderIndex(position,attempts===1||stable===0);
        if(poems.length===lastLength&&index===position)stable+=1;else stable=0;
        lastLength=poems.length;
      }
      if(hasExplicitSelection&&attempts<150&&stable<15)setTimeout(enforce,100);
    };
    enforce();

    const todayButton=document.getElementById('today');
    if(todayButton)todayButton.onclick=()=>renderIndex(findPoem(todayData,new URLSearchParams()));
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
})();