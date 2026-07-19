(()=>{
  const normalize=value=>String(value||'').normalize('NFC').replace(/\s+/g,' ').trim().replace(/[.।]+$/u,'');
  const HISTORY='/marimuthu/daily-history.json';
  const TODAY='/marimuthu/today.json';

  const findPoem=(entry,query)=>{
    if(!Array.isArray(globalThis.poems))return -1;
    const book=normalize(entry?.book||query.get('book'));
    const number=normalize(entry?.number||query.get('poem'));
    const text=normalize(entry?.text||query.get('text'));
    if(text){
      const byText=poems.findIndex(poem=>(!book||normalize(poem.book)===book)&&normalize(poem.text)===text);
      if(byText>=0)return byText;
    }
    if(number){
      const byNumber=poems.findIndex(poem=>(!book||normalize(poem.book)===book)&&normalize(poem.number)===number);
      if(byNumber>=0)return byNumber;
    }
    return -1;
  };

  const renderIndex=position=>{
    if(position<0||typeof globalThis.render!=='function')return false;
    globalThis.index=position;
    render();
    const poem=poems[position];
    const params=new URLSearchParams({book:poem.book,poem:poem.number});
    history.replaceState(null,'',`/marimuthu/?${params}`);
    return true;
  };

  const loadJson=url=>fetch(`${url}?v=${Date.now()}`,{cache:'no-store'}).then(response=>response.ok?response.json():null).catch(()=>null);

  const apply=async()=>{
    const query=new URLSearchParams(location.search);
    const [historyData,todayData]=await Promise.all([loadJson(HISTORY),loadJson(TODAY)]);
    const entries=Array.isArray(historyData?.entries)?historyData.entries:[];
    const dailyId=query.get('daily');
    const requestedEntry=dailyId?entries.find(item=>item.id===dailyId):null;
    const target=requestedEntry||(!query.has('book')&&!query.has('poem')?todayData:null);

    let attempts=0;
    const select=()=>{
      attempts+=1;
      const position=findPoem(target,query);
      if(renderIndex(position))return;
      if(attempts<80)setTimeout(select,75);
    };
    select();

    const todayButton=document.getElementById('today');
    if(todayButton){
      todayButton.onclick=()=>{
        const position=findPoem(todayData,new URLSearchParams());
        renderIndex(position);
      };
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
})();
