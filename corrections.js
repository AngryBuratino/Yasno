/* Ясно — проверка диапазонов и применение правок в координатах исходного текста. */
(function(root){
 "use strict";
 const segmenter=new Intl.Segmenter("ru",{granularity:"grapheme"});
 const unpairedSurrogate=/[\uD800-\uDFFF]/u;

 function normalize(text,matches){
  if(!Array.isArray(matches)||!matches.length)return [];
  const boundaries=new Set([text.length]);
  for(const {index} of segmenter.segment(text))boundaries.add(index);
  const valid=[];
  for(const match of matches){
   if(!match||!Number.isInteger(match.offset)||!Number.isInteger(match.length)||
      match.length<0||!boundaries.has(match.offset)||!boundaries.has(match.offset+match.length))continue;
   const original=text.slice(match.offset,match.offset+match.length);
   if(match.original!==undefined&&match.original!==original)continue;
   const variants=Array.isArray(match.replacements)?match.replacements:[];
   const replacements=[...new Set(variants.filter(value=>
    typeof value==="string"&&value!==original&&!unpairedSurrogate.test(value)))];
   valid.push({...match,original,replacements});
  }
  return valid;
 }

 function overlaps(a,b){
  if(a.length===0&&b.length===0)return a.offset===b.offset;
  if(a.length===0)return a.offset>b.offset&&a.offset<b.offset+b.length;
  if(b.length===0)return b.offset>a.offset&&b.offset<a.offset+a.length;
  return a.offset<b.offset+b.length&&b.offset<a.offset+a.length;
 }

 function needsConfirmation(match){
  return Boolean(match.manualOnly||match.source==="LanguageTool");
 }

 function compatible(matches,accepted=[]){
  const selected=[];
  for(const match of matches){
   if(match.replacements.length&&!accepted.some(other=>overlaps(other,match))&&
      !selected.some(other=>overlaps(other,match)))selected.push(match);
  }
  return selected;
 }

 function render(text,edits){
  const parts=[];
  let cursor=0;
  // An insertion at a replacement's start comes before it. At its end it comes after it.
  for(const edit of [...edits].sort((a,b)=>a.offset-b.offset||a.length-b.length)){
   parts.push(text.slice(cursor,edit.offset),edit.replacements[0]);
   cursor=edit.offset+edit.length;
  }
  parts.push(text.slice(cursor));
  return parts.join("");
 }

 function compose(text,matches,includeStyle=false,includeReview=false,accepted=[]){
  const input=String(text||"");
  const confirmed=compatible(normalize(input,accepted));
  const candidates=normalize(input,matches).filter(m=>!needsConfirmation(m)&&
   (includeReview||!m.reviewOnly)&&(includeStyle||m.type!=="style"));
  candidates.sort((a,b)=>Number(Boolean(a.reviewOnly))-Number(Boolean(b.reviewOnly))||
   Number(a.type==="style")-Number(b.type==="style")||a.offset-b.offset||b.length-a.length);
  const pending=compatible(candidates,confirmed);
  return {
   text:render(input,[...confirmed,...pending]),
   applied:pending.length,
   confirmedApplied:confirmed.length,
   styleApplied:pending.filter(m=>m.type==="style").length,
   reviewApplied:pending.filter(m=>m.reviewOnly).length
  };
 }

 function confirm(text,matches,accepted,index,value){
  const [match]=normalize(text,[matches[index]]);
  if(!match||!match.replacements.includes(value))return null;
  const confirmed=compatible(normalize(text,accepted));
  if(confirmed.some(other=>overlaps(other,match)))return null;
  confirmed.push({...match,replacements:[value]});
  // Keep surviving ranges on the original snapshot. A deletion can bring two
  // initially distinct insertion points together without making them conflict.
  return {
   text:render(text,confirmed),
   accepted:confirmed,
   matches:matches.filter((other,i)=>i!==index&&other&&!overlaps(other,match))
  };
 }

 const api={compose,confirm,normalize,needsConfirmation};
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 root.YasnoCorrections=api;
})(typeof window!=="undefined"?window:{});
