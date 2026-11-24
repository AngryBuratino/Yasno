const test=require("node:test");
const assert=require("node:assert/strict");
const Local=require("../local-check.js");
const Fix=require("../corrections.js");
const Business=require("../business-editor.js");
const inspect=(text,options={})=>Local.select(text,Local.candidates(text,{deepCheck:true,...options})).matches;

test("exact identifiers and citations remain literal in both modes",()=>{
 for(const text of [
  "ООО Прийдут действует на основании устава.", "Артикул Адресс указан в спецификации.",
  "Реестровая метка Пожалуйсто не меняется.", "Код заявки: Адресс.",
  "Введите «треннинги» дословно.", "Откройте https://example.test/треннинги."
 ]){
  assert.equal(Fix.compose(text,inspect(text,{businessMode:true})).text,text);
  assert.equal(Business.polish(text).text,text);
 }
});

test("the way a payment is divided is not the name of a service",()=>{
 const literal="Сумму делим «долями» по три тысячи рублей.";
 assert.equal(Business.polish(literal).text,literal);
 assert.equal(Fix.compose(literal,inspect(literal,{businessMode:true})).text,literal);
 const service="Клиент выбрал сервис «долями» для покупки.";
 const target=service.replace("«долями»","«Долями»");
 assert.equal(Business.polish(service).text,target);
 assert.equal(Fix.compose(service,inspect(service,{businessMode:true})).text,target);
});

test("тоже and самое are independent before an attribute",()=>{
 const control="Мы тоже самое дешёвое предложение изучили.";
 assert.equal(Fix.compose(control,inspect(control)).text,control);
 const input="Выберите тоже самое.";
 assert.equal(Fix.compose(input,inspect(input)).text,"Выберите то же самое.");
});

test("punctuation hints do not split predicates, prepositions or highlighted causes",()=>{
 const controls=[
  "Если вы сможете приехать во вторник, позвоните.",
  "Если вам удобно работать в офисе, позвоните.",
  "Позвоните по номеру, по которому можно связаться с секретарём.",
  "Таким образом можно открыть замок изнутри."
 ];
 for(const text of controls)assert.deepEqual(inspect(text),[],text);
 const cause="Мы остались именно потому что задержался курьер.";
 const matches=inspect(cause);
 assert.equal(Fix.compose(cause,matches,true,true).text,cause);
 assert.deepEqual(matches.map(m=>[m.offset,m.manualOnly]),[[cause.indexOf(" что"),true]]);
});

test("business suggestions respect an explicit paper-mail or call-only context",()=>{
 const text="Всё так же нужна почта. Речь о бумажных письмах. По ставкам этих продуктов я вернусь к вам на этой неделе. Только созвон, без письма.";
 assert.equal(Business.polish(text).text,text);
 assert.deepEqual(Business.polish(text).suggestions.map(m=>m.ruleId),[]);
 assert.ok(Business.polish("Всё так же нужна почта.").suggestions.some(m=>m.ruleId==="EMAIL_TONE"));
 const payment="Мы оплатили за работу коллеги его транспорт.";
 assert.ok(!inspect(payment).some(m=>m.ruleId==="RU_PAY_OBJECT"));
});

test("limited short participle agreement and spelling preserve matching controls",()=>{
 const text="Окна были закрыто до осмотра.";
 const matches=inspect(text);
 assert.equal(Fix.compose(text,matches,true,true).text,text);
 assert.ok(matches.some(m=>m.manualOnly&&m.replacements.includes("закрыты")));
 for(const control of ["Окна были закрыты до осмотра.","В офисе было закрыто до осмотра.",
  "Нужно следующее подготовить документы.","Нужно подготовить следующее письмо."])
  assert.deepEqual(inspect(control),[],control);
 const typo="В письме приложен разщётный листок.";
 assert.equal(Fix.compose(typo,inspect(typo)).text,"В письме приложен расчётный листок.");
});

test("a duplicate remote card is dropped and a competing variant stays manual",()=>{
 const text="Мы подготовил ведомость.";
 const offset=text.indexOf("подготовил");
 const remote={offset,length:"подготовил".length,source:"LanguageTool",replacements:["подготовили"]};
 assert.equal(Local.select(text,[...Local.candidates(text),remote]).matches.length,1);
 const conflict={...remote,replacements:["подготовила"]};
 const candidates=Local.select(text,[...Local.candidates(text),conflict]).matches;
 assert.equal(Fix.compose(text,candidates,true,true).text,"Мы подготовили ведомость.");
 const chosen=Fix.confirm(text,candidates,[],candidates.findIndex(m=>m.source==="LanguageTool"),"подготовила");
 assert.equal(chosen.text,"Мы подготовила ведомость.");
 assert.equal(chosen.matches.length,0);
});

test("protected-span filtering follows range validation for malformed candidates",()=>{
 const text="ООО Прийдут указано в реестре. Мы подготовил акт.";
 const candidates=Local.select(text,[null,{offset:-1,source:"LanguageTool",replacements:["подмена"]},
  ...Local.candidates(text)]).matches;
 assert.equal(Fix.compose(text,candidates).text,"ООО Прийдут указано в реестре. Мы подготовили акт.");
});

test("ordinary company labels and single-quoted values are protected",()=>{
 for(const text of ["Компания Адресс подписала договор.","Введите 'адресс' дословно."]){
  assert.equal(Fix.compose(text,inspect(text)).text,text);
  assert.equal(Business.polish(text).text,text);
 }
});

test("coordinated parts with a shared condition or time keep their punctuation",()=>{
 for(const text of ["Если вы пришлёте акт и я создам заявку, процесс ускорится.",
  "Завтра обсудим проект и я подготовлю справку."])
  assert.equal(Fix.compose(text,inspect(text)).text,text);
 const direct="Пришлите акт и я создам заявку.";
 assert.equal(Fix.compose(direct,inspect(direct)).text,"Пришлите акт, и я создам заявку.");
});
