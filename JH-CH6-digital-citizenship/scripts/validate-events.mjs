import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "events.json"), "utf8"));
const failures = [];
const optionIds = new Set();

if (data.days.length !== 6) failures.push(`Expected 6 days, got ${data.days.length}`);
if (data.questions.length !== 25) failures.push(`Expected 25 questions, got ${data.questions.length}`);

for (const day of data.days) {
  const expected = day.day === 6 ? 5 : 4;
  if (day.questions.length !== expected) failures.push(`Day ${day.day}: expected ${expected} questions, got ${day.questions.length}`);
}

for (const question of data.questions) {
  const expected = question.id === "D6_Q4" ? 18 : 3;
  if (question.options.length !== expected) failures.push(`${question.id}: expected ${expected} options, got ${question.options.length}`);
  for (const option of question.options) {
    if (!option.id) failures.push(`${question.id}: option missing id`);
    if (optionIds.has(option.id)) failures.push(`Duplicate option id: ${option.id}`);
    optionIds.add(option.id);
    for (const key of ["text", "feedback", "handbook", "rationale", "remedy"]) {
      if (!option[key]) failures.push(`${option.id}: missing ${key}`);
    }
    for (const value of Object.values(option.axes)) if (value < -2 || value > 2) failures.push(`${option.id}: axis delta outside -2..2`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Validated ${data.days.length} days, ${data.questions.length} questions, ${optionIds.size} unique options.`);
