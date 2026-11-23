/* Ясно 2.2 — собрать исправленный текст без сетевых вызовов. */
(function(root){
  "use strict";
  function overlaps(a,b){
    if(a.length===0&&b.length===0)return a.offset===b.offset;
    if(a.length===0)return a.offset>b.offset&&a.offset<b.offset+b.length;
    if(b.length===0)return b.offset>a.offset&&b.offset<a.offset+a.length;
    return a.offset<b.offset+b.length&&b.offset<a.offset+a.length;
  }
  function compose(text,matches,includeStyle=false){
    const input=String(text||"");
    if(!Array.isArray(matches))return {text:input,applied:0,styleApplied:0};
    const selected=matches.filter(m=>m&&!m.reviewOnly&&(includeStyle||m.type!=="style")&&
      Number.isInteger(m.offset)&&Number.isInteger(m.length)&&m.offset>=0&&m.length>=0&&
      m.offset+m.length<=input.length&&Array.isArray(m.replacements)&&m.replacements.length&&
      typeof m.replacements[0]==="string");
    selected.sort((a,b)=>(a.type==="style")-(b.type==="style")||a.offset-b.offset||b.length-a.length);
    const safe=[];
    for(const m of selected)if(!safe.some(x=>overlaps(x,m)))safe.push(m);
    let output=input;
    for(const m of [...safe].sort((a,b)=>b.offset-a.offset||b.length-a.length))
      output=output.slice(0,m.offset)+m.replacements[0]+output.slice(m.offset+m.length);
    return {text:output,applied:safe.length,styleApplied:safe.filter(m=>m.type==="style").length};
  }
  const api={compose};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.YasnoCorrections=api;
})(typeof window!=="undefined"?window:{});