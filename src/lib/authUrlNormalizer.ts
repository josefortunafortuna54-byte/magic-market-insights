export function normalizeAuthCallbackUrl(){
  if(typeof window==='undefined')return;
  const l=window.location;
  if(l.hostname!=='localhost')return;
  const has=l.hash.includes('access_token')||l.hash.includes('refresh_token')||l.search.includes('code')||l.search.includes('error');
  if(!has)return;
  if(l.port&&l.port!=='8080'){
    const u=new URL(l.href);
    u.port='8080';
    window.location.replace(u.toString());
  }
}
