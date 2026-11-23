// Ясно 3.0 — проверка через LanguageTool и осторожные локальные правила.
// Текст не записывается в базу данных или логи приложения.
const {reviewSuggestions}=require("../advanced-punctuation.js");
const labels={punctuation:"Пунктуация",spelling:"Орфография",grammar:"Грамматика",style:"Совет по стилю"};
const item=(offset,length,replacement,type,message,ruleId)=>({offset,length,message,replacements:[replacement],type,category:labels[type],ruleId});
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
 const please="«Пожалуйста» — вводное слово, в просьбах обычно выделяется запятыми.";
 add(/([А-Яа-яЁё])([ \t]+)(пожалуйста)([ \t]+)(?=[А-Яа-яЁё])/giu,m=>item(m.index+m[1].length,m[2].length+m[3].length+m[4].length,", пожалуйста, ","punctuation",please,"LOCAL_PLEASE_BOTH"));
 add(/,[ \t]+(пожалуйста)([ \t]+)(?=[А-Яа-яЁё])/giu,m=>item(m.index+m[0].indexOf(m[1]),m[1].length,m[1]+",","punctuation",please,"LOCAL_PLEASE_RIGHT"));
 add(/([А-Яа-яЁё])([ \t]+)(пожалуйста)(?=[ \t]*,)/giu,m=>item(m.index+m[1].length,m[2].length,", ","punctuation",please,"LOCAL_PLEASE_LEFT"));
 add(/(^|[.!?][ \t]+)(Пожалуйста)([ \t]+)(?=[А-Яа-яЁё])/gimu,m=>item(m.index+m[1].length,m[2].length,m[2]+",","punctuation",please,"LOCAL_PLEASE_START"));
 add(/(^|[\n.!?][ \t]*)(Коллеги)([ \t]+)(привет|добрый день)(?=$|[ \t!.,])/gimu,m=>item(m.index+m[1].length+m[2].length,0,",","punctuation","После обращения «коллеги» нужна запятая.","LOCAL_COLLEAGUES"));
 add(/([А-Яа-яЁё])([ \t]+)(а|но)(?=[ \t]+[А-Яа-яЁё])/giu,m=>item(m.index+m[1].length,0,",","punctuation","Перед противительным союзом «а» или «но» обычно ставится запятая.","LOCAL_BUT"));
 add(/([А-Яа-яЁё])([ \t]+)(и я[ \t]+(?:создам|отправлю|проверю|посмотрю|назначу|организую|подготовлю|сверюсь))(?=$|[ \t.,!?])/giu,m=>item(m.index+m[1].length,0,",","punctuation","«И» соединяет две части предложения с разными грамматическими основами.","LOCAL_AND_I"));
 add(/(встречи)([ \t]+)(на которых)(?=[ \t]+[А-Яа-яЁё])/giu,m=>item(m.index+m[1].length,0,",","punctuation","Придаточная часть «на которых ...» отделяется запятой.","LOCAL_RELATIVE"));
 if(businessMode){
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
 return out;
}
function kind(m){
 const s=((m.rule?.category?.id||"")+" "+(m.rule?.issueType||"")+" "+(m.rule?.id||"")).toUpperCase();
 if(/PUNCT|COMMA|COLON|DASH/.test(s))return "punctuation";
 if(/MISSPELL|SPELL|TYPOGRAPH|CASING|TYPOS/.test(s))return "spelling";
 if(/STYLE|REDUNDAN|WORDINESS/.test(s))return "style";
 return "grammar";
}
function collision(a,b){
 if(a.length===0&&b.length===0)return a.offset===b.offset;
 if(a.length===0)return a.offset>b.offset&&a.offset<b.offset+b.length;
 if(b.length===0)return b.offset>a.offset&&b.offset<a.offset+a.length;
 return a.offset<b.offset+b.length&&b.offset<a.offset+a.length;
}
function merge(remote,local,text){
 const valid=m=>Number.isInteger(m.offset)&&Number.isInteger(m.length)&&m.offset>=0&&m.length>=0&&m.offset+m.length<=text.length;
 const accepted=[];
 const incoming=[...remote,...local.filter(x=>x.type!=="style"),...local.filter(x=>x.type==="style")];
 for(const m of incoming.filter(valid)){
   if(!accepted.some(x=>collision(x,m)))accepted.push(m);
 }
 return accepted.sort((a,b)=>a.offset-b.offset).slice(0,100);
}
module.exports=async function handler(req,res){
 res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="POST")return res.status(405).json({error:"Метод не поддерживается"});
 const origin=req.headers.origin;
 if(origin){try{if(new URL(origin).host!==req.headers.host)return res.status(403).json({error:"Запрос запрещён"});}
 catch{return res.status(403).json({error:"Некорректный запрос"});}}
 let body=req.body;
 if(typeof body==="string"){try{body=JSON.parse(body)}catch{body={}}}
 const text=typeof body?.text==="string"?body.text:"";
 if(!text.trim()||text.length>10000)return res.status(400).json({error:"Введите текст до 10 000 символов."});
 const businessMode=body?.businessMode===true;
 const deepCheck=body?.deepCheck===true;
 async function checkLT(){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),6000);
  try{
   const result=await fetch("https://api.languagetool.org/v2/check",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({text,language:"ru"}),signal:controller.signal
   });
   if(!result.ok)throw Error("LanguageTool "+result.status);
   const data=await result.json();
   const matches=(Array.isArray(data.matches)?data.matches:[]).map(m=>{
    const type=kind(m);
    return {offset:m.offset,length:m.length,message:String(m.message||"Проверь это место").slice(0,400),
      replacements:(Array.isArray(m.replacements)?m.replacements:[]).slice(0,4).map(x=>String(x.value??"").slice(0,120)),
      type,category:labels[type],ruleId:String(m.rule?.id||""),source:"LanguageTool"};
   });
   return {complete:true,matches};
  }catch{return {complete:false,matches:[]};}
  finally{clearTimeout(timer);}
 }
 const lt=await checkLT();
 const base=localMatches(text,businessMode);
 const advanced=deepCheck?reviewSuggestions(text):[];
 const all=merge(lt.matches,[...base,...advanced],text);
 const reviewCount=all.filter(x=>x.reviewOnly).length;
 const notes=[];
 if(!lt.complete)notes.push("LanguageTool временно недоступен. Проверка ограничена локальными правилами.");
 return res.status(200).json({
   matches:all,complete:lt.complete,reviewCount,deepCheck,engine:"rules-language-tool",
   note:notes.join(" "),mode:businessMode?"business":"standard"
 });
};
module.exports.localMatches=localMatches;
module.exports.mergeMatches=merge;
