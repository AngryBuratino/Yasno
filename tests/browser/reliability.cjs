const assert=require("node:assert/strict");
const {after,before,test}=require("node:test");
const {createServer}=require("node:http");
const {readFile}=require("node:fs/promises");
const {resolve,extname}=require("node:path");
const {chromium}=require("playwright");

const root=resolve(__dirname,"../..");
const type={".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".webmanifest":"application/manifest+json"};
const source="👩‍💻 Пришлите пожалуйста ответ.";
const corrected="👩‍💻 Пришлите, пожалуйста, ответ.";
let browser;
before(async()=>{browser=await chromium.launch({executablePath:process.env.YASNO_CHROMIUM});});
after(async()=>{await browser?.close();});

async function withApp(width,run){
 const service={version:1,failNavigation:false,calls:0,reply:null};
 const server=createServer(async(req,res)=>{
  const {pathname}=new URL(req.url,"http://localhost");
  res.setHeader("Cache-Control","no-store");
  if(pathname==="/api/check"){
   service.calls++;
   req.resume();
   return service.reply?service.reply(res):res.writeHead(503).end("private gateway detail");
  }
  if(pathname==="/extra.txt")return res.end("network only");
  if(!/^\/(?:[\w.-]+)?$/.test(pathname))return res.writeHead(404).end();
  const asset=pathname==="/"?"/index.html":pathname;
  if(service.failNavigation&&asset==="/index.html")return res.writeHead(503).end("upstream navigation unavailable");
  try{
   let content=await readFile(root+asset,"utf8");
   if(asset==="/sw.js")content=content.replace(/yasno-static-v\d+/g,"yasno-static-v"+service.version);
   res.setHeader("Content-Type",(type[extname(asset)]||"text/plain")+"; charset=utf-8");
   res.end(content);
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const context=await browser.newContext({viewport:{width,height:900},permissions:["clipboard-read","clipboard-write"]});
 try{
  const page=await context.newPage();
  page.setDefaultTimeout(5000);
  await page.goto("http://127.0.0.1:"+server.address().port+"/");
  await page.waitForFunction(()=>navigator.serviceWorker.controller);
  await run(page,context,service);
 }finally{
  await context.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
const editor=page=>page.locator("#editor");
const read=(page,id)=>page.locator("#"+id).textContent();
async function check(page,text=source){
 await editor(page).fill(text);
 await page.locator("#check").click();
 await page.waitForFunction(()=>!document.querySelector("#result").hidden&&!document.querySelector("#check").disabled);
}

for(const width of [320,360,390,768,1440]){
 test("browser fallback remains usable at "+width+" px",async()=>{
  await withApp(width,async(page,context,service)=>{
   await check(page);
   assert.equal(await read(page,"correctedText"),corrected);
   assert.match(await read(page,"checkNotice"),/ограниченн/iu);
   assert.equal(service.calls,1);
   await context.setOffline(true);
   await page.reload();
   await check(page);
   assert.equal(await read(page,"correctedText"),corrected);
   assert.match(await read(page,"checkNotice"),/локальн/iu);
   assert.equal(await read(page,"beforeDiff"),source);
   assert.equal(await read(page,"afterDiff"),corrected);
   await page.locator("#copyCorrected").click();
   await page.waitForFunction(async text=>await navigator.clipboard.readText()===text,corrected);
   await page.locator("#applyCorrected").click();
   assert.equal(await editor(page).inputValue(),corrected);
   await page.locator("#undo").click();
   assert.equal(await editor(page).inputValue(),source);
   await editor(page).fill("Всё так же нужна почта. Речь о бумажных письмах.");
   await page.locator("#businessPolish").click();
   assert.equal(await read(page,"editorialText"),await editor(page).inputValue());
   const overflow=await page.locator("button,select").evaluateAll(elements=>elements
    .filter(node=>{const rect=node.getBoundingClientRect();return rect.width&&rect.height&&!node.closest(".filter-row")&&(rect.left< -1||rect.right>innerWidth+1);})
    .map(node=>node.id));
   assert.deepEqual(overflow,[]);
  });
 });
}

test("limited and full results are distinct and 429 avoids another request",async()=>{
 await withApp(390,async(page,_,service)=>{
  const json=value=>res=>res.setHeader("Content-Type","application/json").end(JSON.stringify(value));
  service.reply=json({coverage:"full",complete:true,matches:[]});
  await check(page,"Документ готов.");
  assert.match(await read(page,"checkNotice"),/Полная проверка/iu);
  service.reply=json({coverage:"partial",complete:false,reason:"invalid_response",matches:[]});
  await check(page,"Следующий документ готов.");
  assert.match(await read(page,"checkNotice"),/ограничениями/iu);
  assert.doesNotMatch(await read(page,"checkNotice"),/ошибок не найдено/iu);
  service.reply=json({coverage:"local",complete:false,reason:"rate_limited",retryAfter:45,matches:[]});
  await check(page,"Проверить.");
  const requests=service.calls;
  await check(page);
  assert.equal(service.calls,requests);
  assert.equal(await read(page,"correctedText"),corrected);
 });
});

test("only listed static assets enter Cache Storage and a cached shell survives navigation 503",async()=>{
 await withApp(390,async(page,_,service)=>{
  await page.evaluate(async()=>{
   await fetch("/extra.txt");
   await fetch("/styles.css?variant=1");
   await fetch("/api/check",{method:"POST"});
  });
  const paths=await page.evaluate(async()=> (await Promise.all((await caches.keys()).map(async name=>(await (await caches.open(name)).keys()).map(request=>new URL(request.url).pathname+new URL(request.url).search)))).flat());
  assert.ok(paths.includes("/app.js"));
  assert.ok(!paths.some(path=>path==="/extra.txt"||path.includes("?")||path.startsWith("/api/")));
  service.failNavigation=true;
  const response=await page.reload();
  assert.equal(response.status(),200);
  assert.equal(await editor(page).isVisible(),true);
 });
});

test("an available update keeps active input and activates after explicit action on an empty editor",async()=>{
 await withApp(390,async(page,_,service)=>{
  await editor(page).fill("Не потерять 👩‍💻.");
  service.version=2;
  await page.evaluate(async()=> (await navigator.serviceWorker.ready).update());
  await page.locator("#applyUpdate").waitFor();
  assert.equal(await editor(page).inputValue(),"Не потерять 👩‍💻.");
  await page.locator("#applyUpdate").click();
  assert.equal(await editor(page).inputValue(),"Не потерять 👩‍💻.");
  assert.equal(await page.evaluate(async()=>Boolean((await navigator.serviceWorker.getRegistration()).waiting)),true);
  await editor(page).fill("");
  await Promise.all([page.waitForNavigation(),page.locator("#applyUpdate").click()]);
  await page.waitForFunction(async()=> (await caches.keys()).includes("yasno-static-v2")&&!(await caches.keys()).includes("yasno-static-v1"));
  assert.equal(await page.locator("#applyUpdate").isVisible(),false);
 });
});

test("an update can reload a saved draft without losing its text",async()=>{
 await withApp(390,async(page,_,service)=>{
  await page.locator("#settings").click();
  await page.locator("#draftMode").check();
  await editor(page).fill(source);
  service.version=2;
  await page.evaluate(async()=> (await navigator.serviceWorker.ready).update());
  await page.locator("#applyUpdate").waitFor();
  await Promise.all([page.waitForNavigation(),page.locator("#applyUpdate").click()]);
  assert.equal(await editor(page).inputValue(),source);
  assert.equal(await page.locator("#applyUpdate").isVisible(),false);
 });
});

test("explicit API errors and corrupt successful gateway replies have different statuses",async()=>{
 await withApp(360,async(page,_,service)=>{
  service.reply=res=>res.writeHead(403).end("private gateway error");
  await check(page);
  assert.match(await read(page,"checkNotice"),/не удалось/iu);
  assert.doesNotMatch(await read(page,"checkNotice"),/private gateway|не найдено/iu);
  service.reply=res=>res.writeHead(200).end("<html>interstitial</html>");
  await check(page);
  assert.equal(await read(page,"correctedText"),corrected);
  assert.match(await read(page,"checkNotice"),/локальн/iu);
 });
});

test("the browser gives up on a stalled API without duplicate requests",async()=>{
 await withApp(390,async(page,_,service)=>{
  service.reply=()=>{}; // No headers or body until the browser aborts.
  await page.clock.install();
  await editor(page).fill(source);
  await Promise.all([page.waitForRequest("**/api/check"),page.locator("#check").click()]);
  await editor(page).press("Control+Enter");
  await editor(page).press("Control+Enter");
  await page.clock.runFor(8100);
  await page.locator("#result").waitFor();
  assert.equal(service.calls,1);
  assert.equal(await read(page,"correctedText"),corrected);
  assert.match(await read(page,"checkNotice"),/ограниченн/iu);
 });
});
