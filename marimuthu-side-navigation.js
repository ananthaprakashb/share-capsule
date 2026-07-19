(()=>{
  const installStyles=()=>{
    if(document.getElementById('marimuthuSideNavigationStyles'))return;
    const style=document.createElement('style');
    style.id='marimuthuSideNavigationStyles';
    style.textContent=`
      .post{position:relative;overflow:visible}
      .navigation{position:absolute;inset:0;display:block;margin:0;pointer-events:none}
      .navigation button{position:absolute;top:50%;width:48px;height:48px;padding:0;border:1px solid rgba(23,61,42,.16);border-radius:50%;background:#fff;color:#173d2a;font-size:0;line-height:1;box-shadow:0 10px 28px rgba(31,55,38,.18);pointer-events:auto;transform:translateY(-50%);z-index:5}
      .navigation button::before{display:block;font-size:28px;font-weight:700;line-height:46px;text-align:center}
      #prev{left:-68px}
      #prev::before{content:'‹'}
      #next{right:-68px}
      #next::before{content:'›'}
      .navigation button:hover{background:#173d2a;color:#fff}
      .navigation button:focus-visible{outline:3px solid rgba(45,96,65,.28);outline-offset:3px}
      @media(max-width:1120px){
        #prev{left:10px}
        #next{right:10px}
        .navigation button{background:rgba(255,255,255,.94)}
      }
      @media(max-width:640px){
        .navigation button{top:38%;width:42px;height:42px}
        .navigation button::before{font-size:25px;line-height:40px}
        #prev{left:6px}
        #next{right:6px}
      }
    `;
    document.head.appendChild(style);
  };

  const applyLabels=()=>{
    const prev=document.getElementById('prev');
    const next=document.getElementById('next');
    if(prev){prev.textContent='';prev.setAttribute('aria-label','முந்தைய பாடல்');prev.title='முந்தைய பாடல்'}
    if(next){next.textContent='';next.setAttribute('aria-label','அடுத்த பாடல்');next.title='அடுத்த பாடல்'}
  };

  const apply=()=>{installStyles();applyLabels()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
})();
