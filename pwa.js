(()=>{
  const API='https://sharecapsule-reactions.subhafash-86.workers.dev';
  let deferredPrompt=null;
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const base64ToUint8=value=>{const padding='='.repeat((4-value.length%4)%4);const raw=atob((value+padding).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));};
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();

  const installStyles=()=>{
    if(document.getElementById('sharecapsulePwaStyles'))return;
    const style=document.createElement('style');
    style.id='sharecapsulePwaStyles';
    style.textContent=`
      .sharecapsulePwaBar{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:0 0 22px;padding:16px;border:1px solid rgba(120,110,100,.24);border-radius:20px;background:rgba(255,255,255,.88);box-shadow:0 8px 28px rgba(35,31,27,.07);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .sharecapsulePwaBar>div:first-child{min-width:0;flex:1}
      .sharecapsulePwaBar strong,.sharecapsulePwaBar span{display:block}
      .sharecapsulePwaBar strong{margin:0;font-size:16px;line-height:1.25;font-weight:900;letter-spacing:-.02em;color:inherit}
      .sharecapsulePwaBar span{margin-top:4px;font-size:13px;line-height:1.4;color:#746d65}
      .sharecapsulePwaActions{display:flex;align-items:center;gap:9px;flex:0 0 auto}
      .sharecapsulePwaActions button{min-height:42px;border:0;border-radius:999px;padding:10px 15px;background:#132f45;color:#fff;font:850 13px/1 system-ui,-apple-system,sans-serif;white-space:nowrap;cursor:pointer}
      .sharecapsulePwaActions button+button{background:#0f766e}
      .sharecapsulePwaActions button:disabled{opacity:.65;cursor:default}
      .sharecapsuleInstallGuide{position:fixed;inset:0;z-index:100000;display:grid;place-items:end center;padding:18px;background:rgba(12,20,27,.55);backdrop-filter:blur(8px)}
      .sharecapsuleInstallCard{position:relative;width:min(100%,460px);padding:24px;border-radius:26px;background:#fff;color:#191919;box-shadow:0 24px 80px rgba(0,0,0,.28);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .sharecapsuleInstallClose{position:absolute;top:12px;right:14px;width:36px;height:36px;border:0;border-radius:50%;background:#f0ede8;font-size:24px}
      .sharecapsuleInstallIcon{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:#e8f4f2;color:#0f766e;font-size:28px;font-weight:900}
      .sharecapsuleInstallCard h2{margin:14px 0 8px;font-size:23px;line-height:1.15}
      .sharecapsuleInstallCard p,.sharecapsuleInstallCard li{font-size:15px;line-height:1.45}
      .sharecapsuleInstallCard ol{margin:14px 0;padding-left:22px}
      .sharecapsuleOpenShare{width:100%;border:0;border-radius:15px;padding:14px;background:#132f45;color:#fff;font-size:16px;font-weight:900}
      .sharecapsuleInstallHint{margin:12px 0 0;color:#6e6861;font-size:12px!important}
      @media(max-width:620px){
        .sharecapsulePwaBar{align-items:stretch;flex-direction:column;gap:13px;padding:15px}
        .sharecapsulePwaBar strong{font-size:17px}
        .sharecapsulePwaActions{width:100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
        .sharecapsulePwaActions button{width:100%;padding:11px 10px}
        .sharecapsulePwaActions button:only-child{grid-column:1/-1}
      }
    `;
    document.head.appendChild(style);
  };

  const closeInstallGuide=()=>document.getElementById('sharecapsuleInstallGuide')?.remove();

  const openShareSheet=async()=>{
    if(navigator.share){
      try{
        await navigator.share({title:'Share Capsule',text:'Add Share Capsule to your Home Screen.',url:location.origin+'/'});
        return;
      }catch(error){
        if(error?.name==='AbortError')return;
      }
    }
    const message=document.getElementById('sharecapsuleInstallGuideMessage');
    if(message)message.textContent='Tap the ••• button at the bottom-right of Safari, choose Share, then scroll to Add to Home Screen.';
  };

  const showIosGuide=()=>{
    closeInstallGuide();
    const guide=document.createElement('div');
    guide.id='sharecapsuleInstallGuide';
    guide.className='sharecapsuleInstallGuide';
    guide.setAttribute('role','dialog');
    guide.setAttribute('aria-modal','true');
    guide.setAttribute('aria-labelledby','sharecapsuleInstallGuideTitle');
    guide.innerHTML=`<div class="sharecapsuleInstallCard"><button class="sharecapsuleInstallClose" type="button" aria-label="Close">×</button><div class="sharecapsuleInstallIcon">↗</div><h2 id="sharecapsuleInstallGuideTitle">Add Share Capsule to your iPhone</h2><p id="sharecapsuleInstallGuideMessage">Tap <strong>Open Share menu</strong>, then choose <strong>Add to Home Screen</strong>. If it is not visible, scroll down in the actions list.</p><ol><li>Open the Share menu.</li><li>Choose <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong> in the top-right.</li></ol><button class="sharecapsuleOpenShare" type="button">Open Share menu</button><p class="sharecapsuleInstallHint">You can also tap the <strong>•••</strong> button at the bottom-right of Safari, then choose Share.</p></div>`;
    document.body.appendChild(guide);
    guide.querySelector('.sharecapsuleInstallClose').addEventListener('click',closeInstallGuide);
    guide.querySelector('.sharecapsuleOpenShare').addEventListener('click',openShareSheet);
    guide.addEventListener('click',event=>{if(event.target===guide)closeInstallGuide();});
  };

  const install=async()=>{
    if(deferredPrompt){
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt=null;
      render();
      return;
    }
    if(ios){showIosGuide();return;}
    alert('Open your browser menu and choose “Install app” or “Add to Home screen”.');
  };

  const subscribe=async button=>{
    if(!('serviceWorker'in navigator)||!('PushManager'in window)){button.textContent='Notifications unsupported';button.disabled=true;return;}
    if(Notification.permission==='denied'){alert('Notifications are blocked in browser settings for this site.');return;}
    button.disabled=true;button.textContent='Enabling…';
    try{
      const registration=await navigator.serviceWorker.ready;
      const keyResponse=await fetch(`${API}/api/push/public-key`,{cache:'no-store'});
      if(!keyResponse.ok)throw new Error('Notification service is not configured yet.');
      const {publicKey}=await keyResponse.json();
      const permission=await Notification.requestPermission();
      if(permission!=='granted')throw new Error('Notification permission was not granted.');
      let subscription=await registration.pushManager.getSubscription();
      if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64ToUint8(publicKey)});
      const response=await fetch(`${API}/api/push/subscribe`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription,source:location.pathname,userAgent:navigator.userAgent})});
      if(!response.ok)throw new Error('Could not save the notification subscription.');
      button.textContent='Notifications enabled';button.dataset.enabled='true';
    }catch(error){button.disabled=false;button.textContent='Notify me';alert(error.message);}
  };

  const render=()=>{
    installStyles();
    if(document.getElementById('sharecapsulePwaBar'))return;
    const anchor=document.getElementById('sharecapsuleEndpoints')||document.getElementById('sharecapsuleBreadcrumbs');
    if(!anchor)return;
    const bar=document.createElement('section');
    bar.id='sharecapsulePwaBar';
    bar.className='sharecapsulePwaBar';
    const installLabel=ios?'Add to Home Screen':'Install';
    bar.innerHTML=`<div><strong>${standalone?'Share Capsule app':'Get the Share Capsule app'}</strong><span>${standalone?'Installed on this device':ios?'Add it to your iPhone Home Screen':'Install for faster access and offline pages'}</span></div><div class="sharecapsulePwaActions">${standalone?'':`<button type="button" id="sharecapsuleInstall">${installLabel}</button>`}<button type="button" id="sharecapsuleNotify">Notify me</button></div>`;
    anchor.insertAdjacentElement('afterend',bar);
    document.getElementById('sharecapsuleInstall')?.addEventListener('click',install);
    document.getElementById('sharecapsuleNotify')?.addEventListener('click',event=>subscribe(event.currentTarget));
  };

  const loadDailyCustomTitle=()=>{
    if(!/^\/cards\/daily(?:\/|$)/i.test(location.pathname)||document.querySelector('script[data-daily-custom-title]'))return;
    const script=document.createElement('script');
    script.src='/cards/daily/custom-title.js';
    script.defer=true;
    script.dataset.dailyCustomTitle='true';
    document.body.appendChild(script);
  };

  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;render();});
  ready(async()=>{
    installStyles();
    if('serviceWorker'in navigator){try{await navigator.serviceWorker.register('/sw.js',{scope:'/'});}catch(error){console.warn('PWA registration failed',error);}}
    render();
    loadDailyCustomTitle();
  });
})();
