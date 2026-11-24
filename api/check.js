// The editor never stores request text. Origin only protects browser requests.
const Local=require("../local-check.js");
const {needsConfirmation}=require("../corrections.js");
const {checkLanguageTool}=require("../server/languagetool.js");

const MAX_BODY_BYTES=64*1024;

module.exports=async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 res.setHeader("X-Content-Type-Options","nosniff");
 const fail=(status,error)=>res.status(status).json({coverage:"error",complete:false,error});
 if(req.method!=="POST")return fail(405,"Метод не поддерживается");
 const origin=req.headers.origin;
 if(origin){
  try{
   if(new URL(origin).host!==req.headers.host)return fail(403,"Запрос запрещён");
  }catch{return fail(403,"Некорректный запрос");}
 }
 let body=req.body;
 if(Number(req.headers["content-length"])>MAX_BODY_BYTES||
    typeof body==="string"&&Buffer.byteLength(body)>MAX_BODY_BYTES)return fail(413,"Запрос слишком большой.");
 if(typeof body==="string"){
  try{body=JSON.parse(body)}catch{return fail(400,"Некорректный запрос.")}
 }
 const text=typeof body?.text==="string"?body.text:"";
 if(!text.trim()||text.length>10000)return fail(400,"Введите текст до 10 000 символов.");
 const options={businessMode:body.businessMode===true,deepCheck:body.deepCheck===true};
 const local=Local.candidates(text,options);
 const provider=await checkLanguageTool(text);
 const {coverage,reason,retryAfter}=provider;
 const {matches,truncated}=Local.select(text,[...local,...provider.matches]);
 // An older shell has no per-suggestion confirmation. Its response keeps
 // advisory cards and withholds the replacement values for those cards.
 const all=body.individualReview===true?matches:matches.map(match=>
  needsConfirmation(match)?{...match,replacements:[]}:match);
 const notes=[];
 if(coverage==="local")notes.push("LanguageTool временно недоступен. Выполнена ограниченная локальная проверка.");
 if(coverage==="partial")notes.push("Проверка завершена с ограничениями. Часть подсказок LanguageTool недоступна.");
 if(truncated)notes.push("Показано до 100 подсказок. Для полной выдачи проверьте текст по частям.");
 return res.status(200).json({
  coverage,reason,retryAfter,truncated,matches:all,complete:coverage==="full",
  reviewCount:all.filter(match=>match.reviewOnly).length,
  deepCheck:options.deepCheck,engine:"rules-language-tool",note:notes.join(" "),
  mode:options.businessMode?"business":"standard"
 });
};

module.exports.localMatches=Local.localMatches;
module.exports.mergeMatches=(remote,local,text)=>Local.select(text,[...local,...remote]).matches;
