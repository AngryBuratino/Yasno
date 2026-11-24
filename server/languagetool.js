"use strict";
const {normalize}=require("../corrections.js");
const {labels}=require("../local-check.js");

const url="https://api.languagetool.org/v2/check";
const limited=(reason,details={})=>({coverage:"local",reason,matches:[],...details});

function retryDelay(header){
 if(!header)return 30;
 const seconds=/^\d+$/.test(header)?Number(header):Math.ceil((Date.parse(header)-Date.now())/1000);
 return Number.isFinite(seconds)?Math.min(3600,Math.max(1,seconds)):30;
}

function kind(match){
 const rules=[match.rule?.category?.id,match.rule?.issueType,match.rule?.id]
  .filter(value=>typeof value==="string").join(" ").toUpperCase();
 if(/PUNCT|COMMA|COLON|DASH/.test(rules))return "punctuation";
 if(/MISSPELL|SPELL|TYPOGRAPH|CASING|TYPOS/.test(rules))return "spelling";
 if(/STYLE|REDUNDAN|WORDINESS/.test(rules))return "style";
 return "grammar";
}

function decode(text,data){
 if(!Array.isArray(data?.matches))return limited("invalid_response");
 const candidates=[];
 let damaged=false;
 for(const match of data.matches){
  if(!match||!Array.isArray(match.replacements)){
   damaged=true;
   continue;
  }
  const types=match.replacements.map(variant=>variant?.value);
  const replacements=types.filter(value=>typeof value==="string"&&value.length<=120&&!/[\uD800-\uDFFF]/u.test(value));
  damaged ||= replacements.length!==types.length;
  if(types.length&&!replacements.length)continue;
  const type=kind(match);
  candidates.push({
   offset:match.offset,length:match.length,
   message:typeof match.message==="string"?match.message.slice(0,400):"Проверь это место",
   replacements:[...new Set(replacements)].slice(0,4),
   type,category:labels[type],ruleId:typeof match.rule?.id==="string"?match.rule.id:"",
   source:"LanguageTool",manualOnly:true
  });
 }
 const matches=normalize(text,candidates);
 damaged ||= matches.length!==candidates.length;
 if(!damaged)return {coverage:"full",matches};
 return matches.length?{coverage:"partial",reason:"invalid_response",matches}:limited("invalid_response");
}

async function checkLanguageTool(text){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),6000);
 let response;
 try{
  response=await fetch(url,{
   method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
   body:new URLSearchParams({text,language:"ru"}),redirect:"manual",signal:controller.signal
  });
  if(response.status===429)return limited("rate_limited",{retryAfter:retryDelay(response.headers?.get("Retry-After"))});
  if(!response.ok)return limited("upstream_error");
  return decode(text,await response.json());
 }catch{
  return limited(controller.signal.aborted?"timeout":response?"invalid_response":"network");
 }finally{
  clearTimeout(timer);
 }
}

module.exports={checkLanguageTool};
