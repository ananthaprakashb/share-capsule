const DATA_ROOT='https://raw.githubusercontent.com/ananthaprakashb/checklist/main/data';
const macroFiles=['buy-home.json','rent-home.json','lease-property-landlord.json','san-ramon-resident-activities.json','chennai-life-events.json'];
const microFiles=['home-buying.json','home-renting.json','property-leasing-landlord.json','san-ramon-resident-activities.json','chennai-life-events.json'];
const $=id=>document.getElementById(id);
const state={checklists:[],microById:new Map(),last:null};
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

function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function same(a,b){return String(a??'').trim().toLowerCase()===String(b??'').trim().toLowerCase();}
function normalizeMacros(doc){return Array.isArray(doc.checklists)?doc.checklists.map(item=>({...item,version:item.version??doc.version,status:item.status??doc.status,risk_level:item.risk_level??doc.risk_level})): [doc];}
function normalizeMicros(doc){return (doc.checklists??[]).map(item=>({...item,version:item.version??doc.version,status:item.status??doc.status}));}
async function fetchJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(`Unable to load ${path}`);return response.json();}
function layerMatches(layer,location){if(layer.level==='generic'||!layer.location)return true;return Object.entries(layer.location).every(([key,value])=>same(location[key],value));}
function evaluateCondition(expression,context){
  if(!expression)return {include:true};
  const match=expression.match(/^([a-zA-Z_][\w.]*)\s*(==|!=|<=|>=|<|>)\s*(true|false|null|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*')$/);
  if(!match)return {include:true,warning:`Unsupported condition retained: ${expression}`};
  const [,path,operator,raw]=match;let actual=context;
  for(const key of path.split('.')){if(actual==null||!(key in Object(actual)))return {include:true,warning:`Missing context for condition retained: ${expression}`};actual=actual[key];}
  let expected=raw;if(raw==='true')expected=true;else if(raw==='false')expected=false;else if(raw==='null')expected=null;else if(/^[-\d]/.test(raw))expected=Number(raw);else expected=raw.slice(1,-1);
  const operations={'==':(a,b)=>a===b,'!=':(a,b)=>a!==b,'<':(a,b)=>a<b,'>':(a,b)=>a>b,'<=':(a,b)=>a<=b,'>=':(a,b)=>a>=b};
  return {include:operations[operator](actual,expected)};
}
function compose(checklist,location,context={},expand=true){
  const layers=(checklist.layers??[]).filter(layer=>layerMatches(layer,location));
  const tasks=new Map(),sources=new Map(),warnings=[];
  for(const layer of layers){
    for(const source of layer.sources??[])sources.set(source.url??`${source.authority}:${source.title}`,source);
    for(const task of layer.tasks??[]){
      const condition=evaluateCondition(task.condition,context);if(condition.warning)warnings.push(condition.warning);if(!condition.include)continue;
      const key=task.semantic_key??`${task.phase}:${task.sequence}:${task.title}`;
      const item={...task,source_layer:layer.level,source_location:layer.location??null};
      if(expand&&task.micro_checklist_id){const micro=state.microById.get(task.micro_checklist_id);if(micro)item.micro_checklist=micro;else warnings.push(`Micro-checklist not found: ${task.micro_checklist_id}`);}
      tasks.set(key,item);
    }
  }
  return {id:checklist.id,title:checklist.title,version:checklist.version,status:checklist.status,risk_level:checklist.risk_level,location,applied_layers:layers.map(layer=>({level:layer.level,location:layer.location??null})),tasks:[...tasks.values()].sort((a,b)=>(a.sequence??0)-(b.sequence??0)||String(a.title).localeCompare(String(b.title))),sources:[...sources.values()],warnings:[...new Set(warnings)]};
}
function render(result){
  state.last=result;$('title').textContent=result.title;
  $('warnings').innerHTML=result.warnings.map(w=>`<div class="warning">${esc(w)}</div>`).join('');
  $('tasks').innerHTML=result.tasks.map(task=>`<li class="task"><h3>${esc(task.title)}</h3><div class="meta">${esc(task.phase??'task')} · ${esc(task.source_layer)}${task.micro_checklist_id?` · ${esc(task.micro_checklist_id)}`:''}</div>${task.micro_checklist?.steps?.length?`<ol class="steps">${task.micro_checklist.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol>`:''}</li>`).join('');
  $('sources').innerHTML=result.sources.length?result.sources.map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a>${source.authority?` — ${esc(source.authority)}`:''}</li>`).join(''):'<li>No sources attached.</li>';
  $('json').textContent=JSON.stringify(result,null,2);$('result').hidden=false;$('status').innerHTML=`Built <strong>${result.tasks.length}</strong> tasks from <strong>${result.applied_layers.length}</strong> matching layers.`;
}
function locationValues(){return {country:$('country').value,state:$('state').value,district:$('district').value,county:$('county').value,city:$('city').value};}
function applyPreset(id){const preset=LOCATION_PRESETS[id];if(!preset)return;for(const [key,value] of Object.entries(preset)){const input=$(key);if(input)input.value=value;}}
function composeSelected(){const checklist=state.checklists.find(item=>item.id===$('checklist').value);if(checklist)render(compose(checklist,locationValues(),{},$('expand').checked));}
async function init(){
  try{
    const macros=await Promise.all(macroFiles.map(name=>fetchJson(`${DATA_ROOT}/macros/${name}`)));
    const micros=await Promise.all(microFiles.map(name=>fetchJson(`${DATA_ROOT}/micro/${name}`)));
    state.checklists=macros.flatMap(normalizeMacros).sort((a,b)=>String(a.title).localeCompare(String(b.title)));
    state.microById=new Map(micros.flatMap(normalizeMicros).map(item=>[item.id,item]));
    $('checklist').innerHTML=state.checklists.map(item=>`<option value="${esc(item.id)}">${esc(item.title)}</option>`).join('');
    const preferred=state.checklists.find(item=>item.id==='travel-domestic-from-chennai')??state.checklists[0];
    if(preferred){$('checklist').value=preferred.id;applyPreset(preferred.id);}
    composeSelected();
  }catch(error){$('status').textContent=`Unable to load checklist data: ${error.message}`;}
}
$('checklist').addEventListener('change',()=>{applyPreset($('checklist').value);composeSelected();});
$('compose').addEventListener('click',composeSelected);
$('copy').addEventListener('click',async()=>{if(!state.last)return;await navigator.clipboard.writeText(JSON.stringify(state.last,null,2));$('copy').textContent='Copied';setTimeout(()=>$('copy').textContent='Copy JSON',1200);});
init();