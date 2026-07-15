(()=>{
  const ENDPOINTS=[
    {href:'/',label:'Releases'},{href:'/audio/',label:'Audio'},{href:'/tip/',label:'Tips'},
    {href:'/quotes/',label:'Quotes'},{href:'/story/',label:'Story'},{href:'/jobs/',label:'Jobs'},
    {href:'/law/',label:'Law'},{href:'/parking/',label:'Parking'}
  ];
  const STATE_KEY='sharecapsule.fm.state.v2';
  const readState=()=>{try{return JSON.parse(sessionStorage.getItem(STATE_KEY)||'null')}catch{return null}};
  const writeState=value=>{try{sessionStorage.setItem(STATE_KEY,JSON.stringify(value))}catch{}};

  const installBrand=top=>{
    if(!document.querySelector('link[rel="icon"][data-sharecapsule]')){
      const icon=document.createElement('link');
      icon.rel='icon';icon.type='image/svg+xml';icon.href='/favicon.svg?v=3';icon.dataset.sharecapsule='true';
      document.head.appendChild(icon);
    }
    const brand=top?.querySelector('.brand');
    if(brand&&!brand.querySelector('.brandLogo')){
      brand.insertAdjacentHTML('afterbegin','<img class="brandLogo" src="/assets/sharecapsule-logo.svg?v=3" alt="" width="36" height="36" aria-hidden="true">');
      brand.setAttribute('aria-label','Share Capsule home');
    }
  };

  const installEndpointNav=anchor=>{
    if(!anchor||document.getElementById('sharecapsuleEndpoints'))return;
    const normalize=value=>String(value||'/').replace(/\/+$/,'')||'/';
    const current=normalize(location.pathname);
    const nav=document.createElement('nav');
    nav.id='sharecapsuleEndpoints';nav.className='endpointNav';nav.setAttribute('aria-label','Explore Share Capsule sections');
    nav.innerHTML=`<span class="endpointLabel">Explore</span>${ENDPOINTS.map(item=>{
      const active=normalize(item.href)===current;
      return `<a class="endpointLink${active?' active':''}" href="${item.href}"${active?' aria-current="page"':''}>${item.label}</a>`;
    }).join('')}`;
    anchor.insertAdjacentElement('afterend',nav);
  };

  const mount=()=>{
    const top=document.querySelector('.top');
    if(!top)return false;
    installBrand(top);
    const existing=document.getElementById('sharecapsuleFm');
    if(existing){installEndpointNav(existing);return true}

    const style=document.createElement('style');
    style.textContent='.brand{display:inline-flex!important;align-items:center;gap:10px}.brandLogo{width:36px;height:36px;display:block;flex:0 0 36px;border-radius:12px;box-shadow:0 6px 16px rgba(20,47,68,.18)}.fm{margin:0 0 20px;background:linear-gradient(135deg,#132f45,#244f68 58%,#8a5b20);color:#fff;border-radius:24px;padding:16px;box-shadow:0 16px 46px rgba(19,47,69,.2)}.fmTop{display:flex;align-items:center;gap:13px}.fmPlay{width:50px;height:50px;flex:0 0 50px;border:1px solid rgba(255,255,255,.55);border-radius:50%;background:rgba(255,255,255,.14);color:#fff;font-size:20px;font-weight:900}.fmInfo{min-width:0;flex:1}.fmName{font-size:11px;font-weight:950;letter-spacing:.14em;text-transform:uppercase;color:#cae7f6}.fmTitle{margin-top:4px;font-size:16px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fmState{margin-top:3px;font-size:11px;color:rgba(255,255,255,.72)}.fmNext{border:1px solid rgba(255,255,255,.38);border-radius:999px;background:transparent;color:#fff;padding:9px 11px;font-size:11px;font-weight:900}.fmTrack{margin-top:13px;height:6px;background:rgba(255,255,255,.2);border-radius:99px;overflow:hidden;cursor:pointer}.fmFill{height:100%;width:0;background:#fff;border-radius:99px}.fmTimes{display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:rgba(255,255,255,.7)}.fmYouTube{position:absolute;width:1px;height:1px;overflow:hidden;opacity:.01;pointer-events:none}.endpointNav{margin:-8px 0 22px;display:flex;align-items:center;gap:8px;overflow-x:auto;padding:2px 2px 5px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.endpointNav::-webkit-scrollbar{display:none}.endpointLabel{flex:0 0 auto;margin-right:2px;color:#77716a;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.endpointLink{flex:0 0 auto;white-space:nowrap;text-decoration:none;color:#403c37;background:rgba(255,255,255,.78);border:1px solid #e2dbd1;border-radius:999px;padding:9px 13px;font-size:12px;font-weight:850;box-shadow:0 5px 18px rgba(50,40,28,.05)}.endpointLink:hover{border-color:#9a9186}.endpointLink.active{background:#171717;color:#fff;border-color:#171717}';
    document.head.appendChild(style);

    const root=document.createElement('section');
    root.id='sharecapsuleFm';root.className='fm';root.setAttribute('aria-label','ShareCapsule FM');
    root.innerHTML='<div class="fmTop"><button class="fmPlay" id="fmPlay" type="button" aria-label="Play ShareCapsule FM">▶</button><div class="fmInfo"><div class="fmName">ShareCapsule FM</div><div class="fmTitle" id="fmTitle">Building a mixed queue…</div><div class="fmState" id="fmState">Loading audio articles and songs</div></div><button class="fmNext" id="fmNext" type="button">Next</button></div><div class="fmTrack" id="fmTrack"><div class="fmFill" id="fmFill"></div></div><div class="fmTimes"><span id="fmCurrent">0:00</span><span id="fmDuration">0:00</span></div><audio id="fmAudio" preload="metadata"></audio><div class="fmYouTube" id="fmYouTube"></div>';
    top.insertAdjacentElement('afterend',root);installEndpointNav(root);

    const $=id=>document.getElementById(id);
    const audio=$('fmAudio'),play=$('fmPlay'),next=$('fmNext'),title=$('fmTitle'),status=$('fmState');
    const fill=$('fmFill'),track=$('fmTrack'),current=$('fmCurrent'),duration=$('fmDuration');
    let items=[],index=-1,currentItem=null,yt=null,ytReady=null,timer=null,restoring=false;

    const fmt=value=>{const seconds=Math.max(0,Number(value)||0);return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`};
    const randomIndex=()=>{if(items.length<2)return 0;let candidate;do candidate=Math.floor(Math.random()*items.length);while(candidate===index);return candidate};
    const youtubeId=raw=>{try{const url=new URL(raw);if(url.hostname==='youtu.be')return url.pathname.split('/').filter(Boolean)[0]||null;if(url.hostname.endsWith('youtube.com'))return url.searchParams.get('v')||url.pathname.match(/\/embed\/([^/?#]+)/)?.[1]||null}catch{}return null};
    const releaseSong=release=>{
      const urls=[release.primaryPlayer?.url,...(release.platforms||[]).map(p=>p.url),release.youtubeMusicUrl,release.youtubeUrl].filter(Boolean);
      for(const url of urls){const id=youtubeId(url);if(id)return{kind:'youtube',id:`song:${release.slug||id}`,title:release.title||'Song',language:release.language||'Music',category:release.category||'Song',videoId:id}}
      return null;
    };
    const ensureYouTube=()=>{
      if(window.YT?.Player)return Promise.resolve();
      if(ytReady)return ytReady;
      ytReady=new Promise(resolve=>{
        const previous=window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady=()=>{if(typeof previous==='function')previous();resolve()};
        const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';document.head.appendChild(script);
      });
      return ytReady;
    };
    const isPlaying=()=>{
      if(currentItem?.kind==='audio')return !audio.paused&&!audio.ended;
      if(currentItem?.kind==='youtube'&&yt?.getPlayerState)return yt.getPlayerState()===window.YT?.PlayerState?.PLAYING;
      return false;
    };
    const position=()=>{
      if(currentItem?.kind==='audio')return Number(audio.currentTime)||0;
      if(currentItem?.kind==='youtube'&&yt?.getCurrentTime)return Number(yt.getCurrentTime())||0;
      return 0;
    };
    const persist=()=>{
      if(!currentItem)return;
      writeState({id:currentItem.id,kind:currentItem.kind,position:position(),playing:isPlaying(),savedAt:Date.now()});
    };
    const stopMedia=()=>{audio.pause();if(yt?.pauseVideo)yt.pauseVideo();clearInterval(timer)};
    const updateYoutubeProgress=()=>{
      if(!yt||currentItem?.kind!=='youtube')return;
      const total=yt.getDuration?.()||0,elapsed=yt.getCurrentTime?.()||0;
      current.textContent=fmt(elapsed);duration.textContent=fmt(total);fill.style.width=`${total?elapsed/total*100:0}%`;persist();
    };
    const handleYoutubeState=event=>{
      if(event.data===YT.PlayerState.PLAYING){play.textContent='❚❚';status.textContent='Playing song from YouTube Music';clearInterval(timer);timer=setInterval(updateYoutubeProgress,700)}
      else if(event.data===YT.PlayerState.PAUSED){play.textContent='▶';status.textContent='Paused';persist()}
      else if(event.data===YT.PlayerState.ENDED){writeState(null);setItem(randomIndex(),true,0)}
    };
    const startYoutube=async(item,autoplay,startAt=0)=>{
      await ensureYouTube();
      const ready=event=>{
        if(startAt>0)event.target.seekTo(startAt,true);
        if(autoplay)event.target.playVideo();
        else event.target.pauseVideo();
      };
      if(!yt){
        yt=new YT.Player('fmYouTube',{height:'1',width:'1',videoId:item.videoId,playerVars:{autoplay:0,controls:0,playsinline:1,origin:location.origin,start:Math.floor(startAt)},events:{onReady:ready,onStateChange:handleYoutubeState}});
      }else{
        yt.loadVideoById({videoId:item.videoId,startSeconds:startAt});
        if(!autoplay)setTimeout(()=>yt?.pauseVideo?.(),100);
      }
      if(autoplay)setTimeout(()=>{if(yt?.getPlayerState?.()!==YT.PlayerState.PLAYING)status.textContent='Tap play to continue this track'},1400);
    };
    async function setItem(itemIndex,autoplay=false,startAt=0){
      if(!items.length)return;
      restoring=true;stopMedia();index=itemIndex;currentItem=items[itemIndex];
      title.textContent=currentItem.title;
      status.textContent=`${currentItem.language||'Audio'} · ${currentItem.category||'Article'} · ${currentItem.kind==='youtube'?'YouTube Music':'ShareCapsule Audio'}`;
      fill.style.width='0%';current.textContent=fmt(startAt);duration.textContent='0:00';play.textContent=autoplay?'❚❚':'▶';
      if(currentItem.kind==='audio'){
        audio.src=currentItem.mediaUrl;audio.load();
        audio.onloadedmetadata=async()=>{
          duration.textContent=fmt(audio.duration);
          if(startAt>0&&Number.isFinite(audio.duration))audio.currentTime=Math.min(startAt,Math.max(0,audio.duration-.25));
          restoring=false;
          if(autoplay){try{await audio.play()}catch{status.textContent='Tap play to continue this track';play.textContent='▶'}}
          persist();
        };
      }else{
        await startYoutube(currentItem,autoplay,startAt);restoring=false;persist();
      }
    }
    const restoreOrPrepare=async()=>{
      const saved=readState();
      const savedIndex=saved?.id?items.findIndex(item=>item.id===saved.id):-1;
      if(savedIndex>=0){
        await setItem(savedIndex,Boolean(saved.playing),Math.max(0,Number(saved.position)||0));
        status.textContent=saved.playing?'Restoring current FM track':'Current FM track paused';
      }else{
        await setItem(randomIndex(),false,0);
        status.textContent='Ready — tap play';
      }
    };
    const load=async()=>{
      try{
        const [audioResponse,releasesResponse]=await Promise.all([
          fetch(`/audio/data.json?v=${Date.now()}`,{cache:'no-store'}),
          fetch(`/data/releases.json?v=${Date.now()}`,{cache:'no-store'})
        ]);
        if(audioResponse.ok){
          const data=await audioResponse.json();
          items.push(...(data.audio||[]).filter(item=>item.mediaUrl&&String(item.mimeType||'').startsWith('audio/')).map(item=>({kind:'audio',id:`audio:${item.id}`,title:item.title,language:item.language,category:item.category,mediaUrl:item.mediaUrl})));
        }
        if(releasesResponse.ok){const data=await releasesResponse.json();items.push(...(data.releases||data.items||[]).map(releaseSong).filter(Boolean))}
        const seen=new Set();items=items.filter(item=>!seen.has(item.id)&&seen.add(item.id));
        if(!items.length)throw new Error('No playable FM items found');
        await restoreOrPrepare();
      }catch(error){title.textContent='FM unavailable';status.textContent=error.message;play.disabled=true;next.disabled=true}
    };

    play.onclick=async()=>{
      if(!currentItem)return;
      if(currentItem.kind==='audio'){
        if(audio.paused)audio.play().catch(()=>{status.textContent='Playback blocked — tap again'});else audio.pause();
      }else{
        await ensureYouTube();
        if(yt?.getPlayerState?.()===YT.PlayerState.PLAYING)yt.pauseVideo();else yt?.playVideo?.();
      }
      setTimeout(persist,100);
    };
    next.onclick=()=>{stopMedia();writeState(null);setItem(randomIndex(),true,0)};
    track.onclick=event=>{
      const rect=track.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
      if(currentItem?.kind==='audio'&&audio.duration)audio.currentTime=ratio*audio.duration;
      else if(currentItem?.kind==='youtube'&&yt?.getDuration)yt.seekTo(ratio*yt.getDuration(),true);
      persist();
    };
    audio.onplay=()=>{play.textContent='❚❚';status.textContent='Playing audio article';persist()};
    audio.onpause=()=>{play.textContent='▶';if(!restoring&&audio.currentTime>0&&!audio.ended)status.textContent='Paused';persist()};
    audio.ontimeupdate=()=>{current.textContent=fmt(audio.currentTime);fill.style.width=`${audio.duration?audio.currentTime/audio.duration*100:0}%`;persist()};
    audio.onended=()=>{writeState(null);setItem(randomIndex(),true,0)};
    window.addEventListener('pagehide',persist);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persist()});
    load();return true;
  };

  if(!mount()){
    document.addEventListener('DOMContentLoaded',mount,{once:true});
    let attempts=0;const retry=setInterval(()=>{attempts+=1;if(mount()||attempts>40)clearInterval(retry)},250);
  }
})();