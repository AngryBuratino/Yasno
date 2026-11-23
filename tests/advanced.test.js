const test=require("node:test");
const assert=require("node:assert/strict");
const {reviewSuggestions}=require("../advanced-punctuation.js");
const {compose}=require("../corrections.js");
test("Detect subordinate boundaries with appropriate confidence",()=>{
 const samples=[
  ["Я думаю что мы успеем","SUBORDINATE_WHAT"],
  ["Напишу когда получу ответ","SUBORDINATE_CONJ"],
  ["Если вам удобно давайте обсудим","INITIAL_SUBORDINATE"],
  ["Письмо которое обсуждали вчера","RELATIVE_CLAUSE"],
  ["К сожалению мы не успеваем","INTRODUCTORY"]
 ];
 for(const [s,id] of samples){
  const findings=reviewSuggestions(s);
  assert.ok(findings.some(x=>x.ruleId===id),s);
  const expectedReview=!["SUBORDINATE_WHAT","SUBORDINATE_WHEN_SAFE"].includes(id);
  assert.ok(findings.find(x=>x.ruleId===id).reviewOnly===expectedReview,s);
 }
});
test("Possible participial phrase has two manual comma tips",()=>{
 const matches=reviewSuggestions("Отчёт подготовленный вчера уже готов");
 assert.ok(matches.some(m=>m.ruleId==="PARTICIPLE_START"));
 assert.ok(matches.some(m=>m.ruleId==="PARTICIPLE_END"));
});
test("Do not flag correctly punctuated sentences",()=>{
 const examples=[
  "Я думаю, что мы успеем",
  "Если вам удобно, давайте созвонимся",
  "К сожалению, мы не успеваем",
  "Письмо, которое мы обсуждали, готово"
 ];
 for(const s of examples)assert.equal(reviewSuggestions(s).length,0,s);
});
test("Manual review suggestions require explicit opt-in",()=>{
 const s="Письмо которое обсуждали вчера готово",suggestions=reviewSuggestions(s);
 assert.ok(suggestions.some(m=>m.reviewOnly));
 assert.equal(compose(s,suggestions,false).text,s);
 assert.equal(compose(s,suggestions,true).text,s);
 assert.equal(compose(s,suggestions,false,true).text,"Письмо, которое обсуждали вчера готово");
});
test("Screenshot regression: both commas go into corrected text",()=>{
 const s="Я думаю что мы сможем встретиться когда у всех будет время";
 const suggestions=reviewSuggestions(s);
 assert.equal(suggestions.filter(m=>!m.reviewOnly).length,2);
 assert.equal(suggestions.filter(m=>m.reviewOnly).length,0);
 assert.equal(compose(s,suggestions,false).text,
  "Я думаю, что мы сможем встретиться, когда у всех будет время");
});
test("Other potentially ambiguous cases remain manual review",()=>{
 const s="Мы обсудим всё когда получите ответ";
 const suggestions=reviewSuggestions(s);
 assert.ok(suggestions.length>0);
 assert.ok(suggestions.every(m=>m.reviewOnly),s);
 assert.equal(compose(s,suggestions,false).text,s);
});
test("No large-scale analysis required for complex punctuation fallback",()=>{
 const original="Письмо которое обсуждали вчера готово";
 const findings=reviewSuggestions(original);
 assert.ok(findings.some(m=>m.reviewOnly));
 assert.equal(compose(original,findings,false).text,original);
});
