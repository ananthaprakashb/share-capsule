const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});

const SYSTEM_PROMPTS={
  ta:`You are a master Tamil poet (தமிழ் கவிஞர்). Write expressive, emotionally resonant Tamil poems (புதுக்கவிதை) using rich imagery, natural Tamil, traditional metaphors where appropriate, and proper Tamil script. Keep line breaks musical and natural. Return only the poem unless the user explicitly asks for a title.`,
  en:`You are an accomplished English poet. Write expressive, emotionally resonant free verse with vivid imagery, precise language, natural musical line breaks, and fresh metaphors. Return only the poem unless the user explicitly asks for a title.`
};

async function generateWithOllama({env,prompt,language,signal}){
  if(!env.OLLAMA_BASE_URL)return null;
  const base=env.OLLAMA_BASE_URL.replace(/\/$/,'');
  const model=env.OLLAMA_MODEL||'qwen2.5:3b';
  const headers={'content-type':'application/json'};
  if(env.OLLAMA_API_KEY)headers.authorization=`Bearer ${env.OLLAMA_API_KEY}`;
  const response=await fetch(`${base}/api/chat`,{method:'POST',headers,signal,body:JSON.stringify({model,stream:false,messages:[{role:'system',content:SYSTEM_PROMPTS[language]},{role:'user',content:prompt}],options:{temperature:.82,top_p:.9}})});
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.error||`SLM request failed with status ${response.status}.`);
  const poem=payload?.message?.content?.trim();
  if(!poem)throw new Error('The SLM returned an empty response.');
  return {poem,model};
}

async function generateWithGroq({env,prompt,language,signal}){
  if(!env.GROQ_API_KEY)return null;
  const base=(env.GROQ_BASE_URL||'https://api.groq.com/openai/v1').replace(/\/$/,'');
  const model=env.GROQ_MODEL||'llama-3.3-70b-versatile';
  const response=await fetch(`${base}/chat/completions`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${env.GROQ_API_KEY}`},signal,body:JSON.stringify({model,messages:[{role:'system',content:SYSTEM_PROMPTS[language]},{role:'user',content:prompt}],temperature:.78})});
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.error?.message||`Inference failed with status ${response.status}.`);
  const poem=payload?.choices?.[0]?.message?.content?.trim();
  if(!poem)throw new Error('The model returned an empty response.');
  return {poem,model};
}

export async function onRequestPost({request,env}){
  let body;try{body=await request.json()}catch{return json({error:'Request body must be valid JSON.'},400)}
  const prompt=typeof body?.prompt==='string'?body.prompt.trim():'';
  const language=body?.language==='en'?'en':'ta';
  if(!prompt)return json({error:'Please enter a poem prompt.'},400);
  if(prompt.length>1200)return json({error:'Prompt must be 1200 characters or fewer.'},400);
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),45000);
  try{
    const result=await generateWithOllama({env,prompt,language,signal:controller.signal})||await generateWithGroq({env,prompt,language,signal:controller.signal});
    if(!result)return json({error:'Poem generation is not configured. Set OLLAMA_BASE_URL or GROQ_API_KEY in Cloudflare Pages.'},503);
    return json({...result,language});
  }catch(error){
    if(error?.name==='AbortError')return json({error:'The model took too long to respond. Please try again.'},504);
    return json({error:error?.message||'Unable to reach the configured model service.'},502);
  }finally{clearTimeout(timeout)}
}

export function onRequestGet(){return json({service:'Protected Tamil/English poem card generator',method:'POST',body:{prompt:'Write a six-line poem about rain.',language:'en'}})}
export function onRequestOptions(){return new Response(null,{status:204,headers:{allow:'GET, POST, OPTIONS','cache-control':'no-store'}})}
