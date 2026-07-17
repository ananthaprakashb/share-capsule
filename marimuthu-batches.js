(()=>{
  const BATCHES=['/marimuthu/data/iniyavai-narpathu.json'];
  const normalize=value=>String(value||'').normalize('NFC').replace(/\s+/g,' ').trim().replace(/[.।]+$/u,'');
  const STOCK_PHRASE='என்ற கருத்தை இன்றைய வாழ்விலும் நினைவில் கொண்டு செயல்படுவோம்.';
  const cleanThought=value=>String(value||'').trim().replace(new RegExp(`\\s*${STOCK_PHRASE.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`),'').trim();
  const thoughtFor=poem=>{
    const existing=cleanThought(poem?.thought);
    if(existing)return existing;
    const first=String(poem?.meaning||'').split(/(?<=[.!?।])\s+/)[0].replace(/[.!?।]+$/,'').trim();
    return first||'பாடலின் கருத்தை நம் நாளாந்த வாழ்வில் சிந்திப்போம்.';
  };
  const merge=list=>{
    const positions=new Map(poems.map((poem,i)=>[`${normalize(poem.book)}|${normalize(poem.text)}`,i]));
    for(const item of list||[]){
      const poem={...item,thought:thoughtFor(item)};
      const key=`${normalize(poem.book)}|${normalize(poem.text)}`;
      if(positions.has(key)){
        const current=poems[positions.get(key)];
        current.author=poem.author||current.author;
        current.number=poem.number||current.number;
        current.meaning=poem.meaning||current.meaning;
        current.thought=poem.thought||thoughtFor(current);
      }else{
        positions.set(key,poems.length);
        poems.push(poem);
      }
    }
    poems.forEach(poem=>{poem.thought=thoughtFor(poem)});
  };
  const shortArticleUrl=position=>`${location.origin}/marimuthu/?p=${(position+1).toString(36)}`;
  const applyShortWhatsAppLink=()=>{
    const whatsapp=document.getElementById('wa');
    if(!whatsapp||!poems[index])return;
    const shortUrl=shortArticleUrl(index);
    let message='';
    try{
      message=new URL(whatsapp.href,location.href).searchParams.get('text')||'';
    }catch{}
    if(message){
      message=message.replace(/https?:\/\/\S+/g,shortUrl).trim();
      if(!message.includes(shortUrl))message+=`\n\n${shortUrl}`;
    }else{
      const poem=poems[index];
      message=`${poem.text}\n\n${poem.book} — ${poem.author}\n${shortUrl}`;
    }
    whatsapp.href=`https://wa.me/?text=${encodeURIComponent(message)}`;
  };
  const chooseAndRender=()=>{
    const query=new URLSearchParams(location.search);
    const compact=query.get('p');
    const compactIndex=compact?parseInt(compact,36)-1:-1;
    const book=query.get('book');
    const number=query.get('poem');
    const selected=number?poems.findIndex(poem=>poem.number===number&&(!book||poem.book===book)):-1;
    if(Number.isInteger(compactIndex)&&compactIndex>=0&&compactIndex<poems.length)index=compactIndex;
    else if(selected>=0)index=selected;
    else if(!book&&!number&&!compact)index=(new Date().getDate()-1)%poems.length;
    render();
    const thoughtSection=document.querySelector('.thought');
    if(thoughtSection)thoughtSection.hidden=false;
  };
  const ready=async()=>{
    if(typeof poems==='undefined'||!Array.isArray(poems)||typeof render!=='function')return;
    poems.forEach(poem=>{poem.thought=thoughtFor(poem)});
    const baseRender=render;
    render=function(){
      poems[index].thought=thoughtFor(poems[index]);
      baseRender();
      const thoughtSection=document.querySelector('.thought');
      if(thoughtSection)thoughtSection.hidden=false;
      applyShortWhatsAppLink();
    };
    try{
      const groups=await Promise.all(BATCHES.map(async url=>{
        const response=await fetch(url,{cache:'no-cache'});
        if(!response.ok)throw new Error(`Unable to load ${url}`);
        return response.json();
      }));
      groups.forEach(merge);
    }catch(error){
      console.error('Marimuthu batch loading failed',error);
    }
    chooseAndRender();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
})();