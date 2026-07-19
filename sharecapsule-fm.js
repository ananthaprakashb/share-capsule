(()=>{
  const core=document.createElement('script');
  core.src='https://cdn.jsdelivr.net/gh/ananthaprakashb/share-capsule@a7f5e020a9816dbc55481c1d1c224ac11d2541e2/sharecapsule-fm.js';
  core.defer=true;
  document.body.appendChild(core);

  const installStyles=()=>{
    if(document.getElementById('homeTamilRadioStyles'))return;
    const style=document.createElement('style');
    style.id='homeTamilRadioStyles';
    style.textContent='.homeTamilRadio{display:block;margin:0 0 20px;padding:24px;border-radius:28px;background:linear-gradient(145deg,#32122a,#8d2457 58%,#e45b83);color:#fff;text-decoration:none;box-shadow:0 18px 48px rgba(104,30,68,.22);position:relative;overflow:hidden}.homeTamilRadio:before{content:"♪";position:absolute;right:22px;top:4px;font-size:112px;line-height:1;color:rgba(255,255,255,.09);font-weight:900}.homeTamilRadio>*{position:relative;z-index:1}.homeTamilRadioEyebrow{margin:0 0 8px;font-size:10px;font-weight:950;letter-spacing:.15em;text-transform:uppercase;opacity:.78}.homeTamilRadio h2{margin:0;max-width:620px;font-size:clamp(30px,6vw,44px);line-height:.98;letter-spacing:-.055em}.homeTamilRadio p{max-width:650px;margin:13px 0 0;color:rgba(255,255,255,.84);font-size:14px;line-height:1.58}.homeTamilRadioMeta{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px}.homeTamilRadioMeta span{padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.12);font-size:11px;font-weight:850}.homeTamilRadioAction{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-top:19px;padding:15px 16px;border-radius:16px;background:#fff;color:#6b1c45;font-size:13px;font-weight:950}';
    document.head.appendChild(style);
  };
  const render=()=>{
    if(location.pathname!=='/'||new URLSearchParams(location.search).has('release'))return;
    const toolbar=document.querySelector('#app .toolbar');
    if(!toolbar||document.getElementById('homeTamilRadio'))return;
    const link=document.createElement('a');
    link.id='homeTamilRadio';
    link.className='homeTamilRadio';
    link.href='/tamilradio/';
    link.innerHTML='<p class="homeTamilRadioEyebrow">Live Tamil audio</p><h2>Listen to Tamil radio from around the world.</h2><p>Open a dedicated Tamil radio experience with music, news, culture and community stations from India, Sri Lanka, Malaysia, Canada, the United States and Share Capsule.</p><div class="homeTamilRadioMeta"><span>♫ Music</span><span>◉ Live stations</span><span>🌍 Global Tamil</span><span>▶ Play in page</span></div><div class="homeTamilRadioAction"><span>Open Tamil Radio</span><span>Listen →</span></div>';
    toolbar.insertAdjacentElement('beforebegin',link);
  };
  installStyles();
  const observer=new MutationObserver(render);
  observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  render();
  window.addEventListener('popstate',()=>setTimeout(render,0));
})();