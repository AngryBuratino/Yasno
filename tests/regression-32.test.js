const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const check=require("../api/check.js");
const {compose}=require("../corrections.js");
const Shared=require("../proofread-fallback.js");
const {polish}=require("../business-editor.js");

const example="Создал нам встречу на сегодня в 13:00\nПодскажите все в силе\nВсе так же нужна почта";
const expected="Создал нам встречу на сегодня в 13:00.\nПодскажите, всё в силе?\nВсё так же нужна почта.";

async function invoke(body){
 const response={setHeader(){},status(s){this.statusCode=s;return this},json(data){this.body=data;return this}};
 await check({method:"POST",headers:{host:"yasno-2.vercel.app"},body},response);
 return response;
}
test("shared local rules recover punctuation and spelling from screenshot",()=>{
 const found=Shared.suggest(example);
 const codes=found.map(x=>x.ruleId);
 assert.deepEqual(codes,["MEETING_PERIOD","ASK_COMMA","ASK_ALL","ASK_QUESTION","STILL_ALL","EMAIL_PERIOD"]);
 assert.equal(Shared.apply(example,found),expected);
});
test("ordinary editor uses local corrections even when LanguageTool answers no matches",async()=>{
 const previous=global.fetch;
 global.fetch=async()=>({ok:true,json:async()=>({matches:[]})});
 try{
  const r=await invoke({text:example,businessMode:false,deepCheck:true});
  assert.equal(r.statusCode,200);
  assert.equal(r.body.complete,true);
  assert.equal(r.body.matches.filter(x=>x.ruleId&&x.ruleId.startsWith("ASK")).length,3);
  assert.equal(compose(example,r.body.matches,false).text,expected);
 }finally{global.fetch=previous}
});
test("ordinary editor still fixes example when LanguageTool is offline",async()=>{
 const previous=global.fetch;
 global.fetch=async()=>{throw Error("offline")};
 try{
  const r=await invoke({text:example,businessMode:true,deepCheck:true});
  assert.equal(r.statusCode,200);
  assert.equal(r.body.complete,false);
  assert.match(r.body.note,/LanguageTool/u);
  assert.equal(compose(example,r.body.matches,false).text,expected);
 }finally{global.fetch=previous}
});
test("business editor proofreads and separates interpretations from the ready text",()=>{
 const source=example;
 const r=polish(source);
 assert.equal(r.text,expected);
 assert.equal(source,example);
 assert.equal(r.changed,true);
 assert.ok(r.notes.some(x=>x.includes("почтой")));
 assert.deepEqual(r.suggestions.map(m=>m.ruleId),["MEETING_TONE","STATUS","EMAIL_TONE"]);
});
test("already correct text is unchanged by common proofreading rules",()=>{
 const a=Shared.suggest(expected);
 assert.deepEqual(a,[]);
 assert.equal(Shared.apply(expected,a),expected);
 assert.deepEqual(Shared.suggest("Подскажите номер заказа. Надеюсь, встреча состоится."),[]);
});
test("do not alter cases where все means plural people",()=>{
 const statement="Все сотрудники в силе и готовы работать.";
 assert.equal(Shared.apply(statement,Shared.suggest(statement)),statement);
});
test("business editor may leave original content when it cannot infer context",()=>{
 const input="Подскажите все в силе";
 const r=polish(input);
 assert.equal(r.text,"Подскажите, всё в силе?");
 assert.ok(!r.text.includes("встреча остаётся"));
});
test("browser script order and PWA cache include shared fallback, no OpenAI",()=>{
 const base=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
 const html=base("index.html"),sw=base("sw.js");
 const p=html.indexOf('src="/proofread-fallback.js"'),b=html.indexOf('src="/business-editor.js"');
 assert.ok(p>0&&b>p);
 assert.match(html,/3\.2 · без ИИ/u);
 assert.match(sw,/yasno-static-v35/u);
 assert.ok(html.indexOf('src="/corrections.js"')<p);
 assert.match(sw,/proofread-fallback\.js/u);
 for(const file of ["api/check.js","business-editor.js","proofread-fallback.js"])
  assert.doesNotMatch(base(file),/api\.openai\.com|OPENAI_API_KEY|aiPunctuation/iu);
});
