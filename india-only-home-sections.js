(()=>{
  const isHome=()=>location.pathname==='/'&&!new URLSearchParams(location.search).has('release');
  const isIndiaVisitor=()=>document.cookie.split(';').some(part=>part.trim()==='sharecapsule-country=IN');
  const INDIA_ONLY_IDS=['homeIndiaSchemes','homeIndiaOpportunities'];

  const enforce=()=>{
    if(!isHome()||isIndiaVisitor())return;
    for(const id of INDIA_ONLY_IDS)document.getElementById(id)?.remove();
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enforce,{once:true});
  else enforce();

  const root=document.getElementById('app')||document.body;
  const observer=new MutationObserver(enforce);
  observer.observe(root,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),15000);
  window.addEventListener('popstate',()=>setTimeout(enforce,0));
})();
