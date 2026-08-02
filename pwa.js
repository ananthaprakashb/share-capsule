(()=>{
  const cleanup=async()=>{
    document.getElementById('sharecapsulePwaBar')?.remove();
    document.getElementById('sharecapsuleInstallGuide')?.remove();
    document.getElementById('sharecapsulePwaStyles')?.remove();
    document.querySelectorAll('link[rel="manifest"],link[rel="apple-touch-icon"],meta[name="apple-mobile-web-app-capable"],meta[name="apple-mobile-web-app-status-bar-style"],meta[name="apple-mobile-web-app-title"]').forEach(node=>node.remove());
    if('serviceWorker' in navigator){
      try{
        const registrations=await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration=>registration.unregister()));
      }catch(error){
        console.warn('Could not unregister service workers',error);
      }
    }
    if('caches' in window){
      try{
        const keys=await caches.keys();
        await Promise.all(keys.filter(key=>/share.?capsule|pwa|offline/i.test(key)).map(key=>caches.delete(key)));
      }catch(error){
        console.warn('Could not clear PWA caches',error);
      }
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanup,{once:true});
  else cleanup();
})();
