(()=>{
  const init=()=>{
    if(!/^\/cards\/daily(?:\/|$)/i.test(location.pathname))return;

    const limits={greetingX:[0,1080],messageX:[0,1080],greetingY:[0,1350],messageY:[0,1350]};
    for(const [id,[min,max]] of Object.entries(limits)){
      const input=document.getElementById(id);
      if(!input)continue;
      input.min=String(min);
      input.max=String(max);
    }

    const positionGroup=[...document.querySelectorAll('.panel .group')].find(group=>
      group.querySelector('h2')?.textContent.trim().toLowerCase().includes('position text')
    );
    if(positionGroup)positionGroup.hidden=true;

    const help=document.querySelector('.canvasHelp');
    if(help)help.textContent='Drag the title or message directly anywhere on the card.';

    const canvas=document.getElementById('card');
    if(canvas){
      canvas.setAttribute('aria-label','Daily greeting card editor. Drag the title or message anywhere on the image.');
      canvas.style.cursor='move';
    }
  };

  document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded',init,{once:true})
    : init();
})();
