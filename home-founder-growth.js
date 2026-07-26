(()=>{
  const install=()=>{
    if(location.pathname!=='/'||document.getElementById('dailyWishesFeature'))return;

    const style=document.createElement('style');
    style.id='dailyWishesFeatureStyles';
    style.textContent=`
      .dailyWishesFeature{display:grid;grid-template-columns:96px 1fr auto;gap:15px;align-items:center;margin:0 0 20px;padding:15px;border-radius:24px;background:linear-gradient(135deg,#5b247a,#d36b98 58%,#f7b733);color:#fff;text-decoration:none;box-shadow:0 16px 42px rgba(91,36,122,.2);overflow:hidden;position:relative}
      .dailyWishesArt{width:96px;aspect-ratio:1;border-radius:18px;display:grid;place-items:center;background:radial-gradient(circle,#fff7c2 0 18%,rgba(255,247,194,.2) 19% 42%,transparent 43%);font-size:44px}
      .dailyWishesCopy{position:relative;z-index:1}
      .dailyWishesCopy small{display:block;text-transform:uppercase;letter-spacing:.12em;font-weight:900;opacity:.82}
      .dailyWishesCopy strong{display:block;margin-top:5px;font-size:23px;line-height:1.06;letter-spacing:-.035em}
      .dailyWishesCopy span{display:block;margin-top:7px;font-size:13px;line-height:1.4;opacity:.92}
      .dailyWishesGo{position:relative;z-index:1;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#fff;color:#6b2d8f;font-weight:900;font-size:20px}
      @media(max-width:560px){.dailyWishesFeature{grid-template-columns:74px 1fr}.dailyWishesArt{width:74px;font-size:36px}.dailyWishesGo{display:none}.dailyWishesCopy strong{font-size:20px}}
    `;
    document.head.appendChild(style);

    const card=document.createElement('a');
    card.id='dailyWishesFeature';
    card.className='dailyWishesFeature';
    card.href='/cards/daily/';
    card.setAttribute('aria-label','Create and share daily greeting cards');
    card.innerHTML='<div class="dailyWishesArt">☀</div><div class="dailyWishesCopy"><small>Free daily wishes</small><strong>Good Morning, Good Day and Good Night cards</strong><span>Choose a devotional or nature design, personalize it, and share it with family and friends.</span></div><div class="dailyWishesGo">→</div>';

    const place=()=>{
      const hero=document.querySelector('#app .hero');
      if(!hero)return false;
      hero.insertAdjacentElement('afterend',card);
      return true;
    };

    if(!place()){
      const observer=new MutationObserver(()=>{
        if(place())observer.disconnect();
      });
      observer.observe(document.documentElement,{childList:true,subtree:true});
      setTimeout(()=>observer.disconnect(),10000);
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

(()=>{
  const ENDPOINT='/name/history/tn/';
  const install=()=>{
    if(location.pathname!=='/'||new URLSearchParams(location.search).has('release')||document.getElementById('tnPlaceHistoryFeature'))return;

    if(!document.getElementById('tnPlaceHistoryFeatureStyles')){
      const style=document.createElement('style');
      style.id='tnPlaceHistoryFeatureStyles';
      style.textContent=`
        .tnPlaceHistoryFeature{display:block;margin:0 0 20px;padding:22px;border-radius:26px;background:linear-gradient(145deg,#6f241d,#a94a2f 58%,#d7893d);color:#fff;text-decoration:none;box-shadow:0 16px 44px rgba(111,36,29,.2);overflow:hidden;position:relative}
        .tnPlaceHistoryFeature:before{content:"";position:absolute;width:210px;height:210px;border:1px solid rgba(255,255,255,.18);border-radius:50%;right:-85px;top:-105px}
        .tnPlaceHistoryTop{display:flex;justify-content:space-between;align-items:flex-start;gap:15px;position:relative;z-index:1}
        .tnPlaceHistoryEyebrow{margin:0 0 8px;text-transform:uppercase;letter-spacing:.14em;font-size:10px;font-weight:900;opacity:.8}
        .tnPlaceHistoryFeature h2{margin:0;font-size:29px;line-height:1.02;letter-spacing:-.045em;max-width:520px}
        .tnPlaceHistoryBadge{white-space:nowrap;padding:7px 10px;border:1px solid rgba(255,255,255,.25);border-radius:999px;background:rgba(255,255,255,.1);font-size:11px;font-weight:900}
        .tnPlaceHistoryIntro{position:relative;z-index:1;margin:12px 0 0;color:rgba(255,255,255,.87);font-size:14px;line-height:1.55;max-width:620px}
        .tnPlaceHistoryExamples{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:7px;margin-top:15px}
        .tnPlaceHistoryExamples span{padding:7px 9px;border-radius:999px;background:rgba(255,255,255,.11);font-size:11px;font-weight:850}
        .tnPlaceHistoryAction{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:18px;padding-top:15px;border-top:1px solid rgba(255,255,255,.18);font-size:13px;font-weight:900}
        @media(max-width:560px){.tnPlaceHistoryTop{display:block}.tnPlaceHistoryBadge{display:inline-block;margin-top:12px}.tnPlaceHistoryFeature h2{font-size:25px}}
      `;
      document.head.appendChild(style);
    }

    const card=document.createElement('a');
    card.id='tnPlaceHistoryFeature';
    card.className='tnPlaceHistoryFeature';
    card.href=ENDPOINT;
    card.setAttribute('aria-label','Discover the history and meaning behind your Tamil Nadu hometown name');
    card.innerHTML='<div class="tnPlaceHistoryTop"><div><p class="tnPlaceHistoryEyebrow">தமிழ்நாடு · Hometown stories</p><h2>What does your hometown name mean?</h2></div><span class="tnPlaceHistoryBadge">42+ places</span></div><p class="tnPlaceHistoryIntro">Search Tamil Nadu towns, cities, ancient ports and heritage sites to discover how their names developed. Read the historical context, check cited sources, vote on facts and share your hometown story.</p><div class="tnPlaceHistoryExamples"><span>Madurai · கூடல்</span><span>Korkai · Ancient port</span><span>Keezhadi · Archaeology</span><span>Thanjavur · Chola history</span></div><div class="tnPlaceHistoryAction"><span>Find your hometown story</span><span>Explore →</span></div>';

    const place=()=>{
      const daily=document.getElementById('dailyWishesFeature');
      if(daily){daily.insertAdjacentElement('afterend',card);return true}
      const hero=document.querySelector('#app .hero');
      if(!hero)return false;
      hero.insertAdjacentElement('afterend',card);
      return true;
    };

    if(!place()){
      const observer=new MutationObserver(()=>{
        if(place())observer.disconnect();
      });
      observer.observe(document.getElementById('app')||document.documentElement,{childList:true,subtree:true});
      setTimeout(()=>observer.disconnect(),10000);
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  window.addEventListener('popstate',()=>setTimeout(install,0));
})();