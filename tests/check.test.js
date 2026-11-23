const {test} = require("node:test");
const assert = require("node:assert/strict");
const handler = require("../api/check.js");

async function invoke(method, body, origin = "https://yasno.test") {
  const headers = {};
  const res = {
    setHeader(k,v) {headers[k] = v;},
    status(code) {this.statusCode = code;return this;},
    json(obj) {this.body = obj;return this;}
  };
  await handler({method,body,headers:{host:"yasno.test",origin}},res);
  return res;
}
test("fallback: finds comma around please", async () => {
  const old = global.fetch;
  global.fetch = async () => {throw new Error("offline")};
  try {
    const text = "Пришлите пожалуйста почты и я создам встречу";
    const res = await invoke("POST",{text});
    assert.equal(res.statusCode,200);
    assert.equal(res.body.complete,false);
    assert.ok(res.body.matches.some(m => m.type === "punctuation" && m.replacements[0].includes(", пожалуйста,")));
  } finally {global.fetch=old;}
});
test("fallback: grammar and spelling rules", async () => {
  const old = global.fetch;
  global.fetch = async () => {throw new Error("offline")};
  try {
    const res = await invoke("POST",{text:"На этой недели прошел треннинги."});
    assert.deepEqual(res.body.matches.map(m=>m.replacements[0]),["На этой неделе","тренинги"]);
  } finally {global.fetch=old;}
});
test("rejects oversized and wrong-origin requests", async () => {
  const large = await invoke("POST",{text:"а".repeat(10001)});
  assert.equal(large.statusCode,400);
  const foreign = await invoke("POST",{text:"Привет"},"https://evil.test");
  assert.equal(foreign.statusCode,403);
});
test("successful provider response", async () => {
  const old = global.fetch;
  global.fetch = async () => ({ok:true,json:async()=>({matches:[]})});
  try {
    const res = await invoke("POST",{text:"Привет, мир!"});
    assert.equal(res.statusCode,200);
    assert.equal(res.body.complete,true);
    assert.deepEqual(res.body.matches,[]);
  } finally {global.fetch=old;}
});

test("business mode gives optional style suggestions", async () => {
 const old=global.fetch;global.fetch=async()=>{throw Error("offline")};
 try{
  const text="Пришлите пожалуйста почты и я создам встречу";
  const full=await invoke("POST",{text,businessMode:true});
  const standard=await invoke("POST",{text,businessMode:false});
  for(const id of ["LOCAL_PLEASE_BOTH","LOCAL_AND_I","BUSINESS_EMAIL","BUSINESS_MEETING"]) assert.ok(full.body.matches.some(m=>m.ruleId===id),id);
  assert.ok(!standard.body.matches.some(m=>m.type==="style"));
 }finally{global.fetch=old}
});
test("correct please and business email has no local findings",async()=>{
 const old=global.fetch;global.fetch=async()=>{throw Error("offline")};
 try{
  const r=await invoke("POST",{text:"Пришлите, пожалуйста, адреса электронной почты.",businessMode:true});
  assert.equal(r.statusCode,200);assert.deepEqual(r.body.matches,[]);
 }finally{global.fetch=old}
});
test("missing comma on either side of please",()=>{
 const local=require("../api/check.js").localMatches;
 for(const [s,id] of [["Пришлите, пожалуйста адреса","LOCAL_PLEASE_RIGHT"],["Пришлите пожалуйста, адреса","LOCAL_PLEASE_LEFT"],["Пожалуйста пришлите адреса","LOCAL_PLEASE_START"]]) assert.ok(local(s).some(x=>x.ruleId===id),s);
});
test("relative clauses and conjunctions",()=>{
 const local=require("../api/check.js").localMatches;
 assert.ok(local("Провёл встречи на которых обсудили проект").some(x=>x.ruleId==="LOCAL_RELATIVE"));
 assert.ok(local("Напишите время а я посмотрю").some(x=>x.ruleId==="LOCAL_BUT"));
});

test("local rules for two additional frequent errors",()=>{
 const local=require("../api/check.js").localMatches;
 assert.ok(local("Это тоже самое").some(x=>x.ruleId==="LOCAL_SAME"));
 assert.ok(local("Удалось познакомится с коллегами").some(x=>x.ruleId==="LOCAL_MEET"));
});
