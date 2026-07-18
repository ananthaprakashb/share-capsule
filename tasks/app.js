const API_ROOT='https://api.sharecapsule.app/api/v1';
const STORAGE_KEY='sharecapsule.personal-tasks.v1';
const $=id=>document.getElementById(id);
const state={tasks:loadTasks(),filter:'all',library:[]};
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function loadTasks(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value:[];}catch{return[];}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state.tasks));}
function uid(){return `task-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;}
function normalizeProgress(task){if(task.status==='done')return 100;return Math.max(0,Math.min(100,Number(task.progress)||0));}
function addTask(title,priority='medium',source='Personal task'){
  const clean=String(title??'').trim();if(!clean)return false;
  if(state.tasks.some(task=>task.title.toLowerCase()===clean.toLowerCase()&&task.status!=='done'))return false;
  state.tasks.unshift({id:uid(),title:clean,priority,status:'todo',progress:0,source,createdAt:new Date().toISOString()});save();render();return true;
}
function updateSummary(){const total=state.tasks.length;const done=state.tasks.filter(task=>task.status==='done').length;$('totalCount').textContent=total;$('activeCount').textContent=total-done;$('doneCount').textContent=done;}
function taskMatches(task){if(state.filter==='done')return task.status==='done';if(state.filter==='active')return task.status!=='done';return true;}
function priorityRank(value){return {high:0,medium:1,low:2,none:3}[value]??3;}
function render(){
  updateSummary();
  const tasks=state.tasks.filter(taskMatches).sort((a,b)=>(a.status==='done')-(b.status==='done')||priorityRank(a.priority)-priorityRank(b.priority)||new Date(b.createdAt)-new Date(a.createdAt));
  $('taskList').innerHTML=tasks.length?tasks.map(task=>{const progress=normalizeProgress(task);return `<article class="taskCard priority-${esc(task.priority)} ${task.status==='done'?'done':''}" data-id="${esc(task.id)}"><div class="taskMain"><input class="completeToggle" type="checkbox" ${task.status==='done'?'checked':''} aria-label="Mark task complete"><div class="taskText"><div class="taskName">${esc(task.title)}</div><span class="taskSource">${esc(task.source||'Personal task')}</span></div></div><div class="taskControls"><label>Priority<select class="prioritySelect"><option value="high" ${task.priority==='high'?'selected':''}>High</option><option value="medium" ${task.priority==='medium'?'selected':''}>Medium</option><option value="low" ${task.priority==='low'?'selected':''}>Low</option><option value="none" ${task.priority==='none'?'selected':''}>None</option></select></label><label>Status<select class="statusSelect"><option value="todo" ${task.status==='todo'?'selected':''}>To do</option><option value="in-progress" ${task.status==='in-progress'?'selected':''}>In progress</option><option value="done" ${task.status==='done'?'selected':''}>Done</option></select></label><label class="progressWrap"><span class="progressRow"><span>Progress</span><strong>${progress}%</strong></span><input class="progressRange" type="range" min="0" max="100" step="10" value="${progress}" ${task.status==='done'?'disabled':''}></label><button class="deleteButton" type="button">Delete</button></div></article>`;}).join(''):'<div class="empty">No tasks in this view.<br>Add a task above or choose one from the task library.</div>';
  document.querySelectorAll('.taskCard').forEach(card=>{
    const task=state.tasks.find(item=>item.id===card.dataset.id);if(!task)return;
    card.querySelector('.completeToggle').addEventListener('change',event=>{task.status=event.target.checked?'done':'todo';task.progress=event.target.checked?100:Math.min(task.progress||0,90);save();render();});
    card.querySelector('.prioritySelect').addEventListener('change',event=>{task.priority=event.target.value;save();render();});
    card.querySelector('.statusSelect').addEventListener('change',event=>{task.status=event.target.value;if(task.status==='done')task.progress=100;else if(task.progress===100)task.progress=90;save();render();});
    card.querySelector('.progressRange').addEventListener('input',event=>{task.progress=Number(event.target.value);if(task.progress===100)task.status='done';else if(task.progress>0)task.status='in-progress';else task.status='todo';save();render();});
    card.querySelector('.deleteButton').addEventListener('click',()=>{state.tasks=state.tasks.filter(item=>item.id!==task.id);save();render();});
  });
  renderLibrary();
}
async function loadLibrary(){
  try{const body=await fetch(`${API_ROOT}/global-activities`,{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('Unable to load task library');return response.json();});state.library=body.items??[];$('libraryStatus').textContent=`${state.library.length} useful checklists available.`;renderLibrary();}
  catch(error){$('libraryStatus').textContent=error.message;}
}
async function openLibraryBoard(id,container){
  if(container.dataset.loaded==='true')return;
  container.innerHTML='<div class="libraryStatus">Loading tasks…</div>';
  try{const board=await fetch(`${API_ROOT}/global-activities/${encodeURIComponent(id)}`,{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('Unable to load tasks');return response.json();});container.dataset.loaded='true';container.innerHTML=board.tasks.map(task=>{const added=state.tasks.some(item=>item.title.toLowerCase()===task.title.toLowerCase()&&item.status!=='done');return `<div class="libraryTask"><span>${esc(task.title)}</span><button type="button" class="${added?'added':''}" data-title="${esc(task.title)}" data-source="${esc(board.title)}">${added?'Added':'Add'}</button></div>`;}).join('');container.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{if(button.classList.contains('added'))return;addTask(button.dataset.title,'medium',button.dataset.source);button.classList.add('added');button.textContent='Added';}));}
  catch(error){container.innerHTML=`<div class="libraryStatus">${esc(error.message)}</div>`;}
}
function renderLibrary(){
  if(!state.library.length)return;
  const query=$('librarySearch').value.trim().toLowerCase();const matches=state.library.filter(board=>!query||`${board.title} ${board.category}`.toLowerCase().includes(query)).slice(0,30);
  $('libraryList').innerHTML=matches.length?matches.map(board=>`<details class="libraryBoard" data-board="${esc(board.id)}"><summary>${esc(board.title)}<span>${esc(board.task_count??0)} tasks</span></summary><div class="libraryTasks"></div></details>`).join(''):'<div class="empty">No checklist matches that search.</div>';
  document.querySelectorAll('.libraryBoard').forEach(detail=>detail.addEventListener('toggle',()=>{if(detail.open)openLibraryBoard(detail.dataset.board,detail.querySelector('.libraryTasks'));}));
}
$('addTaskForm').addEventListener('submit',event=>{event.preventDefault();const added=addTask($('taskTitle').value,$('taskPriority').value);if(added){event.target.reset();$('taskPriority').value='medium';$('taskTitle').focus();}});
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{state.filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(item=>item.classList.toggle('active',item===button));render();}));
$('librarySearch').addEventListener('input',renderLibrary);
render();loadLibrary();
