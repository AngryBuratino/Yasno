/* Ясно 3.2 — общие осторожные правила для браузера и API. Без ИИ. */
(function(root){"use strict";
 const Russian=typeof module!=="undefined"&&module.exports?require("./russian-language.js"):root.YasnoRussian;
 const types={spelling:"Орфография",punctuation:"Пунктуация",grammar:"Грамматика",style:"Совет по стилю"};
 function make(offset,length,replacement,type,message,id){
  return {offset,length,replacements:[replacement],type,category:types[type]||"Замечание",message,ruleId:id,source:"local"};
 }
 function suggest(text){
  text=String(text||"");
  const matches=Russian.suggest(text);
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
 const Fix=typeof module!=="undefined"&&module.exports?require("./corrections.js"):root.YasnoCorrections;
 function apply(text,matches){
  return Fix.compose(text,matches).text;
 }
 const api={suggest,apply};
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 root.YasnoFallback=api;
})(typeof window!=="undefined"?window:{});