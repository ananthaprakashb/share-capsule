(()=>{
  const DATA='/marimuthu/daily-history.json';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const installStyles=()=>{
    if(document.getElementById('homeMarimuthuHistoryStyles'))return;
    const style=document.createElement('style');
    style.id='homeMarimuthuHistoryStyles';
    style.textContent='.homeMarimuthuHistory{margin:0 0 20px}.homeMarimuthuHistoryHead{display:flex;justify-content:space-between;align-items:end;gap:14px;margin:0 2px 12px}.homeMarimuthuHistoryHead h2{margin:0;font-size:24px;letter-spacing:-.04em}.homeMarimuthuHistoryHead p{margin:5px 0 0;color:#6f6a63;font-size:12px}.homeMarimuthuHistoryGrid{display:grid;grid-template-columns:1fr;gap:12px}@media(min-width:650px){.homeMarimuthuHistoryGrid{grid-template-columns:1fr 1fr}}.homeMarimuthuTile{display:block;padding:20px;border-radius:24px;background:linear-gradient(145deg,#173d2a,#2f6544);color:#fff;text-decoration:none;box-shadow:0 14px 38px rgba(31,75,48,.16);position:relative;overflow:hidden}.homeMarimuthuTile:after{content:"";position:absolute;width:150px;height:150px;border:1px solid rgba(255,255,255,.15);border-radius:50%;right:-55px;top:-75px}.homeMarimuthuTile>*{position:relative;z-index:1}.homeMarimuthuTile.previous{background:linear-gradient(145deg,#55442b,#8b6b3c)}.homeMarimuthuBadge{display:inline-flex;padding:6px 9px;border-radius:999px;background:rgba(255,255,255,.14);font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.homeMarimuthuTile h3{margin:14px 0 0;font-family:"Noto Serif Tamil",serif;font-size:23px;line-height:1.45}.homeMarimuthuMeta{margin-top:12px;color:rgba(255,255,255,.75);font-size:11px;font-weight:800}.homeMarimuthuOpen{display:flex;justify-content:space-between;gap:10px;margin-top:16px;padding-top:13px;border-top:1px solid rgba(255,255,255,.17);font-size:12px;font-weight:900}';
    document.head.appendChild(style);
  };
  const render=data=>{
    if(location.pathname!=='/'||new URLSearchParams(location.search).has('release'))return;
    const toolbar=document.querySelector('#app .toolbar');
    if(!toolbar||document.getElementById('homeMarimuthuHistory'))return;
    const entries=Array.isArray(data?.entries)?data.entries:[];
    if(!entries.length)return;
    const section=document.createElement('section');
    section.id='homeMarimuthuHistory';section.className='homeMarimuthuHistory';
    section.innerHTML=`<div class="homeMarimuthuHistoryHead"><div><h2>பாடல் நாள்காட்டி</h2><p>ஒவ்வொரு நாளின் தேர்வும் இங்கே தொடர்ந்து சேமிக்கப்படும்.</p></div></div><div class="homeMarimuthuHistoryGrid">${entries.slice().reverse().map(item=>{const params=new URLSearchParams({daily:item.id,book:item.book,poem:item.number});return`<a class="homeMarimuthuTile ${item.status==='previous'?'previous':''}" href="/marimuthu/?${params}"><span class="homeMarimuthuBadge">${item.status==='today'?'இன்றைய பாடல்':'முந்தைய பதிவு'} · ${esc(item.date)}</span><h3>${esc(item.text).replace(/\n/g,'<br>')}</h3><div class="homeMarimuthuMeta">${esc(item.book)} · ${esc(item.author)}${item.canonicalNumber?` · பாடல் ${esc(item.canonicalNumber)}`:''}</div><div class="homeMarimuthuOpen"><span>பாடலும் பொருளும் காண்க</span><span>திறக்க →</span></div></a>`}).join('')}</div>`;
    toolbar.insertAdjacentElement('beforebegin',section);
  };
  installStyles();
  fetch(`${DATA}?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error(`HTTP ${r.status}`))).then(data=>{window.__marimuthuDailyHistory=data;render(data)}).catch(error=>console.error('Unable to load Marimuthu daily history',error));
  const observer=new MutationObserver(()=>window.__marimuthuDailyHistory&&render(window.__marimuthuDailyHistory));
  observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  window.addEventListener('popstate',()=>setTimeout(()=>window.__marimuthuDailyHistory&&render(window.__marimuthuDailyHistory),0));
})();
