(()=>{
  const AVATAR_SRC='/assets/marimuthu-profile.jpg?v=1';
  const AUTHOR_NAME='சுப மாரிமுத்து';
  const isMarimuthuPage=()=>/^\/(?:marimuthu|maimurhuayya)(?:\/|$)/i.test(location.pathname);
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  const installStyles=()=>{
    if(document.getElementById('marimuthuAuthorImageStyles'))return;
    const style=document.createElement('style');
    style.id='marimuthuAuthorImageStyles';
    style.textContent='.marimuthuAuthorLine{display:flex!important;align-items:center;justify-content:center;gap:12px}.marimuthuAuthorAvatar{width:58px!important;height:58px!important;flex:0 0 58px;object-fit:cover!important;object-position:center!important;border-radius:50%!important;border:3px solid rgba(255,255,255,.92)!important;background:#fff;box-shadow:0 8px 22px rgba(0,0,0,.2)!important;margin:0!important}.profile .marimuthuAuthorLine{color:#6b2f1c}.profile .marimuthuAuthorAvatar{border-color:#f6e3b5!important}.profileBar .marimuthuAuthorAvatar{width:62px!important;height:62px!important;flex-basis:62px}@media(max-width:520px){.marimuthuAuthorLine{gap:9px}.marimuthuAuthorAvatar,.profileBar .marimuthuAuthorAvatar{width:50px!important;height:50px!important;flex-basis:50px}}';
    document.head.appendChild(style);
  };
  const decorate=()=>{
    const targets=[...document.querySelectorAll('.profileBar h2,.profile .credit,.credit')].filter(node=>String(node.textContent||'').includes(AUTHOR_NAME));
    targets.forEach(target=>{
      if(target.querySelector('.marimuthuAuthorAvatar'))return;
      let image=null;
      const profile=target.closest('.profile');
      if(profile)image=profile.querySelector('img.portrait');
      if(!image)image=document.createElement('img');
      image.src=AVATAR_SRC;
      image.alt='';
      image.setAttribute('aria-hidden','true');
      image.removeAttribute('srcset');
      image.className='marimuthuAuthorAvatar';
      target.classList.add('marimuthuAuthorLine');
      target.prepend(image);
    });
  };
  if(!isMarimuthuPage())return;
  ready(()=>{installStyles();decorate()});
})();
