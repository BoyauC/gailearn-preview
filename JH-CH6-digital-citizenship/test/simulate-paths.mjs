import fs from "node:fs";

const data = JSON.parse(fs.readFileSync(new URL("../data/events.json", import.meta.url), "utf8"));
const axisKeys = new Set(data.axes);
const stateKeys = new Set(data.states);
const failures = [];

function clamp(value) { return Math.max(0, Math.min(100, value)); }
function run(strategy) {
  const sim = {
    axes: Object.fromEntries(data.axes.map((key) => [key, 6])),
    states: { ST_ENERGY: 70, ST_TRUST: 55, ST_STRESS: 30, ST_FOOTPRINT: 20 },
    flags: new Set(), decisions: []
  };
  for (const question of data.questions) {
    const groups = question.id === "D6_Q4"
      ? ["DATA", "BALANCE", "REPUTATION", "PRIVACY", "LAW", "ETHICS"].map((group) => question.options.filter((option) => option.id.includes(`_${group}_`)))
      : [question.options];
    for (const options of groups) {
      const option = options[strategy % options.length];
      if (!option) { failures.push(`${question.id}: strategy ${strategy} produced no option`); continue; }
      for (const [key, delta] of Object.entries(option.axes)) {
        if (!axisKeys.has(key)) failures.push(`${option.id}: unknown axis ${key}`);
        sim.axes[key] = Math.max(0, Math.min(14, (sim.axes[key] ?? 0) + delta));
      }
      for (const [key, delta] of Object.entries(option.states)) {
        if (!stateKeys.has(key)) failures.push(`${option.id}: unknown state ${key}`);
        sim.states[key] = clamp((sim.states[key] ?? 0) + delta);
      }
      option.flags.forEach((flag) => sim.flags.add(flag));
      sim.decisions.push(option.id);
    }
  }
  if (sim.decisions.length !== 30) failures.push(`Strategy ${strategy}: expected 30 submitted choices, got ${sim.decisions.length}`);
  for (const value of Object.values(sim.axes)) if (value < 0 || value > 14) failures.push(`Strategy ${strategy}: axis out of bounds`);
  for (const value of Object.values(sim.states)) if (value < 0 || value > 100) failures.push(`Strategy ${strategy}: state out of bounds`);
  return sim;
}

const paths = [run(0), run(1), run(2)];
for (const question of data.questions) {
  for (const option of question.options) {
    const seen = paths.some((path) => path.decisions.includes(option.id));
    if (!seen) failures.push(`Option not covered by canonical simulations: ${option.id}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Simulated 3 canonical full paths; covered all ${data.questions.reduce((sum, q) => sum + q.options.length, 0)} options with bounded values.`);
