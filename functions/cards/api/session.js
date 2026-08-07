const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

export async function onRequestGet({request}){
  const email=request.headers.get('Cf-Access-Authenticated-User-Email')||'';
  return json({authenticated:true,email});
}

export function onRequest(){
  return json({error:'Method not allowed.'},405);
}
