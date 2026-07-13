import { readFile, writeFile } from 'node:fs/promises';

const library = JSON.parse(await readFile('scripts/daily-news-content-library.json','utf8'));
const paths={tip:'tip/data.json',paa:'paa/data.json',law:'law/data.json',haiku:'tulip/data.json'};
const arrays={tip:'tips',paa:'poems',law:'principles',haiku:'haiku'};
const pacificDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const today=pacificDate();
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
const replaceDate=value=>JSON.parse(JSON.stringify(value).replaceAll('__DATE__',today));

async function headlines(){
  if(process.env.SEED_NEWS_CONTEXT==='true') return [{title:'Record-warm nights intensify a dangerous U.S. heat wave; courts and Tamil literature also lead today’s news',url:'https://apnews.com/article/fb7664f71743f71beca4ce7447562ca2',source:'Seeded verified context'}];
  const url='https://api.gdeltproject.org/api/v2/doc/doc?query=(sourcecountry:US OR sourcecountry:IN)&mode=artlist&maxrecords=75&format=json&timespan=24h';
  const r=await fetch(url,{headers:{'user-agent':'share-capsule-daily-content/1.0'}}); if(!r.ok)throw new Error('News feed HTTP '+r.status);
  const j=await r.json(); return (j.articles||[]).map(x=>({title:x.title||'',url:x.url||'',source:x.domain||''})).filter(x=>x.title&&x.url);
}

async function verified(candidate){
  const r=await fetch(candidate.sourceUrl,{headers:{'user-agent':'share-capsule-source-validator/1.0'}}); if(!r.ok)return false;
  const text=norm(await r.text()); return text.includes(norm(candidate.verifyNeedle));
}

function score(candidate,news){const text=norm(news.map(x=>x.title).join(' '));return candidate.themes.reduce((n,t)=>n+(text.includes(norm(t))?1:0),0)}
function inferCandidate(type,item){
  const text=[item.title,item.category,item.mood,item.action,item.plainRule,item.interpretation,item.happyNote].filter(Boolean).join(' ');
  return {themes:norm(text).split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>3).slice(0,25),verifyNeedle:item.title||item.id,sourceUrl:item.sourceUrl||item.globalSourceUrl||item.poemSourceUrl,item};
}

const news=await headlines();
for(const type of Object.keys(paths)){
  const data=JSON.parse(await readFile(paths[type],'utf8')); const key=arrays[type]; data[key]||=[]; data.site||={};
  for(const entry of library[type]||[]){const item=replaceDate(entry.item);if(!data[key].some(x=>x.id===item.id))data[key].unshift(item)}
  const recent=(data.site.dailyNewsSelections||[]).slice(0,7).map(x=>x.id);
  const candidates=[...(library[type]||[]),...data[key].map(x=>inferCandidate(type,x))].filter((x,i,a)=>x.item?.id&&a.findIndex(y=>y.item?.id===x.item.id)===i&&!recent.includes(x.item.id));
  candidates.sort((a,b)=>score(b,news)-score(a,news));
  let chosen=null; for(const c of candidates){try{if(c.sourceUrl&&await verified(c)){chosen=c;break}}catch{}}
  if(!chosen)throw new Error(`No authenticated ${type} candidate passed source validation`);
  const top=news[0]; const selection={date:today,id:chosen.item.id,headline:top.title,newsUrl:top.url,newsSource:top.source,explanation:`Selected from authenticated ${type} content because its themes best matched the previous 24 hours of news.`,verifiedOn:today};
  data.site.dailyNewsSelections=[selection,...(data.site.dailyNewsSelections||[]).filter(x=>x.date!==today)].slice(0,120);
  await writeFile(paths[type],JSON.stringify(data,null,2)+'\n');
}
