const test=require("node:test");
const assert=require("node:assert/strict");
const {compose}=require("../corrections.js");
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
