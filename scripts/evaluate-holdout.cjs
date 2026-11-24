// Evaluate without LanguageTool. Optionally pass a different checkout as argv[2].
const path=require("node:path");
const root=path.resolve(process.argv[2]||path.join(__dirname,".."));
const Local=require(path.join(root,"local-check.js"));
const Fix=require(path.join(root,"corrections.js"));
const corpus=require("../tests/fixtures/p2-holdout.json");
const totals={cases:0,targets:0,detected:0,missed:0,falseDetections:0,correctAuto:0,wrongAuto:0,
 usefulManual:0,falseRecommendations:0,exact:0,controls:0,controlsPreserved:0};
const failures=[];
function describe(row,match){
 const t=row.target;
 const compatible=t&&row.type===match.type&&match.replacements.some(replacement=>
  t.acceptable.some(value=>
   row.input.slice(0,match.offset)+replacement+row.input.slice(match.offset+match.length)===
   row.input.slice(0,t.offset)+value+row.input.slice(t.offset+t.length)
  ));
 if(!t||row.type!==match.type)return {compatible:false,located:false};
 // Appending punctuation to an annotated word is a zero-width insertion at its end.
 const before=row.input.slice(t.offset,t.offset+t.length);
 const insertion=t.acceptable.every(value=>value.startsWith(before));
 const end=t.offset+t.length;
 const located=compatible||(insertion?
  match.offset<=end&&match.offset+match.length>=end:
  match.offset<end&&match.offset+match.length>t.offset);
 return {compatible,located};
}
for(const row of corpus){
 const candidates=Local.select(row.input,Local.candidates(row.input,{deepCheck:true})).matches.filter(m=>m.replacements.length);
 const scored=candidates.map(match=>({match,...describe(row,match)}));
 const output=Fix.compose(row.input,candidates).text;
 const expected=row.target?.policy==="auto"?
  row.target.acceptable.map(value=>row.input.slice(0,row.target.offset)+value+row.input.slice(row.target.offset+row.target.length)):
  [row.input];
 const exact=expected.includes(output);
 const detected=scored.some(x=>x.located);
 totals.cases++;
 if(row.target){
  totals.targets++;
  if(detected)totals.detected++;else totals.missed++;
  if(row.target.policy==="auto"&&exact)totals.correctAuto++;
 }else{
  totals.controls++;
  if(exact)totals.controlsPreserved++;
 }
 if(exact)totals.exact++;
 if(!exact&&output!==row.input)totals.wrongAuto++;
 const falseDetections=new Set(scored.filter(x=>!x.located).map(({match:m})=>m.type+":"+m.offset+":"+m.length));
 totals.falseDetections+=falseDetections.size;
 for(const x of scored){
  if(!x.compatible)totals.falseRecommendations++;
  else if(Fix.needsConfirmation(x.match)||x.match.reviewOnly)totals.usefulManual++;
 }
 if(!exact||scored.some(x=>!x.compatible))failures.push({
  id:row.id,output,missed:!!row.target&&!detected,
  falseRules:scored.filter(x=>!x.compatible).map(x=>x.match.ruleId)
 });
}
const precision=totals.detected/(totals.detected+totals.falseDetections);
const recall=totals.detected/totals.targets;
console.log(JSON.stringify({totals,precision,recall,failures},null,2));
