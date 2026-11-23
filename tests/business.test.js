const test=require("node:test");
const assert=require("node:assert/strict");
const {polish}=require("../business-editor.js");
const {localMatches}=require("../api/check.js");
const {compose}=require("../corrections.js");
const fs=require("node:fs");
const path=require("node:path");

test("business editor fixes representative meeting summary punctuation and brands",()=>{
 const input="2. Дополнительные сервисы – Сервисы такие как robokassa и продамус помогают клиентам совершать оплаты.";
 const result=polish(input);
 assert.match(result.text,/2\. Дополнительные сервисы\n\nСервисы, такие как Robokassa и Prodamus, помогают клиентам проводить платежи\./u);
 assert.ok(result.changes.length>=4);
});
test("bank issuers and explanatory abbreviations",()=>{
 const input="Необходимо проанализировать банки эмитенты т.к. это важно.";
 const result=polish(input);
 assert.equal(result.text,"Необходимо проанализировать банки-эмитенты, так как это важно.");
 assert.ok(result.changed);
});
test("headings work with Latin and Cyrillic names",()=>{
 assert.equal(polish("4. Способы оплаты – SberPay и СБП.").text,"4. Способы оплаты\n\nSberPay и СБП.");
 assert.equal(polish("5. Рассрочка и сервис «долями» - в этом потребности нет т.к. есть своя внутренняя рассрочка.").text,
  "5. Рассрочка и сервис «Долями»\n\nВ этом нет потребности, так как уже действует собственная рассрочка.");
});
test("business editor does not double existing commas or repeat correct brand suggestions",()=>{
 const correct="Сервисы, такие как Robokassa и Prodamus, помогают клиентам, так как это удобно.";
 assert.equal(polish(correct).text,correct);
 assert.deepEqual(localMatches(correct,true).filter(x=>x.ruleId.startsWith("BRAND_")||x.ruleId.startsWith("SUCH_AS")||x.ruleId==="BECAUSE_ABBR"),[]);
});
test("local spelling and grammar rules correct listed recurring mistakes",()=>{
 const t="Дополнительные сервисы такие как robokassa и продамус помогают клиентам. Банки эмитенты т.к. необходим анализ.";
 const matches=localMatches(t,true);
 for(const id of ["SUCH_AS_OPEN","SUCH_AS_CLOSE","BRAND_ROBOKASSA","BRAND_PRODAMUS","BANKS_ISSUERS","BECAUSE_ABBR"])
  assert.ok(matches.some(m=>m.ruleId===id),id);
 const out=compose(t,matches,true).text;
 assert.match(out,/сервисы, такие как Robokassa и Prodamus, помогают/u);
 assert.match(out,/Банки-эмитенты, так как/u);
});
test("notes flag ambiguity, instead of inventing business facts",()=>{
 const text="Проникновение. Необходимо рассчитать и посмотреть данные. Перечень документов согласован из-за частых проверок.";
 const result=polish(text);
 assert.equal(result.notes.length,3);
 assert.match(result.text,/Необходимо провести расчёты и проанализировать данные/u);
});
test("language tools do not send words to external AI",()=>{
 const s=fs.readFileSync(path.join(__dirname,"..","business-editor.js"),"utf8");
 assert.doesNotMatch(s,/api\.openai\.com|https:\/\/|fetch\(/iu);
});
