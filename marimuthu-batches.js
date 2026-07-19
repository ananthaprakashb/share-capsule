(()=>{
  const load=src=>{if(document.querySelector(`script[src="${src}"]`))return;const script=document.createElement('script');script.src=src;script.defer=true;document.body.appendChild(script)};
  load('https://cdn.jsdelivr.net/gh/ananthaprakashb/share-capsule@ea119fa6f6143a7fb733cbba9a8580cdfc3c441b/marimuthu-batches.js');
  load('/marimuthu-validation.js');
  load('/marimuthu-routing-fix.js');
})();
