const app = document.querySelector("#app");
const announcer = document.querySelector("#announcer");
const STORAGE_KEY = "gailearn.jhCh6DigitalCitizen.v1";

const AXES = {
  AX_DATA: { name: "資料判讀", badge: "01-真相羅盤.svg" },
  AX_BALANCE: { name: "科技平衡", badge: "02-科技平衡.svg" },
  AX_REPUTATION: { name: "聲譽守護", badge: "03-聲譽守護.svg" },
  AX_PRIVACY: { name: "隱私保護", badge: "04-足跡密鎖.svg" },
  AX_LAW: { name: "法律界線", badge: "05-法律界線.svg" },
  AX_ETHICS: { name: "善意溝通", badge: "06-善意連線.svg" }
};
const STATES = {
  ST_ENERGY: { name: "精力", icon: "⚡", risk: false },
  ST_TRUST: { name: "人際信任", icon: "🤝", risk: false },
  ST_STRESS: { name: "數位壓力", icon: "💬", risk: true },
  ST_FOOTPRINT: { name: "足跡風險", icon: "◉", risk: true }
};
const WARMUPS = [
  ["看到驚人消息時，我通常會……", "先轉傳再說", "看一下留言", "確認來源與日期"],
  ["睡前收到很多通知時，我通常會……", "一路看到睡著", "想到才關", "設定下線與休息時間"],
  ["群組出現同學的尷尬照片時，我通常會……", "跟著互動", "不轉傳但不表示", "先關心當事人並阻止擴散"],
  ["網站要求很多個資時，我通常會……", "全部填完", "只拒絕密碼", "先確認必要性與主辦者"],
  ["製作作品需要網路素材時，我通常會……", "找到就用", "標作者就用", "查看授權或改用自製素材"],
  ["網路爭論變激烈時，我通常會……", "立刻反擊", "先離開但不處理", "分清事實與意見、針對議題回應"]
];

let content;
let view = "home";
let warmupIndex = 0;
let currentDay = 1;
let stepIndex = 0;
let feedback = null;
let pendingNotice = "";
let state = loadState();

function initialState() {
  return {
    version: 1,
    started: false,
    warmupDone: false,
    completed: false,
    day: 1,
    axes: Object.fromEntries(Object.keys(AXES).map((key) => [key, 3])),
    states: { ST_ENERGY: 70, ST_TRUST: 55, ST_STRESS: 30, ST_FOOTPRINT: 20 },
    flags: [],
    decisions: {},
    completedDays: [],
    arrivedDays: [],
    consequencesSeen: [],
    history: [],
    improvement: null,
    ending: null
  };
}

function loadState() {
  try {
    return { ...initialState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") };
  } catch {
    return initialState();
  }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function clamp(value) { return Math.max(0, Math.min(100, value)); }
function level(points) { return Math.max(1, Math.min(5, 1 + Math.floor(Math.max(0, points) / 3))); }
function announce(text) { announcer.textContent = ""; requestAnimationFrame(() => { announcer.textContent = text; }); }
function esc(value = "") { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }

function shell(inner, controls = "") {
  return `<div class="shell"><header class="topbar"><div class="brand"><h1>我要成為善用 AI 的數位公民</h1><p>數位生活挑戰營</p></div>${controls}</header>${inner}</div>`;
}

function statusBar() {
  return `<section class="statusbar" aria-label="角色狀態">${Object.entries(STATES).map(([key, meta]) => {
    const shown = meta.risk ? state.states[key] : state.states[key];
    const favorableValue = meta.risk ? 100 - shown : shown;
    const tone = favorableValue >= 67 ? "good" : favorableValue >= 34 ? "caution" : "danger";
    return `<div class="status ${meta.risk ? "risk" : ""} ${tone}"><div class="status-head"><span>${meta.icon} ${meta.name}</span><span>${shown}</span></div><div class="meter" aria-label="${meta.name} ${shown}"><span style="--value:${shown}%"></span></div></div>`;
  }).join("")}</section>`;
}

function renderHome() {
  const resume = state.started && !state.completed;
  app.innerHTML = shell(`<section class="hero"><div class="hero-art" role="img" aria-label="小民，數位生活挑戰營的國中生主角"></div><div><h2>每一次點擊，<br>都會留下足跡。</h2><p class="hero-copy">和小民、吱吱、思思、可可與歐匿一起面對群組消息、AI 作業、照片、個資、網路素材與匿名爭論。沒有只靠直覺的滿分答案；你要在時間、關係與風險之間做決定。</p><div class="chips"><span class="chip">6 項數位公民能力</span><span class="chip">4 項生活狀態</span><span class="chip">選擇會影響後續</span></div><button class="primary" id="start">${resume ? "繼續挑戰" : state.completed ? "查看上次結算" : "開始挑戰"}</button></div></section>`);
  document.querySelector("#start").addEventListener("click", () => {
    if (state.completed) { view = "result"; render(); return; }
    state.started = true; saveState();
    view = state.warmupDone ? "map" : "warmup";
    currentDay = state.day;
    render();
  });
}

function renderWarmup() {
  const item = WARMUPS[warmupIndex];
  app.innerHTML = shell(`<section class="event-card event-layout"><div class="scene-panel"><span class="day-tag">暖身活動</span><p class="context">這不是考試，也不會決定最後結果，六題只是為了建立你的起點。</p><div class="warmup-avatar" role="img" aria-label="小民半身像"></div></div><div class="choice-panel"><div class="progress"><span style="--progress:${((warmupIndex + 1) / 6) * 100}%"></span></div><p class="question-count">第 ${warmupIndex + 1}／6 題</p><h3>${item[0]}</h3><div class="options">${item.slice(1).map((text, index) => `<button class="option" data-score="${index}">${text}</button>`).join("")}</div></div><aside class="hex-panel">${hexPanel()}</aside></section>`);
  document.querySelectorAll(".option").forEach((button) => button.addEventListener("click", () => {
    const axis = Object.keys(AXES)[warmupIndex];
    state.axes[axis] = Number(button.dataset.score) * 3;
    warmupIndex += 1;
    if (warmupIndex >= 6) { state.warmupDone = true; saveState(); view = "map"; }
    render();
  }));
}

function badgePath(axis) { return `assets/badges/${AXES[axis].badge}`; }
function hexPanel() {
  return `<h3>數位公民六邊形</h3><div class="hex-list">${Object.entries(AXES).map(([key, meta]) => {
    const lvl = level(state.axes[key]);
    return `<div class="hex-axis"><img src="${badgePath(key)}" alt=""><div><div class="axis-name">${meta.name}・${lvl}級</div><div class="level-dots" aria-hidden="true">${[1,2,3,4,5].map((n) => `<i class="${n <= lvl ? "on" : ""}"></i>`).join("")}</div></div></div>`;
  }).join("")}</div>`;
}

function radarChart() {
  const entries = Object.entries(AXES);
  const centerX = 240;
  const centerY = 220;
  const radius = 125;
  const point = (index, scale) => {
    const angle = -Math.PI / 2 + index * Math.PI / 3;
    return `${centerX + Math.cos(angle) * radius * scale},${centerY + Math.sin(angle) * radius * scale}`;
  };
  const grids = [1, 2, 3, 4, 5].map((ring) => `<polygon points="${entries.map((_, index) => point(index, ring / 5)).join(" ")}" />`).join("");
  const axes = entries.map((_, index) => {
    const [x, y] = point(index, 1).split(",");
    return `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" />`;
  }).join("");
  const valuePoints = entries.map(([key], index) => point(index, level(state.axes[key]) / 5));
  const dots = valuePoints.map((coords) => {
    const [cx, cy] = coords.split(",");
    return `<circle cx="${cx}" cy="${cy}" r="6" />`;
  }).join("");
  const labels = entries.map(([key, meta], index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 3;
    const x = centerX + Math.cos(angle) * 195 - 66;
    const y = centerY + Math.sin(angle) * 195 - 22;
    return `<g class="radar-label" transform="translate(${x} ${y})"><rect width="132" height="44" rx="14" /><image href="${badgePath(key)}" x="5" y="5" width="34" height="34" /><text class="radar-label-name" x="43" y="27">${meta.name}</text><text class="radar-label-level" x="123" y="27" text-anchor="end">${level(state.axes[key])} 級</text></g>`;
  }).join("");
  const description = entries.map(([key, meta]) => `${meta.name}${level(state.axes[key])}級`).join("、");
  return `<div class="radar-wrap"><svg class="radar" viewBox="0 0 480 440" role="img" aria-label="六項數位公民能力雷達圖：${description}"><g class="radar-grid">${grids}${axes}</g><polygon class="radar-value" points="${valuePoints.join(" ")}" /><g class="radar-dots">${dots}</g><g class="radar-labels">${labels}</g></svg></div>`;
}

const CONSEQUENCES = [
  { id: "rumor_d3", day: 3, flag: "rumor_shared", unless: "rumor_correction", text: "第一天轉傳的消息流到家長群，信任下降、壓力上升。", states: { ST_TRUST: -5, ST_STRESS: 4 } },
  { id: "late_d3", day: 3, flag: "late_night_overuse", text: "昨晚睡太晚，小民今天比較難集中精神。", states: { ST_ENERGY: -8 } },
  { id: "photo_d5", day: 5, flag: "photo_forwarded", text: "阿岳的迷因仍有副本，出現在班級影片草稿中。", states: { ST_TRUST: -4, ST_FOOTPRINT: 5 } },
  { id: "source_d4", day: 4, flag: "source_checked", text: "思思記得小民會查來源，主動請你一起檢查活動頁。", states: { ST_TRUST: 4 } },
  { id: "privacy_d6", day: 6, flag: "privacy_overexposed", unless: "remedy_privacy_full", text: "先前提供的資料被用來寄送客製化可疑訊息。", states: { ST_STRESS: 8, ST_FOOTPRINT: 8 } },
  { id: "licensed_d6", day: 6, flag: "licensed_assets", text: "素材授權完整，班級影片可以在成果舞臺播放。", states: { ST_TRUST: 5 } },
  { id: "photo_help_d6", day: 6, flag: "photo_protected", text: "阿岳願意一起說明：不同意也應被尊重。", states: { ST_TRUST: 5 } }
];

function applyConsequences(day) {
  const flags = new Set(state.flags);
  const notices = [];
  for (const consequence of CONSEQUENCES.filter((item) => item.day === day)) {
    if (!flags.has(consequence.flag) || (consequence.unless && flags.has(consequence.unless)) || state.consequencesSeen.includes(consequence.id)) continue;
    Object.entries(consequence.states).forEach(([key, delta]) => { state.states[key] = clamp(state.states[key] + delta); });
    state.consequencesSeen.push(consequence.id);
    notices.push(consequence.text);
  }
  pendingNotice = notices.join(" ");
  saveState();
}

function renderMap() {
  const controls = `<button class="ghost" id="reset">重新開始</button>`;
  const points = [
    { x: 11, y: 76 }, { x: 28, y: 65 }, { x: 44, y: 48 },
    { x: 60, y: 29 }, { x: 77, y: 21 }, { x: 91, y: 31 }
  ];
  const arrived = state.arrivedDays?.includes(state.day);
  const pawnPoint = arrived ? points[state.day - 1] : state.day === 1 ? { x: 3.5, y: 87 } : points[state.day - 2];
  app.innerHTML = shell(`${statusBar()}<section class="map-card"><div class="map-head"><div><div class="eyebrow">六天生活地圖</div><h2>第 ${state.day} 天</h2><p>點選標示「點擊開始」的今日關卡，小民會沿著道路前往任務。</p></div></div>${pendingNotice ? `<div class="consequence"><strong>前面選擇的影響：</strong>${pendingNotice}</div>` : ""}<div class="journey-viewport"><div class="journey-map"><svg class="journey-road" viewBox="0 0 1200 480" preserveAspectRatio="none" aria-hidden="true"><path class="road-shadow" d="M42 423 C120 390 215 400 336 315 C420 256 468 248 528 218 C620 172 650 107 720 104 C830 99 876 54 950 74 C1040 98 1072 135 1138 150"/><path class="road-edge" d="M42 423 C120 390 215 400 336 315 C420 256 468 248 528 218 C620 172 650 107 720 104 C830 99 876 54 950 74 C1040 98 1072 135 1138 150"/><path class="road-surface" d="M42 423 C120 390 215 400 336 315 C420 256 468 248 528 218 C620 172 650 107 720 104 C830 99 876 54 950 74 C1040 98 1072 135 1138 150"/><path class="road-guide" d="M42 423 C120 390 215 400 336 315 C420 256 468 248 528 218 C620 172 650 107 720 104 C830 99 876 54 950 74 C1040 98 1072 135 1138 150"/></svg>${content.days.map((day, index) => {
    const done = state.completedDays.includes(day.day);
    const current = day.day === state.day;
    const locked = day.day > state.day;
    const point = points[index];
    return `<button class="node ${done ? "done" : ""} ${current ? "current" : ""}" style="--node-x:${point.x}%;--node-y:${point.y}%" data-day="${day.day}" ${locked ? "disabled" : ""} aria-label="第 ${day.day} 天，${day.title}，${done ? "已完成，可回顧" : current ? "點擊開始今日任務" : "尚未解鎖"}"><span class="badge-shell"><img src="${badgePath(day.axis)}" alt=""></span><span class="node-number">${day.day}</span><span class="node-label">第 ${day.day} 天｜${day.title}</span><span class="node-mark">${done ? "✓" : locked ? "鎖定" : "點擊開始"}</span></button>`;
  }).join("")}<div class="map-pawn ${arrived ? "arrived" : ""}" style="--pawn-x:${pawnPoint.x}%;--pawn-y:${pawnPoint.y}%" aria-label="小民棋子"><img src="assets/characters/xiaomin-bust-flipped.png" alt=""><span></span></div></div></div></section>`, controls);

  const enterMission = () => {
    if (state.arrivedDays?.includes(state.day)) { startDay(state.day); return; }
    const pawn = document.querySelector(".map-pawn");
    const target = points[state.day - 1];
    const start = pawnPoint;
    const middle = { x: (start.x + target.x) / 2, y: (start.y + target.y) / 2 - 2.5 };
    document.querySelector(".node.current").disabled = true;
    announce(`小民正前往第 ${state.day} 天任務`);
    const movement = pawn.animate([
      { left: `${start.x}%`, top: `${start.y}%` },
      { left: `${middle.x}%`, top: `${middle.y - 1}%`, transform: "translate(-50%, -100%) translateY(-5px)" },
      { left: `${target.x}%`, top: `${target.y}%` }
    ], { duration: 1050, easing: "cubic-bezier(.35,.05,.2,1)", fill: "forwards" });
    movement.finished.then(() => {
      state.arrivedDays = [...new Set([...(state.arrivedDays || []), state.day])];
      saveState();
      startDay(state.day);
    });
  };
  document.querySelector("#reset").addEventListener("click", resetGame);
  document.querySelectorAll(".node:not(:disabled)").forEach((node) => node.addEventListener("click", () => {
    const day = Number(node.dataset.day);
    if (day === state.day) enterMission();
    else renderReview(day);
  }));
}

function daySteps(day) {
  const questions = content.questions.filter((question) => question.day === day);
  return questions.flatMap((question) => {
    if (question.id !== "D6_Q4") return [{ ...question }];
    const groups = ["DATA", "BALANCE", "REPUTATION", "PRIVACY", "LAW", "ETHICS"];
    return groups.map((group, index) => ({
      ...question,
      id: `D6_Q4_${group}`,
      title: `數位生活公約 ${index + 1}／6：${AXES[`AX_${group}`].name}`,
      options: question.options.filter((option) => option.id.includes(`_${group}_`))
    }));
  });
}

function startDay(day) {
  currentDay = day; stepIndex = 0; feedback = null; applyConsequences(day); view = "event"; render();
}

function applyQuestionConsequence(question) {
  const flags = new Set(state.flags);
  if (question.id === "D2_Q4" && flags.has("late_night_overuse") && !state.consequencesSeen.includes("late_d2_check")) {
    state.states.ST_ENERGY = clamp(state.states.ST_ENERGY - 10);
    state.consequencesSeen.push("late_d2_check");
    saveState();
  }
}

function questionContext(question, day) {
  const flags = new Set(state.flags);
  if (question.id === "D2_Q4") {
    return flags.has("late_night_overuse")
      ? "老師臨時請小民說明查核步驟。昨晚睡得太晚，小民精神有些不濟，但仍能選擇誠實說明或採取補救。"
      : "老師臨時請小民用一句話，說明心得中實際採用的查核步驟。";
  }
  if (question.id === "D3_Q1") {
    const details = [];
    if (flags.has("rumor_shared")) details.push("第一天的截圖已經流到更多群組");
    if (flags.has("public_shaming")) details.push("同學也對小民先前公開標記別人的做法感到不舒服");
    return details.length
      ? `${details.join("；")}。此時，班級群組又出現阿岳的搞笑照片。`
      : "班級群組突然出現阿岳的搞笑照片，轉傳數正快速增加。";
  }
  if (question.id === "D4_Q4") {
    return flags.has("privacy_overexposed") || flags.has("broad_permissions_granted") || flags.has("evidence_publicized")
      ? "小民的手機跳出陌生登入警告，還收到提到學校與活動的可疑訊息。"
      : "思思轉來一張陌生登入警告，想請小民一起判斷該怎麼處理。";
  }
  if (question.id === "D5_Q3") {
    return flags.has("photo_forwarded")
      ? "剪輯軌上出現阿岳迷因的殘留副本，團隊必須決定是否保留。"
      : "剪輯軌上出現一張尚未確認能否公開使用的同學照片。";
  }
  if (question.id === "D6_Q3") {
    if (flags.has("privacy_overexposed") && !flags.has("remedy_privacy_full")) return "班級準備整理這六天的經驗；小民仍需要處理曾經提供過多個資所造成的影響。";
    if (flags.has("photo_forwarded") && !flags.has("remedy_photo_full")) return "班級準備整理這六天的經驗；阿岳的照片仍有副本尚未完整處理。";
    if (flags.has("unlicensed_assets") || flags.has("publish_before_clearance")) return "班級準備整理這六天的經驗；成果影片仍有素材授權問題需要補救。";
    if (flags.has("rumor_shared") && !flags.has("rumor_correction")) return "班級準備整理這六天的經驗；第一天轉傳的消息仍需要正式更正。";
    return "班級準備把六天遇到的錯誤與補救寫進公約，小民要決定如何說明。";
  }
  return question.context || day.scene;
}

function renderEvent() {
  const day = content.days.find((item) => item.day === currentDay);
  const steps = daySteps(currentDay);
  const question = steps[stepIndex];
  applyQuestionConsequence(question);
  const officialCount = day.questions.length;
  const progress = ((stepIndex + (feedback ? 1 : 0)) / steps.length) * 100;
  const context = questionContext(question, day);
  app.innerHTML = shell(`${statusBar()}<section class="event-card event-layout"><section class="scene-panel"><span class="day-tag">第 ${day.day} 天・${AXES[day.axis].name}</span><h2>${day.title}</h2><p class="context">${esc(context)}</p><div class="speaker"><img class="speaker-character" src="assets/characters/ouni.png" alt="歐匿"><div><strong>歐匿</strong><br>${currentDay === 6 ? "這次便利與責任要一起考慮。" : "先看清楚情境，再決定怎麼行動。"}</div></div></section><section class="choice-panel"><div class="progress"><span style="--progress:${progress}%"></span></div><p class="question-count">${question.id.startsWith("D6_Q4_") ? "第 6 天・公約制定" : `第 ${question.number}／${officialCount} 個正式決策`}</p><h3>${esc(question.title)}</h3>${feedback ? feedbackHtml(feedback) : `<div class="options">${question.options.map((option) => `<button class="option" data-id="${option.id}">${esc(option.text)}</button>`).join("")}</div>`}</section><aside class="hex-panel">${hexPanel()}</aside></section>`, `<button class="ghost" id="map">回到地圖</button>`);
  document.querySelector("#map").addEventListener("click", () => { view = "map"; render(); });
  if (!feedback) document.querySelectorAll(".option").forEach((button) => button.addEventListener("click", () => chooseOption(question, button.dataset.id)));
  else document.querySelector("#next").addEventListener("click", () => {
    feedback = null; stepIndex += 1;
    if (stepIndex >= steps.length) completeDay(currentDay); else render();
  });
}

function chooseOption(question, optionId) {
  if (state.decisions[question.id]) return;
  const option = question.options.find((item) => item.id === optionId);
  Object.entries(option.axes).forEach(([key, delta]) => { state.axes[key] = Math.max(0, Math.min(14, state.axes[key] + delta)); });
  Object.entries(option.states).forEach(([key, delta]) => { state.states[key] = clamp(state.states[key] + delta); });
  state.flags = [...new Set([...state.flags, ...option.flags])];
  state.decisions[question.id] = option.id;
  state.history.push({ day: currentDay, question: question.title, option: option.text, feedback: option.feedback });
  if (question.id === "D6_Q5") state.improvement = option.id;
  feedback = option;
  saveState();
  announce(`選擇完成。${option.feedback}`);
  render();
}

function deltaLabels(option) {
  const labels = [];
  Object.entries(option.axes).forEach(([key, value]) => labels.push([`${AXES[key].name} ${value > 0 ? "+" : ""}${value}`, value]));
  Object.entries(option.states).forEach(([key, value]) => labels.push([`${STATES[key].name} ${value > 0 ? "+" : ""}${value}`, STATES[key].risk ? -value : value]));
  return labels;
}
function feedbackHtml(option) {
  return `<div class="feedback"><blockquote>${esc(option.feedback)}</blockquote><div class="delta-row">${deltaLabels(option).map(([label, direction]) => `<span class="delta ${direction < 0 ? "down" : ""}">${esc(label)}</span>`).join("")}</div><div class="why"><strong>為什麼：</strong>${esc(option.rationale)}</div><div class="remedy"><strong>改善或補救：</strong>${esc(option.remedy)}</div><button class="primary" id="next">繼續</button></div>`;
}

function completeDay(day) {
  if (!state.completedDays.includes(day)) state.completedDays.push(day);
  if (day < 6) {
    state.day = day + 1; saveState(); applyConsequences(state.day); view = "map"; render();
  } else {
    state.completed = true; state.ending = determineEnding(); saveState(); view = "result"; render();
  }
}

function determineEnding() {
  const levels = Object.fromEntries(Object.keys(AXES).map((key) => [key, level(state.axes[key])]));
  const flags = new Set(state.flags);
  const unresolved = flags.has("privacy_overexposed") && !flags.has("remedy_privacy_full") || flags.has("publish_before_clearance") || flags.has("anonymous_attack");
  if (unresolved || state.states.ST_FOOTPRINT >= 65) return "END_FOOTPRINT_ALERT";
  if (state.states.ST_ENERGY <= 30 || state.states.ST_STRESS >= 70) return "END_EFFICIENT_OVERLOADED";
  if (levels.AX_REPUTATION >= 4 && levels.AX_ETHICS >= 4 && flags.has("ethical_mediation")) return "END_KIND_MEDIATOR";
  if (levels.AX_PRIVACY >= 4 && levels.AX_LAW >= 4) return "END_PRIVACY_LAW_GUARD";
  if (levels.AX_DATA >= 4 && (levels.AX_BALANCE < 4 || levels.AX_ETHICS < 4)) return "END_TRUTH_NAVIGATOR";
  if (Object.values(levels).every((value) => value >= 3) && state.improvement) return "END_HEX_CITIZEN";
  return "END_GROWING_CITIZEN";
}

const ENDINGS = {
  END_HEX_CITIZEN: ["數位公民六邊形戰士", "六項能力都建立了穩定基礎，也能提出下一步行動。"],
  END_TRUTH_NAVIGATOR: ["真相導航員", "你擅長查找證據；接著要把同樣的判斷力帶進作息與溝通。"],
  END_PRIVACY_LAW_GUARD: ["隱私與法律守門員", "你能看見資料、影像與素材背後的權利和責任。"],
  END_KIND_MEDIATOR: ["善意溝通者", "你能在衝突中保留尊重，讓討論回到事實與需求。"],
  END_EFFICIENT_OVERLOADED: ["高效但過載的使用者", "任務完成了，但精力或壓力提醒你：善用也包含停下。"],
  END_FOOTPRINT_ALERT: ["數位足跡證明", "有些資料、照片或留言仍需處理；這是補救任務，不是單純失敗。"],
  END_GROWING_CITIZEN: ["成長中的數位公民", "六邊形還不平均，但你已知道下一步可以從哪裡開始。"]
};

function renderResult() {
  const ending = ENDINGS[state.ending || determineEnding()];
  const ranked = Object.keys(AXES).sort((a,b) => state.axes[b] - state.axes[a]);
  app.innerHTML = shell(`<section class="result-card"><div class="eyebrow">六天挑戰完成</div><h2>${ending[0]}</h2><p class="hero-copy">${ending[1]}</p><div class="result-grid"><section class="summary-box"><h3>你的數位公民六邊形</h3>${radarChart()}<p><strong>優勢：</strong>${AXES[ranked[0]].name}</p><p><strong>優先加強：</strong>${AXES[ranked.at(-1)].name}</p></section><section class="summary-box"><h3>生活狀態</h3>${statusBar()}<h3>曾留下的選擇證據</h3><div class="history">${state.history.slice(-6).map((item) => `<div class="history-item"><strong>第 ${item.day} 天：</strong>${esc(item.option)}</div>`).join("")}</div></section></div><button class="secondary" id="restart">重新挑戰</button></section>`);
  document.querySelector("#restart").addEventListener("click", resetGame);
}

function renderReview(day) {
  const items = state.history.filter((item) => item.day === day);
  app.innerHTML = shell(`<section class="result-card"><div class="eyebrow">第 ${day} 天回顧</div><h2>${content.days.find((item) => item.day === day).title}</h2><div class="history">${items.map((item) => `<div class="history-item"><strong>${esc(item.question)}</strong><br>${esc(item.option)}<br><small>${esc(item.feedback)}</small></div>`).join("")}</div><button class="primary" id="back">回到地圖</button></section>`);
  document.querySelector("#back").addEventListener("click", () => { view = "map"; render(); });
}

function resetGame() {
  if (!confirm("要清除本機的正式紀錄並重新開始嗎？")) return;
  state = initialState(); warmupIndex = 0; currentDay = 1; stepIndex = 0; feedback = null; pendingNotice = ""; saveState(); view = "home"; render();
}

function renderError(error) {
  app.innerHTML = shell(`<section class="result-card"><h2>教材載入失敗</h2><p>${esc(error.message)}</p><p>請確認使用本機伺服器開啟，而不是直接點兩下 HTML 檔案。</p></section>`);
}

function render() {
  if (view === "home") renderHome();
  else if (view === "warmup") renderWarmup();
  else if (view === "map") renderMap();
  else if (view === "event") renderEvent();
  else if (view === "result") renderResult();
}

fetch("data/events.json")
  .then((response) => { if (!response.ok) throw new Error(`事件資料 HTTP ${response.status}`); return response.json(); })
  .then((data) => { content = data; render(); })
  .catch(renderError);
