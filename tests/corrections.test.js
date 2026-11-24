const test=require("node:test");
const assert=require("node:assert/strict");
const {compose,confirm}=require("../corrections.js");
test("one-click corrected text and optional professional style",()=>{
 const text="Пришлите пожалуйста почты и я создам встречу";
 const issues=[
  {offset:text.indexOf(" пожалуйста "),length:" пожалуйста ".length,type:"punctuation",replacements:[", пожалуйста, "]},
  {offset:text.indexOf("почты"),length:5,type:"style",replacements:["адреса электронной почты"]},
  {offset:text.indexOf(" и я"),length:0,type:"punctuation",replacements:[","]},
  {offset:text.indexOf("создам встречу"),length:"создам встречу".length,type:"style",replacements:["отправлю приглашение на встречу"]}
 ];
 assert.equal(compose(text,issues,false).text,"Пришлите, пожалуйста, почты, и я создам встречу");
 assert.equal(compose(text,issues,true).text,"Пришлите, пожалуйста, адреса электронной почты, и я отправлю приглашение на встречу");
});
test("avoid duplicate overlapping edits",()=>{
 assert.equal(compose("abcde",[{offset:1,length:2,type:"grammar",replacements:["XY"]},{offset:2,length:2,type:"style",replacements:["Q"]}],true).text,"aXYde");
});
test("ignore invalid offsets and preserve markup as plain text",()=>{
 assert.equal(compose("<b>Text</b>",[{offset:999,length:1,type:"grammar",replacements:["x"]}],false).text,"<b>Text</b>");
});
test("zero-length comma insertions",()=>{
 assert.equal(compose("А я",[{offset:1,length:0,type:"punctuation",replacements:[","]}],false).text,"А, я");
});

test("reviewOnly hints need explicit includeReview flag",()=>{
 const s="Согласуем документ который подготовили вчера";
 const matches=[{offset:s.indexOf(" который"),length:0,type:"punctuation",reviewOnly:true,replacements:[","]}];
 assert.equal(compose(s,matches,false).text,s);
 const confirmed=compose(s,matches,false,true);
 assert.equal(confirmed.text,"Согласуем документ, который подготовили вчера");
 assert.equal(confirmed.reviewApplied,1);
});

test("composition reports confirmed edits separately from pending automatic edits",()=>{
 const text="Привет";
 const matches=[{offset:0,length:0,replacements:["«"],manualOnly:true}];
 const result=confirm(text,matches,[],0,"«");
 const preview=compose(text,result.matches,false,false,result.accepted);
 assert.equal(preview.text,"«Привет");
 assert.equal(preview.applied,0);
 assert.equal(preview.confirmedApplied,1);
});

test("a browser without Intl.Segmenter still applies conservative edits",()=>{
 const {readFileSync}=require("node:fs");
 const {runInNewContext}=require("node:vm");
 const context={Intl:{},window:{}};
 runInNewContext(readFileSync(require.resolve("../corrections.js"),"utf8"),context);
 const {compose}=context.window.YasnoCorrections;
 assert.equal(compose("👩‍💻 е\u0308 Привет",[
  {offset:1,length:1,replacements:["!"]},
  {offset:7,length:1,replacements:["!"]},
  {offset:9,length:6,replacements:["Здравствуйте"]}
 ]).text,"👩‍💻 е\u0308 Здравствуйте");
});
