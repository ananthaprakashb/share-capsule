(()=>{
  const normalize=value=>String(value||'').normalize('NFC').replace(/\s+/g,' ').trim().replace(/[.।]+$/u,'');
  const validate=()=>{
    if(!/^\/marimuthu(?:\/|$)/i.test(location.pathname)||typeof poems==='undefined'||!Array.isArray(poems)||!poems.length)return false;
    const seenText=new Map(),seenNumber=new Map(),issues=[];
    poems.forEach((poem,index)=>{
      const row=index+1;
      for(const field of ['book','author','number','text','meaning'])if(!normalize(poem?.[field]))issues.push({row,type:'missing',field});
      const textKey=`${normalize(poem.book)}|${normalize(poem.text)}`;
      if(seenText.has(textKey))issues.push({row,type:'duplicate-text',other:seenText.get(textKey)});else seenText.set(textKey,row);
      const numberKey=`${normalize(poem.book)}|${normalize(poem.number)}`;
      if(normalize(poem.number)){if(seenNumber.has(numberKey)&&normalize(poems[seenNumber.get(numberKey)-1]?.text)!==normalize(poem.text))issues.push({row,type:'duplicate-number',other:seenNumber.get(numberKey)});else seenNumber.set(numberKey,row)}
      if(!normalize(poem.thought))poem.thought=normalize(poem.meaning).split(/(?<=[.!?।])\s+/)[0]||'பாடலின் கருத்தை இன்றைய வாழ்வில் சிந்திப்போம்.';
    });
    const summary={checkedAt:new Date().toISOString(),total:poems.length,valid:Math.max(0,poems.length-new Set(issues.map(x=>x.row)).size),issues};
    window.__marimuthuValidation=summary;
    let panel=document.getElementById('marimuthuValidation');
    if(!panel){panel=document.createElement('section');panel.id='marimuthuValidation';panel.style.cssText='margin:16px 0 0;padding:14px 16px;border-radius:18px;background:#eef4ee;border:1px solid #d7e5d9;color:#244330;font-size:12px;line-height:1.55';const article=document.querySelector('.post');article?.insertAdjacentElement('beforebegin',panel)}
    if(panel)panel.innerHTML=`<strong>பாடல் தரச் சரிபார்ப்பு</strong><br>${summary.total} பதிவுகள் ஏற்றப்பட்டன. தேவையான புலங்கள், ஒரே பாடல் மீள்பதிவு, ஒரே நூல்/எண் முரண்பாடு மற்றும் Unicode ஒற்றுமை சரிபார்க்கப்பட்டது.${issues.length?` <span style="color:#8a3b22">${issues.length} கவனிக்க வேண்டிய குறிப்பு உள்ளது.</span>`:' முரண்பாடுகள் எதுவும் கண்டறியப்படவில்லை.'}`;
    return true;
  };
  let attempts=0;const timer=setInterval(()=>{attempts++;if(validate()||attempts>40)clearInterval(timer)},250);
})();
