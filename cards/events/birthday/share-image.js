(()=>{
  const isBirthdayRoute=()=>/^\/cards\/events\/birthday(?:\/|$)/i.test(location.pathname);
  if(!isBirthdayRoute())return;

  const PAGE_URL='https://sharecapsule.app/cards/events/birthday/';
  const WIDTH=1080,HEIGHT=1350;
  const FONT='system-ui,-apple-system,"Noto Sans Tamil","Noto Sans Devanagari",sans-serif';

  const show=text=>{
    const toast=document.getElementById('toast');
    if(!toast)return;
    toast.textContent=text;
    toast.classList.add('show');
    clearTimeout(show.timer);
    show.timer=setTimeout(()=>toast.classList.remove('show'),2200);
  };

  const timeoutFetch=async(url,ms=6500)=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),ms);
    try{
      const response=await fetch(url,{mode:'cors',cache:'no-store',signal:controller.signal});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const blob=await response.blob();
      if(!blob.type.startsWith('image/')||blob.size<500)throw new Error('Not an image');
      return blob;
    }finally{clearTimeout(timer)}
  };

  const blobToImage=async blob=>{
    if('createImageBitmap'in window){try{return await createImageBitmap(blob)}catch(_){}}
    const objectUrl=URL.createObjectURL(blob);
    try{
      const image=new Image();image.src=objectUrl;
      if(image.decode)await image.decode();else await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject});
      return image;
    }finally{setTimeout(()=>URL.revokeObjectURL(objectUrl),1000)}
  };

  const loadRemoteImage=async url=>{
    const stripped=String(url).replace(/^https?:\/\//,'');
    const candidates=[url,'https://wsrv.nl/?url='+encodeURIComponent(stripped)+'&output=png&q=92','https://images.weserv.nl/?url='+encodeURIComponent(stripped)+'&output=png&q=92','https://corsproxy.io/?url='+encodeURIComponent(url)];
    const attempts=candidates.map(candidate=>timeoutFetch(candidate).then(blobToImage));
    try{
      if(Promise.any)return await Promise.any(attempts);
      return await new Promise((resolve,reject)=>{let failures=0;attempts.forEach(p=>p.then(resolve).catch(()=>{if(++failures===attempts.length)reject(new Error('All image sources failed'))}))});
    }catch(_){return null}
  };

  const hash=text=>{let value=2166136261;for(const char of String(text)){value^=char.charCodeAt(0);value=Math.imul(value,16777619)}return value>>>0};

  const paletteFor=(title,seed)=>{
    const name=String(title).toLowerCase();
    if(/gold|champagne|luxury|royal|classic/.test(name))return['#171020','#6b2d8f','#f3c969','#fff2c2'];
    if(/flower|rose|peony|lavender|garden|mom|sister/.test(name))return['#4b195f','#b33d78','#f3a7c7','#fff0d5'];
    if(/dinosaur|jungle|animal|kids/.test(name))return['#12483c','#2f9e72','#ffd166','#f7fff1'];
    if(/rocket|space|neon/.test(name))return['#071633','#283b94','#8f5cff','#62e6ff'];
    if(/navy|black|silver|manager|colleague|professional|men/.test(name))return['#0d1728','#243b59','#7d91a8','#f1f5f9'];
    if(/lotus|temple|prayer|spiritual|peacock/.test(name))return['#31105b','#7d2d8f','#ff9d4d','#fff1aa'];
    if(/sunflower|tropical/.test(name))return['#064e3b','#0f8f67','#ffd34e','#fff5b5'];
    const palettes=[['#45104f','#a62d78','#ff7a59','#ffd166'],['#0c3b5a','#176b87','#46c2cb','#fff0a6'],['#3b1760','#7552b3','#e98ec9','#ffe3a3'],['#51202a','#b33b45','#ff8c5b','#ffe0a8']];
    return palettes[seed%palettes.length];
  };

  const roundedRect=(ctx,x,y,w,h,r)=>{const radius=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);ctx.arcTo(x,y,x+w,y,radius);ctx.closePath()};

  const drawFallbackBackground=(ctx,title,imageUrl)=>{
    const seed=hash(title+'|'+imageUrl),colors=paletteFor(title,seed);
    const gradient=ctx.createLinearGradient(0,0,WIDTH,HEIGHT);gradient.addColorStop(0,colors[0]);gradient.addColorStop(.55,colors[1]);gradient.addColorStop(1,colors[2]);ctx.fillStyle=gradient;ctx.fillRect(0,0,WIDTH,HEIGHT);
    const glow=ctx.createRadialGradient(WIDTH*.72,HEIGHT*.18,10,WIDTH*.72,HEIGHT*.18,420);glow.addColorStop(0,colors[3]+'dd');glow.addColorStop(1,colors[3]+'00');ctx.fillStyle=glow;ctx.fillRect(0,0,WIDTH,HEIGHT);
    const rand=index=>{const x=Math.sin(seed*.0001+index*12.9898)*43758.5453;return x-Math.floor(x)};
    ctx.save();ctx.globalAlpha=.38;
    for(let i=0;i<70;i++){
      const x=rand(i)*WIDTH,y=rand(i+90)*HEIGHT*.68,size=4+rand(i+180)*13;ctx.save();ctx.translate(x,y);ctx.rotate(rand(i+270)*Math.PI);ctx.fillStyle=i%3===0?colors[3]:'#fff';
      if(i%4===0){ctx.fillRect(-size*.18,-size,size*.36,size*2);ctx.fillRect(-size,-size*.18,size*2,size*.36)}else{ctx.beginPath();ctx.arc(0,0,size,0,Math.PI*2);ctx.fill()}ctx.restore();
    }
    ctx.restore();
    const lower=String(title).toLowerCase();
    if(/flower|rose|peony|lavender|garden|lotus|sunflower|mom|sister/.test(lower)){
      for(let i=0;i<9;i++){
        const cx=85+i*120,cy=235+(i%3)*45,r=44+(i%2)*16;ctx.save();ctx.translate(cx,cy);ctx.rotate(i*.45);
        for(let p=0;p<6;p++){ctx.rotate(Math.PI/3);ctx.fillStyle=p%2?colors[2]:colors[3];ctx.beginPath();ctx.ellipse(0,-r*.75,r*.34,r*.78,0,0,Math.PI*2);ctx.fill()}
        ctx.fillStyle='#ffd35d';ctx.beginPath();ctx.arc(0,0,r*.28,0,Math.PI*2);ctx.fill();ctx.restore();
      }
    }else if(/rocket|space|neon/.test(lower)){
      ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.arc(240,250,160,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(780,300);ctx.rotate(-.45);ctx.fillStyle=colors[3];roundedRect(ctx,-45,-130,90,260,42);ctx.fill();ctx.fillStyle=colors[2];ctx.beginPath();ctx.moveTo(-45,75);ctx.lineTo(-115,150);ctx.lineTo(-35,125);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(45,75);ctx.lineTo(115,150);ctx.lineTo(35,125);ctx.closePath();ctx.fill();ctx.fillStyle='#ff8a4f';ctx.beginPath();ctx.moveTo(-28,130);ctx.lineTo(0,250);ctx.lineTo(28,130);ctx.closePath();ctx.fill();ctx.restore();
    }else if(/dinosaur|jungle|animal|kids/.test(lower)){
      ctx.fillStyle='#183e35';ctx.beginPath();ctx.moveTo(0,620);for(let x=0;x<=WIDTH;x+=90)ctx.lineTo(x,500+rand(x)*170);ctx.lineTo(WIDTH,850);ctx.lineTo(0,850);ctx.closePath();ctx.fill();ctx.fillStyle=colors[3];ctx.beginPath();ctx.arc(380,440,120,0,Math.PI*2);ctx.fill();ctx.fillStyle=colors[2];ctx.beginPath();ctx.ellipse(530,500,220,125,-.15,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(675,520);ctx.lineTo(920,430);ctx.lineTo(710,590);ctx.closePath();ctx.fill();ctx.fillStyle='#1c2730';ctx.beginPath();ctx.arc(335,410,12,0,Math.PI*2);ctx.fill();
    }else{
      for(let i=0;i<8;i++){const cx=100+i*130,cy=220+(i%2)*75,r=45+(i%3)*9;ctx.fillStyle=i%2?colors[3]:colors[2];ctx.beginPath();ctx.ellipse(cx,cy,r*.82,r,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx,cy+r);ctx.quadraticCurveTo(cx+30,cy+170,cx-8,cy+255);ctx.stroke()}
      ctx.save();ctx.translate(WIDTH/2,560);ctx.fillStyle='rgba(255,255,255,.15)';roundedRect(ctx,-270,-130,540,260,55);ctx.fill();ctx.fillStyle=colors[3];roundedRect(ctx,-230,-85,460,170,40);ctx.fill();ctx.fillStyle=colors[2];ctx.beginPath();ctx.moveTo(-260,-95);ctx.lineTo(0,-230);ctx.lineTo(260,-95);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(255,255,255,.72)';ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(0,-220);ctx.lineTo(0,80);ctx.stroke();ctx.restore();
    }
    ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(WIDTH/2,760,500,110,0,0,Math.PI*2);ctx.fill();
  };

  const drawCover=(ctx,image)=>{const sw=image.width||image.naturalWidth,sh=image.height||image.naturalHeight,scale=Math.max(WIDTH/sw,HEIGHT/sh),dw=sw*scale,dh=sh*scale;ctx.drawImage(image,(WIDTH-dw)/2,(HEIGHT-dh)/2,dw,dh)};
  const wrap=(ctx,text,maxWidth,maxLines)=>{const lines=[];for(const paragraph of String(text||'').split(/\n/)){if(lines.length>=maxLines)break;if(!paragraph.trim()){lines.push('');continue}let line='';for(const word of paragraph.trim().split(/\s+/)){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test;if(lines.length>=maxLines-1)break}if(line&&lines.length<maxLines)lines.push(line)}return lines.slice(0,maxLines)};
  const strokeFill=(ctx,text,x,y,maxWidth)=>{ctx.strokeText(text,x,y,maxWidth);ctx.fillText(text,x,y,maxWidth)};

  const createCardBlob=async(imageUrl,cardTitle)=>{
    const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;const ctx=canvas.getContext('2d');
    const image=await loadRemoteImage(imageUrl);if(image)drawCover(ctx,image);else drawFallbackBackground(ctx,cardTitle,imageUrl);
    const shade=ctx.createLinearGradient(0,580,0,HEIGHT);shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(.35,'rgba(0,0,0,.25)');shade.addColorStop(1,'rgba(0,0,0,.82)');ctx.fillStyle=shade;ctx.fillRect(0,510,WIDTH,HEIGHT-510);
    const recipient=(document.getElementById('recipient')?.value||'').trim(),wish=(document.getElementById('wish')?.value||'').trim(),title=recipient?'Happy Birthday, '+recipient+'!':'Happy Birthday!';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.strokeStyle='rgba(0,0,0,.78)';ctx.fillStyle='#fff';
    let titleSize=84;while(titleSize>48){ctx.font='900 '+titleSize+'px '+FONT;if(ctx.measureText(title).width<=900)break;titleSize-=3}ctx.lineWidth=Math.max(7,titleSize*.11);strokeFill(ctx,title,WIDTH/2,890,920);
    let messageSize=42,messageLines=[];while(messageSize>=28){ctx.font='650 '+messageSize+'px '+FONT;messageLines=wrap(ctx,wish,860,5);if(messageLines.every(line=>ctx.measureText(line).width<=860))break;messageSize-=2}ctx.lineWidth=Math.max(5,messageSize*.1);const gap=messageSize*1.42,top=1030-(messageLines.length-1)*gap/2;messageLines.forEach((line,index)=>strokeFill(ctx,line,WIDTH/2,top+index*gap,880));
    ctx.fillStyle='rgba(0,0,0,.48)';ctx.fillRect(0,1294,WIDTH,56);ctx.fillStyle='rgba(255,255,255,.94)';ctx.font='700 25px '+FONT;ctx.fillText('sharecapsule.app',WIDTH/2,1323);
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not create the birthday image')),'image/png',1));
  };

  const caption=()=>{const recipient=(document.getElementById('recipient')?.value||'').trim(),wish=(document.getElementById('wish')?.value||'').trim();return(recipient?'Happy Birthday, '+recipient+'!':'Happy Birthday!')+(wish?'\n'+wish:'')+'\n\nCreate your own birthday card: '+PAGE_URL};
  const download=blob=>{const anchor=document.createElement('a');anchor.href=URL.createObjectURL(blob);anchor.download='sharecapsule-birthday-card.png';anchor.click();setTimeout(()=>URL.revokeObjectURL(anchor.href),1200)};

  const share=async({imageUrl,title,button})=>{
    const oldText=button?.textContent;if(button){button.disabled=true;button.textContent='Preparing image…'}
    try{
      const blob=await createCardBlob(imageUrl,title),file=new File([blob],'sharecapsule-birthday-card.png',{type:'image/png'});
      if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:title||'Birthday card',text:caption()});return}catch(error){if(error?.name==='AbortError')return}}
      download(blob);show('Birthday PNG downloaded. Attach it in WhatsApp.');
    }catch(error){console.error(error);show('Could not create the card. Please reload and try again.');}
    finally{if(button){button.disabled=false;button.textContent=oldText}}
  };

  document.addEventListener('click',event=>{
    const button=event.target.closest('.actions .wa,#modalShare');if(!button)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    let imageUrl='',title='';if(button.id==='modalShare'){imageUrl=document.getElementById('modalImage')?.src||'';title=document.getElementById('modalTitle')?.textContent||'Birthday card'}else{const card=button.closest('.card');imageUrl=card?.querySelector('.preview img')?.src||'';title=card?.querySelector('h2')?.textContent||'Birthday card'}
    if(!imageUrl){show('Choose a birthday card first');return}share({imageUrl,title,button});
  },true);

  const updateUi=()=>{document.querySelectorAll('.actions .wa').forEach(button=>button.textContent='Share image');const modalShare=document.getElementById('modalShare');if(modalShare)modalShare.textContent='Share image to WhatsApp';const note=document.querySelector('.note');if(note)note.textContent='Share image creates a personalized PNG and opens the phone share sheet. Choose WhatsApp to send the actual image. If Canva blocks a thumbnail, ShareCapsule automatically creates a matching birthday background instead.'};
  const observer=new MutationObserver(updateUi),start=()=>{updateUi();observer.observe(document.body,{childList:true,subtree:true})};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();