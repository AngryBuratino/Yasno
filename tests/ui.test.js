const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const C=require("../app-core.js");
const base=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");

test("correctly computes words, symbols and reading time",()=>{
 const x=C.stats("Я думаю, что мы успеем.");
 assert.equal(x.words,5);
 assert.equal(x.chars,"Я думаю, что мы успеем.".length);
 assert.equal(x.minutes,1);
});
test("custom dictionary removes only corresponding spelling/grammar findings",()=>{
 const text="Novikov — сильный бренд";
 const spelling={offset:0,length:7,type:"spelling",ruleId:"typo"};
 const punctuation={offset:0,length:0,type:"punctuation",ruleId:"comma"};
 const filtered=C.filterDictionary(text,[spelling,punctuation],["Novikov"]);
 assert.deepEqual(filtered,[punctuation]);
});
test("dictionary is case insensitive and unifies е and ё",()=>{
 assert.equal(C.normalizeWord("  Ёжик  "),C.normalizeWord("ежик"));
});
test("dictionary rejects script-like and oversized entries",()=>{
 assert.equal(C.validDictionaryWord("<script>alert(1)</script>"),false);
 assert.equal(C.validDictionaryWord("а".repeat(42)),false);
 assert.equal(C.validDictionaryWord("Novikov Group"),true);
});
test("word-level comparison keeps both original and corrected strings",()=>{
 const original="Я думаю что мы сможем встретиться";
 const fixed="Я думаю, что мы сможем встретиться";
 const segments=C.diff(original,fixed);
 assert.equal(segments.filter(x=>x.kind!=="add").map(x=>x.text).join(""),original);
 assert.equal(segments.filter(x=>x.kind!=="remove").map(x=>x.text).join(""),fixed);
 assert.ok(segments.some(x=>x.kind==="add"&&x.text.includes(",")));
});
test("long documents compare without quadratic memory blowup",()=>{
 const original=("Привет, текст! ").repeat(300);
 const changed=original.replace("текст!","письмо!");
 const parts=C.diff(original,changed);
 assert.equal(parts.filter(x=>x.kind!=="add").map(x=>x.text).join(""),original);
 assert.equal(parts.filter(x=>x.kind!=="remove").map(x=>x.text).join(""),changed);
});
test("readability analysis flags long sentences, not normal short messages",()=>{
 assert.equal(C.advice("Добрый день. Напишите удобное время.").length,0);
 assert.ok(C.advice(Array.from({length:37},()=>"слово").join(" ")+".").some(x=>x.type==="readability"));
});
test("business phrasing is deterministic and opt-in",()=>{
 assert.equal(C.toneVersion("Скиньте файл","neutral"),"Скиньте файл");
 assert.equal(C.toneVersion("Скиньте файл","polite"),"Пришлите файл");
 assert.equal(C.toneVersion("Прошу произвести оплату","concise"),"Прошу оплатить");
});
test("template gallery offers working messages with no AI",()=>{
 assert.equal(C.templates.length,4);
 assert.ok(C.templates.every(x=>x.body.length>20&&!x.body.includes("undefined")));
});
test("text length limit stays 10,000 characters",()=>assert.equal(C.MAX_TEXT,10000));
test("all frontend IDs used by app.js exist in HTML",()=>{
 const html=base("index.html"),app=base("app.js");
 const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
 const required=[...app.matchAll(/\$\("([^"]+)"\)/g)].map(m=>m[1]);
 const absent=[...new Set(required)].filter(x=>!ids.has(x));
 assert.deepEqual(absent,[]);
});
test("frontend and server contain no OpenAI API integration",()=>{
 const files=["index.html","app.js","app-core.js","api/check.js","corrections.js"];
 for(const f of files)assert.doesNotMatch(base(f),/api\.openai\.com|OPENAI_API_KEY|aiPunctuation|gpt-4\.1-mini/i,f);
 assert.doesNotMatch(base("index.html"),/aiCheck|ИИ-анализ/);
 assert.equal(fs.existsSync(path.join(__dirname,"..","ai-punctuation.js")),false);
});
test("PWA caches only static shell and excludes API responses",()=>{
 const sw=base("sw.js");
 assert.match(sw,/req\.method!=="GET"/);
 assert.match(sw,/pathname\.startsWith\("\/api\/"\)/);
 assert.doesNotMatch(sw,/yasno:draft|yasno:history/);
});
test("privacy storage requires opt-in for draft and history",()=>{
 const app=base("app.js");
 assert.match(app,/state\.draftOn/);
 assert.match(app,/\$\("saveResult"\)\.onclick/);
 assert.match(app,/state\.history\.unshift/);
 assert.match(app,/onchange=\(\)=>/);
});
