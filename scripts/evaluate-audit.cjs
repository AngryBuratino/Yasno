// Local evaluation. Run against any checked-out version without network access.
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(process.argv[2]||path.join(__dirname,".."));
const Local=require(path.join(root,"local-check.js"));
const Fix=require(path.join(root,"corrections.js"));
const business=require(path.join(root,"business-editor.js"));
const rows=[];
let category;
for(const raw of fs.readFileSync(path.join(__dirname,"../tests/fixtures/p2-audit.txt"),"utf8").trim().split("\n")){
 if(raw.startsWith("# ")){category=raw.slice(2);continue;}
 const [input,...edits]=raw.trim().replaceAll("\\r","\r").replaceAll("\\n","\n").split("¦");
 if(!input)continue;
 const targets=edits.map(edit=>{
  const manual=edit.startsWith("?");
  const [before,...alternatives]=(manual?edit.slice(1):edit).split("=>");
  const offset=input.indexOf(before);
  if(offset<0||input.indexOf(before,offset+1)>=0||!alternatives.length)throw Error(raw);
  return {before,offset,end:offset+before.length,alternatives,manual};
 }).sort((a,b)=>a.offset-b.offset);
 rows.push({id:rows.length+1,input,category,targets});
}

function evaluate(row){
 const {input,category,targets}=row;
 const editorial=category==="business";
 const draft=editorial?business.polish(input):null;
 const ordinary=Local.select(input,Local.candidates(input,{deepCheck:true})).matches;
 const output=draft?.text??Fix.compose(input,ordinary).text;
 // Evaluate linguistic candidates on input coordinates. Business manual
 // alternatives are emitted on the proposed text and can be aligned by text.
 const initial=draft?.suggestions??ordinary;
 const proposals=initial.filter(m=>m.replacements.length).map(m=>{
  if(!editorial||draft.text===input)return m;
  const original=m.original;
  if(!original)return m;
  const offset=input.indexOf(original);
  return offset>=0&&input.indexOf(original,offset+1)<0?{...m,offset}:m;
 });
 const autoTargets=targets.filter(t=>!t.manual);
 const offered=new Set();
 const anchored=new Set();
 const falseRules=[];
 let usefulManual=0,falseManual=0,falseDetections=0;
 const edit=(text,m,value)=>text.slice(0,m.offset)+value+text.slice(m.offset+m.length);
 for(const m of proposals){
  const manual=editorial||m.reviewOnly||Fix.needsConfirmation(m);
  const located=targets.filter(t=>m.length===0?m.offset>t.offset&&m.offset<=t.end:
   m.offset<t.end&&m.offset+m.length>t.offset);
  const compatible=located.filter(t=>t.alternatives.some(value=>m.replacements.some(r=>
   edit(input,m,r)===edit(input,{offset:t.offset,length:t.before.length},value)
  )));
  if(!located.length)falseDetections++;
  for(const t of located)anchored.add(t);
  for(const t of compatible)offered.add(t);
  if(manual){
   if(compatible.length)usefulManual++;
   else{falseManual++;falseRules.push(m.ruleId);}
  }
 }
 function combinations(subset){
  let options=[{text:input,applied:[]}];
  for(const t of [...autoTargets].reverse()){
   const next=options.flatMap(option=>t.alternatives.map(value=>({
    text:edit(option.text,{offset:t.offset,length:t.before.length},value),
    applied:[...option.applied,t]
   })));
   options=subset?[...options,...next]:next;
  }
  return options;
 }
 const exact=combinations(false).some(option=>option.text===output);
 const accepted=combinations(true).filter(option=>option.text===output);
 const unsafe=output!==input&&!accepted.length;
 for(const option of accepted)for(const target of option.applied)anchored.add(target);
 return {...row,output,exact,unsafe,autoChanged:output!==input,detected:anchored.size,falseDetections,
  usefulManual,falseManual,falseRules,offered:offered.size,autoTargetCount:autoTargets.length};
}

function stats(items){
 const sum=(key)=>items.reduce((n,r)=>n+r[key],0);
 const goals=items.reduce((n,r)=>n+r.targets.length,0);
 const controls=items.filter(r=>!r.targets.length);
 const positives=items.filter(r=>r.autoTargetCount);
 const detected=sum("detected"),fp=sum("falseDetections");
 const changed=items.filter(r=>r.autoChanged);
 return {total:items.length,targets:goals,detected,missed:goals-detected,
  precision:detected+fp?detected/(detected+fp):null,recall:goals?detected/goals:null,
  falseDetections:fp,correctManual:sum("usefulManual"),falseManual:sum("falseManual"),
  exact:items.filter(r=>r.exact).length,correctedTexts:positives.filter(r=>r.exact).length,positiveTexts:positives.length,
  autoChanged:changed.length,falseAutomatic:changed.filter(r=>r.unsafe).length,
  autoPrecision:changed.length?changed.filter(r=>!r.unsafe).length/changed.length:null,
  controls:controls.length,controlsPreserved:controls.filter(r=>r.exact).length};
}
const evaluated=rows.map(evaluate);
const summary=Object.fromEntries(["all",...new Set(rows.map(r=>r.category))].map(c=>[
 c,stats(evaluated.filter(r=>c==="all"||r.category===c))
]));
console.log(JSON.stringify({summary,rows:evaluated},null,2));
