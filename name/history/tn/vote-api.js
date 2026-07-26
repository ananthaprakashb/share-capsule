(()=>{
  const API='/api/place-votes';
  const counts=new Map(),voted=new Set();
  let ready=false;
  const originalVotesFor=window.votesFor;
  const originalRender=window.render;
  function token(){let value=localStorage.getItem('sharecapsule:voter-token');if(!value){value=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;localStorage.setItem('sharecapsule:voter-token',value)}return value}
  function syncButtons(){document.querySelectorAll('[data-vote]').forEach(button=>{const id=button.dataset.vote;if(!counts.has(id))return;button.classList.toggle('voted',voted.has(id));button.setAttribute('aria-pressed',String(voted.has(id)));const number=button.querySelector('.voteCount');if(number)number.textContent=counts.get(id)})}
  if(typeof originalVotesFor==='function')window.votesFor=place=>ready?(counts.get(place.id)||0):originalVotesFor(place);
  if(typeof originalRender==='function')window.render=function(){originalRender();syncButtons()};
  async function load(){try{const response=await fetch(API,{headers:{accept:'application/json','x-voter-token':token()}});if(!response.ok)throw new Error();const body=await response.json();for(const item of body.votes||[])counts.set(item.placeId,Number(item.count)||0);for(const id of body.voted||[])voted.add(id);ready=true;if(typeof window.render==='function')window.render();else syncButtons()}catch{ready=false}}
  async function submit(placeId,button){button.disabled=true;const action=voted.has(placeId)?'remove':'add';try{const response=await fetch(`${API}/${encodeURIComponent(placeId)}`,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({action,voterToken:token()})});if(!response.ok)throw new Error();const body=await response.json();counts.set(placeId,Number(body.count)||0);if(body.voted)voted.add(placeId);else voted.delete(placeId);syncButtons();if(typeof window.showToast==='function')window.showToast(body.voted?'Vote counted':'Vote removed')}catch{if(typeof window.showToast==='function')window.showToast('Shared voting is temporarily unavailable')}finally{button.disabled=false}}
  document.getElementById('grid')?.addEventListener('click',event=>{const button=event.target.closest('[data-vote]');if(!button||!ready)return;event.preventDefault();event.stopImmediatePropagation();submit(button.dataset.vote,button)},true);
  new MutationObserver(syncButtons).observe(document.getElementById('grid'),{childList:true,subtree:true});
  load();
})();
