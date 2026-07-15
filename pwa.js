(()=>{
  const API='https://sharecapsule-reactions.subhafash-86.workers.dev';
  let deferredPrompt=null;
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const base64ToUint8=value=>{const padding='='.repeat((4-value.length%4)%4);const raw=atob((value+padding).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));};
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();

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

  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;render();});
  ready(async()=>{
    if('serviceWorker'in navigator){try{await navigator.serviceWorker.register('/sw.js',{scope:'/'});}catch(error){console.warn('PWA registration failed',error);}}
    render();
  });
})();
