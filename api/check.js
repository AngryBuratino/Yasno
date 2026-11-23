// Проверка русского текста: LanguageTool + ограниченные локальные правила.
// Тексты не записываются в базу данных или логи приложения.
function localMatches(text) {
  const out = [];
  const rules = [
    {
      pattern: /на этой недели/giu,
      replacement: (s) => s[0] === s[0].toUpperCase() ? "На этой неделе" : "на этой неделе",
      type: "grammar",
      message: "В выражении «на этой неделе» нужна форма предложного падежа."
    },
    {
      pattern: /треннинги/giu,
      replacement: () => "тренинги",
      type: "spelling",
      message: "Слово «тренинги» пишется с одной буквой «н» после «е»."
    },
    {
      pattern: /интернет\s+эквайринг[а-яё]*/giu,
      replacement: (s) => s.replace(/\s+/, "-"),
      type: "spelling",
      message: "«Интернет-эквайринг» пишется через дефис."
    },
    {
      pattern: /онлайн\s+встреч[а-яё]*/giu,
      replacement: (s) => s.replace(/\s+/, "-"),
      type: "spelling",
      message: "«Онлайн-встреча» и производные формы пишутся через дефис."
    }
  ];
  for (const rule of rules) {
    for (const match of text.matchAll(rule.pattern)) {
      out.push({
        offset: match.index,
        length: match[0].length,
        message: rule.message,
        replacements: [rule.replacement(match[0])],
        type: rule.type,
        category: rule.type === "spelling" ? "Орфография" : "Грамматика",
        ruleId: "local"
      });
    }
  }
  for (const match of text.matchAll(/([А-Яа-яЁё])(\s+)(пожалуйста)(\s+)(?=[А-Яа-яЁё])/giu)) {
    out.push({
      offset: match.index + 1,
      length: match[2].length + match[3].length + match[4].length,
      message: "Вводное «пожалуйста» в середине просьбы выделяется запятыми.",
      replacements: [", пожалуйста, "],
      type: "punctuation",
      category: "Пунктуация",
      ruleId: "local-please"
    });
  }
  return out;
}
function kind(m) {
  const label = ((m.rule?.category?.id || "") + " " + (m.rule?.issueType || "") + " " + (m.rule?.id || "")).toUpperCase();
  if (/PUNCT|COMMA|COLON|DASH/.test(label)) return "punctuation";
  if (/MISSPELL|SPELL|TYPOGRAPH|CASING|TYPOS/.test(label)) return "spelling";
  if (/STYLE|REDUNDAN|WORDINESS/.test(label)) return "style";
  return "grammar";
}
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") return res.status(405).json({ error: "Метод не поддерживается" });
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return res.status(403).json({ error: "Запрос запрещён" });
    } catch {
      return res.status(403).json({ error: "Некорректный запрос" });
    }
  }
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const text = typeof body?.text === "string" ? body.text : "";
  if (!text.trim() || text.length > 10000) return res.status(400).json({ error: "Введите текст до 10 000 символов." });

  let remote = [], complete = false, note = "";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7500);
    let response;
    try {
      response = await fetch("https://api.languagetool.org/v2/check", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ text, language: "ru" }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error("LanguageTool status " + response.status);
    const result = await response.json();
    remote = (Array.isArray(result.matches) ? result.matches : []).map(m => ({
      offset: m.offset,
      length: m.length,
      message: m.message || "Проверь это место",
      replacements: (m.replacements || []).slice(0, 4).map(r => r.value),
      type: kind(m),
      category: m.rule?.category?.name || "Грамматика",
      ruleId: m.rule?.id || ""
    }));
    complete = true;
  } catch {
    note = "Выполнена только ограниченная локальная проверка: LanguageTool недоступен. Результат может быть неполным.";
  }
  const sorted = [...remote, ...localMatches(text)]
    .filter(m => Number.isInteger(m.offset) && Number.isInteger(m.length)
      && m.offset >= 0 && m.length >= 0 && m.offset + m.length <= text.length)
    .sort((a, b) => a.offset - b.offset || b.length - a.length);
  const matches = [];
  let right = -1;
  for (const m of sorted) {
    if (m.offset < right) continue;
    matches.push(m);
    right = m.offset + m.length;
  }
  return res.status(200).json({ matches: matches.slice(0, 100), complete, note });
};
