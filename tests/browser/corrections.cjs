const assert = require("node:assert/strict");
const {after, before, test} = require("node:test");
const {chromium} = require("playwright");

// Start Yasno separately. Run with: node --test tests/browser/corrections.cjs
const address = process.env.YASNO_TEST_URL || "http://127.0.0.1:3000";
const widths = [390, 1440];
let browser;

before(async () => {
 browser = await chromium.launch({executablePath: process.env.YASNO_CHROMIUM});
});
after(async () => { await browser?.close(); });

const edit = (offset,length,replacement,metadata={}) => ({offset,length,replacements:[replacement],...metadata});
const manual = {source:"LanguageTool",manualOnly:true};
const read = (page,id) => page.locator("#"+id).textContent();
const click = (page,id) => page.locator("#"+id).click();
const button = (page,name,scope="#issuesList") =>
 page.locator(scope).getByRole("button",{name,exact:true});

async function withPage(width, matches, run) {
 const context = await browser.newContext({
  viewport:{width,height:850},isMobile:width<500,hasTouch:width<500,
  permissions:["clipboard-read","clipboard-write"]
 });
 try {
  const page = await context.newPage();
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.setDefaultTimeout(4000);
  await page.route("**/api/check", async route => {
   const {text}=route.request().postDataJSON();
   await route.fulfill({json:{complete:true,matches:await matches(text)}});
  });
  await page.goto(address);
  const editor=page.locator("#editor");
  const check=async () => {
   await Promise.all([page.waitForResponse("**/api/check"), click(page,"check")]);
   await page.waitForFunction(() => !document.querySelector("#check").disabled);
  };
  await run(page,editor,check);
  assert.deepEqual(errors,[]);
 } finally {
  await context.close();
 }
}

for (const width of widths) {
 test("confirmed-only result can be transferred exactly once at "+width+" px", async () => {
  const source = "Привет.";
  const result = "«Привет.";
  await withPage(width,text=>text===source?[edit(0,0,"«",manual)]:[],async(page,editor,check)=>{
   await editor.fill(source);
   await check();
   assert.equal(await page.locator("#applyCorrected").isDisabled(),true);
   await button(page,"Подтвердить: «").click();
   assert.equal(await read(page,"correctedText"),result);
   assert.equal(await page.locator("#applyCorrected").isEnabled(),true);
   await click(page,"applyCorrected");
   assert.equal(await editor.inputValue(),result);
   assert.equal(await page.locator("#applyCorrected").isDisabled(),true);
   await click(page,"undo");
   assert.equal(await editor.inputValue(),source);
  });
 });
}

for (const width of widths) {
 test("individual, overlapping and bulk edits preserve Unicode and undo at "+width+" px",async()=>{
  const source="👩‍💻 е\u0308 Привет";
  const offset=source.indexOf("Привет");
  const partial=source+"!";
  const ready=source.slice(0,offset)+"Здравствуйте!";
  await withPage(width,text=>text===source?[
   edit(1,1,"сломано"),
   edit(offset,6,"Здравствуйте"),
   edit(offset+1,4,"другая правка",{reviewOnly:true}),
   edit(source.length,0,"!",manual)
  ]:[],async(page,editor,check)=>{
   await editor.fill(source);
   await check();
   assert.equal(await page.locator("#issuesList article").count(),3);
   assert.match(await read(page,"corrected-count"),/1 к переносу/u);
   await button(page,"Подтвердить: !").click();
   assert.equal(await editor.inputValue(),partial);
   assert.equal(await read(page,"correctedText"),ready);
   assert.equal(await read(page,"beforeDiff"),source);
   assert.equal(await read(page,"afterDiff"),ready);
   assert.match(await read(page,"corrected-count"),/1 подтверждено/u);
   await button(page,"Применить: Здравствуйте").click();
   assert.equal(await editor.inputValue(),ready);
   assert.equal(await page.locator("#issuesList article").count(),0);
   await click(page,"undo");
   assert.equal(await editor.inputValue(),partial);
   await click(page,"copyCorrected");
   assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),ready);
   await click(page,"applyCorrected");
   assert.equal(await editor.inputValue(),ready);
   assert.equal(await read(page,"beforeDiff"),source);
   assert.equal(await read(page,"afterDiff"),ready);
   await check();
   assert.equal(await read(page,"correctedText"),ready);
   assert.equal(await page.locator("#applyCorrected").isDisabled(),true);
   await click(page,"undo");
   assert.equal(await editor.inputValue(),partial);
   assert.equal(await read(page,"correctedText"),ready);
   await click(page,"undo");
   assert.equal(await editor.inputValue(),source);
   await button(page,"Пропустить").first().click();
   assert.equal(await read(page,"correctedText"),source);
   await editor.fill("Всё согласовано ✅");
   assert.equal(await page.locator("#result").isVisible(),false);
   assert.equal(await page.locator("#undo").isDisabled(),true);
   await check();
   assert.equal(await read(page,"correctedText"),"Всё согласовано ✅");
   assert.equal(await page.locator("#issuesList article").count(),0);
  });
 });

 test("bulk review preferences survive undo at "+width+" px",async()=>{
  const source="Пришлите письмо которое готово";
  const comma=source.indexOf(" которое");
  await withPage(width,text=>text===source?[
   edit(comma,0,",",{reviewOnly:true}),edit(source.length,0,".")
  ]:[],async(page,editor,check)=>{
   await editor.fill(source);
   await check();
   await page.locator("#includeReview").check();
   const ready="Пришлите письмо, которое готово.";
   assert.equal(await read(page,"correctedText"),ready);
   await click(page,"applyCorrected");
   assert.equal(await editor.inputValue(),ready);
   assert.equal(await page.locator("#applyCorrected").isDisabled(),true);
   await click(page,"undo");
   assert.equal(await editor.inputValue(),source);
   assert.equal(await page.locator("#includeReview").isChecked(),true);
   assert.equal(await read(page,"correctedText"),ready);
  });
 });

 test("editorial preview, skip, copy, transfer and both levels of undo at "+width+" px",async()=>{
  const source="Всё так же нужна почта. Речь о бумажных письмах. Покажите данные кнопки на странице оплаты. Я обязательно к вам вернусь. Оплата до 18 декабря: 12 500 ₽. Ответственная — Анна. 👩‍💻";
  const payment="эти способы оплаты на странице оплаты";
  const first=source.replace("данные кнопки на странице оплаты",payment);
  const both=first.replace("Я обязательно к вам вернусь","я обязательно сообщу вам об этом");
  const scope="#editorialSuggestions";
  await withPage(width,()=>[],async(page,editor,check)=>{
   await editor.fill(source);
   await click(page,"businessPolish");
   assert.equal(await read(page,"editorialText"),source);
   assert.equal(await page.locator("#editorialApply").isDisabled(),true);
   await button(page,"Подтвердить: "+payment,scope).click();
   assert.equal(await editor.inputValue(),source);
   assert.equal(await page.locator("#editorialApply").isEnabled(),true);
   await button(page,"Подтвердить: я обязательно сообщу вам об этом",scope).click();
   assert.equal(await read(page,"editorialText"),both);
   assert.match(await read(page,"editorial-count"),/2 подтверждено/u);
   await button(page,"Пропустить",scope).click();
   await click(page,"editorialUndo");
   assert.equal(await page.locator(scope+" article").count(),1);
   assert.equal(await read(page,"editorialText"),first);
   assert.equal(await read(page,"editorialBeforeDiff"),source);
   assert.equal(await read(page,"editorialAfterDiff"),first);
   await click(page,"editorialCopy");
   assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),first);
   await click(page,"editorialApply");
   assert.equal(await editor.inputValue(),first);
   assert.equal(await page.locator("#editorialResult").isVisible(),false);
   await check();
   await click(page,"undo");
   assert.equal(await editor.inputValue(),source);
   await click(page,"businessPolish");
   await editor.fill("Письмо отправлено.");
   assert.equal(await page.locator("#editorialResult").isVisible(),false);
   await click(page,"businessPolish");
   assert.equal(await read(page,"editorialText"),"Письмо отправлено.");
   assert.equal(await page.locator("#editorialApply").isDisabled(),true);
  });
 });
}

for (const width of widths) {
 test("automatic batch, persistent skip and a fresh check at "+width+" px",async()=>{
  const source="Анна прислала отчёт";
  const ready="Анна прислала доклад.";
  await withPage(width,text=>text===source?[
   edit(0,0,"✅ ",manual),edit(source.indexOf("отчёт"),5,"доклад"),edit(source.length,0,".")
  ]:[],async(page,editor,check)=>{
   await editor.fill(source);
   await check();
   assert.equal(await read(page,"correctedText"),ready);
   assert.match(await read(page,"corrected-count"),/2 к переносу/u);
   await click(page,"applyCorrected");
   assert.equal(await editor.inputValue(),ready);
   await click(page,"undo");
   assert.equal(await editor.inputValue(),source);
   await button(page,"Подтвердить: ✅").click();
   await page.locator("#issuesList article").filter({hasText:"доклад"}).getByRole("button",{name:"Пропустить"}).click();
   await click(page,"undo");
   assert.equal(await read(page,"correctedText"),source+".");
   assert.equal(await page.locator("#issuesList article").count(),2);
   await check();
   assert.equal(await read(page,"correctedText"),ready);
  });
 });
}

test("an in-flight check cannot restore recommendations after the editor changes",async()=>{
 let start,release;
 const started=new Promise(resolve=>{start=resolve;});
 const blocked=new Promise(resolve=>{release=resolve;});
 await withPage(390,async text=>{
  if(text!=="Старый текст")return [];
  start();
  await blocked;
  return [edit(0,6,"Новый")];
 },async(page,editor,check)=>{
  await editor.fill("Старый текст");
  await click(page,"check");
  try {
   await started;
   await editor.fill("Свежий текст.");
   assert.equal(await page.locator("#result").isVisible(),false);
   assert.equal(await page.locator("#check").isEnabled(),true);
  } finally {
   release();
  }
  await check();
  assert.equal(await read(page,"correctedText"),"Свежий текст.");
  assert.equal(await page.locator("#issuesList article").count(),0);
 });
});

for (const width of widths) {
 test("sidebar tone preview stays reachable and can be applied and undone at "+width+" px",async()=>{
  await withPage(width,()=>[],async(page,editor)=>{
   const buttonFits=await page.locator("#tonePreview").evaluate(node=>
    node.getBoundingClientRect().right<=node.parentElement.getBoundingClientRect().right+1);
   assert.equal(buttonFits,true);
   await editor.fill("Скиньте договор.");
   await page.locator("#tone").selectOption("polite");
   await click(page,"tonePreview");
   assert.match(await read(page,"toneText"),/Пришлите договор/u);
   await editor.fill("Скиньте отчёт.");
   assert.equal(await page.locator("#toneApply").isVisible(),false);
   assert.doesNotMatch(await read(page,"toneText"),/договор/u);
   await click(page,"tonePreview");
   await click(page,"toneApply");
   assert.equal(await editor.inputValue(),"Пришлите отчёт.");
   await click(page,"undo");
   assert.equal(await editor.inputValue(),"Скиньте отчёт.");
  });
 });
}
