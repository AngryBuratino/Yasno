/* Ясно 3.0: только локальные функции, без ИИ и запросов. */
(function(root){"use strict";
const MAX_TEXT=10000;
const words=s=>(String(s||"").match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu)||[]).length;
function stats(s){s=String(s||"");const n=words(s);return{words:n,chars:s.length,minutes:Math.max(1,Math.ceil(n/180)),sentences:(s.match(/[.!?]+(?=\s|$)/g)||[]).length};}
const normalizeWord=s=>String(s||"").trim().toLocaleLowerCase("ru-RU").replace(/ё/g,"е");
function validDictionaryWord(v){v=String(v||"").trim();return v.length>=2&&v.length<=40&&/^[\p{L}\p{N}][\p{L}\p{N}\s._&+№/-]*$/u.test(v);}
function filterDictionary(text,matches,items){
 const dict=new Set((items||[]).map(normalizeWord));
 return (matches||[]).filter(m=>!["spelling","grammar"].includes(m.type)||!dict.has(normalizeWord(String(text||"").slice(m.offset,m.offset+m.length))));
}
const tokenize=s=>String(s||"").match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*|\s+|[^\p{L}\p{N}\s]/gu)||[];
function compact(a){const out=[];for(const x of a){if(!x.text)continue;const y=out[out.length-1];if(y&&y.kind===x.kind)y.text+=x.text;else out.push({...x});}return out;}
function diff(original,updated){
 const a=tokenize(original),b=tokenize(updated),n=a.length,m=b.length;
 if(n*m>90000){
  let p=0,q=0;while(p<n&&p<m&&a[p]===b[p])p++;
  while(q<n-p&&q<m-p&&a[n-q-1]===b[m-q-1])q++;
  return compact([{kind:"same",text:a.slice(0,p).join("")},{kind:"remove",text:a.slice(p,n-q).join("")},{kind:"add",text:b.slice(p,m-q).join("")},{kind:"same",text:a.slice(n-q).join("")}]);
 }
 const t=Array.from({length:n+1},()=>new Uint16Array(m+1));
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)t[i][j]=a[i]===b[j]?t[i+1][j+1]+1:Math.max(t[i+1][j],t[i][j+1]);
 const changes=[];let i=0,j=0;
 while(i<n||j<m){
  if(i<n&&j<m&&a[i]===b[j]){changes.push({kind:"same",text:a[i]});i++;j++;}
  else if(j<m&&(i===n||t[i][j+1]>=t[i+1][j]))changes.push({kind:"add",text:b[j++]});
  else changes.push({kind:"remove",text:a[i++]});
 }
 return compact(changes);
}
function advice(s){
 const out=[];s=String(s||"");
 for(const sentence of s.split(/(?<=[.!?])\s+|\n+/u))if(words(sentence)>=33)out.push({type:"readability",message:"Длинное предложение. Можно разделить на два, чтобы его было проще прочитать."});
 if(/!{3,}/u.test(s))out.push({type:"tone",message:"Три и более восклицательных знака: для рабочего письма лучше спокойный тон."});
 if(/(?<!\p{L})([\p{L}]{3,})\s+\1(?!\p{L})/giu.test(s))out.push({type:"repetition",message:"В тексте может быть случайное повторение слова."});
 return out.slice(0,6);
}
const templates=[
{id:"meeting",title:"Предложить встречу",icon:"📅",body:"Добрый день!\n\nПредлагаю обсудить текущие вопросы на встрече. Напишите, пожалуйста, удобные для вас день и время, а я сверюсь с календарём.\n\nСпасибо!"},
{id:"data",title:"Запросить информацию",icon:"📄",body:"Добрый день!\n\nПришлите, пожалуйста, необходимую информацию по нашему вопросу. Это поможет подготовить следующий этап работы.\n\nСпасибо!"},
{id:"followup",title:"Вежливое напоминание",icon:"🔔",body:"Добрый день!\n\nХотел уточнить, удалось ли посмотреть моё предыдущее сообщение. Буду признателен за обратную связь, когда появится возможность.\n\nСпасибо!"},
{id:"reply",title:"Подтвердить договорённость",icon:"🤝",body:"Добрый день!\n\nПодтверждаю наши договорённости. Со своей стороны подготовлю следующие шаги и вернусь с информацией.\n\nСпасибо!"}
];
function toneVersion(text,tone){
 let s=String(text||"");if(tone==="neutral")return s;
 const changes=tone==="polite"?[
 [/(?<!\p{L})Скиньте(?!\p{L})/gu,"Пришлите"],
 [/(?<!\p{L})скиньте(?!\p{L})/gu,"пришлите"],
 [/жду ответа/giu,"буду признателен за ответ"]
 ]:[
 [/В связи с тем, что/gu,"Поскольку"],
 [/в связи с тем, что/gu,"поскольку"],
 [/в настоящий момент/giu,"сейчас"],
 [/произвести оплату/giu,"оплатить"]
 ];
 for(const [re,replacement] of changes)s=s.replace(re,replacement);
 return s;
}
const api={MAX_TEXT,words,stats,normalizeWord,validDictionaryWord,filterDictionary,diff,advice,templates,toneVersion};
if(typeof module!=="undefined"&&module.exports)module.exports=api;root.YasnoCore=api;
})(typeof window!=="undefined"?window:{});