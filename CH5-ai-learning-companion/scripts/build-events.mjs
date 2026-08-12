import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, "..");
const source = path.resolve(project, "../../../Obsidian-current-國中-互動式教材-CH5-五日正式逐日劇本.md");
const output = path.resolve(project, "data/events.json");
const text = fs.readFileSync(source, "utf8").replace(/\r\n/g, "\n").replaceAll("歐匿", "星芽");
const lines = text.split("\n");
const dayMap = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5 };

const clean = (value = "") => value
  .replace(/^[-*]\s*/, "")
  .replace(/\*\*/g, "")
  .replace(/`/g, "")
  .trim();

const parseDelta = (value = "") => {
  const match = value.match(/[+-]\d+/);
  return match ? Number(match[0]) : 0;
};

const parseBadgeDelta = (value = "") => {
  const names = { 公: "fairness", 透: "transparency", 責: "accountability", 隱: "privacy", 人: "humanAgency" };
  const result = {};
  for (const match of value.matchAll(/([公透責隱人])([↑↓]{1,2})/g)) {
    const direction = match[2][0] === "↑" ? 1 : -1;
    result[names[match[1]]] = direction * match[2].length;
  }
  return result;
};

const parseFeedback = (value = "") => {
  const speakers = { 系統: "system", 可可: "coco", 吱吱: "jiji", 思思: "sisi", 星芽: "onick", 歐匿: "onick", 指導老師: "teacher", 評審: "judge" };
  const parts = [];
  const re = /(系統|可可|吱吱|思思|星芽|歐匿|指導老師|評審)(?:小聲說)?：?「([^」]+)」/g;
  for (const match of value.matchAll(re)) parts.push({ speaker: speakers[match[1]], text: match[2] });
  if (!parts.length) parts.push({ speaker: "system", text: clean(value) });
  return parts;
};

const days = [];
const events = [];
let currentDay = null;
let mode = "";
let event = null;
let choice = null;

for (const raw of lines) {
  const line = raw.trim();
  const dayHeading = line.match(/^# 第([一二三四五])天｜(.+)$/);
  if (dayHeading) {
    currentDay = { day: dayMap[dayHeading[1]], title: dayHeading[2], opening: [], objective: "", closing: [] };
    days.push(currentDay);
    mode = "";
    continue;
  }
  if (!currentDay) continue;

  if (line === "## 開場") { mode = "opening"; continue; }
  if (line === "## 今日任務目標") { mode = "objective"; continue; }
  if (/^## (支線|第[一二三四五]天支線)/.test(line)) { mode = "closing"; continue; }

  const eventHeading = line.match(/^## 事件 (D[1-5]-\d{2})｜(.+)$/);
  if (eventHeading) {
    event = { id: eventHeading[1], day: currentDay.day, order: events.length + 1, title: eventHeading[2], eventText: "", choices: [] };
    events.push(event);
    choice = null;
    mode = "event";
    continue;
  }

  const choiceHeading = line.match(/^### 選項 ([ABC])｜(.+)$/);
  if (choiceHeading && event) {
    choice = { id: `${event.id}-${choiceHeading[1]}`, key: choiceHeading[1], label: choiceHeading[2] };
    event.choices.push(choice);
    mode = "choice";
    continue;
  }

  if (mode === "opening" && /^- /.test(line)) currentDay.opening.push(clean(line));
  if (mode === "objective" && line && !line.startsWith("#")) currentDay.objective += `${clean(line)} `;
  if (mode === "closing" && /^- /.test(line)) currentDay.closing.push(clean(line));
  if (mode === "event" && line.startsWith("**主要事件**：")) event.eventText = clean(line.replace("**主要事件**：", ""));

  if (mode === "choice" && choice) {
    const field = line.match(/^\d+\. \*\*([^*]+)\*\*：(.+)$/);
    if (!field) continue;
    const [, name, value] = field;
    if (name === "使用情境") choice.scenario = clean(value);
    if (name === "燈號判定") choice.light = value.includes("綠") ? "green" : value.includes("黃") ? "yellow" : "red";
    if (name === "判定理由") choice.reason = clean(value);
    if (name === "建議做法") choice.recommendation = clean(value);
    if (name === "專案進度變化") choice.workPoints = parseDelta(value);
    if (name === "倫理風險變化") choice.riskDelta = parseDelta(value);
    if (name === "影響的倫理徽章") choice.badgeDelta = parseBadgeDelta(value);
    if (name === "角色即時回饋") choice.feedback = parseFeedback(value);
    if (name === "延遲後果旗標") {
      choice.consequence = clean(value);
      choice.setFlags = [...value.matchAll(/`?([a-z][a-z0-9_]+)=true`?/g)].map((match) => match[1]);
    }
    if (name === "對應的手冊內容") choice.handbook = clean(value);
  }
}

for (const day of days) day.objective = day.objective.trim();
const dayOne = days.find((day) => day.day === 1);
if (dayOne) dayOne.opening = [
  "主持人：「全科 AI 學伴設計大賽，隊伍報到完成。請在五天內交出可測試的提案。」",
  "吱吱：「五天而已？那我們的 AI 學伴就叫星芽吧，讓他什麼都會，連作業也一起包了！」",
  "可可：「等一下，什麼都會，跟什麼都替你做，不是同一件事喔。」",
  "思思：「如果 AI 星芽直接告訴我答案，我應該會很喜歡……但那有算學會嗎？」",
  "星芽：「請設定我的第一條規則：我應該幫到哪裡？」"
];
const result = { version: 1, generatedFrom: path.basename(source), days, events };
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(`Generated ${events.length} events and ${events.reduce((sum, item) => sum + item.choices.length, 0)} choices.`);
