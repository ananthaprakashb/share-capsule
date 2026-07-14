(()=>{
  const installBrand=top=>{
    if(!document.querySelector('link[rel="icon"][data-sharecapsule]')){
      const icon=document.createElement('link');
      icon.rel='icon';icon.type='image/svg+xml';icon.href='/favicon.svg?v=1';icon.dataset.sharecapsule='true';
      document.head.appendChild(icon);
    }
    if(!document.querySelector('link[rel="apple-touch-icon"][data-sharecapsule]')){
      const touch=document.createElement('link');
      touch.rel='apple-touch-icon';touch.href='/assets/sharecapsule-logo.svg?v=1';touch.dataset.sharecapsule='true';
      document.head.appendChild(touch);
    }
    const brand=top?.querySelector('.brand');
    if(brand&&!brand.querySelector('.brandLogo')){
      brand.insertAdjacentHTML('afterbegin','<img class="brandLogo" src="/assets/sharecapsule-logo.svg?v=1" alt="" width="36" height="36" aria-hidden="true">');
      brand.setAttribute('aria-label','Share Capsule home');
      brand.title='Share Capsule';
    }
  };

  const mount=()=>{
    const top=document.querySelector('.top');
    if(!top)return false;
    installBrand(top);
    if(document.getElementById('sharecapsuleFm'))return true;

    const style=document.createElement('style');
    style.textContent='.brand{display:inline-flex!important;align-items:center;gap:10px}.brandLogo{width:36px;height:36px;display:block;flex:0 0 36px;border-radius:12px;box-shadow:0 6px 16px rgba(20,47,68,.18)}.fm{margin:0 0 20px;background:linear-gradient(135deg,#132f45,#244f68 58%,#8a5b20);color:#fff;border-radius:24px;padding:16px;box-shadow:0 16px 46px rgba(19,47,69,.2)}.fmTop{display:flex;align-items:center;gap:13px}.fmPlay{width:50px;height:50px;flex:0 0 50px;border:1px solid rgba(255,255,255,.55);border-radius:50%;background:rgba(255,255,255,.14);color:#fff;font-size:20px;font-weight:900}.fmInfo{min-width:0;flex:1}.fmName{font-size:11px;font-weight:950;letter-spacing:.14em;text-transform:uppercase;color:#cae7f6}.fmTitle{margin-top:4px;font-size:16px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fmState{margin-top:3px;font-size:11px;color:rgba(255,255,255,.72)}.fmNext{border:1px solid rgba(255,255,255,.38);border-radius:999px;background:transparent;color:#fff;padding:9px 11px;font-size:11px;font-weight:900}.fmTrack{margin-top:13px;height:6px;background:rgba(255,255,255,.2);border-radius:99px;overflow:hidden;cursor:pointer}.fmFill{height:100%;width:0;background:#fff;border-radius:99px}.fmTimes{display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:rgba(255,255,255,.7)}.fmYouTube{position:absolute;width:1px;height:1px;overflow:hidden;opacity:.01;pointer-events:none}';
    document.head.appendChild(style);

    const root=document.createElement('section');
    root.id='sharecapsuleFm';root.className='fm';root.setAttribute('aria-label','ShareCapsule FM');
    root.innerHTML='<div class="fmTop"><button class="fmPlay" id="fmPlay" type="button" aria-label="Play ShareCapsule FM">▶</button><div class="fmInfo"><div class="fmName">ShareCapsule FM</div><div class="fmTitle" id="fmTitle">Building a mixed queue…</div><div class="fmState" id="fmState">Loading audio articles and songs</div></div><button class="fmNext" id="fmNext" type="button">Next</button></div><div class="fmTrack" id="fmTrack"><div class="fmFill" id="fmFill"></div></div><div class="fmTimes"><span id="fmCurrent">0:00</span><span id="fmDuration">0:00</span></div><audio id="fmAudio" preload="metadata"></audio><div class="fmYouTube" id="fmYouTube"></div>';
    top.insertAdjacentElement('afterend',root);

    const $=id=>document.getElementById(id),audio=$('fmAudio'),play=$('fmPlay'),next=$('fmNext'),title=$('fmTitle'),status=$('fmState'),fill=$('fmFill'),track=$('fmTrack'),current=$('fmCurrent'),duration=$('fmDuration');
    let items=[],index=-1,currentItem=null,yt=null,ytReady=null,timer=null;
    const fmt=v=>{v=Math.max(0,Number(v)||0);return`${Math.floor(v/60)}:${String(Math.floor(v%60)).padStart(2,'0')}`};
    const randomIndex=()=>{if(items.length<2)return 0;let i;do{i=Math.floor(Math.random()*items.length)}while(i===index);return i};
    const youtubeId=raw=>{try{const u=new URL(raw);if(u.hostname==='youtu.be')return u.pathname.split('/').filter(Boolean)[0]||null;if(u.hostname.endsWith('youtube.com'))return u.searchParams.get('v')||u.pathname.match(/\/embed\/([^/?#]+)/)?.[1]||null;return null}catch{return null}};
    const releaseSong=r=>{const urls=[r.primaryPlayer?.url,...(r.platforms||[]).map(p=>p.url),r.youtubeMusicUrl,r.youtubeUrl].filter(Boolean);for(const url of urls){const id=youtubeId(url);if(id)return{kind:'youtube',id:`song:${r.slug||id}`,title:r.title||'Song',language:r.language||'Music',category:r.category||'Song',videoId:id}}return null};
    function stopAll(){audio.pause();if(yt?.pauseVideo)yt.pauseVideo();clearInterval(timer)}
    function ensureYouTube(){if(window.YT?.Player)return Promise.resolve();if(ytReady)return ytReady;ytReady=new Promise(resolve=>{const old=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{old?.();resolve()};const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s)});return ytReady}
    function updateYoutubeProgress(){if(!yt||currentItem?.kind!=='youtube')return;const d=yt.getDuration?.()||0,c=yt.getCurrentTime?.()||0;current.textContent=fmt(c);duration.textContent=fmt(d);fill.style.width=`${d?c/d*100:0}%`}
    async function setItem(i,autoplay=true){if(!items.length)return;stopAll();index=i;currentItem=items[i];title.textContent=currentItem.title;status.textContent=`${currentItem.language||'Audio'} · ${currentItem.category||'Article'} · ${currentItem.kind==='youtube'?'YouTube Music':'ShareCapsule Audio'}`;fill.style.width='0%';current.textContent='0:00';duration.textContent='0:00';play.textContent='▶';
      if(currentItem.kind==='audio'){audio.src=currentItem.mediaUrl;audio.load();if(autoplay)try{await audio.play()}catch{status.textContent='Autoplay blocked — tap play'}}
      else{await ensureYouTube();if(!yt){yt=new YT.Player('fmYouTube',{height:'1',width:'1',videoId:currentItem.videoId,playerVars:{autoplay:autoplay?1:0,controls:0,playsinline:1,origin:location.origin},events:{onReady:e=>{if(autoplay)e.target.playVideo()},onStateChange:e=>{if(e.data===YT.PlayerState.PLAYING){play.textContent='❚❚';status.textContent='Playing song from YouTube Music';clearInterval(timer);timer=setInterval(updateYoutubeProgress,500)}else if(e.data===YT.PlayerState.PAUSED){play.textContent='▶';status.textContent='Paused'}else if(e.data===YT.PlayerState.ENDED)setItem(randomIndex(),true)}}})}else yt.loadVideoById(currentItem.videoId);setTimeout(()=>{if(yt?.getPlayerState?.()!==YT.PlayerState.PLAYING)status.textContent='Autoplay blocked — tap play'},1400)}}
    async function load(){try{const [a,r]=await Promise.all([fetch(`/audio/data.json?v=${Date.now()}`,{cache:'no-store'}),fetch(`/data/releases.json?v=${Date.now()}`,{cache:'no-store'})]);if(a.ok){const data=await a.json();items.push(...(data.audio||[]).filter(x=>x.mediaUrl&&String(x.mimeType||'').startsWith('audio/')).map(x=>({kind:'audio',id:`audio:${x.id}`,title:x.title,language:x.language,category:x.category,mediaUrl:x.mediaUrl}))}if(r.ok){const data=await r.json();items.push(...(data.releases||data.items||[]).map(releaseSong).filter(Boolean))}const seen=new Set();items=items.filter(x=>!seen.has(x.id)&&seen.add(x.id));if(!items.length)throw new Error('No playable FM items found');setItem(randomIndex(),true)}catch(e){title.textContent='FM unavailable';status.textContent=e.message;play.disabled=true;next.disabled=true}}
    play.onclick=async()=>{if(!currentItem)return;if(currentItem.kind==='audio'){audio.paused?audio.play().catch(()=>status.textContent='Playback blocked — tap again'):audio.pause()}else{await ensureYouTube();yt?.getPlayerState?.()===YT.PlayerState.PLAYING?yt.pauseVideo():yt.playVideo()}};
    next.onclick=()=>setItem(randomIndex(),true);
    track.onclick=e=>{const rect=track.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));if(currentItem?.kind==='audio'&&audio.duration)audio.currentTime=ratio*audio.duration;else if(currentItem?.kind==='youtube'&&yt?.getDuration)yt.seekTo(ratio*yt.getDuration(),true)};
    audio.onplay=()=>{play.textContent='❚❚';status.textContent='Playing audio article'};audio.onpause=()=>{play.textContent='▶';if(audio.currentTime>0&&!audio.ended)status.textContent='Paused'};audio.onloadedmetadata=()=>duration.textContent=fmt(audio.duration);audio.ontimeupdate=()=>{current.textContent=fmt(audio.currentTime);fill.style.width=`${audio.duration?audio.currentTime/audio.duration*100:0}%`};audio.onended=()=>setItem(randomIndex(),true);
    load();
    return true;
  };

  if(!mount()){
    document.addEventListener('DOMContentLoaded',mount,{once:true});
    let attempts=0;
    const retry=setInterval(()=>{attempts++;if(mount()||attempts>40)clearInterval(retry)},250);
  }
})();