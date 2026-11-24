/* Ясно: PWA shell only. Text and API responses are NEVER cached. */
const CACHE="yasno-static-v35";
const ASSETS=["/","/index.html","/styles.css","/app-core.js","/proofread-fallback.js","/business-editor.js","/app.js","/corrections.js","/icon.svg","/manifest.webmanifest"];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("yasno-static-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET")return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin||url.pathname.startsWith("/api/"))return;
 event.respondWith((async()=>{
  try{
   const response=await fetch(req);
   if(response.ok&&url.origin===self.location.origin){
    const cache=await caches.open(CACHE);
    cache.put(req,response.clone()).catch(()=>{});
   }
   return response;
  }catch{
   const cache=await caches.open(CACHE);
   return await cache.match(req)|| (req.mode==="navigate"?await cache.match("/index.html"):Response.error());
  }
 })());
});
