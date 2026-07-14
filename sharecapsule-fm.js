(()=>{
  const ENDPOINTS=[
    {href:'/',label:'Releases'},
    {href:'/audio/',label:'Audio'},
    {href:'/jobs/',label:'Jobs'},
    {href:'/law/',label:'Law'},
    {href:'/parking/',label:'Parking'}
  ];

  const installBrand=top=>{
    if(!document.querySelector('link[rel="icon"][data-sharecapsule]')){
      const icon=document.createElement('link');
      icon.rel='icon';
      icon.type='image/svg+xml';
      icon.href='/favicon.svg?v=3';
      icon.dataset.sharecapsule='true';
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
    const normalize=value=>{const path=String(value||'/').replace(/\/+$/,'');return path||'/'};
    const current=normalize(location.pathname);
    const nav=document.createElement('nav');
    nav.id='sharecapsuleEndpoints';
    nav.className='endpointNav';
    nav.setAttribute('aria-label','Explore Share Capsule sections');
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
    root.id='sharecapsuleFm';
    root.className='fm';
    root.setAttribute('aria-label','ShareCapsule FM');
    root.innerHTML='<div class="fmTop"><button class="fmPlay" id="fmPlay" type="button" aria-label="Play ShareCapsule FM">▶</button><div class="fmInfo"><div class="fmName">ShareCapsule FM</div><div class="fmTitle" id="fmTitle">Building a mixed queue…</div><div class="fmState" id="fmState">Loading audio articles, songs and local news</div></div><button class="fmNext" id="fmNext" type="button">Next</button></div><div class="fmTrack" id="fmTrack"><div class="fmFill" id="fmFill"></div></div><div class="fmTimes"><span id="fmCurrent">0:00</span><span id="fmDuration">0:00</span></div><audio id="fmAudio" preload="metadata"></audio><div class="fmYouTube" id="fmYouTube"></div>';
    top.insertAdjacentElement('afterend',root);
    installEndpointNav(root);

    const $=id=>document.getElementById(id);
    const audio=$('fmAudio'),play=$('fmPlay'),next=$('fmNext'),title=$('fmTitle'),status=$('fmState'),fill=$('fmFill'),track=$('fmTrack'),current=$('fmCurrent'),duration=$('fmDuration');
    let items=[],index=-1,currentItem=null,yt=null,ytReady=null,timer=null;
    let newsHeadlines=[],newsLocation='',newsCursor=0,readingNews=false,advanceToken=0;

    const fmt=value=>{const seconds=Math.max(0,Number(value)||0);return`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`};
    const randomIndex=()=>{if(items.length<2)return 0;let candidate;do candidate=Math.floor(Math.random()*items.length);while(candidate===index);return candidate};
    const youtubeId=raw=>{try{const url=new URL(raw);if(url.hostname==='youtu.be')return url.pathname.split('/').filter(Boolean)[0]||null;if(url.hostname.endsWith('youtube.com'))return url.searchParams.get('v')||url.pathname.match(/\/embed\/([^/?#]+)/)?.[1]||null}catch{}return null};
    const releaseSong=release=>{const urls=[release.primaryPlayer?.url,...(release.platforms||[]).map(platform=>platform.url),release.youtubeMusicUrl,release.youtubeUrl].filter(Boolean);for(const url of urls){const id=youtubeId(url);if(id)return{kind:'youtube',id:`song:${release.slug||id}`,title:release.title||'Song',language:release.language||'Music',category:release.category||'Song',videoId:id}}return null};

    const cancelSpeech=()=>{if('speechSynthesis'in window)window.speechSynthesis.cancel();readingNews=false};
    const stopMedia=()=>{audio.pause();if(yt&&typeof yt.pauseVideo==='function')yt.pauseVideo();clearInterval(timer)};
    const stopAll=()=>{stopMedia();cancelSpeech()};

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

    const updateYoutubeProgress=()=>{if(!yt||currentItem?.kind!=='youtube')return;const total=yt.getDuration?.()||0,elapsed=yt.getCurrentTime?.()||0;current.textContent=fmt(elapsed);duration.textContent=fmt(total);fill.style.width=`${total?elapsed/total*100:0}%`};

    const loadLocalNews=async()=>{
      try{
        const response=await fetch('https://sharecapsule-reactions.subhafash-86.workers.dev/api/local-news',{cache:'no-store'});
        if(!response.ok)return;
        const data=await response.json();
        newsLocation=data.location||'';
        newsHeadlines=(data.headlines||[]).filter(item=>item.title&&item.source).slice(0,5);
      }catch{}
    };

    const speakLocalNews=()=>new Promise(resolve=>{
      if(!newsHeadlines.length||!('speechSynthesis'in window)){resolve();return}
      readingNews=true;
      stopMedia();
      const headline=newsHeadlines[newsCursor%newsHeadlines.length];
      newsCursor+=1;
      const locationText=newsLocation?` for ${newsLocation}`:'';
      title.textContent='Local News Update';
      status.textContent=`${headline.source}${locationText}`;
      fill.style.width='0%';current.textContent='News';duration.textContent='';play.textContent='❚❚';
      const utterance=new SpeechSynthesisUtterance(`ShareCapsule local news${locationText}. ${headline.title}. Source: ${headline.source}.`);
      utterance.rate=0.96;
      utterance.pitch=1;
      utterance.onend=()=>{readingNews=false;resolve()};
      utterance.onerror=()=>{readingNews=false;resolve()};
      window.speechSynthesis.speak(utterance);
    });

    const advanceWithNews=async()=>{
      const token=++advanceToken;
      await speakLocalNews();
      if(token!==advanceToken)return;
      await setItem(randomIndex(),true);
    };

    const handleYoutubeState=event=>{
      if(event.data===YT.PlayerState.PLAYING){play.textContent='❚❚';status.textContent='Playing song from YouTube Music';clearInterval(timer);timer=setInterval(updateYoutubeProgress,500)}
      else if(event.data===YT.PlayerState.PAUSED){play.textContent='▶';status.textContent='Paused'}
      else if(event.data===YT.PlayerState.ENDED)advanceWithNews();
    };

    const startYoutube=async(item,autoplay)=>{
      await ensureYouTube();
      if(!yt){
        yt=new YT.Player('fmYouTube',{height:'1',width:'1',videoId:item.videoId,playerVars:{autoplay:autoplay?1:0,controls:0,playsinline:1,origin:location.origin},events:{onReady:event=>{if(autoplay)event.target.playVideo()},onStateChange:handleYoutubeState}});
      }else{
        yt.loadVideoById(item.videoId);
      }
      setTimeout(()=>{if(yt?.getPlayerState?.()!==YT.PlayerState.PLAYING)status.textContent='Autoplay blocked — tap play'},1400);
    };

    async function setItem(itemIndex,autoplay=true){
      if(!items.length)return;
      stopAll();
      index=itemIndex;currentItem=items[itemIndex];
      title.textContent=currentItem.title;
      status.textContent=`${currentItem.language||'Audio'} · ${currentItem.category||'Article'} · ${currentItem.kind==='youtube'?'YouTube Music':'ShareCapsule Audio'}`;
      fill.style.width='0%';current.textContent='0:00';duration.textContent='0:00';play.textContent='▶';
      if(currentItem.kind==='audio'){
        audio.src=currentItem.mediaUrl;audio.load();
        if(autoplay){try{await audio.play()}catch{status.textContent='Autoplay blocked — tap play'}}
      }else await startYoutube(currentItem,autoplay);
    }

    const load=async()=>{
      try{
        const [audioResponse,releasesResponse]=await Promise.all([fetch(`/audio/data.json?v=${Date.now()}`,{cache:'no-store'}),fetch(`/data/releases.json?v=${Date.now()}`,{cache:'no-store'}),loadLocalNews()]);
        if(audioResponse.ok){const data=await audioResponse.json();items.push(...(data.audio||[]).filter(item=>item.mediaUrl&&String(item.mimeType||'').startsWith('audio/')).map(item=>({kind:'audio',id:`audio:${item.id}`,title:item.title,language:item.language,category:item.category,mediaUrl:item.mediaUrl})))}
        if(releasesResponse.ok){const data=await releasesResponse.json();items.push(...(data.releases||data.items||[]).map(releaseSong).filter(Boolean))}
        const seen=new Set();items=items.filter(item=>!seen.has(item.id)&&seen.add(item.id));
        if(!items.length)throw new Error('No playable FM items found');
        await setItem(randomIndex(),true);
      }catch(error){title.textContent='FM unavailable';status.textContent=error.message;play.disabled=true;next.disabled=true}
    };

    play.onclick=async()=>{
      if(readingNews){if(window.speechSynthesis.paused){window.speechSynthesis.resume();play.textContent='❚❚'}else{window.speechSynthesis.pause();play.textContent='▶'}return}
      if(!currentItem)return;
      if(currentItem.kind==='audio'){audio.paused?audio.play().catch(()=>{status.textContent='Playback blocked — tap again'}):audio.pause()}
      else{await ensureYouTube();yt?.getPlayerState?.()===YT.PlayerState.PLAYING?yt.pauseVideo():yt?.playVideo?.()}
    };

    next.onclick=()=>{advanceToken+=1;stopAll();setItem(randomIndex(),true)};
    track.onclick=event=>{if(readingNews)return;const rect=track.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));if(currentItem?.kind==='audio'&&audio.duration)audio.currentTime=ratio*audio.duration;else if(currentItem?.kind==='youtube'&&yt?.getDuration)yt.seekTo(ratio*yt.getDuration(),true)};
    audio.onplay=()=>{play.textContent='❚❚';status.textContent='Playing audio article'};
    audio.onpause=()=>{play.textContent='▶';if(audio.currentTime>0&&!audio.ended)status.textContent='Paused'};
    audio.onloadedmetadata=()=>{duration.textContent=fmt(audio.duration)};
    audio.ontimeupdate=()=>{current.textContent=fmt(audio.currentTime);fill.style.width=`${audio.duration?audio.currentTime/audio.duration*100:0}%`};
    audio.onended=advanceWithNews;

    load();
    return true;
  };

  if(!mount()){
    document.addEventListener('DOMContentLoaded',mount,{once:true});
    let attempts=0;
    const retry=setInterval(()=>{attempts+=1;if(mount()||attempts>40)clearInterval(retry)},250);
  }
})();