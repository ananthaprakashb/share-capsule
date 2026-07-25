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
    if(!canvas)return;

    canvas.setAttribute('aria-label','Daily greeting card editor. Drag the title or message anywhere on the image.');
    canvas.style.cursor='move';

    const personalizeGroup=[...document.querySelectorAll('.panel .group')].find(group=>
      group.querySelector('h2')?.textContent.trim().toLowerCase().includes('personalize')
    );

    let opacityInput=document.getElementById('bgOpacity');
    let opacityOutput=document.getElementById('bgOpacityOut');
    if(personalizeGroup&&!opacityInput){
      const field=document.createElement('div');
      field.className='field';
      field.innerHTML='<div class="rangeHead"><label for="bgOpacity">Background opacity</label><output id="bgOpacityOut">100</output></div><input id="bgOpacity" type="range" min="15" max="100" value="100">';
      personalizeGroup.appendChild(field);
      opacityInput=field.querySelector('#bgOpacity');
      opacityOutput=field.querySelector('#bgOpacityOut');
    }

    if(canvas.dataset.opacityWatermarkReady==='true')return;
    canvas.dataset.opacityWatermarkReady='true';

    const ctx=canvas.getContext('2d');
    const originalClearRect=ctx.clearRect.bind(ctx);
    const originalDrawImage=ctx.drawImage.bind(ctx);
    const originalFillText=ctx.fillText.bind(ctx);
    const originalFillRect=ctx.fillRect.bind(ctx);
    let backgroundOpacity=(Number(opacityInput?.value)||100)/100;

    ctx.clearRect=(...args)=>{
      originalClearRect(...args);
      ctx.save();
      ctx.globalAlpha=1;
      ctx.fillStyle='#000';
      originalFillRect(0,0,canvas.width,canvas.height);
      ctx.restore();
    };

    ctx.drawImage=(...args)=>{
      ctx.save();
      ctx.globalAlpha=backgroundOpacity;
      originalDrawImage(...args);
      ctx.restore();
    };

    ctx.fillText=(text,...args)=>{
      const next=text==='Create your own: sharecapsule.app/cards/daily'?'sharecapsule.app':text;
      originalFillText(next,...args);
    };

    const repaint=()=>{
      const message=document.getElementById('message');
      message?.dispatchEvent(new Event('input',{bubbles:true}));
    };

    opacityInput?.addEventListener('input',()=>{
      backgroundOpacity=(Number(opacityInput.value)||100)/100;
      if(opacityOutput)opacityOutput.value=opacityInput.value;
      repaint();
    });

    repaint();
  };

  document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded',init,{once:true})
    : init();
})();