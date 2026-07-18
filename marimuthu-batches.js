(()=>{
  const BATCHES=[
    '/marimuthu/data/iniyavai-narpathu.json',
    '/marimuthu/data/sirupanchamoolam-batch-01.json',
    '/marimuthu/data/sirupanchamoolam-batch-02.json',
    '/marimuthu/data/moothurai-recent.json'
  ];
  const TODAY_URL='/marimuthu/today.json';
  const CORRECTIONS_URL='/marimuthu/data/inna-narpathu-corrections.json';
  let todayOverride=null;
  const COMPRESSED_BATCHES=[[
    '/marimuthu/data/inna-narpathu.part1',
    '/marimuthu/data/inna-narpathu.part2',
    '/marimuthu/data/inna-narpathu.part3',
    '/marimuthu/data/inna-narpathu.part4'
  ]];
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
    const textPositions=new Map(poems.map((poem,i)=>[`${normalize(poem.book)}|${normalize(poem.text)}`,i]));
    const numberPositions=new Map(poems.map((poem,i)=>poem.number?[`${normalize(poem.book)}|${normalize(poem.number)}`,i]:null).filter(Boolean));
    for(const item of list||[]){
      const poem={...item,thought:thoughtFor(item)};
      const textKey=`${normalize(poem.book)}|${normalize(poem.text)}`;
      const numberKey=poem.number?`${normalize(poem.book)}|${normalize(poem.number)}`:'';
      const position=numberKey&&numberPositions.has(numberKey)?numberPositions.get(numberKey):textPositions.get(textKey);
      if(position!==undefined){
        const current=poems[position];
        current.author=poem.author||current.author;
        current.number=poem.number||current.number;
        current.text=poem.text||current.text;
        current.meaning=poem.meaning||current.meaning;
        current.thought=poem.thought||thoughtFor(current);
        textPositions.set(`${normalize(current.book)}|${normalize(current.text)}`,position);
        if(current.number)numberPositions.set(`${normalize(current.book)}|${normalize(current.number)}`,position);
      }else{
        const next=poems.length;
        textPositions.set(textKey,next);
        if(numberKey)numberPositions.set(numberKey,next);
        poems.push(poem);
      }
    }
    poems.forEach(poem=>{poem.thought=thoughtFor(poem)});
  };
  const fetchText=async url=>{
    const response=await fetch(url,{cache:'no-cache'});
    if(!response.ok)throw new Error(`Unable to load ${url}`);
    return response.text();
  };
  const loadCompressed=async parts=>{
    const encoded=(await Promise.all(parts.map(fetchText))).join('').trim();
    const binary=atob(encoded);
    const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
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
    const dailySelected=todayOverride?.number?poems.findIndex(poem=>poem.number===String(todayOverride.number)&&(!todayOverride.book||poem.book===todayOverride.book)):-1;
    if(Number.isInteger(compactIndex)&&compactIndex>=0&&compactIndex<poems.length)index=compactIndex;
    else if(selected>=0)index=selected;
    else if(!book&&!number&&!compact&&dailySelected>=0)index=dailySelected;
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
      const plain=BATCHES.map(async url=>{
        const response=await fetch(url,{cache:'no-cache'});
        if(!response.ok)throw new Error(`Unable to load ${url}`);
        return response.json();
      });
      const compressed=COMPRESSED_BATCHES.map(loadCompressed);
      const [groups,todayResponse,correctionsResponse]=await Promise.all([
        Promise.all([...plain,...compressed]),
        fetch(TODAY_URL,{cache:'no-cache'}).catch(()=>null),
        fetch(CORRECTIONS_URL,{cache:'no-cache'}).catch(()=>null)
      ]);
      groups.forEach(merge);
      if(correctionsResponse?.ok)merge(await correctionsResponse.json());
      if(todayResponse?.ok)todayOverride=await todayResponse.json();
    }catch(error){
      console.error('Marimuthu batch loading failed',error);
    }
    chooseAndRender();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
})();
