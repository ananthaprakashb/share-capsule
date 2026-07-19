const ADMIN_EMAIL='admin@sharecapsule.app';
const DRAFT_KEY='sharecapsule.checklist-submission-draft.v1';
const $=id=>document.getElementById(id);
const state={items:[],draft:loadDraft()};
function loadDraft(){try{const value=JSON.parse(localStorage.getItem(DRAFT_KEY)||'{}');return value&&typeof value==='object'?value:{};}catch{return {};}}
function saveDraft(){const draft={title:$('listTitle').value,category:$('listCategory').value,name:$('submitterName').value,email:$('submitterEmail').value,description:$('listDescription').value,items:state.items};localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));}
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function addItem(){const title=$('newItem').value.trim();if(!title)return;if(state.items.some(item=>item.toLowerCase()===title.toLowerCase())){$('itemHelp').textContent='That task is already in the list.';return;}state.items.push(title);$('newItem').value='';$('itemHelp').textContent='Add at least three tasks.';saveDraft();render();$('newItem').focus();}
function removeItem(index){state.items.splice(index,1);saveDraft();render();}
function render(){
  $('itemList').innerHTML=state.items.map((item,index)=>`<li><span>${esc(item)}</span><button type="button" data-remove="${index}">Remove</button></li>`).join('');
  $('previewItems').innerHTML=state.items.map(item=>`<li>${esc(item)}</li>`).join('');
  $('previewTitle').textContent=$('listTitle').value.trim()||'Your checklist title';
  $('previewDescription').textContent=$('listDescription').value.trim()||'The description will appear here.';
  $('previewCategory').textContent=$('listCategory').value.trim()||'Category';
  $('previewCount').textContent=`${state.items.length} task${state.items.length===1?'':'s'}`;
  document.querySelectorAll('[data-remove]').forEach(button=>button.addEventListener('click',()=>removeItem(Number(button.dataset.remove))));
}
function submissionText(){return [
  'CHECKLIST SUBMISSION',
  '',
  `Title: ${$('listTitle').value.trim()}`,
  `Category: ${$('listCategory').value.trim()}`,
  `Submitted by: ${$('submitterName').value.trim()}`,
  `Contact email: ${$('submitterEmail').value.trim()}`,
  '',
  'Description:',
  $('listDescription').value.trim(),
  '',
  `Tasks (${state.items.length}):`,
  ...state.items.map((item,index)=>`${index+1}. ${item}`),
  '',
  'The submitter understands this checklist will be reviewed and may be edited before publication.'
].join('\n');}
function restoreDraft(){const d=state.draft;$('listTitle').value=d.title||'';$('listCategory').value=d.category||'';$('submitterName').value=d.name||'';$('submitterEmail').value=d.email||'';$('listDescription').value=d.description||'';state.items=Array.isArray(d.items)?d.items:[];render();}
$('addItem').addEventListener('click',addItem);
$('newItem').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();addItem();}});
['listTitle','listCategory','submitterName','submitterEmail','listDescription'].forEach(id=>$(id).addEventListener('input',()=>{saveDraft();render();}));
$('submissionForm').addEventListener('submit',event=>{event.preventDefault();if(state.items.length<3){$('itemHelp').textContent='Please add at least three tasks before submitting.';$('newItem').focus();return;}$('reviewContent').textContent=submissionText();$('reviewDialog').showModal();});
$('sendSubmission').addEventListener('click',event=>{event.preventDefault();const subject=`Checklist submission: ${$('listTitle').value.trim()}`;const body=submissionText();window.location.href=`mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;localStorage.removeItem(DRAFT_KEY);$('reviewDialog').close();});
restoreDraft();