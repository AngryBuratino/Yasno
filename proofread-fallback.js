/* Ясно 3.2 — общие осторожные правила для браузера и API. Без ИИ. */
(function(root){"use strict";
 const types={spelling:"Орфография",punctuation:"Пунктуация",grammar:"Грамматика",style:"Совет по стилю"};
 function make(offset,length,replacement,type,message,id){
  return {offset,length,replacements:[replacement],type,category:types[type]||"Замечание",message,ruleId:id,source:"local"};
 }
 function suggest(text){
  text=String(text||"");
  const matches=[];
  function add(regex,handler){
   for(const m of text.matchAll(regex)){
    const v=handler(m);
    if(v&&Number.isInteger(v.offset)&&v.offset>=0&&v.offset+v.length<=text.length)matches.push(v);
   }
  }
  // Прямая просьба уточнить, остаются ли договорённости в силе.
  // Ограничиваемся одной типовой конструкцией, чтобы не портить другие вопросы.
  add(/(^|\n)([ \t]*)(Подскажите)([ \t]+)(?=(?:все|всё)[ \t]+в[ \t]+силе(?![А-Яа-яЁё]))/gmiu,
   m=>make(m.index+m[1].length+m[2].length+m[3].length,0,",","punctuation",
      "После «подскажите» перед самостоятельным вопросом нужна запятая.","ASK_COMMA"));
  add(/(^|\n)([ \t]*Подскажите(?:,[ \t]*|[ \t]+))(все)(?=[ \t]+в[ \t]+силе(?![А-Яа-яЁё]))/gmiu,
   m=>make(m.index+m[1].length+m[2].length,m[3].length,
      m[3]==="Все"?"Всё":"всё","spelling","Здесь «всё» означает «все обстоятельства», пишется с «ё».","ASK_ALL"));
  add(/(^|\n)([ \t]*Подскажите,?[ \t]*(?:все|всё)[ \t]+в[ \t]+силе)([ \t]*)([.!?]?)(?=\r?$)/gmiu,
   m=>m[4]==="?"?null:make(m.index+m[1].length+m[2].length+m[3].length,m[4].length,"?","punctuation",
    "Это вопрос: в конце нужен вопросительный знак.","ASK_QUESTION"));
  // «Все так же нужна почта»: «всё» здесь наречное, не множественное «все».
  add(/(^|\n)([ \t]*)(Все|все)(?=[ \t]+так[ \t]+же[ \t]+нужна[ \t]+почта(?![А-Яа-яЁё]))/gmu,
   m=>make(m.index+m[1].length+m[2].length,m[3].length,
    m[3]==="Все"?"Всё":"всё","spelling","В значении «по-прежнему» пишется «всё».","STILL_ALL"));
  // Аккуратно дополняем очевидно незавершённую пунктуацию отдельных строк.
  add(/(^|\n)([ \t]*(?:Создал|Создала|Назначил|Назначила)[^\r\n.!?]{0,120}[ \t]+в[ \t]+\d{1,2}:\d{2})([ \t]*)(?=\r?$)/gmiu,
   m=>make(m.index+m[1].length+m[2].length,0,".","punctuation",
    "Законченное сообщение о времени встречи обычно завершается точкой.","MEETING_PERIOD"));
  add(/(^|\n)([ \t]*(?:Все|Всё|все|всё)[ \t]+так[ \t]+же[ \t]+нужна[ \t]+почта)([ \t]*)(?=\r?$)/gmu,
   m=>make(m.index+m[1].length+m[2].length,0,".","punctuation",
    "В конце законченного предложения нужна точка.","EMAIL_PERIOD"));
  return matches.sort((a,b)=>a.offset-b.offset||b.length-a.length);
 }
 function apply(text,matches){
  const input=String(text||"");
  const ordered=(matches||[]).filter(m=>m&&Number.isInteger(m.offset)&&Number.isInteger(m.length)&&m.offset>=0&&m.length>=0&&m.offset+m.length<=input.length&&Array.isArray(m.replacements)&&typeof m.replacements[0]==="string")
   .sort((a,b)=>a.offset-b.offset||b.length-a.length);
  const safe=[];
  function overlaps(a,b){
   if(a.length===0&&b.length===0)return a.offset===b.offset;
   if(a.length===0)return a.offset>b.offset&&a.offset<b.offset+b.length;
   if(b.length===0)return b.offset>a.offset&&b.offset<a.offset+a.length;
   return a.offset<b.offset+b.length&&b.offset<a.offset+a.length;
  }
  for(const m of ordered)if(!safe.some(other=>overlaps(other,m)))safe.push(m);
  let output=input;
  for(const m of [...safe].sort((a,b)=>b.offset-a.offset||b.length-a.length)){
   const replacement=m.replacements[0];
   output=output.slice(0,m.offset)+replacement+output.slice(m.offset+m.length);
  }
  return output;
 }
 const api={suggest,apply};
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 root.YasnoFallback=api;
})(typeof window!=="undefined"?window:{});