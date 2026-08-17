(() => {
  'use strict';
  const API = 'https://finance-market.sharecapsule.org/v1/ticker';
  const DB_NAME = 'sharecapsule-trade-monitor';
  const STORE = 'local';
  const WATCHLIST_ID = 'watchlist';
  const KEY_ID = 'device-key';
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const usd = new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:2});
  const compact = new Intl.NumberFormat('en-US', {notation:'compact',maximumFractionDigits:1});
  let db;
  let deviceKey;
  let tickers = [];
  let selected = null;

  function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
  function get(id){return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)})}
  function put(value){return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readwrite').objectStore(STORE).put(value);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error)})}
  const b64=(bytes)=>{let s='';for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return btoa(s)};
  const unb64=(text)=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));

  async function loadKey(){
    const saved=await get(KEY_ID);
    if(saved?.key)return saved.key;
    const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
    await put({id:KEY_ID,key});
    return key;
  }
  async function saveWatchlist(){
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const data=new TextEncoder().encode(JSON.stringify(tickers));
    const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},deviceKey,data);
    await put({id:WATCHLIST_ID,iv:b64(iv),ciphertext:b64(ciphertext),updatedAt:new Date().toISOString()});
  }
  async function loadWatchlist(){
    const saved=await get(WATCHLIST_ID);if(!saved)return [];
    try{const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(saved.iv)},deviceKey,unb64(saved.ciphertext));const parsed=JSON.parse(new TextDecoder().decode(plain));return Array.isArray(parsed)?parsed.filter(t=>/^[A-Z][A-Z0-9.-]{0,9}$/.test(t)).slice(0,30):[]}catch{return []}
  }

  function setStatus(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error)}
  function renderWatchlist(){
    $('watchlist').innerHTML=tickers.length?tickers.map(t=>`<button class="ticker-card ${selected===t?'active':''}" data-ticker="${esc(t)}" type="button"><strong>${esc(t)}</strong><span>Tap to load public market data</span><span class="ticker-actions"><span>Local</span><span class="remove" data-remove="${esc(t)}">Remove</span></span></button>`).join(''):'<div class="empty">No tickers yet. Add a symbol such as AAPL, MSFT, NVDA, TSLA or AMZN.</div>';
    document.querySelectorAll('[data-ticker]').forEach(btn=>btn.addEventListener('click',async(e)=>{const remove=e.target.closest('[data-remove]');if(remove){e.stopPropagation();tickers=tickers.filter(t=>t!==remove.dataset.remove);if(selected===remove.dataset.remove){selected=tickers[0]||null;$('detail').hidden=true}await saveWatchlist();renderWatchlist();return}selected=btn.dataset.ticker;renderWatchlist();await loadTicker(selected)}));
  }

  const valueOrDash=(v,formatter=usd)=>Number.isFinite(Number(v))?formatter.format(Number(v)):'—';
  function impactBadge(impact){const value=String(impact||'low').toLowerCase();return `<span class="badge ${value==='high'?'high':value==='medium'?'medium':''}">${esc(value)} potential impact</span>`}
  function sentimentBadge(value){const s=String(value||'neutral').toLowerCase();return `<span class="badge ${s==='positive'?'positive':s==='negative'?'negative':''}">${esc(s)} sentiment</span>`}
  function timeAgo(value){const ms=Date.now()-new Date(value).getTime();if(!Number.isFinite(ms))return '';const h=Math.max(0,Math.floor(ms/3600000));if(h<1)return 'Less than 1h ago';if(h<24)return `${h}h ago`;const d=Math.floor(h/24);return `${d}d ago`}

  function renderData(data){
    $('detail').hidden=false;
    $('companyName').textContent=data.company?.name||'Company';$('tickerName').textContent=data.ticker;
    $('lastPrice').textContent=valueOrDash(data.quote?.price);
    const ch=Number(data.quote?.changePercent);$('dayChange').textContent=Number.isFinite(ch)?`${ch>=0?'+':''}${ch.toFixed(2)}% today`:'Change unavailable';$('dayChange').className=Number.isFinite(ch)?(ch>=0?'up':'down'):'';
    $('dayOpen').textContent=valueOrDash(data.quote?.open);$('dayHigh').textContent=valueOrDash(data.quote?.high);$('dayLow').textContent=valueOrDash(data.quote?.low);$('dayVolume').textContent=Number.isFinite(Number(data.quote?.volume))?compact.format(Number(data.quote.volume)):'—';
    $('marketNote').textContent=data.quote?.asOf?`Market data as of ${new Date(data.quote.asOf).toLocaleString()}. Availability and delay depend on the configured market-data plan.`:'Market timestamp unavailable.';
    const news=Array.isArray(data.news)?data.news:[];
    $('newsList').innerHTML=news.length?news.map(item=>`<article class="feed-card"><div class="feed-meta">${impactBadge(item.impact)}${sentimentBadge(item.sentiment)}<span class="badge">${esc(item.publisher||'Source')}</span><span class="badge">${esc(timeAgo(item.publishedAt))}</span></div><h3>${esc(item.title)}</h3>${item.summary?`<p>${esc(item.summary)}</p>`:''}<div class="reason">Why flagged: ${esc(item.impactReason||'Ticker-linked recent news.')}</div><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Open original article ↗</a></article>`).join(''):'<div class="empty">No recent ticker-linked news was returned by the configured provider.</div>';
    const filings=Array.isArray(data.filings)?data.filings:[];
    $('filingList').innerHTML=filings.length?filings.map(item=>`<article class="feed-card"><div class="feed-meta">${impactBadge(item.impact)}<span class="badge">SEC ${esc(item.form)}</span><span class="badge">${esc(item.filed||'')}</span></div><h3>${esc(item.description||item.form)}</h3><div class="reason">Primary-source regulatory filing. Review the filing rather than relying on a headline summary.</div><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Open SEC filing ↗</a></article>`).join(''):'<div class="empty">No recent SEC filing data was returned for this ticker.</div>';
  }

  async function loadTicker(ticker){
    setStatus(`Loading public market data and recent catalysts for ${ticker}…`);
    try{const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);const res=await fetch(`${API}?symbol=${encodeURIComponent(ticker)}`,{method:'GET',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal,headers:{'Accept':'application/json'}});clearTimeout(timeout);if(!res.ok){const body=await res.json().catch(()=>({}));throw new Error(body.error||`Market gateway returned ${res.status}`)}const data=await res.json();renderData(data);setStatus(`Loaded ${ticker}. Only the ticker symbol was sent; your local finance data was not transmitted.`)}catch(err){setStatus(`Could not load ${ticker}: ${err.name==='AbortError'?'request timed out':err.message}`,true)}}

  $('tickerForm').addEventListener('submit',async(e)=>{e.preventDefault();const ticker=$('tickerInput').value.trim().toUpperCase();if(!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)){setStatus('Enter a valid U.S. ticker symbol using letters, numbers, dot, or dash.',true);return}if(!tickers.includes(ticker)){tickers.push(ticker);tickers=tickers.slice(0,30);await saveWatchlist()}selected=ticker;$('tickerInput').value='';renderWatchlist();await loadTicker(ticker)});
  $('refreshAll').addEventListener('click',()=>selected?loadTicker(selected):setStatus('Select or add a ticker first.',true));

  async function init(){
    if(!crypto?.subtle||!indexedDB){setStatus('This browser does not provide the local security features required by Trade Monitor.',true);return}
    try{db=await openDb();deviceKey=await loadKey();tickers=await loadWatchlist();selected=tickers[0]||null;renderWatchlist();if(selected)await loadTicker(selected)}catch(err){console.error(err);setStatus('Could not open device-local watchlist storage.',true)}
  }
  init();
})();
