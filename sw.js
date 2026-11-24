/* Cache immutable versions of the app shell. User data stays out of Cache Storage. */
const CACHE="yasno-static-v36";
const ASSETS=new Set([
 "/index.html","/styles.css","/app-core.js","/proofread-fallback.js","/business-editor.js",
 "/advanced-punctuation.js","/local-check.js","/app.js","/corrections.js","/icon.svg","/manifest.webmanifest"
]);

self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>
  cache.addAll([...ASSETS].map(path=>new Request(path,{cache:"reload"})))));
});
self.addEventListener("message",event=>{
 if(event.data==="ACTIVATE_UPDATE")event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith("yasno-static-")&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET")return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin||url.pathname.startsWith("/api/"))return;
 const navigation=req.mode==="navigate";
 const path=navigation&&url.pathname==="/"?"/index.html":url.pathname;
 if(!ASSETS.has(path)||(!navigation&&url.search))return;
 if(navigation&&path!=="/index.html")return;
 // Keep the HTML and its JS on the same version until the user updates.
 // This also keeps a cached shell available during a network failure or 503.
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  return await cache.match(path)||fetch(req);
 })());
});
