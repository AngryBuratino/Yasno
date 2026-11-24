/* Local matches shared by the API and offline browser checks. */
(function(root){
"use strict";
const node=typeof module!=="undefined"&&module.exports;
const shared=node?require("./proofread-fallback.js"):root.YasnoFallback;
const advanced=node?require("./advanced-punctuation.js"):root.YasnoAdvanced;
const Fix=node?require("./corrections.js"):root.YasnoCorrections;

const labels={punctuation:"Пунктуация",spelling:"Орфография",grammar:"Грамматика",style:"Совет по стилю"};
const item=(offset,length,replacement,type,message,ruleId)=>({offset,length,message,replacements:[replacement],type,category:labels[type],ruleId});
const manual=match=>({...match,manualOnly:true});
function localMatches(text,businessMode=false){
 const out=[];
 const add=(re,fn)=>{for(const m of text.matchAll(re)){const v=fn(m);if(v)out.push(v)}};
 const swap=(re,repl,type,msg,id)=>add(re,m=>item(m.index,m[0].length,repl(m[0]),type,msg,id));
 swap(/на этой недели/giu,s=>s[0]===s[0].toUpperCase()?"На этой неделе":"на этой неделе","grammar","Правильно: «на этой неделе» (предложный падеж).","LOCAL_WEEK");
 swap(/тоже самое/giu,s=>s[0]===s[0].toUpperCase()?"То же самое":"то же самое","spelling","В выражении «то же самое» частица «же» пишется отдельно.","LOCAL_SAME");
 swap(/удалось[ \t]+познакомится/giu,s=>s.replace(/познакомится/iu,"познакомиться"),"grammar","После «удалось» требуется инфинитив «познакомиться».","LOCAL_MEET");
 swap(/треннинги/giu,s=>s[0]===s[0].toUpperCase()?"Тренинги":"тренинги","spelling","«Тренинги» пишется с одной «н» после «е».","LOCAL_TRAINING");
 swap(/интернет[ \t]+эквайринг[а-яё]*/giu,s=>s.replace(/[ \t]+/,"-"),"spelling","«Интернет-эквайринг» пишется через дефис.","LOCAL_INTERNET");
 swap(/онлайн[ \t]+встреч[а-яё]*/giu,s=>s.replace(/[ \t]+/,"-"),"spelling","«Онлайн-встреча» пишется через дефис.","LOCAL_ONLINE");
 // Правила для распространённых ошибок в деловых итогах.
 swap(/(?<![\p{L}\p{N}])банки[ \t]+эмитенты(?![\p{L}\p{N}])/giu,s=>s.replace(/[ \t]+/,"-"),"spelling","«Банки-эмитенты» пишется через дефис.","BANKS_ISSUERS");
 add(/([А-Яа-яЁё0-9])([ \t]+)(т[ \t]*\.[ \t]*к\.?)(?=[ \t]+[А-Яа-яЁё])/giu,
  m=>item(m.index+m[1].length,m[2].length+m[3].length,", так как","punctuation",
  "Перед придаточной частью с «так как» нужна запятая; в деловом письме лучше писать союз полностью.","BECAUSE_ABBR"));
 swap(/,[ \t]+т[ \t]*\.[ \t]*к\.?(?=[ \t]+[А-Яа-яЁё])/giu,s=>s.replace(/т[ \t]*\.[ \t]*к\.?/iu,"так как"),"grammar","Лучше писать полный союз «так как».","BECAUSE_ALREADY_COMMA");
 const suchAs=/(?<![\p{L}\p{N}])(сервисы|решения|инструменты|платформы|продукты|способы)([ \t]+)такие как([ \t]+)([\p{L}\p{N}-]+[ \t]+и[ \t]+[\p{L}\p{N}-]+)([ \t]+)(?=(?:помогают|позволяют|работают|поддерживают|доступны|используются)(?![\p{L}\p{N}]))/giu;
 add(suchAs,m=>item(m.index+m[1].length,0,",","punctuation","Поставь запятую перед обособленным оборотом «такие как».","SUCH_AS_OPEN"));
 add(suchAs,m=>item(m.index+m[0].length-m[5].length,0,",","punctuation","После перечня примеров нужна закрывающая запятая.","SUCH_AS_CLOSE"));
 const please="«Пожалуйста» — вводное слово, в просьбах обычно выделяется запятыми.";
 add(/([А-Яа-яЁё])([ \t]+)(пожалуйста)([ \t]+)(?=[А-Яа-яЁё])/giu,m=>item(m.index+m[1].length,m[2].length+m[3].length+m[4].length,", пожалуйста, ","punctuation",please,"LOCAL_PLEASE_BOTH"));
 add(/,[ \t]+(пожалуйста)([ \t]+)(?=[А-Яа-яЁё])/giu,m=>item(m.index+m[0].indexOf(m[1]),m[1].length,m[1]+",","punctuation",please,"LOCAL_PLEASE_RIGHT"));
 add(/([А-Яа-яЁё])([ \t]+)(пожалуйста)(?=[ \t]*,)/giu,m=>item(m.index+m[1].length,m[2].length,", ","punctuation",please,"LOCAL_PLEASE_LEFT"));
 add(/(^|[.!?][ \t]+)(Пожалуйста)([ \t]+)(?=[А-Яа-яЁё])/gimu,m=>item(m.index+m[1].length,m[2].length,m[2]+",","punctuation",please,"LOCAL_PLEASE_START"));
 add(/(^|[\n.!?][ \t]*)(Коллеги)([ \t]+)(привет|добрый день)(?=$|[ \t!.,])/gimu,m=>item(m.index+m[1].length+m[2].length,0,",","punctuation","После обращения «коллеги» нужна запятая.","LOCAL_COLLEAGUES"));
 add(/([А-Яа-яЁё])([ \t]+)(а|но)(?=[ \t]+[А-Яа-яЁё])/giu,m=>manual(item(m.index+m[1].length,0,",","punctuation","Если «а» или «но» соединяет части предложения, проверь запятую.","LOCAL_BUT")));
 add(/([А-Яа-яЁё])([ \t]+)(и я[ \t]+(?:создам|отправлю|проверю|посмотрю|назначу|организую|подготовлю|сверюсь))(?=$|[ \t.,!?])/giu,m=>item(m.index+m[1].length,0,",","punctuation","«И» соединяет две части предложения с разными грамматическими основами.","LOCAL_AND_I"));
 add(/(встречи)([ \t]+)(на которых)(?=[ \t]+[А-Яа-яЁё])/giu,m=>item(m.index+m[1].length,0,",","punctuation","Придаточная часть «на которых ...» отделяется запятой.","LOCAL_RELATIVE"));
 if(businessMode){
   add(/(?<![\p{L}])robokassa(?![\p{L}])/giu,m=>m[0]==="Robokassa"?null:item(m.index,m[0].length,"Robokassa","spelling","Написание названия сервиса — Robokassa.","BRAND_ROBOKASSA"));
   add(/(?<![\p{L}])продамус(?![\p{L}])/giu,m=>m[0]==="Prodamus"?null:item(m.index,m[0].length,"Prodamus","spelling","Написание названия сервиса — Prodamus.","BRAND_PRODAMUS"));
   add(/«долями»/giu,m=>m[0]==="«Долями»"?null:item(m.index,m[0].length,"«Долями»","spelling","В названии сервиса «Долями» первая буква прописная.","BRAND_DOLYAMI"));
   add(/почты(?![А-Яа-яЁё])/giu,m=>{
     const before=text.slice(Math.max(0,m.index-90),m.index).split(/[.!?\n]/).pop();
     if(/электронной[ \t]+$/iu.test(before))return null;
     return /(?:пришлите|напишите|отправьте|укажите)/iu.test(before)
       ?item(m.index,m[0].length,"адреса электронной почты","style","В деловом письме «адреса электронной почты» звучит точнее, чем «почты».","BUSINESS_EMAIL"):null;
   });
   swap(/создам встречу/giu,()=> "отправлю приглашение на встречу","style","Если речь о календарном приглашении, можно уточнить: «отправлю приглашение на встречу». Это необязательная рекомендация.","BUSINESS_MEETING");
   swap(/день и время удобное/giu,()=> "удобные для вас день и время","style","Такой порядок слов звучит естественнее в деловом сообщении.","BUSINESS_TIME");
   swap(/посмотрю по календарю/giu,()=> "сверюсь с календарём","style","Краткая нейтральная формулировка для рабочей переписки.","BUSINESS_CALENDAR");
   swap(/скиньте/giu,s=>s[0]===s[0].toUpperCase()?"Пришлите":"пришлите","style","Для делового письма лучше нейтральное «пришлите».","BUSINESS_SEND");
   add(/собрать[ \t]+ОС(?=$|[ \t,.:;!?])/gu,m=>item(m.index+m[0].lastIndexOf("ОС"),2,"обратную связь","style","Если «ОС» означает обратную связь, полная формулировка понятнее.","BUSINESS_FEEDBACK"));
 }
 return [...out.map(match=>match.type==="style"?manual(match):match),...shared.suggest(text)];
}

function candidates(text,{businessMode=false,deepCheck=false}={}){
 const base=localMatches(text,businessMode);
 return deepCheck?[...base,...advanced.reviewSuggestions(text)]:base;
}

function select(text,matches){
 const normalized=Fix.normalize(text,matches);
 function priority(match){
  if(!match.replacements.length)return 4;
  if(match.source==="LanguageTool")return 3;
  if(Fix.needsConfirmation(match))return 2;
  return match.reviewOnly?1:0;
 }
 // Keep local applicable edits ahead of remote suggestions if the result is capped.
 normalized.sort((a,b)=>priority(a)-priority(b)||a.offset-b.offset);
 return {matches:normalized.slice(0,100).sort((a,b)=>a.offset-b.offset),truncated:normalized.length>100};
}

const api={labels,localMatches,candidates,select};
if(node)module.exports=api;
else root.YasnoLocalCheck=api;
})(typeof window!=="undefined"?window:{});
