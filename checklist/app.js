const API_ROOT='https://api.sharecapsule.app/api/v1';
const DATA_ROOT='https://raw.githubusercontent.com/ananthaprakashb/checklist/main/data';
const BOARD_STORAGE_KEY='sharecapsule.checklist.boards.v1';
const LOCATION_STORAGE_KEY='sharecapsule.checklist.location.v1';
const macroFiles=['buy-home.json','rent-home.json','lease-property-landlord.json','san-ramon-resident-activities.json','chennai-life-events.json'];
const microFiles=['home-buying.json','home-renting.json','property-leasing-landlord.json','san-ramon-resident-activities.json','chennai-life-events.json'];
const LOCATION_FIELDS=['country','state','district','county','city'];
const $=id=>document.getElementById(id);
const state={boards:[],activeBoard:null,taskFilter:'all',boardStore:loadBoardStore(),checklists:[],microById:new Map(),last:null};
const LOCATION_PRESETS={
  'travel-domestic-from-chennai':{country:'IN',state:'Tamil Nadu',district:'Chennai',county:'',city:'Chennai'},
  'travel-international-from-chennai':{country:'IN',state:'Tamil Nadu',district:'Chennai',county:'',city:'Chennai'},
  'organize-birthday-party-chennai':{country:'IN',state:'Tamil Nadu',district:'Chennai',county:'',city:'Chennai'},
  'organize-wedding-chennai':{country:'IN',state:'Tamil Nadu',district:'Chennai',county:'',city:'Chennai'},
  'organize-housewarming-chennai':{country:'IN',state:'Tamil Nadu',district:'Chennai',county:'',city:'Chennai'},
  'book-gcc-community-hall':{country:'IN',state:'Tamil Nadu',district:'Chennai',county:'',city:'Chennai'},
  'move-to-san-ramon':{country:'US',state:'CA',district:'',county:'Contra Costa',city:'San Ramon'},
  'prepare-san-ramon-household-emergency':{country:'US',state:'CA',district:'',county:'Contra Costa',city:'San Ramon'},
  'complete-san-ramon-home-project':{country:'US',state:'CA',district:'',county:'Contra Costa',city:'San Ramon'},
  'report-san-ramon-service-issue':{country:'US',state:'CA',district:'',county:'Contra Costa',city:'San Ramon'},
  'register-san-ramon-recreation-program':{country:'US',state:'CA',district:'',county:'Contra Costa',city:'San Ramon'},
  'rent-home':{country:'US',state:'CA',district:'',county:'San Joaquin',city:'Manteca'},
  'lease-property-landlord':{country:'US',state:'CA',district:'',county:'San Joaquin',city:'Manteca'},
  'buy-home':{country:'US',state:'CA',district:'',county:'Contra Costa',city:'San Ramon'}
};
const CATEGORY_META={
  household:['⌂','#7654c7','#f2edff'],career:['↗','#b54708','#fff1e8'],learning:['✦','#2874d0','#edf5ff'],travel:['✈','#087e8b','#e9f8fa'],
  'personal-finance':['$','#16805b','#eaf8f2'],'personal-productivity':['✓','#3157d5','#eef2ff'],'digital-safety':['⌁','#b42318','#fff0ef'],
  'emergency-preparedness':['!','#c25a00','#fff3e7'],'health-fitness':['♥','#c43b72','#fff0f6'],'health-wellness':['♥','#c43b72','#fff0f6'],
  'health-nutrition':['●','#16805b','#eaf8f2'],work:['▦','#475467','#f0f2f5'],marketing:['◆','#9b2c7d','#fff0fa'],'software-development':['⌘','#2759b8','#edf3ff'],
  'project-management':['◇','#6842b8','#f2edff'],relationships:['☺','#b54708','#fff1e8'],events:['★','#8e4d00','#fff4df']
};
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
async function fetchJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(`Unable to load ${path}`);return response.json();}
function loadBoardStore(){try{const parsed=JSON.parse(localStorage.getItem(BOARD_STORAGE_KEY)||'{}');return parsed&&typeof parsed==='object'?parsed:{};}catch{return {};}}
function saveBoardStore(){localStorage.setItem(BOARD_STORAGE_KEY,JSON.stringify(state.boardStore));}
function boardData(id){return state.boardStore[id]??={completed:{},priorities:{},customTasks:[]};}
function priorityRank(value){return {high:0,medium:1,low:2,none:3}[value]??3;}
function categoryLabel(value){return String(value??'other').split('-').map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ');}
function categoryMeta(category){return CATEGORY_META[category]??['✓','#3157d5','#eef2ff'];}
function progressFor(board){const saved=boardData(board.id);const total=(board.task_count??board.tasks?.length??0)+saved.customTasks.length;const done=Object.entries(saved.completed).filter(([,value])=>value).length;return {done:Math.min(done,total),total,percent:total?Math.round(Math.min(done,total)/total*100):0};}
function updateDashboard(){
  const completed=Object.values(state.boardStore).reduce((sum,item)=>sum+Object.values(item.completed??{}).filter(Boolean).length,0);
  const custom=Object.values(state.boardStore).reduce((sum,item)=>sum+(item.customTasks?.length??0),0);
  $('heroBoardCount').textContent=state.boards.length;$('statBoards').textContent=state.boards.length;$('statCompleted').textContent=completed;$('statCustom').textContent=custom;
}
function renderCategoryChips(){
  const counts=new Map();for(const board of state.boards)counts.set(board.category,(counts.get(board.category)??0)+1);
  const top=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,8);
  $('categoryChips').innerHTML=`<button class="categoryChip ${$('boardCategory').value?'':'active'}" data-category="" type="button">All boards</button>`+top.map(([category,count])=>`<button class="categoryChip ${$('boardCategory').value===category?'active':''}" data-category="${esc(category)}" type="button">${esc(categoryLabel(category))} · ${count}</button>`).join('');
  document.querySelectorAll('.categoryChip').forEach(button=>button.addEventListener('click',()=>{$('boardCategory').value=button.dataset.category;renderBoards();}));
}
function boardDescription(board){return `${board.task_count??0} ready-made tasks${board.subtask_count?` and ${board.subtask_count} helpful subtasks`:''}. Add your own items anytime.`;}
function renderBoards(){
  const query=$('boardSearch').value.trim().toLowerCase();const category=$('boardCategory').value;
  const filtered=state.boards.filter(board=>(!category||board.category===category)&&(!query||`${board.title} ${board.category}`.toLowerCase().includes(query)));
  $('boards').innerHTML=filtered.length?filtered.map(board=>{const p=progressFor(board);const [icon,accent,soft]=categoryMeta(board.category);return `<button class="boardCard" data-board-id="${esc(board.id)}" type="button" style="--card-accent:${accent};--card-soft:${soft}"><div class="boardTop"><span class="boardIcon">${icon}</span><span class="boardCategory">${esc(categoryLabel(board.category))}</span></div><h3>${esc(board.title)}</h3><p class="boardDescription">${esc(boardDescription(board))}</p><div class="boardProgressBlock"><div class="boardProgressMeta"><span class="boardCount">${p.done} of ${p.total} done</span><span>${p.percent}%</span></div><div class="progressTrack"><span style="width:${p.percent}%"></span></div><div class="boardFoot"><span>${p.total-p.done} remaining</span><span>Open board →</span></div></div></button>`;}).join(''):'<div class="emptyTasks">No checklist boards match those filters. Try a broader search.</div>';
  $('boardStatus').textContent='Your progress and personal tasks are saved automatically in this browser.';
  $('boardResultCount').textContent=`${filtered.length} of ${state.boards.length} boards`;
  renderCategoryChips();updateDashboard();
  document.querySelectorAll('[data-board-id]').forEach(button=>button.addEventListener('click',()=>openBoard(button.dataset.boardId)));
}
async function openBoard(id){
  $('boardStatus').textContent='Loading board tasks…';
  try{
    const board=await fetchJson(`${API_ROOT}/global-activities/${encodeURIComponent(id)}`);state.activeBoard=board;state.taskFilter='all';
    $('boards').hidden=true;$('boardToolbar').hidden=true;$('categoryChips').hidden=true;$('boardStatus').hidden=true;$('.browseHeader');$('boardDetail').hidden=false;
    const [icon]=categoryMeta(board.category);$('detailIcon').textContent=icon;$('detailCategory').textContent=categoryLabel(board.category);$('detailTitle').textContent=board.title;
    document.querySelectorAll('[data-task-filter]').forEach(button=>button.classList.toggle('active',button.dataset.taskFilter==='all'));
    renderActiveBoard();history.replaceState(null,'',`#${encodeURIComponent(id)}`);window.scrollTo({top:$('boardDetail').offsetTop-20,behavior:'smooth'});
  }catch(error){$('boardStatus').textContent=`Unable to load this board: ${error.message}`;}
}
function allBoardTasks(){
  if(!state.activeBoard)return[];const saved=boardData(state.activeBoard.id);
  const builtIn=state.activeBoard.tasks.map(task=>({...task,custom:false,priority:saved.priorities[task.id]??'none'}));
  const custom=saved.customTasks.map(task=>({...task,custom:true,subtasks:[],priority:saved.priorities[task.id]??task.priority??'none'}));
  return [...builtIn,...custom].sort((a,b)=>priorityRank(a.priority)-priorityRank(b.priority)||(a.sequence??9999)-(b.sequence??9999)||a.title.localeCompare(b.title));
}
function renderActiveBoard(){
  const board=state.activeBoard;if(!board)return;const saved=boardData(board.id);const p=progressFor({...board,task_count:board.tasks.length});
  $('detailProgress').textContent=`${p.done} completed · ${p.total-p.done} remaining`;$('detailProgressPercent').textContent=`${p.percent}%`;$('detailProgressBar').style.width=`${p.percent}%`;$('detailProgressRing').style.setProperty('--progress',p.percent);
  const tasks=allBoardTasks().filter(task=>state.taskFilter==='all'||(state.taskFilter==='completed'&&saved.completed[task.id])||(state.taskFilter==='active'&&!saved.completed[task.id]));
  $('boardTasks').innerHTML=tasks.length?tasks.map(task=>`<article class="boardTask priority-${task.priority} ${saved.completed[task.id]?'done':''}" data-task-id="${esc(task.id)}"><label class="taskCheck"><input type="checkbox" ${saved.completed[task.id]?'checked':''}><span><strong>${esc(task.title)}</strong><small>${task.custom?'Personal task':task.subtasks?.length?`${task.subtasks.length} subtasks included`:'Checklist task'}</small></span></label><div class="taskActions"><select class="taskPriority" aria-label="Priority for ${esc(task.title)}"><option value="high" ${task.priority==='high'?'selected':''}>High priority</option><option value="medium" ${task.priority==='medium'?'selected':''}>Medium priority</option><option value="low" ${task.priority==='low'?'selected':''}>Low priority</option><option value="none" ${task.priority==='none'?'selected':''}>No priority</option></select>${task.custom?'<button class="deleteTask" type="button">Delete</button>':''}</div>${task.subtasks?.length?`<details class="subtasks"><summary>View ${task.subtasks.length} subtasks</summary><ul>${task.subtasks.map(sub=>`<li>${esc(sub.title)}</li>`).join('')}</ul></details>`:''}</article>`).join(''):'<div class="emptyTasks">No tasks in this view.</div>';
  document.querySelectorAll('.boardTask').forEach(row=>{
    const id=row.dataset.taskId;row.querySelector('input[type=checkbox]').addEventListener('change',event=>{saved.completed[id]=event.target.checked;saveBoardStore();renderActiveBoard();renderBoards();});
    row.querySelector('.taskPriority').addEventListener('change',event=>{saved.priorities[id]=event.target.value;saveBoardStore();renderActiveBoard();renderBoards();});
    row.querySelector('.deleteTask')?.addEventListener('click',()=>{saved.customTasks=saved.customTasks.filter(task=>task.id!==id);delete saved.completed[id];delete saved.priorities[id];saveBoardStore();renderActiveBoard();renderBoards();});
  });
}
function closeBoard(){state.activeBoard=null;$('boardDetail').hidden=true;$('boards').hidden=false;$('boardToolbar').hidden=false;$('categoryChips').hidden=false;$('boardStatus').hidden=false;history.replaceState(null,'',location.pathname+location.search);renderBoards();window.scrollTo({top:$('boardToolbar').offsetTop-20,behavior:'smooth'});}
function addCustomTask(event){event.preventDefault();if(!state.activeBoard)return;const title=$('newTaskTitle').value.trim();if(!title)return;const priority=$('newTaskPriority').value;const id=`custom-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;const saved=boardData(state.activeBoard.id);saved.customTasks.push({id,title,sequence:10000+saved.customTasks.length*10,priority});saved.priorities[id]=priority;saveBoardStore();event.target.reset();$('newTaskPriority').value='medium';renderActiveBoard();renderBoards();$('newTaskTitle').focus();}
function clearActiveBoard(){if(!state.activeBoard||!confirm('Reset completed items, priorities, and personal tasks for this board?'))return;delete state.boardStore[state.activeBoard.id];saveBoardStore();renderActiveBoard();renderBoards();}
async function initBoards(){
  try{const body=await fetchJson(`${API_ROOT}/global-activities`);state.boards=body.items??[];const categories=[...new Set(state.boards.map(item=>item.category))].sort();$('boardCategory').innerHTML='<option value="">All categories</option>'+categories.map(category=>`<option value="${esc(category)}">${esc(categoryLabel(category))}</option>`).join('');renderBoards();const id=decodeURIComponent(location.hash.slice(1));if(id&&state.boards.some(board=>board.id===id))openBoard(id);}catch(error){$('boardStatus').textContent=`Unable to load checklist boards: ${error.message}`;}
}
function same(a,b){return String(a??'').trim().toLowerCase()===String(b??'').trim().toLowerCase();}
function normalizeMacros(doc){return Array.isArray(doc.checklists)?doc.checklists.map(item=>({...item,version:item.version??doc.version,status:item.status??doc.status,risk_level:item.risk_level??doc.risk_level})):[doc];}
function normalizeMicros(doc){return (doc.checklists??[]).map(item=>({...item,version:item.version??doc.version,status:item.status??doc.status}));}
function layerMatches(layer,location){if(layer.level==='generic'||!layer.location)return true;return Object.entries(layer.location).every(([key,value])=>same(location[key],value));}
function evaluateCondition(expression,context){if(!expression)return{include:true};const match=expression.match(/^([a-zA-Z_][\w.]*)\s*(==|!=|<=|>=|<|>)\s*(true|false|null|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*')$/);if(!match)return{include:true,warning:`Unsupported condition retained: ${expression}`};const[,path,operator,raw]=match;let actual=context;for(const key of path.split('.')){if(actual==null||!(key in Object(actual)))return{include:true,warning:`Missing context for condition retained: ${expression}`};actual=actual[key];}let expected=raw;if(raw==='true')expected=true;else if(raw==='false')expected=false;else if(raw==='null')expected=null;else if(/^[-\d]/.test(raw))expected=Number(raw);else expected=raw.slice(1,-1);const operations={'==':(a,b)=>a===b,'!=':(a,b)=>a!==b,'<':(a,b)=>a<b,'>':(a,b)=>a>b,'<=':(a,b)=>a<=b,'>=':(a,b)=>a>=b};return{include:operations[operator](actual,expected)};}
function compose(checklist,location,context={},expand=true){const layers=(checklist.layers??[]).filter(layer=>layerMatches(layer,location));const tasks=new Map(),sources=new Map(),warnings=[];for(const layer of layers){for(const source of layer.sources??[])sources.set(source.url??`${source.authority}:${source.title}`,source);for(const task of layer.tasks??[]){const condition=evaluateCondition(task.condition,context);if(condition.warning)warnings.push(condition.warning);if(!condition.include)continue;const key=task.semantic_key??`${task.phase}:${task.sequence}:${task.title}`;const item={...task,source_layer:layer.level,source_location:layer.location??null};if(expand&&task.micro_checklist_id){const micro=state.microById.get(task.micro_checklist_id);if(micro)item.micro_checklist=micro;else warnings.push(`Micro-checklist not found: ${task.micro_checklist_id}`);}tasks.set(key,item);}}return{id:checklist.id,title:checklist.title,version:checklist.version,status:checklist.status,risk_level:checklist.risk_level,location,applied_layers:layers.map(layer=>({level:layer.level,location:layer.location??null})),tasks:[...tasks.values()].sort((a,b)=>(a.sequence??0)-(b.sequence??0)||String(a.title).localeCompare(String(b.title))),sources:[...sources.values()],warnings:[...new Set(warnings)]};}
function render(result){state.last=result;$('title').textContent=result.title;$('warnings').innerHTML=result.warnings.map(w=>`<div class="warning">${esc(w)}</div>`).join('');$('tasks').innerHTML=result.tasks.map(task=>`<li class="task"><h3>${esc(task.title)}</h3><div class="meta">${esc(task.phase??'task')} · ${esc(task.source_layer)}${task.micro_checklist_id?` · ${esc(task.micro_checklist_id)}`:''}</div>${task.micro_checklist?.steps?.length?`<ol class="steps">${task.micro_checklist.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol>`:''}</li>`).join('');$('sources').innerHTML=result.sources.length?result.sources.map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a>${source.authority?` — ${esc(source.authority)}`:''}</li>`).join('):'<li>No sources attached.</li>';$('json').textContent=JSON.stringify(result,null,2);$('result').hidden=false;$('status').innerHTML=`Built <strong>${result.tasks.length}</strong> tasks from <strong>${result.applied_layers.length}</strong> matching layers.`;}
function locationValues(){return Object.fromEntries(LOCATION_FIELDS.map(key=>[key,$(key).value.trim()]));}
function setLocation(values,{save=true,message='Location updated.'}={}){for(const key of LOCATION_FIELDS){if(values[key]!==undefined&&$(key))$(key).value=values[key]??'';}if(save)localStorage.setItem(LOCATION_STORAGE_KEY,JSON.stringify(locationValues()));$('locationStatus').textContent=message;}
function applyPreset(id){const preset=LOCATION_PRESETS[id];if(!preset)return false;setLocation(preset,{message:'Using the location associated with this checklist.'});return true;}
function savedLocation(){try{const value=JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY)||'null');return value&&typeof value==='object'?value:null;}catch{return null;}}
async function useCurrentLocation(){if(!navigator.geolocation){$('locationStatus').textContent='This browser does not provide location access.';return;}$('locationStatus').textContent='Requesting browser location permission…';$('locate').disabled=true;try{const position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{timeout:10000,maximumAge:300000}));const{latitude,longitude}=position.coords;const url=new URL('https://nominatim.openstreetmap.org/reverse');url.search=new URLSearchParams({format:'jsonv2',lat:String(latitude),lon:String(longitude),addressdetails:'1'});const data=await fetchJson(url);const a=data.address??{};setLocation({country:String(a.country_code??'').toUpperCase(),state:a.state??a.region??'',district:a.state_district??a.district??'',county:a.county??'',city:a.city??a.town??a.village??''},{message:'Using your browser location.'});composeSelected();}catch(error){$('locationStatus').textContent=`Unable to determine location: ${error.message||'unknown error'}`;}finally{$('locate').disabled=false;}}
function composeSelected(){const checklist=state.checklists.find(item=>item.id===$('checklist').value);if(checklist)render(compose(checklist,locationValues(),{},$('expand').checked));}
async function initLegacy(){try{const macros=await Promise.all(macroFiles.map(name=>fetchJson(`${DATA_ROOT}/macros/${name}`)));const micros=await Promise.all(microFiles.map(name=>fetchJson(`${DATA_ROOT}/micro/${name}`)));state.checklists=macros.flatMap(normalizeMacros).sort((a,b)=>String(a.title).localeCompare(String(b.title)));state.microById=new Map(micros.flatMap(normalizeMicros).map(item=>[item.id,item]));$('checklist').innerHTML=state.checklists.map(item=>`<option value="${esc(item.id)}">${esc(item.title)}</option>`).join('');const preferred=state.checklists[0];if(preferred)$('checklist').value=preferred.id;const saved=savedLocation();if(saved)setLocation(saved,{save:false,message:'Location restored from this browser.'});else if(preferred)applyPreset(preferred.id);composeSelected();}catch(error){$('status').textContent=`Unable to load location-aware data: ${error.message}`;}}
$('boardSearch').addEventListener('input',renderBoards);$('boardCategory').addEventListener('change',renderBoards);$('showAllBoards').addEventListener('click',()=>{$('boardSearch').value='';$('boardCategory').value='';renderBoards();});$('closeBoard').addEventListener('click',closeBoard);$('addTaskForm').addEventListener('submit',addCustomTask);$('clearBoardData').addEventListener('click',clearActiveBoard);
document.querySelectorAll('[data-task-filter]').forEach(button=>button.addEventListener('click',()=>{state.taskFilter=button.dataset.taskFilter;document.querySelectorAll('[data-task-filter]').forEach(item=>item.classList.toggle('active',item===button));renderActiveBoard();}));
$('checklist').addEventListener('change',composeSelected);$('locate').addEventListener('click',useCurrentLocation);$('preset').addEventListener('click',()=>{if(applyPreset($('checklist').value))composeSelected();});$('compose').addEventListener('click',composeSelected);for(const key of LOCATION_FIELDS)$(key).addEventListener('change',()=>localStorage.setItem(LOCATION_STORAGE_KEY,JSON.stringify(locationValues())));$('copy').addEventListener('click',async()=>{if(!state.last)return;await navigator.clipboard.writeText(JSON.stringify(state.last,null,2));$('copy').textContent='Copied';setTimeout(()=>$('copy').textContent='Copy JSON',1200);});
initBoards();initLegacy();
