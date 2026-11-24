const test = require("node:test");
const assert = require("node:assert/strict");
const { compose, confirm } = require("../corrections.js");
const { polish } = require("../business-editor.js");
const check = require("../api/check.js");

const edit = (offset, length, ...replacements) => ({ offset, length, replacements });

test("individual edits and bulk use the same original ranges, including touching insertions", () => {
 const text = "Привет";
 const matches = [edit(0, 0, "«"), edit(0, 6, "Здравствуйте"), edit(6, 0, "!»")];
 const first = confirm(text, matches, [], 0, "«");
 assert.equal(first.text, "«Привет");
 const second = confirm(text, first.matches, first.accepted, 0, "Здравствуйте");
 assert.equal(second.text, "«Здравствуйте");
 assert.equal(compose(text, second.matches, false, false, second.accepted).text,
  compose(text, matches).text);
 const reverse = confirm(text, matches, [], 1, "Здравствуйте");
 assert.equal(compose(text, reverse.matches, false, false, reverse.accepted).text, "«Здравствуйте!»");
});

test("confirming a deletion removes overlaps and keeps both distinct boundary insertions", () => {
 const text = "АБВ";
 const matches = [edit(1, 0, "["), edit(1, 1, ""), edit(2, 0, "]"), edit(0, 2, "Г")];
 const deletion = confirm(text, matches, [], 1, "");
 assert.equal(deletion.text, "АВ");
 assert.deepEqual(deletion.matches.map(m => m.offset), [1, 2]);
 assert.equal(compose(text, deletion.matches, false, false, deletion.accepted).text, "А[]В");
});

test("edits respect UTF-16, user-visible characters, CRLF and the checked fragment", () => {
 const text = "👩‍💻 е\u0308\r\nПривет";
 const matches = [
  edit(1, 1, "!"), edit(2, 0, "!"), edit(7, 1, "!"), edit(9, 0, "!"),
  {...edit(10, 6, "Здравствуйте"), original: "Другой"},
  edit(10, 6, "\ud800"), edit(10, 6, "Здравствуйте")
 ];
 assert.equal(compose(text, matches).text, "👩‍💻 е\u0308\r\nЗдравствуйте");
 assert.equal(confirm(text, matches, [], 0, "!"), null);
 assert.equal(confirm(text, matches, [], 6, "непредложенный вариант"), null);
});

async function withProvider(t, text, matches, businessMode = false, individualReview = true) {
 t.mock.method(globalThis, "fetch", async () => ({ok: true, json: async () => ({matches})}));
 let data;
 await check({method: "POST", headers: {}, body: {text, businessMode, deepCheck: true, individualReview}}, {
  setHeader() {}, status() { return this; }, json(value) { data = value; }
 });
 return data;
}

function remote(offset, length, ...values) {
 return {...edit(offset, length, ...values.map(value => ({value}))), rule: {id: "MORFOLOGIK_RULE_RU_RU"}};
}

test("a wrong LanguageTool alternative stays visible for individual confirmation and cannot displace a local fix", async t => {
 const text = "Запланированы треннинги.";
 const data = await withProvider(t, text, [remote(14, 9, "тренинге", "тренинги")]);
 assert.equal(compose(text, data.matches, true, true).text, "Запланированы тренинги.");
 const index = data.matches.findIndex(m => m.source === "LanguageTool");
 assert.ok(index >= 0);
 assert.deepEqual(data.matches[index].replacements, ["тренинге", "тренинги"]);
 assert.equal(confirm(text, data.matches, [], index, "тренинги").text, "Запланированы тренинги.");
});

test("individual confirmation is required even for a single external replacement on clean text", async t => {
 const text = "Договор согласован.";
 const data = await withProvider(t, text, [remote(0, 7, "Счёт")]);
 assert.equal(compose(text, data.matches, true, true).text, text);
 assert.equal(confirm(text, data.matches, [], 0, "Счёт").text, "Счёт согласован.");
});

test("invalid, empty and no-op provider candidates cannot block a local edit", async t => {
 const text = "Пришлите пожалуйста ответ";
 const data = await withProvider(t, text, [
  remote(8, 12), remote(8, 12, null), remote(8, 12, " пожалуйста "),
  remote(8, 12, "x".repeat(121)), null,
  remote(0, 8, "Отправьте")
 ]);
 assert.equal(data.coverage, "partial");
 assert.equal(data.complete, false);
 assert.ok(data.matches.some(m => m.ruleId === "LOCAL_PLEASE_BOTH"));
 assert.ok(data.matches.some(m => m.replacements.includes("Отправьте")));
 assert.equal(compose(text, data.matches, true, true).text, "Пришлите, пожалуйста, ответ");
});

test("business preview keeps meaning and asks for separate decisions about each ambiguous replacement", () => {
 const text = "Всё так же нужна почта. Речь о бумажных письмах.\n" +
  "По ставкам этих продуктов я вернусь к вам на этой неделе.\n" +
  "Покажите данные кнопки на странице оплаты. К оплате 12 500 ₽ до 18 декабря. Ответственная — Анна.";
 const result = polish(text);
 assert.equal(result.text, text);
 assert.deepEqual(result.suggestions.map(m => m.ruleId), ["EMAIL_TONE", "SCHEDULE", "PAYMENT"]);
 assert.equal(compose(result.text, result.suggestions, true, true).text, text);
 const marked = confirm(result.text, result.suggestions, [], 2, "эти способы оплаты на странице оплаты");
 assert.match(marked.text, /Покажите эти способы оплаты/u);
 assert.match(marked.text, /нужна почта.*бумажных письмах/u);
 assert.match(marked.text, /12 500 ₽ до 18 декабря. Ответственная — Анна\./u);
});

test("bulk business styling never confirms a new subject, obligation or abbreviation meaning", async t => {
 const text = "Пришлите пожалуйста почты и я создам встречу. Нужно собрать ОС.";
 const data = await withProvider(t, text, [], true);
 assert.equal(compose(text, data.matches, true, true).text,
  "Пришлите, пожалуйста, почты, и я создам встречу. Нужно собрать ОС.");
});

test("audited false automatic commas stay out of ready text", async t => {
 const text = "Пункт а указан в договоре. Я думаю что угодно о проверке.";
 const data = await withProvider(t, text, []);
 assert.equal(compose(text, data.matches, true, true).text, text);
});

test("clients with cached bulk controls receive advisory-only external and semantic suggestions", async t => {
 const text = "Договор согласован. Я создам встречу.";
 const data = await withProvider(t, text, [remote(0, 7, "Счёт")], true, false);
 const advisory = data.matches.filter(match => match.manualOnly);
 assert.deepEqual(advisory.map(match => match.ruleId), ["MORFOLOGIK_RULE_RU_RU", "BUSINESS_MEETING"]);
 assert.ok(advisory.every(match => match.replacements.length === 0));
});

test("valid provider deletions are preserved as actionable individual choices", async t => {
 const text = "Да, да.";
 const data = await withProvider(t, text, [remote(2, 4, "")]);
 assert.equal(compose(text, data.matches, true, true).text, text);
 assert.equal(confirm(text, data.matches, [], 0, "").text, "Да.");
});
