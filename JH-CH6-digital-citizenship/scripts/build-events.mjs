import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "data", "script-source.md");
const outputPath = path.join(root, "data", "events.json");
const source = fs.readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");

const DAY_META = {
  1: { title: "群組裡的爆料消息", axis: "AX_DATA", badge: "truth", scene: "校門與教室" },
  2: { title: "AI 作業與睡前使用", axis: "AX_BALANCE", badge: "balance", scene: "放學街道與家中書桌" },
  3: { title: "同學的搞笑照片", axis: "AX_REPUTATION", badge: "reputation", scene: "校園走廊與班級群組" },
  4: { title: "免費活動的註冊頁", axis: "AX_PRIVACY", badge: "privacy", scene: "電腦教室與家中平板" },
  5: { title: "網路素材與二創作品", axis: "AX_LAW", badge: "law", scene: "社團教室與影片剪輯桌" },
  6: { title: "群組爭論與數位公約", axis: "AX_ETHICS", badge: "ethics", scene: "班級討論區與成果舞臺" }
};

const CONTEXT_OVERRIDES = {
  D2_Q4: "老師臨時請小民用一句話，說明心得中實際採用的查核步驟。",
  D4_Q4: "手機跳出陌生登入警告，小民和思思要決定接下來怎麼處理。",
  D5_Q3: "剪輯軌上出現一張尚未確認能否公開使用的同學照片。",
  D6_Q3: "班級準備把六天遇到的錯誤與補救寫進公約，小民要決定如何說明。",
  D6_Q4: "班級要為六項數位公民能力，各選出一條可以實際做到的生活公約。",
  D6_Q5: "最後，請為未來一週選一項具體、做得到的改善行動。"
};

const TITLE_OVERRIDES = {};

const OPTION_TEXT_OVERRIDES = {
  D1_Q1_A: {
    remedy: "立即刪除尚可刪除的轉傳，發布更正並附上正式查核入口；稍後查明結果時，再回到原群組補充說明。"
  }
};

const splitCells = (line) => line.slice(1, -1).split("|").map((cell) => cell.trim());
const strip = (value) => value
  .replace(/`/g, "")
  .replace(/\*\*/g, "")
  .replace(/<br\s*\/?>/gi, "\n")
  .trim();

function parseDelta(value, prefix) {
  const result = {};
  const regex = new RegExp(`(${prefix}_[A-Z]+)\\s*([+-]\\d+|0)`, "g");
  for (const match of value.matchAll(regex)) result[match[1]] = Number(match[2]);
  return result;
}

function parseFlags(value) {
  const flags = [...value.matchAll(/`([a-z][a-z0-9_]+)`/g)].map((match) => match[1]);
  return [...new Set(flags.filter((flag) => !flag.startsWith("AX_") && !flag.startsWith("ST_")))];
}

function optionFromCells(cells) {
  const first = cells[0];
  const codes = [...first.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
  const decisionCode = codes.find((code) => /^D\d_Q\d/.test(code));
  const covenantCode = codes.find((code) => /^CV_/.test(code));
  const textMatch = first.match(/[「“](.+?)[」”]/);
  const option = {
    id: decisionCode || covenantCode,
    covenantId: covenantCode || null,
    text: textMatch ? textMatch[1] : strip(first.replace(/`[^`]+`/g, "")),
    axes: parseDelta(cells[1], "AX"),
    states: parseDelta(cells[2], "ST"),
    feedback: strip(cells[3]),
    flags: parseFlags(cells[4]),
    handbook: strip(cells[5]),
    rationale: strip(cells[6]),
    remedy: strip(cells[7])
  };
  return { ...option, ...(OPTION_TEXT_OVERRIDES[option.id] || {}) };
}

const questions = [];
const headingRegex = /^## (D([1-6])-Q(\d+))｜(.+)$/gm;
const headings = [...source.matchAll(headingRegex)];

for (let index = 0; index < headings.length; index += 1) {
  const match = headings[index];
  const day = Number(match[2]);
  const questionNumber = Number(match[3]);
  const start = match.index + match[0].length;
  const end = index + 1 < headings.length ? headings[index + 1].index : source.indexOf("\n# 二、", start);
  const block = source.slice(start, end > start ? end : source.length);
  const rows = block.split("\n").filter((line) => /^\| .*D[1-6]_Q\d/.test(line) || /^\| `CV_/.test(line));
  const options = rows.map(splitCells).filter((cells) => cells.length === 8).map(optionFromCells);
  if (!options.length) throw new Error(`No options parsed for ${match[1]}`);

  const contextLines = block.split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("|") && !line.startsWith("###") && !line.startsWith("**"));

  const id = match[1].replace("-", "_");
  questions.push({
    id,
    day,
    number: questionNumber,
    title: TITLE_OVERRIDES[id] || match[4].trim(),
    context: CONTEXT_OVERRIDES[id] || strip(contextLines[0] || ""),
    options
  });
}

const days = Object.entries(DAY_META).map(([day, meta]) => ({
  day: Number(day),
  ...meta,
  questions: questions.filter((question) => question.day === Number(day)).map((question) => question.id)
}));

const payload = {
  schemaVersion: 1,
  generatedFrom: "data/script-source.md",
  axes: ["AX_DATA", "AX_BALANCE", "AX_REPUTATION", "AX_PRIVACY", "AX_LAW", "AX_ETHICS"],
  states: ["ST_ENERGY", "ST_TRUST", "ST_STRESS", "ST_FOOTPRINT"],
  days,
  questions
};

fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Built ${path.relative(root, outputPath)}: ${days.length} days, ${questions.length} questions, ${questions.reduce((sum, q) => sum + q.options.length, 0)} options.`);
