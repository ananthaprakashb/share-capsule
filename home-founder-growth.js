(()=>{
  const isIndiaVisitor=()=>document.cookie.split(';').some(part=>part.trim()==='sharecapsule-country=IN');
  const install=()=>{
    if(!isIndiaVisitor()||location.pathname!=='/'||document.getElementById('dailyWishesFeature'))return;

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
  const isIndiaVisitor=()=>document.cookie.split(';').some(part=>part.trim()==='sharecapsule-country=IN');
  const install=()=>{
    if(!isIndiaVisitor()||location.pathname!=='/'||new URLSearchParams(location.search).has('release')||document.getElementById('tnPlaceHistoryFeature'))return;

    if(!document.getElementById('tnPlaceHistoryFeatureStyles')){
      const style=document.createElement('style');
      style.id='tnPlaceHistoryFeatureStyles';
      style.textContent=`
        .tnPlaceHistoryFeature{display:grid;grid-template-columns:minmax(250px,42%) 1fr;margin:0 0 20px;border-radius:28px;background:#2b1712;color:#fff;text-decoration:none;box-shadow:0 20px 54px rgba(62,29,17,.24);overflow:hidden;position:relative;isolation:isolate;transition:transform .2s ease,box-shadow .2s ease}
        .tnPlaceHistoryFeature:hover{transform:translateY(-3px);box-shadow:0 24px 64px rgba(62,29,17,.3)}
        .tnPlaceHistoryVisual{min-height:300px;background:#5b3022 url('/assets/tn-place-history-library.svg') center/cover no-repeat;position:relative}
        .tnPlaceHistoryVisual:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 58%,rgba(43,23,18,.82))}
        .tnPlaceHistoryCopy{padding:28px 28px 24px;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:1;background:radial-gradient(circle at 100% 0,rgba(222,151,73,.22),transparent 38%),linear-gradient(145deg,#2b1712,#743422)}
        .tnPlaceHistoryEyebrow{margin:0 0 9px;text-transform:uppercase;letter-spacing:.14em;font-size:10px;font-weight:900;color:#f0bd75}
        .tnPlaceHistoryFeature h2{margin:0;font-family:"Noto Sans Tamil",Inter,system-ui,sans-serif;font-size:clamp(28px,4vw,42px);line-height:1.08;letter-spacing:-.035em;max-width:560px}
        .tnPlaceHistoryQuestion{display:inline-block;margin-top:5px;color:#ffe2a8}
        .tnPlaceHistoryIntro{margin:14px 0 0;color:rgba(255,255,255,.84);font-size:14px;line-height:1.6;max-width:600px}
        .tnPlaceHistoryMeta{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px}
        .tnPlaceHistoryMeta span{padding:7px 10px;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.08);font-size:11px;font-weight:850}
        .tnPlaceHistoryAction{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,.16);font-size:13px;font-weight:900;color:#ffe2a8}
        .tnPlaceHistoryArrow{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#fff;color:#6e2f20;font-size:20px;flex:0 0 auto}
        @media(max-width:700px){.tnPlaceHistoryFeature{grid-template-columns:1fr}.tnPlaceHistoryVisual{min-height:220px}.tnPlaceHistoryVisual:after{background:linear-gradient(180deg,transparent 55%,rgba(43,23,18,.88))}.tnPlaceHistoryCopy{padding:22px}.tnPlaceHistoryFeature h2{font-size:31px}}
        @media(max-width:430px){.tnPlaceHistoryVisual{min-height:190px}.tnPlaceHistoryCopy{padding:20px}.tnPlaceHistoryFeature h2{font-size:28px}.tnPlaceHistoryIntro{font-size:13px}}
      `;
      document.head.appendChild(style);
    }

    const card=document.createElement('a');
    card.id='tnPlaceHistoryFeature';
    card.className='tnPlaceHistoryFeature';
    card.href=ENDPOINT;
    card.setAttribute('aria-label','நம்ம ஊரும் இந்த லிஸ்ட்ல இருக்கா? தமிழ்நாடு ஊர்ப்பெயர் வரலாறுகளை பாருங்கள்');
    card.innerHTML='<div class="tnPlaceHistoryVisual" aria-hidden="true"></div><div class="tnPlaceHistoryCopy"><p class="tnPlaceHistoryEyebrow">தமிழ்நாடு · ஊர்ப்பெயர் வரலாறு</p><h2>நம்ம ஊரும் இந்த லிஸ்ட்ல இருக்கா?<span class="tnPlaceHistoryQuestion">தேடிப் பார்ப்போமா?</span></h2><p class="tnPlaceHistoryIntro">உங்கள் சொந்த ஊரின் பெயர் எப்படி வந்தது என்று அறியுங்கள். வரலாற்றுச் சான்றுகள், கல்வெட்டுகள், இலக்கிய குறிப்புகள் மற்றும் நம்பகமான மேற்கோள்களுடன் ஊர்ப்பெயர் கதைகளைப் படிக்கலாம்.</p><div class="tnPlaceHistoryMeta"><span>தமிழ் + English</span><span>Verified references</span><span>Community contributions</span></div><div class="tnPlaceHistoryAction"><span>உங்கள் ஊரை இப்போது தேடுங்கள்</span><span class="tnPlaceHistoryArrow">→</span></div></div>';

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