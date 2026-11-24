(function(root){
"use strict";
// Эвристики сложной пунктуации: только узкие проверенные конструкции применяются автоматически.
// Более неоднозначные запятые по-прежнему требуют явного подтверждения.
function reviewSuggestions(text){
 const list=[],used=new Set();
 function mark(offset,id,reason,reliable=false,manualOnly=false){
  if(!Number.isInteger(offset)||offset<0||offset>text.length||used.has(offset))return;
  if(text[offset-1]===","||text[offset]===","||/^[ \t]*,/.test(text.slice(offset)))return;
  used.add(offset);
  list.push({offset,length:0,replacements:[","],type:"punctuation",
    category:"Сложная пунктуация",message:reason,ruleId:id,reviewOnly:!reliable,manualOnly,confidence:reliable?"high":"review",source:"rules"});
 }
 const rules=[
  // Узкий набор глаголов + «когда» с последующим обстоятельством времени.
  // Здесь союз вводит придаточную часть, а не прямой вопрос.
  {re:/(встретиться|созвониться|встретимся|созвонимся|обсудим|напишу|отправлю|поговорим|перезвоню)([ 	]+)(когда)(?=[ 	]+(?:у[ 	]+|все[ 	]+|всё[ 	]+|вы[ 	]+|мы[ 	]+|я[ 	]+|будет[ 	]+|получим[ 	]+|получите[ 	]+|появится[ 	]+|сможем[ 	]+|сможете[ 	]+))/giu,
    at:m=>m.index+m[1].length,id:"SUBORDINATE_WHEN_SAFE",reliable:true,
    reason:"Перед придаточной частью с «когда» нужна запятая."},
  {re:/(думаю|считаю|надеюсь|понимаю|знаю|полагаю|уверен|уверена|уверены|кажется|выяснилось)([ \t]+)(что)(?=[ \t]+([А-Яа-яЁё]+))/giu,
   at:m=>m.index+m[1].length,id:"SUBORDINATE_WHAT",
   skip:m=>/^(?:угодно|попало|ни|бы)$/iu.test(m[4]),
   reliable:m=>/^(?:я|ты|он|она|оно|мы|вы|они)$/iu.test(m[4]),
   reason:"Здесь может начинаться придаточная часть с «что». Проверь разделение грамматических основ."},
  {re:/([А-Яа-яЁё]{2,})([ \t]+)(если|когда|потому[ \t]+что|так[ \t]+как|чтобы|хотя)(?=[ \t]+[А-Яа-яЁё])/giu,
   at:m=>m.index+m[1].length,id:"SUBORDINATE_CONJ",
   skip:m=>/^(?:случай|случае|того|том)$/iu.test(m[1]),
   reason:"Перед союзом может начинаться придаточная часть. Проверь, нужна ли запятая по смыслу."},
  {re:/([А-Яа-яЁё]{2,})([ \t]+)(который|которая|которое|которые|которую|которых|которому|которой)(?=[ \t]+[А-Яа-яЁё])/giu,
   at:m=>m.index+m[1].length,id:"RELATIVE_CLAUSE",
   reason:"Возможно, начинается определительная придаточная часть с «который». Проверь также закрывающую запятую."},
  {re:/(^|[.!?][ \t]+)(К сожалению|К счастью|Кстати|Во-первых|Во-вторых|На мой взгляд|По моему мнению|Таким образом)(?=[ \t]+[А-Яа-яЁё])/gimu,
   at:m=>m.index+m[1].length+m[2].length,id:"INTRODUCTORY",manualOnly:true,
   reason:"Это выражение может быть вводным и отделяться запятой. Проверь его роль в предложении."},
  {re:/(^|[.!?][ \t]+)(Если[ \t]+вам[ \t]+удобно|Если[ \t]+у[ \t]+вас[ \t]+будет[ \t]+время|Если[ \t]+получится|Если[ \t]+вы[ \t]+сможете|Когда[ \t]+получите[ \t]+ответ|Когда[ \t]+закончите[ \t]+работу)(?=[ \t]+[А-Яа-яЁё])/gimu,
   at:m=>m.index+m[1].length+m[2].length,id:"INITIAL_SUBORDINATE",manualOnly:true,
   reason:"Похоже, здесь заканчивается придаточная часть перед главной. Проверь, где проходит граница."}
 ];
 for(const r of rules)for(const m of text.matchAll(r.re)){
  if(r.skip?.(m))continue;
  const reliable=typeof r.reliable==="function"?r.reliable(m):r.reliable===true;
  mark(r.at(m),r.id,r.reason,reliable,r.manualOnly===true||typeof r.reliable==="function"&&!reliable);
 }
 // Два возможных знака обособления причастного оборота.
 const p=/(Отчёт|Отчет|Документ|Документы|Письмо|Материалы)([ \t]+)(подготовленный|подготовленные|отправленный|отправленные|согласованный|согласованные|полученный|полученные)([ \t]+)(вчера|сегодня)([ \t]+)(уже|был|были|готов|готовы)/giu;
 for(const m of text.matchAll(p)){
  const first=m.index+m[1].length;
  const last=m.index+m[1].length+m[2].length+m[3].length+m[4].length+m[5].length;
  mark(first,"PARTICIPLE_START","Вероятно, причастный оборот после существительного: проверь открывающую запятую.");
  mark(last,"PARTICIPLE_END","Вероятно, причастный оборот заканчивается: проверь закрывающую запятую.");
 }
 return list.sort((a,b)=>a.offset-b.offset);
}
const api={reviewSuggestions};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
else root.YasnoAdvanced=api;
})(typeof window!=="undefined"?window:{});
