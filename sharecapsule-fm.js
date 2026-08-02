(()=>{
  const isFactcheckRoute=()=>/^\/factcheck(?:\/|$)/i.test(location.pathname);

  if(isFactcheckRoute()){
    const style=document.createElement('style');
    style.id='factcheckFocusedPageStyles';
    style.textContent=`
      #sharecapsuleBreadcrumbs,
      #sharecapsuleLanguage,
      #sharecapsuleReader,
      .sharecapsuleBreadcrumbs,
      .sharecapsuleLanguage,
      .sharecapsuleReader,
      .sharecapsuleFm,
      .sharecapsuleFM,
      [data-sharecapsule-fm],
      [class*="sharecapsuleFm"],
      [id*="sharecapsuleFm"]{display:none!important}
      body{padding-bottom:0!important}
    `;
    document.head.appendChild(style);
    return;
  }

  if(!window.__sharecapsuleAbsoluteFetch){
    const nativeFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>{
      if(typeof input==='string'){
        try{input=new URL(input,document.baseURI||location.href).href}catch(_){ }
      }
      return nativeFetch(input,init);
    };
    window.__sharecapsuleAbsoluteFetch=true;
  }

  const retryReleases=()=>{
    if(location.pathname!=='/'||!document.querySelector('#app .error')||typeof window.load!=='function')return;
    window.load();
  };

  const core=document.createElement('script');
  core.src='https://cdn.jsdelivr.net/gh/ananthaprakashb/share-capsule@a7f5e020a9816dbc55481c1d1c224ac11d2541e2/sharecapsule-fm.js';
  core.defer=true;
  core.addEventListener('load',()=>setTimeout(retryReleases,0));
  document.body.appendChild(core);
  setTimeout(retryReleases,250);

  const installStyles=()=>{
    if(document.getElementById('homeFeatureStyles'))return;
    const style=document.createElement('style');
    style.id='homeFeatureStyles';
    style.textContent=`
      .homeFeatureStack{display:grid;gap:14px;margin:0 0 20px}
      .homeTamilRadio,.homeFactcheck{display:block;padding:24px;border-radius:28px;color:#fff;text-decoration:none;box-shadow:0 18px 48px rgba(40,30,30,.18);position:relative;overflow:hidden}
      .homeTamilRadio{background:linear-gradient(145deg,#32122a,#8d2457 58%,#e45b83)}
      .homeFactcheck{background:linear-gradient(145deg,#102d3b,#176a67 58%,#42a982)}
      .homeTamilRadio:before,.homeFactcheck:before{position:absolute;right:22px;top:4px;font-size:112px;line-height:1;color:rgba(255,255,255,.09);font-weight:900}
      .homeTamilRadio:before{content:"♪"}.homeFactcheck:before{content:"✓"}
      .homeTamilRadio>*,.homeFactcheck>*{position:relative;z-index:1}
      .homeFeatureEyebrow{margin:0 0 8px;font-size:10px;font-weight:950;letter-spacing:.15em;text-transform:uppercase;opacity:.78}
      .homeTamilRadio h2,.homeFactcheck h2{margin:0;max-width:620px;font-size:clamp(30px,6vw,44px);line-height:.98;letter-spacing:-.055em}
      .homeTamilRadio p,.homeFactcheck p{max-width:650px;margin:13px 0 0;color:rgba(255,255,255,.84);font-size:14px;line-height:1.58}
      .homeFeatureMeta{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px}
      .homeFeatureMeta span{padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.12);font-size:11px;font-weight:850}
      .homeFeatureAction{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-top:19px;padding:15px 16px;border-radius:16px;background:#fff;font-size:13px;font-weight:950}
      .homeTamilRadio .homeFeatureAction{color:#6b1c45}.homeFactcheck .homeFeatureAction{color:#145c58}
    `;
    document.head.appendChild(style);
  };

  const render=()=>{
    if(location.pathname!=='/'||new URLSearchParams(location.search).has('release'))return;
    const toolbar=document.querySelector('#app .toolbar');
    if(!toolbar||document.getElementById('homeFeatureStack'))return;

    const stack=document.createElement('section');
    stack.id='homeFeatureStack';
    stack.className='homeFeatureStack';

    const factcheck=document.createElement('a');
    factcheck.id='homeFactcheck';
    factcheck.className='homeFactcheck';
    factcheck.href='/factcheck/';
    factcheck.innerHTML='<p class="homeFeatureEyebrow">New • News verification assistant</p><h2>Verify a message before you forward it.</h2><p>Paste Tamil or English news, check links, inspect image provenance, find date and context warnings, and review trusted evidence without a misleading AI truth score.</p><div class="homeFeatureMeta"><span>தமிழ் + English</span><span>News & WhatsApp forwards</span><span>Images & video links</span><span>Evidence report</span></div><div class="homeFeatureAction"><span>Open News Verification</span><span>Verify →</span></div>';

    const radio=document.createElement('a');
    radio.id='homeTamilRadio';
    radio.className='homeTamilRadio';
    radio.href='/tamilradio/';
    radio.innerHTML='<p class="homeFeatureEyebrow">Live Tamil audio</p><h2>Listen to Tamil radio from around the world.</h2><p>Open a dedicated Tamil radio experience with music, news, culture and community stations from India, Sri Lanka, Malaysia, Canada, the United States and Share Capsule.</p><div class="homeFeatureMeta"><span>♫ Music</span><span>◉ Live stations</span><span>🌍 Global Tamil</span><span>▶ Play in page</span></div><div class="homeFeatureAction"><span>Open Tamil Radio</span><span>Listen →</span></div>';

    stack.append(factcheck,radio);
    toolbar.insertAdjacentElement('beforebegin',stack);
  };

  installStyles();
  const observer=new MutationObserver(render);
  observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  render();
  window.addEventListener('popstate',()=>setTimeout(render,0));
})();