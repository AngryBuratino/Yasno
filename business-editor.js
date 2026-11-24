/* Ясно 3.2: объяснимая редактура без генеративного ИИ и скрытых допущений. */
(function(root){"use strict";
 const Shared=typeof module!=="undefined"&&module.exports?require("./proofread-fallback.js"):root.YasnoFallback;
 const Core=typeof module!=="undefined"&&module.exports?require("./app-core.js"):root.YasnoCore;
 const Fix=typeof module!=="undefined"&&module.exports?require("./corrections.js"):root.YasnoCorrections;
 const rules=[
  {id:"MEETING_TONE",label:"Убрана разговорная формулировка о встрече",re:/Создал[ \t]+нам[ \t]+встречу(?=[ \t]+на[ \t]+сегодня[ \t]+в[ \t]+\d{1,2}:\d{2})/gu,to:"Назначил встречу"},
  {id:"EMAIL_TONE",label:"Используй вариант, только если речь об адресе электронной почты",re:/Всё[ \t]+так[ \t]+же[ \t]+нужна[ \t]+почта(?=[.!?\n]|$)/giu,to:"По-прежнему нужен адрес электронной почты"},
  // Раздельные независимые действия лучше читать отдельными предложениями.
  {id:"STEPS",label:"Этапы разделены на предложения",re:/(направлю вам на этой неделе),[ \t]+(необходимо будет)/giu,to:(_m,part)=>part+". Предварительно необходимо будет"},
  {id:"CALC",label:"Проверь, какие расчёты и какой анализ нужно провести",re:/рассчитать[ \t]+и[ \t]+посмотреть/giu,to:"провести расчёты и проанализировать"},
  {id:"FOOTER",label:"Сделана понятнее ссылка на сайт",re:/в[ \t]+подвале[ \t]+у[ \t]+вас/giu,to:"в подвале вашего сайта"},
  {id:"REQUEST",label:"Точнее сформулирован запрос",re:/(?<![\p{L}\p{N}])Есть запрос с при[её]мом платежей(?![\p{L}\p{N}])/giu,to:"Есть запрос на приём платежей"},
  {id:"PLEASE",automatic:true,label:"Нейтральная формулировка",re:/(?<![\p{L}\p{N}])совершать оплаты(?![\p{L}\p{N}])/giu,to:"проводить платежи"},
  {id:"INTRO",label:"Упрощена конструкция",re:/(?<![\p{L}\p{N}])Со своей стороны сможем предоставить такую возможность, но необходимо будет на сайте разместить(?![\p{L}\p{N}])/giu,to:"Со своей стороны сможем предоставить такую возможность. Для этого потребуется разместить на сайте"},
  {id:"SCHEDULE",label:"Используй вариант, только если планируешь отправить информацию о ставках",re:/(?<![\p{L}\p{N}])По ставкам этих продуктов я вернусь к вам на этой неделе(?![\p{L}\p{N}])/giu,to:"Информацию о ставках по этим продуктам направлю вам на этой неделе"},
  {id:"TIME",label:"Деловой стиль",re:/(?<![\p{L}\p{N}])вопросы закрываются вовремя(?![\p{L}\p{N}])/giu,to:"вопросы решаются своевременно"},
  {id:"SMOOTH",automatic:true,label:"Деловой стиль",re:/(?<![\p{L}\p{N}])в этом потребности нет(?![\p{L}\p{N}])/giu,to:match=>/^[А-ЯЁ]/u.test(match)?"В этом нет потребности":"в этом нет потребности"},
  {id:"FORMAL",label:"Убрана разговорная формулировка",re:/(?<![\p{L}\p{N}])я обязательно к вам вернусь(?![\p{L}\p{N}])/giu,to:"я обязательно сообщу вам об этом"},
  {id:"PAYMENT",label:"Проверь, имеются ли в виду способы оплаты или сами кнопки",re:/(?<![\p{L}\p{N}])данные кнопки на странице оплаты(?![\p{L}\p{N}])/giu,to:"эти способы оплаты на странице оплаты"},
  {id:"BENEFIT",label:"Фраза стала короче",re:/(?<![\p{L}\p{N}])это позволит пользователям удобнее оплачивать(?![\p{L}\p{N}])/giu,to:"это сделает оплату удобнее для пользователей"},
  {id:"EXISTING",label:"Убрано повторение",re:/(?<![\p{L}\p{N}])есть своя внутренняя рассрочка(?![\p{L}\p{N}])/giu,to:"уже действует собственная рассрочка"},
  {id:"SUPPORT",label:"Более естественный деловой стиль",re:/(?<![\p{L}\p{N}])Основная часть работы проходит с нами(?![\p{L}\p{N}])/gu,to:"Основная часть работы ведётся с нами"},
  {id:"BRANDS_ROBO",automatic:true,label:"Корректное написание названия",re:/(?<![\p{L}\p{N}])robokassa(?![\p{L}\p{N}])/giu,to:"Robokassa"},
  {id:"BRANDS_PRO",automatic:true,label:"Корректное написание названия",re:/(?<![\p{L}\p{N}])продамус(?![\p{L}\p{N}])/giu,to:"Prodamus"},
  {id:"BANKS",automatic:true,label:"Дефис в сложном существительном",re:/(?<![\p{L}\p{N}])банки[ \t]+эмитенты(?![\p{L}\p{N}])/giu,to:match=>match.replace(/[ \t]+/,"-")},
  {id:"DOLYAMI",automatic:true,label:"Название сервиса с прописной буквы",re:/(?<=сервис(?:а|ом|у)?[ \t]+)«долями»/giu,to:"«Долями»"}
 ];
 function polish(text,dictionary=[]){
  const original=String(text||"");
  const base=Fix.compose(original,Core.filterDictionary(original,Shared.suggest(original),dictionary));
  let output=base.text;
  const changes=[],notes=[],suggestions=[];
  if(base.applied)changes.push({id:"BASE",label:"Исправлены очевидные ошибки орфографии и пунктуации",count:base.applied});
  function candidates(re,withText,id,label,manualOnly=true){
   return Shared.editable(output,Array.from(output.matchAll(re),match=>({
    offset:match.index,length:match[0].length,original:match[0],
    replacements:[typeof withText==="function"?withText(...match):withText],
    ruleId:id,message:label,manualOnly
   }))).filter(match=>{
    const following=output.slice(match.offset+match.length,match.offset+match.length+100);
    if(id==="EMAIL_TONE")return !/^\.[ \t]*Речь о бумажн/iu.test(following);
    if(id==="SCHEDULE")return !/^\.[ \t]*(?:Только созвон|Только звонок)/iu.test(following);
    return true;
   });
  }
  function swap(re,withText,id,label){
   const result=Fix.compose(output,candidates(re,withText,id,label,false));
   output=result.text;
   if(result.applied)changes.push({id,label,count:result.applied});
  }
  // Сохраняем нумерацию и формулировку заголовков, но отделяем содержание.
  swap(/(^|\n)([ \t]*\d{1,2}\.[ \t]+)([^\n–—-]{3,90}?)\s+[-–—]\s+([а-яёА-ЯЁA-Za-z])/gmu,
    (_m,head,number,title,letter)=>head+number+title.trim()+"\n\n"+letter.toLocaleUpperCase("ru-RU"),
    "HEADINGS","Заголовки отделены от содержания");
  // Раскрываем причинное сокращение. Полное «так как» может быть частью «сделайте так, как …».
  swap(/([А-Яа-яЁё0-9])([ \t]+)(?:т[ \t]*\.[ \t]*к\.?)(?=[ \t]+[А-Яа-яЁё])/giu,
    (_m,letter)=>letter+", так как","BECAUSE","Запятая перед причинным союзом «так как»");
  // Для сокращения после уже имеющейся запятой — только расшифровка, без двойных знаков.
  swap(/т[ \t]*\.[ \t]*к\.?(?=[ \t]+[А-Яа-яЁё])/giu,"так как","ABBR","Сокращение заменено полным союзом");
  // Только перечисление из двух имён, за которым следует известное сказуемое.
  swap(/(?<![\p{L}\p{N}])(сервисы|решения|инструменты|продукты|платформы|способы)([ \t]+)такие как([ \t]+)([\p{L}\p{N}-]+[ \t]+и[ \t]+[\p{L}\p{N}-]+)([ \t]+)(?=(?:помогают|позволяют|работают|поддерживают|доступны|используются)(?![\p{L}\p{N}]))/giu,
    (_m,noun,_space1,_space2,services,space3)=>noun+", такие как "+services+","+space3,
    "SUCH_AS","Перечисление «такие как» выделено запятыми");
  for(const rule of rules)if(rule.automatic)swap(rule.re,rule.to,rule.id,rule.label);
  for(const rule of rules)if(!rule.automatic)suggestions.push(...candidates(rule.re,rule.to,rule.id,rule.label));
  if(/(?:Создал|Назначил)[ \t]+(?:нам[ \t]+)?встречу[ \t]+на[ \t]+сегодня/iu.test(original))
   suggestions.push(...candidates(/Подскажите,[ \t]+всё[ \t]+в[ \t]+силе\?/giu,
    "Подскажите, встреча остаётся в силе?","STATUS","Уточни, относится ли вопрос к встрече"));
  // Однотипные окончания заголовков («Проникновение – ...») не преобразуются,
  // если трудно отличить заголовок от обычного предложения.
  if(/вс[её][ \t]+так[ \t]+же[ \t]+нужна[ \t]+почта/iu.test(original))notes.push("Что здесь имеется в виду под «почтой»: адрес электронной почты или почтовая корреспонденция?");
  if(/(?<![\p{L}\p{N}])проникновение(?![\p{L}\p{N}])/iu.test(original))notes.push("Уточни термин «проникновение»: речь о доле платежей, обороте или подключениях? Без этого редактор не меняет смысл пункта.");
  if(/(?<![\p{L}\p{N}])рассчитать[ \t]+и[ \t]+посмотреть(?![\p{L}\p{N}])/iu.test(original))notes.push("Уточни, что именно необходимо рассчитать. Формулировка «рассчитать и посмотреть банки-эмитенты» неоднозначна.");
  if(/(?<![\p{L}\p{N}])из-за частых проверок(?![\p{L}\p{N}])/iu.test(original))notes.push("Проверь формулировку о перечне документов: неясно, согласован ли он вследствие проверок или просто не меняется.");
  // Готовый вариант — это предложение к редактуре, никогда не меняем оригинал без нажатия.
  const linguistic=Core.filterDictionary(output,Shared.suggest(output),dictionary).filter(Fix.needsConfirmation);
  const valid=Fix.normalize(output,[...suggestions,...linguistic]).filter(match=>match.replacements.length);
  return {text:output,changed:output!==original,changes,notes,suggestions:valid.sort((a,b)=>a.offset-b.offset)};
 }
 const api={polish};
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 root.YasnoBusiness=api;
})(typeof window!=="undefined"?window:{});