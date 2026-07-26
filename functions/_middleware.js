export async function onRequest({request,next}){
  const response=await next();
  const url=new URL(request.url);
  const acceptsHtml=(request.headers.get('accept')||'').includes('text/html');
  if(url.pathname!=='/'||!acceptsHtml)return response;

  const country=String(request.cf?.country||'XX').toUpperCase();
  const safeCountry=/^[A-Z]{2}$/.test(country)?country:'XX';
  const headers=new Headers(response.headers);
  headers.append('Set-Cookie',`sharecapsule-country=${safeCountry}; Path=/; Max-Age=21600; SameSite=Lax; Secure`);
  headers.set('Cache-Control','private, no-cache, must-revalidate');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
