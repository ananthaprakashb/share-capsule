// ShareCapsule WhatsApp video engine bootstrap.
// Loads FFmpeg browser bundles from multiple CDNs before the page's split handler runs.
(function(){
  'use strict';
  const scripts=[
    ['FFmpegWASM','https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/umd/ffmpeg.js'],
    ['FFmpegUtil','https://unpkg.com/@ffmpeg/util@0.12.2/dist/umd/index.js']
  ];
  window.ShareCapsuleVideoEngineReady=(async()=>{
    for(const [globalName,url] of scripts){
      if(window[globalName]) continue;
      await new Promise((resolve,reject)=>{
        const s=document.createElement('script');
        s.src=url;s.async=false;s.crossOrigin='anonymous';
        s.onload=()=>window[globalName]?resolve():reject(new Error(globalName+' loaded without expected browser global'));
        s.onerror=()=>reject(new Error('Unable to load '+globalName));
        document.head.appendChild(s);
      });
    }
    return Boolean(window.FFmpegWASM?.FFmpeg && window.FFmpegUtil?.fetchFile && window.FFmpegUtil?.toBlobURL);
  })();
})();
