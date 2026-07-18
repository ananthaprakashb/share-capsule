const API_ROOT='https://api.sharecapsule.app/api/v1';
const STORAGE_KEY='sharecapsule.checklist.boards.v1';
const PERSONAL_TASKS_KEY='sharecapsule.personal-tasks.v1';
const $=id=>document.getElementById(id);
const state={boards:[],activeBoard:null,taskFilter:'all',store:loadStore()};
const CATEGORY_META={
  household:['⌂','#7654c7','#f2edff'],career:['↗','#b54708','#fff1e8'],learning:['✦','#2874d0','#edf5ff'],travel:['✈','#087e8b','#e9f8fa'],
  'personal-finance':['$','#16805b','#eaf8f2'],'personal-productivity':['✓','#3157d5','#eef2ff'],'digital-safety':['⌁','#b42318','#fff0ef'],
  'emergency-preparedness':['!','#c25a00','#fff3e7'],'health-fitness':['♥','#c43b72','#fff0f6'],'health-wellness':['♥','#c43b72','#fff0f6'],
  'health-nutrition':['●','#16805b','#eaf8f2'],work:['▦','#475467','#f0f2f5'],marketing:['◆','#9b2c7d','#fff0fa'],'software-development':['⌘','#2759b8','#edf3ff'],
  'project-management':['◇','#6842b8','#f2edff'],relationships:['☺','#b54708','#fff1e8'],events:['★','#8e4d00','#fff4df']
};
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
async function fetchJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(`Unable to load ${path}`);return response.json();}
function loadStore(){try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return parsed&&typeof parsed==='object'?parsed:{};}catch{return {};}}
function saveStore(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state.store));}
function loadPersonalTasks(){try{const parsed=JSON.parse(localStorage.getItem(PERSONAL_TASKS_KEY)||'[]');return Array.isArray(parsed)?parsed:[];}catch{return [];}}
function savePersonalTasks(tasks){localStorage.setItem(PERSONAL_TASKS_KEY,JSON.stringify(tasks));}
function boardData(id){return state.store[id]??={completed:{},priorities:{},customTasks:[]};}
function categoryLabel(value){return String(value??'other').split('-').map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ');}
function categoryMeta(category){return CATEGORY_META[category]??['✓','#3157d5','#eef2ff'];}
function priorityRank(value){return {high:0,medium:1,low:2,none:3}[value]??3;}
function progressFor(board){const saved=boardData(board.id);const total=(board.task_count??board.tasks?.length??0)+saved.customTasks.length;const done=Math.min(Object.values(saved.completed).filter(Boolean).length,total);return {done,total,percent:total?Math.round(done/total*100):0};}
function updateDashboard(){
  const completed=Object.values(state.store).reduce((sum,item)=>sum+Object.values(item.completed??{}).filter(Boolean).length,0);
  const custom=Object.values(state.store).reduce((sum,item)=>sum+(item.customTasks?.length??0),0);
  $('heroBoardCount').textContent=state.boards.length;$('statBoards').textContent=state.boards.length;$('statCompleted').textContent=completed;$('statCustom').textContent=custom;
}
function showToast(message,link=false){
  let toast=$('taskToast');
  if(!toast){toast=document.createElement('div');toast.id='taskToast';toast.className='taskToast';toast.setAttribute('role','status');document.body.appendChild(toast);}
  toast.innerHTML=`<span>${esc(message)}</span>${link?'<a href="/tasks/">Open Task Board</a>':''}`;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),4200);
}
async function addBoardToTaskBoard(id,button){
  const original=button.innerHTML;button.disabled=true;button.innerHTML='…';
  try{
    const board=await fetchJson(`${API_ROOT}/global-activities/${encodeURIComponent(id)}`);
    const tasks=loadPersonalTasks();const existing=new Set(tasks.filter(task=>task.status!=='done').map(task=>String(task.title).trim().toLowerCase()));let added=0;
    for(const task of board.tasks??[]){
      const title=String(task.title??'').trim();if(!title||existing.has(title.toLowerCase()))continue;
      tasks.push({id:`task-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,title,priority:'medium',status:'todo',progress:0,source:board.title,createdAt:new Date().toISOString()});existing.add(title.toLowerCase());added++;
    }
    savePersonalTasks(tasks);
    button.innerHTML='✓';button.classList.add('added');button.setAttribute('aria-label',`${board.title} tasks added to Task Board`);
    showToast(added?`${added} tasks added from ${board.title}.`:`All tasks from ${board.title} are already on your Task Board.`,true);
  }catch(error){button.innerHTML=original;showToast(`Unable to add tasks: ${error.message}`);}
  finally{button.disabled=false;}
}
function renderCategoryChips(){
  const counts=new Map();state.boards.forEach(board=>counts.set(board.category,(counts.get(board.category)??0)+1));
  const categories=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,8);
  $('categoryChips').innerHTML=`<button class="categoryChip ${$('boardCategory').value?'':'active'}" data-category="" type="button">All boards</button>`+categories.map(([category,count])=>`<button class="categoryChip ${$('boardCategory').value===category?'active':''}" data-category="${esc(category)}" type="button">${esc(categoryLabel(category))} · ${count}</button>`).join('');
  document.querySelectorAll('.categoryChip').forEach(button=>button.addEventListener('click',()=>{$('boardCategory').value=button.dataset.category;renderBoards();}));
}
function renderBoards(){
  const query=$('boardSearch').value.trim().toLowerCase();const category=$('boardCategory').value;
  const filtered=state.boards.filter(board=>(!category||board.category===category)&&(!query||`${board.title} ${board.category}`.toLowerCase().includes(query)));
  $('boards').innerHTML=filtered.length?filtered.map(board=>{const p=progressFor(board);const [icon,accent,soft]=categoryMeta(board.category);return `<article class="boardCard" style="--card-accent:${accent};--card-soft:${soft}"><button class="boardOpen" data-board-id="${esc(board.id)}" type="button" aria-label="Open ${esc(board.title)}"><div class="boardTop"><span class="boardIcon">${icon}</span><span class="boardCategory">${esc(categoryLabel(board.category))}</span></div><h3>${esc(board.title)}</h3><p class="boardDescription">${board.task_count??0} ready-made tasks${board.subtask_count?` and ${board.subtask_count} helpful subtasks`:''}. Add your own items anytime.</p><div class="boardProgressBlock"><div class="boardProgressMeta"><span class="boardCount">${p.done} of ${p.total} done</span><span>${p.percent}%</span></div><div class="progressTrack"><span style="width:${p.percent}%"></span></div><div class="boardFoot"><span>${p.total-p.done} remaining</span><span>Open board →</span></div></div></button><button class="boardAdd" data-add-board="${esc(board.id)}" type="button" title="Add all tasks to Task Board" aria-label="Add ${esc(board.title)} tasks to Task Board">+</button></article>`;}).join(''):'<div class="emptyTasks">No checklist boards match those filters. Try a broader search.</div>';
  $('boardStatus').textContent='Use the + button to add a checklist’s tasks to your personal Task Board.';$('boardResultCount').textContent=`${filtered.length} of ${state.boards.length} boards`;
  renderCategoryChips();updateDashboard();
  document.querySelectorAll('[data-board-id]').forEach(button=>button.addEventListener('click',()=>openBoard(button.dataset.boardId)));
  document.querySelectorAll('[data-add-board]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();addBoardToTaskBoard(button.dataset.addBoard,button);}));
}
async function openBoard(id){
  $('boardStatus').textContent='Loading board tasks…';
  try{
    const board=await fetchJson(`${API_ROOT}/global-activities/${encodeURIComponent(id)}`);state.activeBoard=board;state.taskFilter='all';
    $('boards').hidden=true;$('boardToolbar').hidden=true;$('categoryChips').hidden=true;$('boardStatus').hidden=true;$('browseHeader').hidden=true;$('boardDetail').hidden=false;
    const [icon]=categoryMeta(board.category);$('detailIcon').textContent=icon;$('detailCategory').textContent=categoryLabel(board.category);$('detailTitle').textContent=board.title;
    document.querySelectorAll('[data-task-filter]').forEach(button=>button.classList.toggle('active',button.dataset.taskFilter==='all'));
    renderActiveBoard();history.replaceState(null,'',`#${encodeURIComponent(id)}`);window.scrollTo({top:$('boardDetail').offsetTop-18,behavior:'smooth'});
  }catch(error){$('boardStatus').textContent=`Unable to load this board: ${error.message}`;}
}
function allTasks(){
  const saved=boardData(state.activeBoard.id);
  const builtIn=state.activeBoard.tasks.map(task=>({...task,custom:false,priority:saved.priorities[task.id]??'none'}));
  const custom=saved.customTasks.map(task=>({...task,custom:true,subtasks:[],priority:saved.priorities[task.id]??task.priority??'none'}));
  return [...builtIn,...custom].sort((a,b)=>priorityRank(a.priority)-priorityRank(b.priority)||(a.sequence??9999)-(b.sequence??9999)||a.title.localeCompare(b.title));
}
function renderActiveBoard(){
  if(!state.activeBoard)return;const saved=boardData(state.activeBoard.id);const p=progressFor({...state.activeBoard,task_count:state.activeBoard.tasks.length});
  $('detailProgress').textContent=`${p.done} completed · ${p.total-p.done} remaining`;$('detailProgressPercent').textContent=`${p.percent}%`;$('detailProgressBar').style.width=`${p.percent}%`;$('detailProgressRing').style.setProperty('--progress',p.percent);
  const tasks=allTasks().filter(task=>state.taskFilter==='all'||(state.taskFilter==='completed'&&saved.completed[task.id])||(state.taskFilter==='active'&&!saved.completed[task.id]));
  $('boardTasks').innerHTML=tasks.length?tasks.map(task=>`<article class="boardTask priority-${task.priority} ${saved.completed[task.id]?'done':''}" data-task-id="${esc(task.id)}"><label class="taskCheck"><input type="checkbox" ${saved.completed[task.id]?'checked':''}><span><strong>${esc(task.title)}</strong><small>${task.custom?'Personal task':task.subtasks?.length?`${task.subtasks.length} subtasks included`:'Checklist task'}</small></span></label><div class="taskActions"><select class="taskPriority" aria-label="Priority for ${esc(task.title)}"><option value="high" ${task.priority==='high'?'selected':''}>High priority</option><option value="medium" ${task.priority==='medium'?'selected':''}>Medium priority</option><option value="low" ${task.priority==='low'?'selected':''}>Low priority</option><option value="none" ${task.priority==='none'?'selected':''}>No priority</option></select>${task.custom?'<button class="deleteTask" type="button">Delete</button>':''}</div>${task.subtasks?.length?`<details class="subtasks"><summary>View ${task.subtasks.length} subtasks</summary><ul>${task.subtasks.map(sub=>`<li>${esc(sub.title)}</li>`).join('')}</ul></details>`:''}</article>`).join(''):'<div class="emptyTasks">No tasks in this view.</div>';
  document.querySelectorAll('.boardTask').forEach(row=>{
    const id=row.dataset.taskId;row.querySelector('input[type=checkbox]').addEventListener('change',event=>{saved.completed[id]=event.target.checked;saveStore();renderActiveBoard();renderBoards();});
    row.querySelector('.taskPriority').addEventListener('change',event=>{saved.priorities[id]=event.target.value;saveStore();renderActiveBoard();renderBoards();});
    row.querySelector('.deleteTask')?.addEventListener('click',()=>{saved.customTasks=saved.customTasks.filter(task=>task.id!==id);delete saved.completed[id];delete saved.priorities[id];saveStore();renderActiveBoard();renderBoards();});
  });
}
function closeBoard(){state.activeBoard=null;$('boardDetail').hidden=true;$('boards').hidden=false;$('boardToolbar').hidden=false;$('categoryChips').hidden=false;$('boardStatus').hidden=false;$('browseHeader').hidden=false;history.replaceState(null,'',location.pathname+location.search);renderBoards();window.scrollTo({top:$('browseHeader').offsetTop-18,behavior:'smooth'});}
function addCustomTask(event){event.preventDefault();const title=$('newTaskTitle').value.trim();if(!state.activeBoard||!title)return;const priority=$('newTaskPriority').value;const id=`custom-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;const saved=boardData(state.activeBoard.id);saved.customTasks.push({id,title,sequence:10000+saved.customTasks.length*10,priority});saved.priorities[id]=priority;saveStore();event.target.reset();$('newTaskPriority').value='medium';renderActiveBoard();renderBoards();$('newTaskTitle').focus();}
function resetBoard(){if(!state.activeBoard||!confirm('Reset completed items, priorities, and personal tasks for this board?'))return;delete state.store[state.activeBoard.id];saveStore();renderActiveBoard();renderBoards();}
async function init(){
  try{const body=await fetchJson(`${API_ROOT}/global-activities`);state.boards=body.items??[];const categories=[...new Set(state.boards.map(item=>item.category))].sort();$('boardCategory').innerHTML='<option value="">All categories</option>'+categories.map(category=>`<option value="${esc(category)}">${esc(categoryLabel(category))}</option>`).join('');renderBoards();const id=decodeURIComponent(location.hash.slice(1));if(id&&state.boards.some(board=>board.id===id))openBoard(id);}catch(error){$('boardStatus').textContent=`Unable to load checklist boards: ${error.message}`;}
}
$('boardSearch').addEventListener('input',renderBoards);$('boardCategory').addEventListener('change',renderBoards);$('showAllBoards').addEventListener('click',()=>{$('boardSearch').value='';$('boardCategory').value='';renderBoards();});$('closeBoard').addEventListener('click',closeBoard);$('addTaskForm').addEventListener('submit',addCustomTask);$('clearBoardData').addEventListener('click',resetBoard);
document.querySelectorAll('[data-task-filter]').forEach(button=>button.addEventListener('click',()=>{state.taskFilter=button.dataset.taskFilter;document.querySelectorAll('[data-task-filter]').forEach(item=>item.classList.toggle('active',item===button));renderActiveBoard();}));
init();