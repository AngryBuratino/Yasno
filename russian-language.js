/* Compact, author-maintained Russian forms and context rules. Offsets are UTF-16. */
(function(root){
"use strict";

const spelling=new Map(Object.entries({
 пожалуйсто:"пожалуйста", пожалуста:"пожалуйста",
 адресс:"адрес", адрессу:"адресу", подьезд:"подъезд", подьезде:"подъезде",
 сдесь:"здесь", прекрастно:"прекрасно", расщёт:"расчёт", разщёт:"расчёт",
 расчот:"расчёт", счот:"счёт", сообшение:"сообщение", сообшения:"сообщения",
 свительство:"свидетельство", свительства:"свидетельства", прилжение:"приложение",
 прилжения:"приложения", допалнительно:"дополнительно", расчотный:"расчётный",
 ращёту:"расчёту", безплатно:"бесплатно", всётаки:"всё-таки"
}));

// Each entry records attested endings of one paradigm rather than replacing
// character sequences inside unknown words.
function family(misspelled,correct,endings){
 for(const ending of endings)spelling.set(misspelled+ending,correct+ending);
}
family("прийд","прид",["у","ёшь","ешь","ёт","ет","ём","ем","ёте","ете","ут"]);
family("здела","сдела",["ть","л","ла","ло","ли","ю","ешь","ет","ем","ете","ют","й","йте","н","на","но","ны"]);
family("камментар","комментар",["ий","ия","ию","ием","ии","иев","иям","иями","иях"]);
family("каментар","комментар",["ий","ия","ию","ием","ии","иев","иям","иями","иях"]);
family("довереност","доверенност",["ь","и","ью","ей","ям","ями","ях"]);
family("опичат","опечат",["ка","ки","ке","ку","кой","ками","ок","ках"]);
family("отсканирован","отсканированн",["ый","ая","ое","ые","ого","ому","ой","ую","ых","ыми"]);
family("допалнительн","дополнительн",["ый","ая","ое","ые","ого","ому","ой","ую","ых","ыми"]);
family("разщётн","расчётн",["ый","ая","ое","ые","ого","ому","ой","ую","ых","ыми"]);
family("ответствен","ответственн",["ый","ая","ое","ые","ого","ому","ой","ую","ых","ыми"]);
for(const [wrong,right] of Object.entries({
 отправте:"отправьте", оставте:"оставьте", поставте:"поставьте", исправте:"исправьте",
 проверте:"проверьте", подготовте:"подготовьте",
 составте:"составьте", подвердить:"подтвердить", подвердите:"подтвердите"
}))spelling.set(wrong,right);

const set=values=>new Set(values.split(" "));
const joinedNegation=set(
 "знаю знаешь знает знаем знаете знают знал знала знали отвечаю отвечаешь отвечает отвечаем отвечаете отвечают " +
 "ответил ответила ответили могу можешь может можем можете могут мог могла могли понимаю понимаешь понимает понимаем понимаете понимают"
);
const ability={
 я:set("могу мог могла"),ты:set("можешь мог могла"),он:set("может мог"),
 она:set("может могла"),мы:set("можем могли"),вы:set("можете могли"),они:set("могут могли")
};
const indefinite=set("кто кого кому кем ком что чего чему чем какой какая какое какие какого какой каких какую каким какими где куда откуда когда как сколько");
const cities=set("москву москвы москве самару самары самаре казань казани новосибирск новосибирска новосибирске");
const placePrepositions=set("в из до под по к");
const governed=set("согласно вопреки благодаря");
const dative=new Map(Object.entries({
 договора:"договору", договоров:"договорам", приказа:"приказу", приказов:"приказам",
 графика:"графику", графиков:"графикам", регламента:"регламенту", регламентов:"регламентам",
 плана:"плану", планов:"планам", прогноза:"прогнозу", прогнозов:"прогнозам",
 распоряжения:"распоряжению", соглашения:"соглашению", заявления:"заявлению",
 протокола:"протоколу", акта:"акту", поддержки:"поддержке",
 адреса:"адресу", маршрута:"маршруту", документа:"документу"
}));
const pluralSubject=set("мы вы они");
const pastSingular=set("отправил отправила подписал подписала получил получила согласовал согласовала утвердил утвердила подготовил подготовила направил направила перечислил перечислила приложил приложила");
const pay=set("оплачу оплатишь оплатит оплатим оплатите оплатят оплатил оплатила оплатило оплатили оплатить");
const payObject=set("услугу услуги доставку работы работу проезд подписку участие обучение проживание питание сбор комиссию");
const payContinuation=set("до после по при через в на из курьеру картой наличными переводом");
const closedSubjects=set("окна двери ворота шлюзы помещения");
const shortPlural=new Map(Object.entries({закрыто:"закрыты",открыто:"открыты",опечатано:"опечатаны"}));
const imperatives=set("пришли пришлите отправь отправьте перезвони перезвоните позвони позвоните приходи приходите напиши напишите сообщи сообщите подтверди подтвердите ответь ответьте передай передайте подожди подождите дай дайте");
const firstNames=set("анна ольга мария ирина елена наталья татьяна саша маша миша сергей алексей иван дмитрий егор павел");
const causes=set("заболел заболела заболели опоздал опоздала опоздали задержался задержалась задержались отменили отменил перенесли забыли забыл сломался сломалась закончился закончилась отказал отказала произошёл произошла отключили");
const causalPredicates=set("перенесли перенёс перенесла задержались задержался задержалась отложили отложил отменили отменил поехал поехала поехали пришёл пришла пришли опоздали опоздал опоздала ушёл ушла ушли вернулись остались остался остановились остановился");
const gerunds=set("закончив завершив проверив получив изучив прочитав подписав согласовав");
const gerundObjects=set("проверку работу документы документ письмо уведомление ответ отчёт отчет акт заявку материалы договор");
const conditionVerb=set("сможешь сможете получится");
const splitCause=set("не именно только лишь просто исключительно отчасти");
const subject=set("я ты он она мы вы они");
const infinitives=set("соблюсти сохранить согласовать проверить подтвердить оплатить отправить");
const adjectiveForms=[
 ["новый","новая","новое","новые"],["готовый","готовая","готовое","готовые"],
 ["срочный","срочная","срочное","срочные"]
];
const nounGender=new Map(Object.entries({отчёт:0,отчет:0,договор:0,заявка:1,смета:1,письмо:2,решение:2,документы:3}));

const types={spelling:"Орфография",grammar:"Грамматика",punctuation:"Пунктуация"};
const tokenPattern=/(https?:\/\/[^\s<>"«»]+|www\.[^\s<>"«»]+|[\p{L}\p{N}.+_-]{1,64}@[\p{L}\p{N}.+-]{1,253}|«[^»\r\n]*(?:»|(?=[\r\n]|$))|“[^”\r\n]*(?:”|(?=[\r\n]|$))|"[^"\r\n]*(?:"|(?=[\r\n]|$))|\x60[^\x60\r\n]*(?:\x60|(?=[\r\n]|$))|(?<![\p{L}\p{N}])\x27[^\x27\r\n]*(?:\x27|(?=[\r\n]|$))|[#@][\p{L}\p{M}\p{N}_]+)|[\p{L}\p{M}\p{N}_]+(?:[-‑][\p{L}\p{M}\p{N}_]+)*|[^\s]/gu;

// A marked field or legal form can introduce a literal name without quotes.
const identifierPattern=/(?<![\p{L}\p{N}_])(?:ООО|ИП|ПАО|ОАО|ЗАО|АО|компания|организация|бренд|артикул|идентификатор|логин|псевдоним|метка|код(?:[ \t]+(?:заявки|платежа))?)(?:[ \t]+|[ \t]*:[ \t]*)([\p{L}\p{M}\p{N}_-]+)/giu;
const nameTail=/^[ \t]+[А-ЯЁ][\p{L}\p{M}\p{N}_-]*/u;
function editable(text,matches){
 if(!matches.length)return matches;
 const ranges=[];
 for(const m of text.matchAll(tokenPattern))if(m[1])ranges.push([m.index,m.index+m[0].length]);
 for(const m of text.matchAll(identifierPattern)){
  let end=m.index+m[0].length;
  let extra;
  while((extra=nameTail.exec(text.slice(end))))end+=extra[0].length;
  ranges.push([m.index+m[0].length-m[1].length,end]);
 }
 return matches.filter(match=>{
  if(match.source!=="LanguageTool"&&["DOLYAMI","BRAND_DOLYAMI"].includes(match.ruleId)&&
     /(?<![\p{L}\p{N}])сервис(?:а|ом|у)?[ \t]+$/iu.test(text.slice(Math.max(0,match.offset-25),match.offset)))return true;
  return !ranges.some(([start,end])=>{
   if(match.offset>=end||match.offset+match.length<=start)return false;
   // The meeting heading formatter may carry a literal through verbatim.
   if(match.source!=="LanguageTool"&&match.ruleId==="HEADINGS"&&start>=match.offset&&end<=match.offset+match.length){
    const relative=start-match.offset;
    return match.replacements[0]?.slice(relative,relative+end-start)!==text.slice(start,end);
   }
   return true;
  });
 });
}

function tokenize(text){
 return Array.from(text.matchAll(tokenPattern),match=>{
  const raw=match[0];
  const word=/^[а-яё]+$/iu.test(raw);
  return {raw,key:word?raw.toLowerCase():"",offset:match.index,end:match.index+raw.length};
 });
}

function casing(replacement,original){
 if(original===original.toUpperCase())return replacement.toUpperCase();
 if(/^[А-ЯЁ][а-яё]+$/u.test(original))return replacement[0].toUpperCase()+replacement.slice(1);
 return replacement;
}

function suggest(text){
 const tokens=tokenize(text),matches=[];
 const key=index=>tokens[index]?.key||"";
 const adjacent=index=>index>0&&index<tokens.length&&/^[ \t]+$/.test(text.slice(tokens[index-1].end,tokens[index].offset));
 const sentenceStart=index=>index===0||/^[.!?…]$/u.test(tokens[index-1].raw)||
  /[\r\n]/.test(text.slice(tokens[index-1].end,tokens[index].offset));
 function add(offset,length,replacement,type,id,message,manualOnly=false){
  matches.push({offset,length,replacements:[replacement],type,category:types[type],message,ruleId:id,source:"local",manualOnly});
 }
 function replace(token,replacement,type,id,message,manualOnly=false){
  add(token.offset,token.raw.length,casing(replacement,token.raw),type,id,message,manualOnly);
 }
 function comma(token,id,message){
  add(token.end,0,",","punctuation",id,message);
 }
 for(const [i,token] of tokens.entries()){
  const word=token.key;
  if(!word)continue;
  const previous=adjacent(i)?key(i-1):"";
  const next=adjacent(i+1)?key(i+1):"";
  const typo=spelling.get(word);
  if(typo)replace(token,typo,"spelling","RU_LEXICON","Словарная форма слова.");
  if(word.startsWith("не")&&joinedNegation.has(word.slice(2)))
   replace(token,"не "+word.slice(2),"spelling","RU_NEGATION","Отрицание с глаголом пишется раздельно.");
  if(word==="ни"&&Object.hasOwn(ability,previous)&&ability[previous].has(next))
   replace(token,"не","spelling","RU_NEGATION","В этом отрицательном сказуемом нужна частица «не».");
  if(word==="нибудь"&&indefinite.has(previous)){
   const first=tokens[i-1];
   add(first.offset,token.end-first.offset,first.raw+"-"+token.raw,"spelling","RU_HYPHEN","Частица «-нибудь» пишется через дефис.");
  }
  if(token.raw===word&&cities.has(word)&&placePrepositions.has(previous))
   replace(token,word[0].toUpperCase()+word.slice(1),"spelling","RU_TOPONYM","Название города пишется с прописной буквы.");
  if(governed.has(previous)&&dative.has(word)&&dative.get(word)!==word)
   replace(token,dative.get(word),"grammar","RU_DATIVE","После этого предлога нужен дательный падеж.");
  if(pluralSubject.has(previous)&&pastSingular.has(word)){
   const stem=word.endsWith("ла")?word.slice(0,-1):word;
   replace(token,stem+"и","grammar","RU_PAST_PLURAL","Согласуй сказуемое с подлежащим во множественном числе.");
  }
  if(word==="за"&&pay.has(previous)&&payObject.has(next)&&(!adjacent(i+2)||payContinuation.has(key(i+2))))
   add(token.offset,tokens[i+1].end-token.offset,tokens[i+1].raw,"grammar","RU_PAY_OBJECT","Если речь об объекте оплаты, «оплатить» употребляется без «за».",true);
  if(previous==="были"&&adjacent(i-1)&&closedSubjects.has(key(i-2))&&shortPlural.has(word))
   replace(token,shortPlural.get(word),"grammar","RU_SHORT_PLURAL","Проверь число краткого причастия при подлежащем во множественном числе.",true);
  if(nounGender.has(word)&&previous){
   const forms=adjectiveForms.find(group=>group.includes(previous));
   if(forms&&forms[nounGender.get(word)]!==previous)replace(tokens[i-1],forms[nounGender.get(word)],
    "grammar","RU_ADJECTIVE","Проверь согласование прилагательного с существительным.",true);
  }
  if(sentenceStart(i)&&imperatives.has(spelling.get(next)??next)){
   if(firstNames.has(word)&&token.raw!==word)comma(token,"RU_ADDRESS","Выдели обращение запятой.");
   if(typo==="пожалуйста")comma(token,"RU_PLEASE","В просьбе «пожалуйста» выделяется запятой.");
  }
  if(sentenceStart(i)&&word==="если"&&adjacent(i+1)){
   const simple=conditionVerb.has(next)?i+1:
    ((next==="вам"||next==="тебе")&&adjacent(i+2)&&key(i+2)==="удобно"?i+2:-1);
   if(simple>0&&adjacent(simple+1)&&imperatives.has(key(simple+1)))
    comma(tokens[simple],"RU_CONDITION","Отдели придаточное условие от просьбы запятой.");
  }
  if(word==="потому"&&next==="что"&&adjacent(i+2)&&causes.has(key(i+2))){
   // A verb in the immediately preceding clause is required. «Не потому»
   // and constructions with a particle can split the conjunction instead.
   if(!splitCause.has(previous)&&previous){
    for(let j=i-1;j>=Math.max(0,i-4)&&adjacent(j+1)&&key(j);j--){
     if(splitCause.has(key(j)))break;
     if(causalPredicates.has(key(j))){
      comma(tokens[i-1],"RU_CAUSE","Отдели придаточную часть причины запятой.");
      break;
     }
    }
   }
  }
  if(sentenceStart(i)&&gerunds.has(word)&&gerundObjects.has(next)&&adjacent(i+2)&&
     subject.has(key(i+2))&&adjacent(i+3)&&
     (pastSingular.has(key(i+3))||pastSingular.has(key(i+3).replace(/ли$/u,"л"))))
   comma(tokens[i+1],"RU_GERUND","Обособь деепричастный оборот.");
  if(sentenceStart(i)&&word==="главное"&&infinitives.has(next))
   add(token.end,0," —","punctuation","RU_DASH","Рассмотри тире между «главное» и неопределённой формой глагола.",true);
 }
 return matches;
}
const api={suggest,editable};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
else root.YasnoRussian=api;
})(typeof window!=="undefined"?window:{});
