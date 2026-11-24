/* Ясно 3.1: интерфейс, полностью без ИИ. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const C=window.YasnoCore,Fix=window.YasnoCorrections,Business=window.YasnoBusiness;
if(!C||!Fix||!Business){document.body.dataset.error="modules";return;}
const editor=$("editor");
const state={checkedText:"",comparisonText:"",matches:[],accepted:[],filter:"all",lastNote:"",complete:false,requestId:0,controller:null,undo:[],words:[],history:[],draftOn:false,previewTone:null};
const keys={dictionary:"yasno:dictionary:3",history:"yasno:history:3",draft:"yasno:draft:3",draftOn:"yasno:draft-enabled:3",theme:"yasno:theme:3"};
const get=(k,fallback)=>{try{const s=localStorage.getItem(k);return s===null?fallback:JSON.parse(s)}catch{return fallback}};
const save=(k,x)=>{try{localStorage.setItem(k,JSON.stringify(x));return true}catch{toast("Не удалось сохранить данные в этом браузере");return false}};
const erase=k=>{try{localStorage.removeItem(k)}catch{}};
function toast(message){
 const node=$("toast");node.textContent=message;node.hidden=false;
 clearTimeout(toast.lastTimer);toast.lastTimer=setTimeout(()=>node.hidden=true,3100);
}
function setTheme(value){
 document.documentElement.dataset.theme=value;
 $("theme").textContent=value==="dark"?"☀":"☾";
 $("theme").title=value==="dark"?"Светлая тема":"Тёмная тема";
 save(keys.theme,value);
}
$("theme").onclick=()=>setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark");
const defaultDark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;
setTheme(get(keys.theme,defaultDark?"dark":"light"));
function refreshMetrics(){
 const stats=C.stats(editor.value);
 $("counter").textContent=stats.chars.toLocaleString("ru-RU")+" / 10 000";
 $("words").textContent=stats.words.toLocaleString("ru-RU");
 $("characters").textContent=stats.chars.toLocaleString("ru-RU");
 $("readingTime").textContent=stats.minutes+" мин";
}
function persistDraft(){if(state.draftOn)save(keys.draft,editor.value)}
function cancelCheck(){
 state.requestId++;if(state.controller){state.controller.abort();state.controller=null}
 $("check").disabled=false;$("check").textContent="✦ Проверить текст";
}
function invalidate(){
 cancelCheck();
 state.checkedText="";state.comparisonText="";state.matches=[];state.accepted=[];
 $("result").hidden=true;$("mistakes").textContent="—";resetPreviews();
 updateUndo();refreshMetrics();persistDraft();
}
function invalidateEditedText(){
 state.undo=[];
 invalidate();
}
editor.addEventListener("input",invalidateEditedText);
function replaceEditor(text,undoable=false){
 if(undoable)undoPush();
 else state.undo=[];
 editor.value=String(text||"");invalidate();editor.focus();
}
$("clear").onclick=()=>{if(editor.value&&!confirm("Очистить текущий текст?"))return;replaceEditor("")};
$("example").onclick=()=>replaceEditor("Коллеги привет! На этой недели прошел треннинги. Пришлите пожалуйста почты и я создам встречу. Я думаю что мы сможем встретиться когда у всех будет время.");
for(const id of ["deepCheck","businessMode"])$(id).addEventListener("change",invalidateEditedText);
function selectedCorrections(){
 return Fix.compose(state.checkedText,state.matches,$("includeStyle").checked,$("includeReview").checked,state.accepted);
}
function appendText(parent,value,className){
 const el=document.createElement("span");el.textContent=value;
 if(className)el.className=className;
 parent.appendChild(el);
}
function compare(before,after,beforeId="beforeDiff",afterId="afterDiff"){
 const original=$(beforeId),updated=$(afterId);
 original.replaceChildren();updated.replaceChildren();
 for(const seg of C.diff(before,after)){
  if(seg.kind==="same"){appendText(original,seg.text);appendText(updated,seg.text);}
  if(seg.kind==="remove")appendText(original,seg.text,"diff-remove");
  if(seg.kind==="add")appendText(updated,seg.text,"diff-add");
 }
}
function canTransfer(result){
 return result.confirmedApplied>0||result.text!==editor.value;
}
function renderCorrected(){
 const review=state.matches.filter(m=>m.reviewOnly&&!Fix.needsConfirmation(m)&&m.replacements.length).length;
 $("reviewLabel").hidden=review===0;
 if(!review)$("includeReview").checked=false;
 const result=selectedCorrections();
 const counts=[];
 if(result.applied)counts.push(result.applied+" к переносу");
 if(result.confirmedApplied)counts.push(result.confirmedApplied+" подтверждено");
 if(review)counts.push(review+" на проверку");
 $("correctedText").textContent=result.text;
 $("corrected-count").textContent=counts.join(" · ")||"Нет правок к переносу";
 $("applyCorrected").disabled=!canTransfer(result);
 $("copyCorrected").disabled=!state.checkedText;
 compare(state.comparisonText,result.text);
}
$("includeStyle").onchange=renderCorrected;
$("includeReview").onchange=renderCorrected;
function issueCard(m,source,onApply,onSkip){
 const review=m.reviewOnly||Fix.needsConfirmation(m);
 const original=m.original;
 const card=document.createElement("article");card.className="issue"+(review?" review":"");
 const head=document.createElement("div");head.className="issue-head";
 const title=document.createElement("strong");
 const start=Math.max(0,m.offset-18),end=m.offset+m.length;
 const left=source.slice(start,m.offset),right=source.slice(end,end+18);
 title.textContent=original||("Вставка в «"+left+"▏"+right+"»");
 const cat=document.createElement("span");cat.className="chip";cat.textContent=review?(m.source==="LanguageTool"?"LanguageTool · На проверку":"На проверку"):m.category||"Замечание";
 head.append(title,cat);
 const p=document.createElement("p");p.textContent=m.message||"Проверь этот фрагмент.";
 const change=document.createElement("div");change.className="issue-change";
 const before=document.createElement("del");before.textContent=original||"нет знака";
 const after=document.createElement("ins");
 after.textContent=m.replacements[0]===""?"Удаление":m.replacements[0]??"Нет готовой замены";
 change.append(before,after);
 const buttons=document.createElement("div");buttons.className="issue-buttons";
 for(const value of m.replacements){
  const b=document.createElement("button");b.type="button";b.className="button light";
  b.textContent=(review?"Подтвердить: ":"Применить: ")+(value||"убрать");
  b.onclick=()=>onApply(value);buttons.appendChild(b);
 }
 const skip=document.createElement("button");skip.type="button";skip.className="button ghost";skip.textContent="Пропустить";
 skip.onclick=onSkip;
 buttons.appendChild(skip);card.append(head,p,change,buttons);return card;
}
function skipMatch(context,index){
 const skipped=context.matches[index];
 for(const snapshot of [context,...context.undo]){
  // Match objects are shared within one check, but a new check has its own objects.
  snapshot.matches=snapshot.matches.filter(match=>match!==skipped);
 }
}
function renderIssues(){
 const list=$("issuesList");list.replaceChildren();
 const entries=state.matches.map((m,i)=>({m,i})).filter(({m})=>
  state.filter==="all"||(state.filter==="review"?(m.reviewOnly||Fix.needsConfirmation(m)):m.type===state.filter));
 $("issues-count").textContent=entries.length+" показано";
 if(!entries.length){const p=document.createElement("p");p.className="empty";p.textContent="В этой категории замечаний нет.";list.append(p);}
 else for(const {m,i} of entries)list.append(issueCard(m,state.checkedText,value=>applyOne(i,value),()=>{
  skipMatch(state,i);
  render();toast("Подсказка пропущена");
 }));
 const tips=C.advice(editor.value),advice=$("adviceList");advice.replaceChildren();
 for(const tip of tips){const p=document.createElement("div");p.className="notice";p.textContent="Совет по читаемости: "+tip.message;advice.appendChild(p)}
}
function render(){
 $("result").hidden=false;$("result-count").textContent=state.matches.length+" замечаний";
 $("mistakes").textContent=state.matches.length;
 renderCorrected();renderIssues();
 const note=$("checkNotice");note.replaceChildren();
 if(state.lastNote){const p=document.createElement("div");p.className="notice";p.textContent=state.lastNote;note.appendChild(p)}
 else if(!state.matches.length){const p=document.createElement("div");p.className="notice ok";p.textContent="Явных ошибок не найдено. Это не гарантия идеальной пунктуации.";note.appendChild(p)}
 if(state.matches.some(m=>Fix.needsConfirmation(m)&&m.replacements.length)){
  const p=document.createElement("div");p.className="notice";
  p.textContent="Спорные замены можно добавить только по одной в карточках замечаний.";
  note.appendChild(p);
 }
}
$("filters").onclick=e=>{
 const target=e.target.closest("button[data-filter]");if(!target)return;
 state.filter=target.dataset.filter;
 for(const b of $("filters").querySelectorAll("button"))b.classList.toggle("active",b===target);
 renderIssues();
};
function updateUndo(){
 $("undo").disabled=state.undo.length===0;
}
function undoPush(){
 state.undo.push({source:state.checkedText,comparisonText:state.comparisonText,text:editor.value,
  matches:state.matches,accepted:state.accepted,lastNote:state.lastNote,resultVisible:!$("result").hidden,
  includeStyle:$("includeStyle").checked,includeReview:$("includeReview").checked});
 if(state.undo.length>20)state.undo.shift();
}
$("undo").onclick=()=>{
 const prev=state.undo.pop();if(!prev)return;
 cancelCheck();
 state.checkedText=prev.source;state.comparisonText=prev.comparisonText;state.lastNote=prev.lastNote;
 state.matches=prev.matches;state.accepted=prev.accepted;editor.value=prev.text;
 $("includeStyle").checked=prev.includeStyle;$("includeReview").checked=prev.includeReview;
 resetPreviews();updateUndo();refreshMetrics();persistDraft();
 if(prev.resultVisible)render();
 else {$("result").hidden=true;$("mistakes").textContent="—";}
 toast("Последнее изменение отменено");
};
function applyOne(index,value){
 const result=Fix.confirm(state.checkedText,state.matches,state.accepted,index,value);
 if(!result)return;
 cancelCheck();undoPush();
 state.matches=result.matches;state.accepted=result.accepted;editor.value=result.text;
 resetPreviews();updateUndo();refreshMetrics();persistDraft();render();
}
$("applyCorrected").onclick=()=>{
 const result=selectedCorrections();if(!canTransfer(result))return;
 cancelCheck();
 // Card confirmations already changed the editor. Closing that result must
 // not add a duplicate edit or an empty step before the user's real undo.
 if(result.text!==editor.value){
  undoPush();
  editor.value=result.text;
 }
 state.checkedText=result.text;state.matches=[];state.accepted=[];
 $("includeReview").checked=false;
 resetPreviews();updateUndo();refreshMetrics();persistDraft();render();toast("Исправления перенесены в редактор");
};
async function copyText(text){
 try{
  if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return true}
  const tmp=document.createElement("textarea");tmp.value=text;tmp.style.position="fixed";tmp.style.opacity="0";
  document.body.append(tmp);tmp.select();const done=document.execCommand("copy");tmp.remove();return done;
 }catch{return false}
}
$("copyCorrected").onclick=async()=>{
 const yes=await copyText(selectedCorrections().text);toast(yes?"Исправленный текст скопирован":"Не получилось скопировать — выдели текст вручную");
};
function normalizeApiMatches(text,matches){
 if(!Array.isArray(matches))return [];
 // Textarea values normalize line endings to LF. Do the same before a
 // replacement enters the preview so transfer and undo use the same value.
 return Fix.normalize(text,matches.map(match=>{
  if(!Array.isArray(match?.replacements))return match;
  return {...match,replacements:match.replacements.map(value=>typeof value==="string"?value.replace(/\r\n?/g,"\n"):value)};
 }));
}
function checkNow(){
 if(!editor.value.trim()){editor.focus();toast("Сначала введи текст");return}
 state.controller?.abort();
 const controller=new AbortController(),seq=++state.requestId;state.controller=controller;
 const check=$("check");check.disabled=true;check.innerHTML='<span class="spinner"></span> Проверяем...';
 const text=editor.value,parameters={text,individualReview:true,businessMode:$("businessMode").checked,deepCheck:$("deepCheck").checked};
 fetch("/api/check",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(parameters),signal:controller.signal})
 .then(async r=>{const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||"Проверка временно недоступна");return data})
 .then(data=>{
  if(seq!==state.requestId||editor.value!==text)return;
  state.checkedText=text;state.comparisonText=text;state.accepted=[];state.complete=Boolean(data.complete);
  state.matches=C.filterDictionary(text,normalizeApiMatches(text,data.matches),state.words);
  state.lastNote=data.note||(!data.complete?"Сработала только ограниченная локальная проверка. Полный анализ недоступен.":"");
  $("includeReview").checked=false;$("includeStyle").checked=false;
  render();$("result").scrollIntoView({behavior:"smooth",block:"start"});
 })
 .catch(err=>{
  if(seq!==state.requestId||editor.value!==text||err.name==="AbortError")return;
  state.checkedText=text;state.comparisonText=text;state.matches=[];state.accepted=[];state.lastNote="Не удалось проверить текст: "+err.message;
  render();
 })
 .finally(()=>{
  if(seq===state.requestId){check.disabled=false;check.textContent="✦ Проверить текст";state.controller=null}
 });
}
$("check").onclick=checkNow;
editor.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();checkNow()}});
function renderDictionary(){
 const box=$("dictionaryList");box.replaceChildren();
 if(!state.words.length){const p=document.createElement("p");p.className="small";p.textContent="Пока пусто.";box.append(p)}
 for(const word of state.words){
  const tag=document.createElement("span");tag.className="token";
  const name=document.createElement("span");name.textContent=word;
  const rm=document.createElement("button");rm.type="button";rm.textContent="×";rm.setAttribute("aria-label","Удалить "+word);
  rm.onclick=()=>{state.words=state.words.filter(x=>x!==word);save(keys.dictionary,state.words);renderDictionary();toast("Слово удалено")};
  tag.append(name,rm);box.append(tag);
 }
}
$("dictionaryForm").onsubmit=e=>{
 e.preventDefault();const word=$("dictionaryInput").value.trim();
 if(!C.validDictionaryWord(word)){toast("Введите слово или название от 2 до 40 символов");return}
 if(state.words.some(x=>C.normalizeWord(x)===C.normalizeWord(word))){toast("Слово уже есть в словаре");return}
 if(state.words.length>=80){toast("В словаре максимум 80 записей");return}
 state.words.push(word);if(save(keys.dictionary,state.words)){renderDictionary();$("dictionaryInput").value="";toast("Добавлено в словарь")}
};
function renderHistory(){
 const box=$("historyList");box.replaceChildren();
 if(!state.history.length){const p=document.createElement("p");p.className="small";p.textContent="Сохранённых текстов нет.";box.append(p)}
 for(const record of state.history){
  const row=document.createElement("div");row.className="saved";
  const left=document.createElement("div");left.className="saved-name";
  const b=document.createElement("button");b.textContent=record.text.split("\n")[0].slice(0,48)||"Текст";
  b.title="Восстановить текст";
  b.onclick=()=>{
   if(editor.value&&editor.value!==record.text&&!confirm("Заменить текст в редакторе сохранённым?"))return;
   replaceEditor(record.text);toast("Текст восстановлен");
  };
  const d=document.createElement("div");d.className="small";d.textContent=new Date(record.date).toLocaleDateString("ru-RU");
  const rem=document.createElement("button");rem.className="button ghost";rem.textContent="×";rem.setAttribute("aria-label","Удалить сохранённый текст");
  rem.onclick=()=>{state.history=state.history.filter(x=>x.id!==record.id);save(keys.history,state.history);renderHistory()};
  left.append(b,d);row.append(left,rem);box.append(row);
 }
}
$("saveResult").onclick=()=>{
 const text=selectedCorrections().text;
 if(!text.trim()){toast("Нечего сохранять");return}
 if(state.history.some(h=>h.text===text)){toast("Этот текст уже сохранён");return}
 state.history.unshift({id:Date.now()+"-"+Math.random().toString(36).slice(2,6),date:Date.now(),text});
 state.history=state.history.slice(0,12);
 if(save(keys.history,state.history)){renderHistory();toast("Текст сохранён только в этом браузере")}
};
$("clearHistory").onclick=()=>{
 if(!state.history.length)return;
 if(!confirm("Удалить все сохранённые тексты в этом браузере?"))return;
 state.history=[];erase(keys.history);renderHistory();toast("История удалена");
};
const drafts=$("draftMode");state.draftOn=get(keys.draftOn,false)===true;drafts.checked=state.draftOn;
if(state.draftOn){const savedDraft=get(keys.draft,"");if(typeof savedDraft==="string"&&savedDraft)editor.value=savedDraft}
drafts.onchange=()=>{
 state.draftOn=drafts.checked;save(keys.draftOn,state.draftOn);
 if(state.draftOn){persistDraft();toast("Черновик сохраняется только на этом устройстве")}
 else {erase(keys.draft);toast("Автосохранение черновика выключено, черновик удалён")}
};
function renderTemplates(){
 const box=$("templates");box.replaceChildren();
 for(const template of C.templates){
  const b=document.createElement("button");b.className="template";b.type="button";b.textContent=template.icon+" "+template.title;
  b.onclick=()=>{
   if(editor.value&&!confirm("Заменить текущий текст шаблоном?"))return;
   replaceEditor(template.body);
   window.scrollTo({top:0,behavior:"smooth"});toast("Шаблон загружен");
  };
  box.append(b);
 }
}
let editorialDraft=null;
const toneDescription=$("toneText").textContent;
function resetTone(){
 state.previewTone=null;$("toneApply").hidden=true;$("toneText").textContent=toneDescription;
}
function resetPreviews(){
 editorialDraft=null;$("editorialResult").hidden=true;
 resetTone();
}
$("tone").onchange=resetTone;
function renderEditorial(){
 const draft=editorialDraft;
 $("editorialText").textContent=draft.text;
 $("editorialApply").disabled=draft.text===draft.source;
 $("editorialUndo").disabled=draft.undo.length===0;
 $("editorial-count").textContent=draft.automaticCount+" авто · "+draft.accepted.length+" подтверждено";
 compare(draft.source,draft.text,"editorialBeforeDiff","editorialAfterDiff");
 const options=$("editorialSuggestions");
 options.replaceChildren();
 options.hidden=draft.matches.length===0;
 for(const [index,match] of draft.matches.entries()){
  options.append(issueCard(match,draft.base,value=>{
   if(draft.source!==editor.value)return;
   const result=Fix.confirm(draft.base,draft.matches,draft.accepted,index,value);
   if(!result)return;
   draft.undo.push({text:draft.text,matches:draft.matches,accepted:draft.accepted});
   if(draft.undo.length>20)draft.undo.shift();
   draft.text=result.text;draft.matches=result.matches;draft.accepted=result.accepted;
   renderEditorial();
   toast("Вариант добавлен в деловую редакцию");
  },()=>{
   skipMatch(draft,index);
   renderEditorial();
  }));
 }
}
function previewEditorial(){
 if(!editor.value.trim()){toast("Сначала введи текст для редактуры");editor.focus();return}
 const source=editor.value,result=Business.polish(source);
 editorialDraft={source,base:result.text,text:result.text,matches:result.suggestions,accepted:[],undo:[],
  automaticCount:result.changes.reduce((total,change)=>total+change.count,0)};
 $("editorialChanges").textContent=result.changes.length?
   "Что изменено: "+result.changes.map(c=>c.label+(c.count>1?" ("+c.count+")":"")).join("; ")+".":"Автоматических правок нет.";
 const notes=$("editorialNotes");notes.replaceChildren();
 for(const message of result.notes){
  const p=document.createElement("div");p.className="notice";p.textContent="Уточнение перед отправкой: "+message;notes.append(p);
 }
 $("editorialResult").hidden=false;
 renderEditorial();
 $("editorialResult").scrollIntoView({behavior:"smooth",block:"start"});
}
$("businessPolish").onclick=previewEditorial;
$("editorialUndo").onclick=()=>{
 const previous=editorialDraft?.undo.pop();
 if(!previous)return;
 Object.assign(editorialDraft,previous);
 renderEditorial();
 toast("Последний вариант отменён");
};
$("editorialCopy").onclick=async()=>{
 if(!editorialDraft||editorialDraft.source!==editor.value){toast("Сначала повтори редактуру актуального текста");return}
 const copied=await copyText(editorialDraft.text);toast(copied?"Деловой вариант скопирован":"Не удалось скопировать текст");
};
$("editorialApply").onclick=()=>{
 if(!editorialDraft||editorialDraft.source!==editor.value){toast("Текст изменился. Выполни редактуру ещё раз");return}
 if(editorialDraft.text===editor.value)return;
 replaceEditor(editorialDraft.text,true);
 toast("Деловой вариант перенесён в редактор");
};
$("tonePreview").onclick=()=>{
 if($("tone").value==="editorial"){previewEditorial();return}
 if(!editor.value.trim()){toast("Введите текст для изменения формулировок");return}
 state.previewTone=C.toneVersion(editor.value,$("tone").value);
 $("toneText").textContent=state.previewTone===editor.value?"Для этого текста нет подходящих автоматических замен.":"Предварительный вариант: "+state.previewTone;
 $("toneApply").hidden=state.previewTone===editor.value;
};
$("toneApply").onclick=()=>{if(state.previewTone===null)return;replaceEditor(state.previewTone,true);toast("Формулировки применены")};
let installPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e});
$("install").onclick=async()=>{
 if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null}
 else toast("На телефоне: меню браузера → «Добавить на главный экран»");
};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
state.words=get(keys.dictionary,[]);if(!Array.isArray(state.words))state.words=[];
state.words=state.words.filter(C.validDictionaryWord).slice(0,80);
state.history=get(keys.history,[]);if(!Array.isArray(state.history))state.history=[];
state.history=state.history.filter(x=>x&&typeof x.text==="string").slice(0,12);
renderMetricsSafe();renderDictionary();renderHistory();renderTemplates();
function renderMetricsSafe(){refreshMetrics()}
})();