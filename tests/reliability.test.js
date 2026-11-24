const test=require("node:test");
const assert=require("node:assert/strict");
const check=require("../api/check.js");
const {compose}=require("../corrections.js");

const source="👩‍💻 Пришлите пожалуйста ответ.";
const corrected="👩‍💻 Пришлите, пожалуйста, ответ.";
const good={offset:source.indexOf("ответ"),length:5,message:"Проверь формулировку",replacements:[{value:"письмо"}]};
const response=(json)=>({ok:true,json:async()=>json});
async function invoke(text=source,body={}){
 let result,status;
 await check({method:"POST",headers:{},body:{text,individualReview:true,...body}},{
  setHeader(){},status(code){status=code;return this;},json(value){result=value;}
 });
 return {status,...result};
}

for(const [name,provider,reason] of [
 ["429",async()=>({ok:false,status:429,headers:new Headers({"Retry-After":"45"})}),"rate_limited"],
 ["500",async()=>({ok:false,status:500}),"upstream_error"],
 ["503",async()=>({ok:false,status:503}),"upstream_error"],
 ["network",async()=>{throw Error("internal network diagnostic");},"network"],
 ["bad JSON",async()=>({ok:true,json:async()=>{throw SyntaxError("private response");}}),"invalid_response"],
 ["bad schema",async()=>response({matches:null}),"invalid_response"]
]){
 test(name+" returns a limited result while preserving local edits",async t=>{
  const calls=t.mock.method(globalThis,"fetch",provider);
  const result=await invoke();
  assert.equal(result.coverage,"local");
  assert.equal(result.reason,reason);
  assert.equal(result.complete,false);
  assert.equal(result.retryAfter,name==="429"?45:undefined);
  assert.equal(compose(source,result.matches).text,corrected);
  assert.equal(calls.mock.callCount(),1);
  assert.doesNotMatch(result.note,/internal network|private response/);
 });
}

test("the upstream timeout also covers reading the response body",async t=>{
 t.mock.timers.enable({apis:["setTimeout"]});
 let reading;
 const started=new Promise(resolve=>{reading=resolve;});
 t.mock.method(globalThis,"fetch",async(_,{signal})=>({
  ok:true,json(){reading();return new Promise((_,reject)=>signal.addEventListener("abort",()=>reject(signal.reason),{once:true}));}
 }));
 const pending=invoke();
 await started;
 t.mock.timers.tick(6000);
 const result=await pending;
 assert.equal(result.coverage,"local");
 assert.equal(result.reason,"timeout");
 assert.equal(compose(source,result.matches).text,corrected);
});

test("a mixed corrupt response keeps valid entries and marks coverage partial",async t=>{
 t.mock.method(globalThis,"fetch",async()=>response({matches:[null,{...good,offset:1},good,
  {...good,replacements:[{value:null},{value:"отклик"}]}
 ]}));
 const result=await invoke();
 assert.equal(result.coverage,"partial");
 assert.equal(result.reason,"invalid_response");
 assert.equal(result.complete,false);
 const remote=result.matches.filter(m=>m.source==="LanguageTool");
 assert.deepEqual(remote.map(m=>m.replacements),[["письмо"],["отклик"]]);
 assert.ok(remote.every(m=>m.manualOnly));
 assert.equal(compose(source,result.matches,true,true).text,corrected);
});

test("a response with only invalid entries is local rather than empty full coverage",async t=>{
 t.mock.method(globalThis,"fetch",async()=>response({matches:[null,{...good,offset:1}]}));
 const result=await invoke();
 assert.equal(result.coverage,"local");
 assert.equal(result.reason,"invalid_response");
 assert.equal(compose(source,result.matches).text,corrected);
});

test("valid empty and nonempty provider responses both yield full coverage",async t=>{
 for(const matches of [[],[good]]){
  t.mock.method(globalThis,"fetch",async()=>response({matches}));
  const result=await invoke();
  assert.equal(result.coverage,"full");
  assert.equal(result.complete,true);
  assert.equal(result.matches.filter(m=>m.source==="LanguageTool").length,matches.length);
  assert.equal(compose(source,result.matches).text,corrected);
  t.mock.restoreAll();
 }
});

test("invalid input returns an error state without sending it upstream",async t=>{
 const calls=t.mock.method(globalThis,"fetch",async()=>response({matches:[]}));
 for(const input of [" ","а".repeat(10001)]){
  const result=await invoke(input);
  assert.equal(result.status,400);
  assert.equal(result.coverage,"error");
 }
 assert.equal(calls.mock.callCount(),0);
});

test("a large raw request is rejected before an upstream call",async t=>{
 const calls=t.mock.method(globalThis,"fetch",async()=>response({matches:[]}));
 let status;
 await check({method:"POST",headers:{},body:JSON.stringify({text:source,extra:"x".repeat(65536)})},{
  setHeader(){},status(code){status=code;return this;},json(){}
 });
 assert.equal(status,413);
 assert.equal(calls.mock.callCount(),0);
});

test("many external suggestions cannot fill the response ahead of local corrections",async t=>{
 const text="Обычный текст. Пришлите пожалуйста ответ.";
 const candidates=Array.from({length:110},(_,index)=>({offset:0,length:7,replacements:[{value:"Другой "+index}]}));
 t.mock.method(globalThis,"fetch",async()=>response({matches:candidates}));
 const result=await invoke(text);
 assert.equal(result.truncated,true);
 assert.equal(result.matches.length,100);
 assert.equal(compose(text,result.matches).text,"Обычный текст. Пришлите, пожалуйста, ответ.");
});

test("a LanguageTool redirect is not followed with the input text",async t=>{
 const calls=t.mock.method(globalThis,"fetch",async()=>({ok:false,status:307}));
 const result=await invoke();
 assert.equal(result.reason,"upstream_error");
 assert.equal(calls.mock.callCount(),1);
 const [endpoint,options]=calls.mock.calls[0].arguments;
 assert.equal(endpoint,"https://api.languagetool.org/v2/check");
 assert.equal(options.redirect,"manual");
 assert.equal(compose(source,result.matches).text,corrected);
});
