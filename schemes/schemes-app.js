(()=>{
  const DATA='/schemes/govt/in/tn/data.json';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const scope=document.body.dataset.scope||'tn';
  const labels={schemes:['Government benefit schemes','Verified public-benefit information from official sources'],govt:['Government schemes','Government programmes grouped by country and state'],in:['India government schemes','Officially sourced schemes available through Indian governments'],tn:['தமிழ்நாடு அரசு நலத்திட்டங்கள்','தமிழர்களுக்கு உதவும் அதிகாரப்பூர்வமாக சரிபார்க்கப்பட்ட திட்டங்கள்']};
  const paths={schemes:'/schemes/',govt:'/schemes/govt/',in:'/schemes/govt/in/',tn:'/schemes/govt/in/tn/'};
  const crumbs=[['Schemes','/schemes/'],['Government','/schemes/govt/'],['India','/schemes/govt/in/'],['Tamil Nadu','/schemes/govt/in/tn/']];
  const visible=crumbs.slice(0,{schemes:1,govt:2,in:3,tn:4}[scope]||4);
  const app=document.getElementById('app');
  const card=s=>`<article class="scheme"><div class="row"><span class="category">${esc(s.category)}</span><span class="status">${esc(s.status)}</span></div><h2>${esc(s.name)}</h2><p>${esc(s.summary)}</p><details><summary>Who may benefit and how to start</summary><p><strong>Who may benefit:</strong> ${esc(s.whoMayBenefit)}</p><p><strong>How to start:</strong> ${esc(s.howToStart)}</p></details><div class="source"><strong>${esc(s.sourceOrganization)}</strong><span>Revalidated ${esc(s.verifiedOn)}</span><a href="${esc(s.sourceUrl)}" target="_blank" rel="noopener">Open official source ↗</a></div></article>`;
  async function load(){
    try{
      const response=await fetch(`${DATA}?v=${Date.now()}`,{cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      const [title,subtitle]=labels[scope]||labels.tn;
      const intro=scope==='tn'?data.subtitle:`Latest verified Tamil Nadu entries are automatically reflected here from the child endpoint.`;
      app.innerHTML=`<nav class="crumbs">${visible.map((c,i)=>i===visible.length-1?`<span>${esc(c[0])}</span>`:`<a href="${c[1]}">${esc(c[0])}</a><b>›</b>`).join('')}</nav><header class="hero"><p class="eyebrow">Verified government sources</p><h1>${esc(title)}</h1><p>${esc(intro||subtitle)}</p><div class="verified">Source collection revalidated: ${esc(data.verifiedOn)} · ${data.schemes.length} entries</div></header>${scope!=='tn'?`<a class="child" href="/schemes/govt/in/tn/"><strong>Tamil Nadu</strong><span>${data.schemes.length} verified schemes and benefit routes →</span></a>`:''}<div class="notice">${esc(data.notice)}</div><section class="grid">${data.schemes.map(card).join('')}</section>`;
    }catch(error){app.innerHTML=`<div class="error"><h1>Schemes unavailable</h1><p>${esc(error.message)}</p></div>`}
  }
  load();
})();