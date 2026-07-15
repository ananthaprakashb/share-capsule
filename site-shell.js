(()=>{
  const SCRIPT_SRC='/sharecapsule-fm.js';
  const labels={
    audio:'Audio',tip:'Tips',quotes:'Quotes',story:'Story',jobs:'Jobs',law:'Law',parking:'Parking',
    factcheck:'Fact Check',tiktok:'TikTok',paa:'PAA',tulip:'Tulip',archive:'Archive'
  };

  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();

  const ensureTop=()=>{
    let top=document.querySelector('.top');
    if(top)return top;
    const main=document.querySelector('main')||document.body;
    top=document.createElement('header');
    top.className='top sharecapsuleGlobalTop';
    top.innerHTML='<a class="brand" href="/">Share Capsule</a><a class="sharecapsuleHome" href="/">All releases</a>';
    main.insertAdjacentElement('afterbegin',top);
    return top;
  };

  const installStyles=()=>{
    if(document.getElementById('sharecapsuleGlobalShellStyles'))return;
    const style=document.createElement('style');
    style.id='sharecapsuleGlobalShellStyles';
    style.textContent='.sharecapsuleGlobalTop{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:4px 0 18px}.sharecapsuleGlobalTop .brand{color:inherit;text-decoration:none;font-weight:900}.sharecapsuleHome{color:inherit;text-decoration:none;font-size:12px;font-weight:850;padding:9px 12px;border:1px solid rgba(120,110,100,.25);border-radius:999px;background:rgba(255,255,255,.72)}.sharecapsuleBreadcrumbs{display:flex;align-items:center;gap:7px;overflow-x:auto;margin:-10px 0 18px;padding:2px 1px 5px;color:#736d66;font-size:12px;font-weight:800;scrollbar-width:none}.sharecapsuleBreadcrumbs::-webkit-scrollbar{display:none}.sharecapsuleBreadcrumbs a{color:inherit;text-decoration:none;white-space:nowrap}.sharecapsuleBreadcrumbs a:hover{text-decoration:underline}.sharecapsuleBreadcrumbs .sep{opacity:.45}.sharecapsuleBreadcrumbs .current{color:#24211e;white-space:nowrap}';
    document.head.appendChild(style);
  };

  const installBreadcrumbs=top=>{
    if(document.getElementById('sharecapsuleBreadcrumbs'))return;
    const parts=location.pathname.split('/').filter(Boolean);
    const crumbs=[{label:'Home',href:'/'}];
    let href='';
    for(const part of parts){
      if(part.toLowerCase()==='index.html')continue;
      href+=`/${part}`;
      const key=part.replace(/\.html$/i,'').toLowerCase();
      const label=labels[key]||key.replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
      crumbs.push({label,href:key==='archive'?null:`${href.replace(/\.html$/i,'')}/`});
    }
    if(!parts.length)crumbs.push({label:'Releases',href:null});
    const nav=document.createElement('nav');
    nav.id='sharecapsuleBreadcrumbs';
    nav.className='sharecapsuleBreadcrumbs';
    nav.setAttribute('aria-label','Breadcrumb');
    nav.innerHTML=crumbs.map((item,index)=>{
      const last=index===crumbs.length-1;
      const node=last||!item.href?`<span class="current" aria-current="page">${item.label}</span>`:`<a href="${item.href}">${item.label}</a>`;
      return `${index?'<span class="sep" aria-hidden="true">›</span>':''}${node}`;
    }).join('');
    top.insertAdjacentElement('afterend',nav);
  };

  const loadFm=()=>{
    if(document.querySelector(`script[src="${SCRIPT_SRC}"]`))return;
    const script=document.createElement('script');
    script.src=SCRIPT_SRC;
    script.defer=true;
    script.dataset.sharecapsuleGlobal='true';
    document.body.appendChild(script);
  };

  ready(()=>{
    installStyles();
    const top=ensureTop();
    installBreadcrumbs(top);
    loadFm();
  });
})();
