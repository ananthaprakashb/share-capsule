(()=>{
  const isBirthdayRoute=()=>/^\/cards\/events\/birthday(?:\/|$)/i.test(location.pathname);
  if(!isBirthdayRoute())return;

  const PAGE_URL='https://sharecapsule.app/cards/events/birthday/';
  const WIDTH=1080,HEIGHT=1350;
  const proxyUrl=url=>'https://images.weserv.nl/?url='+encodeURIComponent(String(url).replace(/^https?:\/\//,''))+'&output=png';

  const show=text=>{
    const toast=document.getElementById('toast');
    if(!toast)return;
    toast.textContent=text;
    toast.classList.add('show');
    clearTimeout(show.timer);
    show.timer=setTimeout(()=>toast.classList.remove('show'),2200);
  };

  const loadImage=async url=>{
    const response=await fetch(proxyUrl(url),{mode:'cors',cache:'force-cache'});
    if(!response.ok)throw new Error('Card image could not be prepared');
    const blob=await response.blob();
    if('createImageBitmap'in window)return createImageBitmap(blob);
    const objectUrl=URL.createObjectURL(blob);
    try{
      const image=new Image();
      image.src=objectUrl;
      await image.decode();
      return image;
    }finally{
      URL.revokeObjectURL(objectUrl);
    }
  };

  const drawCover=(ctx,image)=>{
    const sw=image.width||image.naturalWidth,sh=image.height||image.naturalHeight;
    const scale=Math.max(WIDTH/sw,HEIGHT/sh),dw=sw*scale,dh=sh*scale;
    ctx.drawImage(image,(WIDTH-dw)/2,(HEIGHT-dh)/2,dw,dh);
  };

  const wrap=(ctx,text,maxWidth,maxLines)=>{
    const lines=[];
    for(const paragraph of String(text||'').split(/\n/)){
      if(lines.length>=maxLines)break;
      if(!paragraph.trim()){lines.push('');continue}
      let line='';
      for(const word of paragraph.trim().split(/\s+/)){
        const test=line?line+' '+word:word;
        if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test;
        if(lines.length>=maxLines-1)break;
      }
      if(line&&lines.length<maxLines)lines.push(line);
    }
    return lines.slice(0,maxLines);
  };

  const strokeFill=(ctx,text,x,y,maxWidth)=>{
    ctx.strokeText(text,x,y,maxWidth);
    ctx.fillText(text,x,y,maxWidth);
  };

  const createCardBlob=async imageUrl=>{
    const image=await loadImage(imageUrl);
    const canvas=document.createElement('canvas');
    canvas.width=WIDTH;canvas.height=HEIGHT;
    const ctx=canvas.getContext('2d');
    drawCover(ctx,image);

    const shade=ctx.createLinearGradient(0,610,0,HEIGHT);
    shade.addColorStop(0,'rgba(0,0,0,0)');
    shade.addColorStop(.35,'rgba(0,0,0,.22)');
    shade.addColorStop(1,'rgba(0,0,0,.78)');
    ctx.fillStyle=shade;
    ctx.fillRect(0,540,WIDTH,HEIGHT-540);

    const recipient=(document.getElementById('recipient')?.value||'').trim();
    const wish=(document.getElementById('wish')?.value||'').trim();
    const title=recipient?'Happy Birthday, '+recipient+'!':'Happy Birthday!';

    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.lineJoin='round';
    ctx.strokeStyle='rgba(0,0,0,.74)';
    ctx.fillStyle='#fff';

    let titleSize=84;
    while(titleSize>48){
      ctx.font='900 '+titleSize+'px system-ui,-apple-system,"Noto Sans Tamil","Noto Sans Devanagari",sans-serif';
      if(ctx.measureText(title).width<=900)break;
      titleSize-=3;
    }
    ctx.lineWidth=Math.max(7,titleSize*.11);
    strokeFill(ctx,title,WIDTH/2,890,920);

    let messageSize=42,messageLines=[];
    while(messageSize>=28){
      ctx.font='650 '+messageSize+'px system-ui,-apple-system,"Noto Sans Tamil","Noto Sans Devanagari",sans-serif';
      messageLines=wrap(ctx,wish,860,5);
      if(messageLines.every(line=>ctx.measureText(line).width<=860))break;
      messageSize-=2;
    }
    ctx.lineWidth=Math.max(5,messageSize*.1);
    const gap=messageSize*1.42,top=1030-(messageLines.length-1)*gap/2;
    messageLines.forEach((line,index)=>strokeFill(ctx,line,WIDTH/2,top+index*gap,880));

    ctx.fillStyle='rgba(0,0,0,.48)';
    ctx.fillRect(0,1294,WIDTH,56);
    ctx.fillStyle='rgba(255,255,255,.94)';
    ctx.font='700 25px system-ui,-apple-system,sans-serif';
    ctx.fillText('sharecapsule.app',WIDTH/2,1323);

    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not create the birthday image')),'image/png',1));
  };

  const caption=()=>{
    const recipient=(document.getElementById('recipient')?.value||'').trim();
    const wish=(document.getElementById('wish')?.value||'').trim();
    return (recipient?'Happy Birthday, '+recipient+'!':'Happy Birthday!')+
      (wish?'\n'+wish:'')+
      '\n\nCreate your own birthday card: '+PAGE_URL;
  };

  const download=blob=>{
    const anchor=document.createElement('a');
    anchor.href=URL.createObjectURL(blob);
    anchor.download='sharecapsule-birthday-card.png';
    anchor.click();
    setTimeout(()=>URL.revokeObjectURL(anchor.href),1200);
  };

  const share=async({imageUrl,title,button})=>{
    const oldText=button?.textContent;
    if(button){button.disabled=true;button.textContent='Preparing image…'}
    try{
      const blob=await createCardBlob(imageUrl);
      const file=new File([blob],'sharecapsule-birthday-card.png',{type:'image/png'});
      if(navigator.canShare?.({files:[file]})){
        try{
          await navigator.share({files:[file],title:title||'Birthday card',text:caption()});
          return;
        }catch(error){
          if(error?.name==='AbortError')return;
        }
      }
      download(blob);
      show('Birthday PNG downloaded. Attach it in WhatsApp.');
    }catch(error){
      console.error(error);
      show('Could not prepare this image. Try another card.');
    }finally{
      if(button){button.disabled=false;button.textContent=oldText}
    }
  };

  document.addEventListener('click',event=>{
    const button=event.target.closest('.actions .wa,#modalShare');
    if(!button)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    let imageUrl='',title='';
    if(button.id==='modalShare'){
      imageUrl=document.getElementById('modalImage')?.src||'';
      title=document.getElementById('modalTitle')?.textContent||'Birthday card';
    }else{
      const card=button.closest('.card');
      imageUrl=card?.querySelector('.preview img')?.src||'';
      title=card?.querySelector('h2')?.textContent||'Birthday card';
    }
    if(!imageUrl){show('Choose a birthday card first');return}
    share({imageUrl,title,button});
  },true);

  const updateUi=()=>{
    document.querySelectorAll('.actions .wa').forEach(button=>button.textContent='Share image');
    const modalShare=document.getElementById('modalShare');
    if(modalShare)modalShare.textContent='Share image to WhatsApp';
    const note=document.querySelector('.note');
    if(note)note.textContent='The Share image button creates a personalized PNG and opens the phone share sheet. Choose WhatsApp to send the actual card image. Canva links are not included.';
  };

  const observer=new MutationObserver(updateUi);
  const start=()=>{
    updateUi();
    observer.observe(document.body,{childList:true,subtree:true});
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();