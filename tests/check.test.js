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
