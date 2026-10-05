/* OdontoApp service worker — red primero, caché como respaldo offline */
const CACHE='odontoapp-v10';
const BASE=['./','./index.html','./css/styles.css','./js/core.js','./js/app.js','./js/balance.js','./js/ui.js','./js/patients.js','./js/chart.js','./js/agenda.js','./js/finance.js','./js/clinical.js','./js/recalls.js','./js/sync.js','./js/security.js','./js/main.js','./icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(BASE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.hostname.endsWith('supabase.co'))return;   // la API nunca se cachea
  e.respondWith(fetch(r).then(res=>{
    if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}
    return res;
  }).catch(()=>caches.match(r).then(x=>x||caches.match('./index.html'))));
});
