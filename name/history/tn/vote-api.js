(()=>{
  const extra=document.createElement('script');
  extra.src='./extra-places.js';
  extra.defer=true;
  document.head.appendChild(extra);

  const API='/api/place-votes';
  const counts=new Map(),voted=new Set();
  let ready=false;
  const originalVotesFor=window.votesFor;
  const originalRender=window.render;
  function token(){let value=localStorage.getItem('sharecapsule:voter-token');if(!value){value=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;localStorage.setItem('sharecapsule:voter-token',value)}return value}
  function syncButtons(){document.querySelectorAll('[data-vote]').forEach(button=>{const id=button.dataset.vote;if(!counts.has(id))return;const hasVoted=voted.has(id);button.classList.toggle('voted',hasVoted);button.setAttribute('aria-pressed',String(hasVoted));button.setAttribute('aria-label',hasVoted?'Your vote is counted':'Vote for this place-name history');button.title=hasVoted?'Your vote is already counted from this browser':'Add your vote';const number=button.querySelector('.voteCount');if(number)number.textContent=counts.get(id)})}
  if(typeof originalVotesFor==='function')window.votesFor=place=>ready?(counts.get(place.id)||0):originalVotesFor(place);
  if(typeof originalRender==='function')window.render=function(){originalRender();syncButtons()};
  async function load(){try{const response=await fetch(API,{headers:{accept:'application/json','x-voter-token':token()},cache:'no-store'});if(!response.ok)throw new Error();const body=await response.json();counts.clear();voted.clear();for(const item of body.votes||[])counts.set(item.placeId,Number(item.count)||0);for(const id of body.voted||[])voted.add(id);ready=true;if(typeof window.render==='function')window.render();else syncButtons()}catch{ready=false}}
  async function submit(placeId,button){if(voted.has(placeId)){if(typeof window.showToast==='function')window.showToast('Your vote is already counted');return}button.disabled=true;try{const response=await fetch(`${API}/${encodeURIComponent(placeId)}`,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({action:'add',voterToken:token()})});if(!response.ok)throw new Error();const body=await response.json();counts.set(placeId,Number(body.count)||0);voted.add(placeId);syncButtons();if(typeof window.showToast==='function')window.showToast(body.alreadyVoted?'Your vote was already counted':'Vote counted')}catch{if(typeof window.showToast==='function')window.showToast('Shared voting is temporarily unavailable')}finally{button.disabled=false}}
  document.getElementById('grid')?.addEventListener('click',event=>{const button=event.target.closest('[data-vote]');if(!button||!ready)return;event.preventDefault();event.stopImmediatePropagation();submit(button.dataset.vote,button)},true);
  new MutationObserver(syncButtons).observe(document.getElementById('grid'),{childList:true,subtree:true});
  load();

  const contributionMount=document.createElement('section');
  contributionMount.id='contribute';
  const note=document.getElementById('note');
  (note||document.querySelector('main'))?.insertAdjacentElement(note?'afterend':'beforeend',contributionMount);
  const contributionScript=document.createElement('script');
  contributionScript.src='./contribute.js';
  contributionScript.defer=true;
  document.head.appendChild(contributionScript);
})();
