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