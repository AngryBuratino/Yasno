const test=require("node:test");
const assert=require("node:assert/strict");
const Local=require("../local-check.js");
const Fix=require("../corrections.js");
const Business=require("../business-editor.js");

const get=(text)=>Local.select(text,Local.candidates(text,{deepCheck:true})).matches;
const apply=(text)=>Fix.compose(text,get(text)).text;

test("recognizes word forms, particles, hyphenation and directional toponyms",()=>{
 for(const [text,expected] of [
  ["Никто незнает ответа.","Никто не знает ответа."],
  ["Я ни могу ответить сегодня.","Я не могу ответить сегодня."],
  ["Пришлите какой нибудь файл.","Пришлите какой-нибудь файл."],
  ["Пожалуйсто отправте счёт.","Пожалуйста, отправьте счёт."],
  ["В понедельник мы едем в москву.","В понедельник мы едем в Москву."],
  ["Нужны копии довереностей.","Нужны копии доверенностей."]
 ])assert.equal(apply(text),expected,text);
});

test("uses valency and observed verb forms without deciding tense or payer",()=>{
 assert.equal(apply("Согласно договора оплата в пятницу. Они отправил счёт."),
  "Согласно договору оплата в пятницу. Они отправили счёт.");
 const text="Мы оплатили за услуги.";
 const matches=get(text);
 assert.equal(Fix.compose(text,matches,true,true).text,text);
 assert.ok(matches.some(m=>m.manualOnly&&m.replacements.includes("услуги")));
 for(const control of ["Вчера мы отправляем документы, а курьер вдруг исчезает.",
  "Мы оплатили за клиента все услуги.","Согласно договору оплата в пятницу."])assert.equal(apply(control),control);
});

test("sentence-level punctuation is limited to verified structures",()=>{
 for(const [text,expected] of [
  ["Если вам удобно пришлите счёт.","Если вам удобно, пришлите счёт."],
  ["Мы перенесли встречу потому что заболел докладчик.","Мы перенесли встречу, потому что заболел докладчик."],
  ["Анна пришлите счёт.","Анна, пришлите счёт."],
  ["Закончив проверку мы отправили письмо.","Закончив проверку, мы отправили письмо."]
 ])assert.equal(apply(text),expected,text);
 for(const control of ["Если вы сможете прийти, позвоните.","Анна пришлёт счёт.",
  "Мы перенесли встречу не потому, что заболел докладчик.","Он прочитал письмо которое ещё готовится."])
  assert.equal(apply(control),control,control);
});

test("corrections preserve UTF-16 offsets, CRLF and literal tokens",()=>{
 const text="👩‍💻\r\nПожалуйсто, не меняйте `пожалуйсто`, «пожалуйсто», #пожалуйсто и https://example.test/пожалуйсто.";
 assert.equal(apply(text),text.replace("Пожалуйсто","Пожалуйста"));
 const [match]=get(text);
 assert.equal(match.offset,"👩‍💻\r\n".length);
 assert.equal(text.slice(match.offset,match.offset+match.length),"Пожалуйсто");
});

test("business mode uses the same proofreader and respects the personal dictionary",()=>{
 const text="Согласно приказа пришлите довереность. Сумма — 20 500 ₽ до 3 мая.";
 assert.equal(Business.polish(text).text,"Согласно приказу пришлите доверенность. Сумма — 20 500 ₽ до 3 мая.");
 assert.equal(Business.polish(text,["довереность"]).text,"Согласно приказу пришлите довереность. Сумма — 20 500 ₽ до 3 мая.");
 const ambiguous=Business.polish("Мы оплатили за доставку.");
 assert.equal(ambiguous.text,"Мы оплатили за доставку.");
 assert.ok(ambiguous.suggestions.some(match=>match.manualOnly&&match.replacements.includes("доставку")));
});
