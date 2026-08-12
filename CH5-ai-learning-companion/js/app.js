(() => {
  "use strict";

  const STORAGE_KEY = "gailearn.ch5.aiCompanion.v1";
  const DAY_MILESTONES = { 1: 10, 2: 20, 3: 10, 4: 10, 5: 10 };
  const BADGES = {
    fairness: ["公", "公平性"], transparency: ["透", "透明性"], accountability: ["責", "問責性"],
    privacy: ["隱", "隱私保護"], humanAgency: ["人", "人類主導"]
  };
  const CHARACTERS = {
    system: { name: "系統", type: "none" }, host: { name: "主持人", type: "scene", file: "./assets/scenes/opening-host-stage.png" }, coco: { name: "可可", type: "image", file: "./assets/characters/koko.png" },
    jiji: { name: "吱吱", type: "image", file: "./assets/characters/jiji.png" }, sisi: { name: "思思", type: "image", file: "./assets/characters/sisi.png" },
    onick: { name: "星芽", type: "image", file: "./assets/characters/xingya.png?v=2" }, teacher: { name: "指導老師", type: "scene", file: "./assets/scenes/teacher-lab-scene.png" },
    judge: { name: "評審", type: "scene", file: "./assets/scenes/judge-final-scene.png" }, player: { name: "專案設計師", type: "none" }
  };
  const SPEAKER_KEYS = { 系統: "system", 主持人: "host", 可可: "coco", 吱吱: "jiji", 思思: "sisi", 星芽: "onick", 歐匿: "onick", 指導老師: "teacher", 評審: "judge", 玩家今日提示: "player" };
  const ENDINGS = {
    A: ["負責任的全科 AI 學伴", "星芽不是最快交答案的學伴，卻能讓學生知道怎麼想、資料去了哪裡、錯了找誰修。評審通過公開測試，並邀請團隊進行校內試用。"],
    B: ["高效率答案機器", "展示跑得飛快，現場新題卻沒有人能說明。評審退回學習功能，要求把答案鍵改成提示與練習流程。"],
    C: ["資料蒐集失控", "同學的照片、紀錄或檔案出現在不該出現的地方。展示中止，團隊先完成刪除、通知與權限重設。"],
    D: ["幻覺連鎖", "一筆沒查的資料帶出更多錯誤。團隊公開更正，建立來源查核與錯誤紀錄後才能重新參賽。"],
    E: ["透明度不足", "功能完成了，評審卻無法分辨哪些由 AI 生成。團隊補交協作說明與版本紀錄，作品暫緩評分。"],
    F: ["安全但無法使用", "你們保留了最安全的三項設定，也把其他核心功能暫停公開。評審請團隊從一個低風險核心功能重新開始：負責任使用不是完全不用。"],
    G: ["可改善的 AI 協作者", "星芽已能幫忙，但仍有幾項風險沒有收好。團隊整理已做到與下一步，準備從關鍵日期重新測試。"]
  };

  let content = null;
  let state = null;
  let typingTimer = null;

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    screens: [...document.querySelectorAll(".screen")], cover: $("#cover-screen"), story: $("#story-screen"), ending: $("#ending-screen"),
    newGame: $("#new-game"), continueGame: $("#continue-game"), dayLabel: $("#day-label"), storyTitle: $("#story-title"),
    progressValue: $("#progress-value"), progressBar: $("#progress-bar"), riskValue: $("#risk-value"), riskBar: $("#risk-bar"),
    badgeList: $("#badge-list"), stage: $(".stage"), stageKicker: $("#stage-kicker"), stageDisplay: $("#stage-display"), characterArea: $("#character-area"),
    introCard: $("#intro-card"), speaker: $("#speaker-name"), dialogue: $("#dialogue-text"), nextDialogue: $("#next-dialogue"), skipIntro: $("#skip-intro"),
    eventCard: $("#event-card"), eventCount: $("#event-count"), eventTitle: $("#event-title"), eventText: $("#event-text"),
    interaction: $("#interaction-preview"), choiceList: $("#choice-list"), feedbackCard: $("#feedback-card"), feedbackLight: $("#feedback-light"),
    feedbackDialogue: $("#feedback-dialogue"), feedbackReason: $("#feedback-reason"), feedbackRecommendation: $("#feedback-recommendation"),
    progressDelta: $("#progress-delta"), riskDelta: $("#risk-delta"), feedbackNext: $("#feedback-next"), daySummary: $("#day-summary"),
    summaryTitle: $("#summary-title"), summaryText: $("#summary-text"), summaryProgress: $("#summary-progress"), summaryRisk: $("#summary-risk"),
    nextDay: $("#next-day"), onickMode: $("#onick-mode"), objective: $("#objective-text"), dayRoute: $("#day-route"), dayRecord: $("#day-record"),
    settingsButton: $("#settings-button"), logButton: $("#log-button"), historyList: $("#history-list"), live: $("#live-region"),
    reduceMotion: $("#reduce-motion"), highContrast: $("#high-contrast"), textScale: $("#text-scale"),
    endingCode: $("#ending-code"), endingTitle: $("#ending-title"), endingText: $("#ending-text"), endingProgress: $("#ending-progress"),
    endingRisk: $("#ending-risk"), endingProgressBar: $("#ending-progress-bar"), endingRiskBar: $("#ending-risk-bar"), endingBadges: $("#ending-badges"), endingCast: $("#ending-cast"), retryDay3: $("#retry-day3"), retryDay4: $("#retry-day4"), restart: $("#restart-game")
  };

  function blankState() {
    return {
      version: 1, day: 1, eventIndex: 0, openingIndex: 0, mode: "intro", workPoints: 0, milestoneProgress: 0,
      reworkPenalty: 0, projectProgress: 0, ethicalRisk: 20, flags: {}, badges: Object.fromEntries(Object.keys(BADGES).map((id) => [id, { score: 0, active: false, cap: null }])),
      history: [], choiceOrders: {}, selectedRecordDay: 1, dayStarts: { 1: { projectProgress: 0, ethicalRisk: 20 } }, checkpoints: {}, companionBonusDays: [], settings: { reducedMotion: false, highContrast: false, textScale: "1" }
    };
  }

  async function init() {
    try {
      const response = await fetch("./data/events.json");
      if (!response.ok) throw new Error("事件資料載入失敗");
      content = await response.json();
      const saved = loadSaved();
      elements.continueGame.hidden = !saved;
      bindEvents();
      if (saved) applySettings(saved.settings);
    } catch (error) {
      console.error(error);
      elements.newGame.disabled = true;
      elements.newGame.textContent = "教材資料載入失敗";
    }
  }

  function bindEvents() {
    elements.newGame.addEventListener("click", () => startNew());
    elements.continueGame.addEventListener("click", () => { state = loadSaved(); applySettings(state.settings); showScreen(elements.story); resume(); });
    elements.nextDialogue.addEventListener("click", advanceDialogue);
    elements.skipIntro.addEventListener("click", startEvents);
    elements.feedbackNext.addEventListener("click", afterFeedback);
    elements.nextDay.addEventListener("click", advanceDay);
    elements.restart.addEventListener("click", startNew);
    elements.retryDay3.addEventListener("click", () => retryFromDay(3));
    elements.retryDay4.addEventListener("click", () => retryFromDay(4));
    elements.settingsButton.addEventListener("click", () => toggleDrawer("settings-panel", elements.settingsButton));
    elements.logButton.addEventListener("click", () => { renderHistory(); toggleDrawer("log-panel", elements.logButton); });
    document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => closeDrawer(button.dataset.close)));
    elements.reduceMotion.addEventListener("change", saveSettings);
    elements.highContrast.addEventListener("change", saveSettings);
    elements.textScale.addEventListener("change", saveSettings);
  }

  function startNew() {
    state = blankState();
    state.checkpoints[1] = snapshot();
    save(); applySettings(state.settings); showScreen(elements.story); renderIntro();
  }

  function resume() {
    updateChrome();
    if (state.mode === "intro") renderIntro();
    else if (state.mode === "event") renderEvent();
    else if (state.mode === "feedback") renderFeedback();
    else if (state.mode === "summary") renderSummary();
    else if (state.mode === "ending") renderEnding();
  }

  function showScreen(target) {
    elements.screens.forEach((screen) => screen.classList.toggle("is-active", screen === target));
    const heading = target.querySelector("h1,h2");
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }

  function currentDay() { return content.days.find((item) => item.day === state.day); }
  function dayEvents() { return content.events.filter((event) => event.day === state.day); }
  function currentEvent() { return dayEvents()[state.eventIndex]; }

  function renderIntro() {
    state.mode = "intro"; hideCards(); updateChrome();
    elements.introCard.hidden = false;
    const day = currentDay();
    const line = day.opening[state.openingIndex] || `系統：「${day.objective}」`;
    const parsed = parseLine(line);
    elements.speaker.textContent = parsed.name;
    setCharacter(parsed.key);
    typeText(parsed.text);
    renderTimeStrip();
    save();
  }

  function parseLine(line) {
    const match = line.match(/^(系統|主持人|可可|吱吱|思思|星芽|歐匿|指導老師|評審|玩家今日提示)：?「?(.+?)」?$/);
    if (!match) return { key: "system", name: "系統", text: line };
    return { key: SPEAKER_KEYS[match[1]] || "system", name: match[1], text: match[2] };
  }

  function advanceDialogue() {
    if (typingTimer) { finishTyping(); return; }
    const total = currentDay().opening.length;
    if (state.openingIndex < total - 1) { state.openingIndex += 1; renderIntro(); }
    else startEvents();
  }

  function startEvents() { clearTyping(); state.openingIndex = currentDay().opening.length; state.mode = "event"; renderEvent(); }

  function renderEvent() {
    const event = currentEvent();
    if (!event) return renderSummary();
    state.mode = "event"; hideCards(); updateChrome(); setCharacter(eventSpeaker(event));
    elements.eventCard.hidden = false;
    elements.eventCount.textContent = `任務 ${state.eventIndex + 1}／5 · ${event.id}`;
    elements.eventTitle.textContent = event.title;
    elements.eventText.textContent = event.eventText;
    elements.interaction.innerHTML = interactionMarkup(event);
    elements.choiceList.querySelectorAll("button").forEach((button) => button.remove());
    orderedChoices(event).forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "choice-button"; button.dataset.key = String.fromCharCode(65 + index); button.textContent = choice.label;
      button.addEventListener("click", () => choose(choice));
      elements.choiceList.appendChild(button);
    });
    save();
  }

  function orderedChoices(event) {
    state.choiceOrders ||= {};
    if (!state.choiceOrders[event.id]) {
      const ids = event.choices.map((choice) => choice.id);
      for (let index = ids.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
      }
      state.choiceOrders[event.id] = ids;
    }
    const byId = new Map(event.choices.map((choice) => [choice.id, choice]));
    const ordered = state.choiceOrders[event.id].map((id) => byId.get(id)).filter(Boolean);
    event.choices.forEach((choice) => { if (!ordered.includes(choice)) ordered.push(choice); });
    return ordered;
  }

  function eventSpeaker(event) {
    if (event.day === 5 && ["D5-02", "D5-03", "D5-04"].includes(event.id)) return "judge";
    if (event.id === "D4-05") return "teacher";
    if (/作文|學生|學會/.test(event.title)) return "sisi";
    if (/海報|進度|翻譯/.test(event.title)) return "jiji";
    if (/資料|權限|引用|參考書/.test(event.title)) return "coco";
    return "onick";
  }

  function interactionMarkup(event) {
    if (event.id === "D3-01") return `<span class="token">王小明</span><span class="token">光明國中二年三班</span><span class="token">學號 21307</span><span class="token">數學列式易錯</span>`;
    if (["D3-03", "D3-04", "D5-05"].includes(event.id)) return `<span class="switch">相簿權限 <i></i></span><span class="switch">保存紀錄 <i></i></span><span class="switch">人類確認 <i></i></span>`;
    if (["D2-04", "D4-04"].includes(event.id)) return `<span class="source">書名／作者／出版社</span><span class="source">圖書館查詢</span><span class="source">原始資料</span>`;
    if (event.day === 5) return `<span class="source">AI 做了什麼</span><span class="source">團隊如何處理</span><span class="source">誰做最後決定</span>`;
    return `<span class="token">讀懂情境</span><span class="token">做出設計</span><span class="token">觀察後果</span>`;
  }

  function choose(choice) {
    const event = currentEvent();
    const oldP = state.projectProgress, oldR = state.ethicalRisk;
    let riskDelta = choice.riskDelta || 0;
    if (event.id === "D2-01" && choice.key === "B" && state.flags.essay_example_seen) riskDelta += 3;
    if (choice.light === "green" && state.flags.companion_charter && !state.companionBonusDays.includes(state.day)) {
      riskDelta -= 1; state.companionBonusDays.push(state.day);
    }
    state.workPoints += choice.workPoints || 0;
    state.milestoneProgress += DAY_MILESTONES[state.day] / 5;
    if (event.id === "D4-01" && choice.key === "A" && state.flags.full_essay_generated) state.reworkPenalty += 4;
    if (event.id === "D4-04" && choice.key === "A" && state.flags.unverified_citation) state.reworkPenalty += 5;
    state.ethicalRisk = clamp(state.ethicalRisk + riskDelta, 0, 100);
    Object.entries(choice.badgeDelta || {}).forEach(([id, delta]) => {
      const badge = state.badges[id]; if (!badge) return; badge.active = true; badge.score = clamp(badge.score + delta, -6, 6);
    });
    (choice.setFlags || []).forEach((flag) => { state.flags[flag] = true; });
    state.projectProgress = calculateProgress();
    if (event.id === "D5-05" && choice.key === "B") {
      state.flags.minimum_safe_release = true;
      state.projectProgress = Math.min(state.projectProgress, 59);
    }
    state.history.push({ day: state.day, eventId: event.id, eventTitle: event.title, choiceId: choice.id, choiceLabel: choice.label, light: choice.light, pBefore: oldP, pAfter: state.projectProgress, rBefore: oldR, rAfter: state.ethicalRisk });
    state.lastChoice = choice; state.lastDelta = { p: state.projectProgress - oldP, r: state.ethicalRisk - oldR };
    state.mode = "feedback"; save(); renderFeedback();
  }

  function calculateProgress() { return clamp(Math.round(state.milestoneProgress + Math.min(40, state.workPoints * .2) - state.reworkPenalty), 0, 100); }

  function renderFeedback() {
    hideCards(); updateChrome();
    const choice = state.lastChoice; const light = choice.light;
    elements.feedbackCard.hidden = false;
    const labels = { green: ["✓", "綠燈｜可以進行"], yellow: ["△", "黃燈｜修改後再用"], red: ["!", "紅燈｜停止或改用安全方式"] };
    elements.feedbackLight.className = `light-result ${light}`;
    elements.feedbackLight.querySelector("span").textContent = labels[light][0];
    elements.feedbackLight.querySelector("strong").textContent = labels[light][1];
    elements.feedbackDialogue.innerHTML = (choice.feedback || []).map((line) => `<p><strong>${escapeHtml(CHARACTERS[line.speaker]?.name || "系統")}：</strong>${escapeHtml(line.text)}</p>`).join("");
    elements.feedbackReason.textContent = choice.reason;
    elements.feedbackRecommendation.textContent = choice.recommendation;
    elements.progressDelta.textContent = `專案進度 ${signed(state.lastDelta.p)}`;
    elements.riskDelta.textContent = `倫理風險 ${signed(state.lastDelta.r)}`;
    elements.progressDelta.className = `delta-value ${state.lastDelta.p >= 0 ? "is-good" : "is-bad"}`;
    elements.riskDelta.className = `delta-value ${state.lastDelta.r <= 0 ? "is-good" : "is-bad"}`;
    elements.feedbackNext.textContent = state.day === 5 && state.eventIndex === dayEvents().length - 1 ? "繼續" : "繼續設計";
    setCharacter(choice.feedback?.[0]?.speaker || "onick");
    elements.live.textContent = `專案進度${spokenDelta(state.lastDelta.p)}，現在 ${state.projectProgress}。倫理風險${spokenDelta(state.lastDelta.r)}，現在 ${state.ethicalRisk}。`;
    elements.feedbackCard.focus({ preventScroll: true });
  }

  function afterFeedback() {
    state.eventIndex += 1; state.lastChoice = null; state.lastDelta = null;
    if (state.eventIndex >= dayEvents().length) renderSummary(); else renderEvent();
  }

  function renderSummary() {
    state.mode = "summary"; hideCards(); updateChrome();
    elements.stage.classList.add("summary-mode");
    const day = currentDay(), start = state.dayStarts[state.day];
    elements.daySummary.hidden = false;
    elements.summaryTitle.textContent = `第 ${state.day} 天完成`;
    elements.summaryText.textContent = day.closing.find((line) => line.startsWith("日結旁白"))?.replace(/^日結旁白：?「?|」$/g, "") || "今日設計紀錄已保存。";
    const dayProgress = state.projectProgress - start.projectProgress, dayRisk = state.ethicalRisk - start.ethicalRisk;
    elements.summaryProgress.className = `summary-metric ${dayProgress >= 0 ? "is-good" : "is-bad"}`;
    elements.summaryRisk.className = `summary-metric ${dayRisk <= 0 ? "is-good" : "is-bad"}`;
    elements.summaryProgress.innerHTML = `<small>專案進度</small><strong>${signed(dayProgress)}</strong><em>目前 ${state.projectProgress}</em><i><b style="width:${state.projectProgress}%"></b></i>`;
    elements.summaryRisk.innerHTML = `<small>倫理風險</small><strong>${signed(dayRisk)}</strong><em>目前 ${state.ethicalRisk}</em><i><b style="width:${state.ethicalRisk}%"></b></i>`;
    elements.nextDay.textContent = state.day === 5 ? "查看評審結果" : "進入下一天";
    setCharacter(state.day === 5 ? "judge" : "onick");
    elements.daySummary.focus({ preventScroll: true }); save();
  }

  function advanceDay() {
    if (state.day === 5) return finishGame();
    state.day += 1; state.eventIndex = 0; state.openingIndex = 0; state.mode = "intro";
    state.dayStarts[state.day] = { projectProgress: state.projectProgress, ethicalRisk: state.ethicalRisk };
    state.checkpoints[state.day] = snapshot(); save(); renderIntro();
  }

  function finishGame() { state.endingId = determineEnding(); state.mode = "ending"; save(); showScreen(elements.ending); renderEnding(); }

  function determineEnding() {
    const has = (...flags) => flags.some((flag) => state.flags[flag]);
    const privacyCritical = has("class_photo_uploaded", "full_photo_access", "overbroad_permissions", "privacy_warning_ignored", "unreleased_exam_uploaded") && !has("privacy_incident_remediated", "privacy_public_remediation");
    const learningDependency =
      (has("math_answer_dependency") && !has("math_process_verified")) ||
      (has("full_essay_generated") && !has("essay_authorship_repaired")) ||
      (has("translation_submitted") && !has("translation_verified"));
    const hallucination =
      (has("unverified_citation", "hallucination_reconfirmed") && !has("citation_error_repaired")) ||
      (has("math_process_error_ignored") && !has("math_process_verified"));
    const transparency = has("ai_use_hidden", "essay_deception") && !has("ai_use_fully_disclosed", "limitations_disclosed");
    const highRisk = has("ai_major_decision", "unsafe_high_risk_advice") && !has("high_risk_boundary_proven");
    const badgeStatus = (id) => getBadgeStatus(state.badges[id]);
    if (privacyCritical && (state.ethicalRisk >= 70 || badgeStatus("privacy") === "red" || has("data_necessity_unanswered", "unreleased_exam_uploaded"))) return "C";
    if (state.projectProgress >= 80 && ((badgeStatus("humanAgency") === "red" && learningDependency) || (has("answer_machine_positioning") && has("demo_only_no_learning_evidence")))) return "B";
    if (hallucination && (badgeStatus("accountability") === "red" || has("hallucination_reconfirmed", "math_process_error_ignored"))) return "D";
    if (transparency || (badgeStatus("transparency") === "red" && !has("ai_use_fully_disclosed", "limitations_disclosed"))) return "E";
    const greenBadges = Object.values(state.badges).filter((badge) => getBadgeStatus(badge) === "green").length;
    if (state.projectProgress >= 80 && state.ethicalRisk < 30 && greenBadges >= 4 && has("learning_effect_demonstrated") && has("responsible_defaults_enabled") && !privacyCritical && !learningDependency && !hallucination && !highRisk) return "A";
    if (has("minimum_safe_release") && state.projectProgress < 60 && state.ethicalRisk < 30 && !privacyCritical && !learningDependency && !hallucination && !transparency && !highRisk) return "F";
    return "G";
  }

  function renderEnding() {
    showScreen(elements.ending);
    const id = state.endingId || determineEnding(), ending = ENDINGS[id];
    elements.endingCode.textContent = `結局 ${id}`; elements.endingTitle.textContent = ending[0]; elements.endingText.textContent = ending[1];
    elements.endingProgress.textContent = state.projectProgress; elements.endingRisk.textContent = state.ethicalRisk;
    elements.endingProgressBar.style.width = `${state.projectProgress}%`; elements.endingRiskBar.style.width = `${state.ethicalRisk}%`;
    elements.endingProgressBar.dataset.level = metricLevel(state.projectProgress); elements.endingRiskBar.dataset.level = metricLevel(state.ethicalRisk);
    elements.endingBadges.innerHTML = Object.entries(BADGES).map(([key, [, name]]) => badgeMarkup(key, name, getBadgeStatus(state.badges[key]))).join("");
    elements.endingCast.style.backgroundImage = `url(./assets/endings/ending-${id.toLowerCase()}.png)`;
    elements.retryDay3.hidden = !state.checkpoints[3]; elements.retryDay4.hidden = !state.checkpoints[4];
  }

  function retryFromDay(day) {
    const checkpoint = state.checkpoints[day]; if (!checkpoint) return;
    const settings = state.settings, oldCheckpoints = state.checkpoints;
    state = JSON.parse(JSON.stringify(checkpoint)); state.settings = settings; state.checkpoints = Object.fromEntries(Object.entries(oldCheckpoints).filter(([key]) => Number(key) <= day));
    state.mode = "intro"; save(); showScreen(elements.story); renderIntro();
  }

  function updateChrome() {
    const day = currentDay(); if (!day) return;
    elements.dayLabel.textContent = `DAY ${state.day}／5`; elements.storyTitle.textContent = day.title.split("：")[0];
    elements.progressValue.textContent = state.projectProgress; elements.progressBar.style.width = `${state.projectProgress}%`;
    elements.riskValue.textContent = state.ethicalRisk; elements.riskBar.style.width = `${state.ethicalRisk}%`;
    elements.progressBar.dataset.level = metricLevel(state.projectProgress);
    elements.riskBar.dataset.level = metricLevel(state.ethicalRisk);
    renderTimeStrip();
    elements.objective.textContent = day.objective; elements.onickMode.textContent = onickMode();
    elements.badgeList.innerHTML = Object.entries(BADGES).map(([id, [short, name]]) => {
      const status = getBadgeStatus(state.badges[id]); return badgeMarkup(id, name, status);
    }).join("");
    elements.dayRoute.innerHTML = content.days.map((item) => `<span class="${item.day < state.day ? "is-done" : item.day === state.day ? "is-current" : ""}">DAY ${item.day}｜${item.title.split("：")[0]}</span>`).join("");
  }

  function metricLevel(value) { return value < 40 ? "low" : value < 70 ? "medium" : "high"; }

  function renderTimeStrip() {
    const remaining = 6 - state.day;
    elements.stageKicker.textContent = state.day === 5 ? "最後一天" : "剩餘時間";
    elements.stageDisplay.innerHTML = `<span class="time-boxes" aria-hidden="true">${Array.from({ length: 5 }, (_, index) => `<i class="${index < remaining ? "is-full" : "is-used"}"></i>`).join("")}</span><small>${remaining} 天</small>`;
    window.requestAnimationFrame(renderDayRecord);
  }

  function renderDayRecord() {
    if (!state.selectedRecordDay || state.selectedRecordDay > state.day) state.selectedRecordDay = state.day;
    elements.dayRoute.innerHTML = content.days.map((item) => `<button type="button" data-day="${item.day}" ${item.day > state.day ? "disabled" : ""} class="${item.day < state.day ? "is-done" : item.day === state.day ? "is-current" : ""}">DAY ${item.day}｜${escapeHtml(item.title)}</button>`).join("");
    elements.dayRoute.querySelectorAll("button:not(:disabled)").forEach((button) => button.addEventListener("click", () => { state.selectedRecordDay = Number(button.dataset.day); renderDayRecord(); save(); }));
    const selectedDay = state.selectedRecordDay;
    const day = content.days.find((item) => item.day === selectedDay);
    const records = state.history.filter((item) => item.day === selectedDay);
    elements.dayRoute.querySelectorAll("button").forEach((button) => button.classList.toggle("is-selected", Number(button.dataset.day) === selectedDay));
    if (!records.length) { elements.dayRecord.innerHTML = `<h4>DAY ${selectedDay}｜${escapeHtml(day.title)}</h4><p>尚未完成正式選擇。</p>`; return; }
    const totalP = records.reduce((sum, item) => sum + item.pAfter - item.pBefore, 0);
    const totalR = records.reduce((sum, item) => sum + item.rAfter - item.rBefore, 0);
    elements.dayRecord.innerHTML = `<h4>DAY ${selectedDay}｜${escapeHtml(day.title)}</h4><div class="record-total"><span class="${totalP >= 0 ? "is-good" : "is-bad"}">進度 ${signed(totalP)}</span><span class="${totalR <= 0 ? "is-good" : "is-bad"}">風險 ${signed(totalR)}</span></div><ol>${records.map((item) => `<li><strong>${escapeHtml(item.eventTitle)}</strong><p>${escapeHtml(item.choiceLabel)}</p><div><em class="light-${item.light}">${({ green: "綠燈", yellow: "黃燈", red: "紅燈" })[item.light]}</em><span class="${item.pAfter - item.pBefore >= 0 ? "is-good" : "is-bad"}">進度 ${signed(item.pAfter - item.pBefore)}</span><span class="${item.rAfter - item.rBefore <= 0 ? "is-good" : "is-bad"}">風險 ${signed(item.rAfter - item.rBefore)}</span></div></li>`).join("")}</ol>`;
  }

  function onickMode() {
    if (state.flags.answer_machine_positioning || state.flags.math_answer_dependency) return "答案型模式風險";
    if (state.flags.guided_learning_enabled || state.flags.companion_charter) return "引導型學伴";
    return state.day === 1 ? "等待設定" : "協作原型";
  }

  function getBadgeStatus(badge) { if (!badge?.active) return "inactive"; if (badge.score >= 2 && badge.cap !== "yellow") return "green"; if (badge.score <= -2) return "red"; return "yellow"; }
  function badgeStatusLabel(status) { return ({ inactive: "尚未測試", green: "綠色", yellow: "黃色", red: "紅色" })[status]; }
  function badgeMarkup(key, name, status) {
    const files = { fairness: "fairness", transparency: "transparency", accountability: "accountability", privacy: "privacy", humanAgency: "human-agency" };
    return `<span class="ethics-seal" data-status="${status}" aria-label="${name}：${badgeStatusLabel(status)}"><i class="seal-icon"><img src="./assets/badges/${files[key]}.png" alt=""></i><b>${name}</b><em aria-hidden="true">${status === "inactive" ? "—" : "★"}</em></span>`;
  }
  function setCharacter(key) {
    const character = CHARACTERS[key] || CHARACTERS.onick; elements.characterArea.innerHTML = "";
    if (character.type === "none") return;
    if (character.type === "scene") { const img = document.createElement("img"); img.className = "portrait scene-portrait"; img.src = character.file; img.alt = ""; elements.characterArea.appendChild(img); return; }
    if (character.type === "sprite") { const div = document.createElement("div"); div.className = `portrait sprite ${key}`; elements.characterArea.appendChild(div); return; }
    const img = document.createElement("img"); img.className = "portrait"; img.src = character.file; img.alt = ""; elements.characterArea.appendChild(img);
  }

  function hideCards() { clearTyping(); elements.stage?.classList.remove("summary-mode"); [elements.introCard, elements.eventCard, elements.feedbackCard, elements.daySummary].forEach((item) => { item.hidden = true; }); }
  function typeText(text) {
    clearTyping();
    if (state.settings.reducedMotion) { elements.dialogue.textContent = text; return; }
    elements.dialogue.textContent = ""; let index = 0;
    typingTimer = window.setInterval(() => { elements.dialogue.textContent += text[index++] || ""; if (index >= text.length) clearTyping(); }, 28);
  }
  function finishTyping() { const parsed = parseLine(currentDay().opening[state.openingIndex] || ""); clearTyping(); elements.dialogue.textContent = parsed.text; }
  function clearTyping() { if (typingTimer) window.clearInterval(typingTimer); typingTimer = null; }

  function toggleDrawer(id, button) { const panel = document.getElementById(id); const open = panel.hidden; panel.hidden = !open; button.setAttribute("aria-expanded", String(open)); if (open) panel.querySelector("h2").focus?.(); }
  function closeDrawer(id) { const panel = document.getElementById(id); panel.hidden = true; const trigger = id === "settings-panel" ? elements.settingsButton : elements.logButton; trigger.setAttribute("aria-expanded", "false"); trigger.focus(); }
  function renderHistory() { elements.historyList.innerHTML = state.history.length ? state.history.map((item) => `<li><strong>${item.eventId}｜${escapeHtml(item.eventTitle)}</strong><br>${escapeHtml(item.choiceLabel)}<br>專案進度 ${item.pAfter}｜倫理風險 ${item.rAfter}</li>`).join("") : "<li>尚未做出正式選擇。</li>"; }
  function saveSettings() { state.settings = { reducedMotion: elements.reduceMotion.checked, highContrast: elements.highContrast.checked, textScale: elements.textScale.value }; applySettings(state.settings); save(); }
  function applySettings(settings = {}) { document.body.classList.toggle("reduce-motion", Boolean(settings.reducedMotion)); document.body.classList.toggle("high-contrast", Boolean(settings.highContrast)); document.documentElement.style.setProperty("--scale", settings.textScale || "1"); elements.reduceMotion.checked = Boolean(settings.reducedMotion); elements.highContrast.checked = Boolean(settings.highContrast); elements.textScale.value = settings.textScale || "1"; }

  function snapshot() { const copy = JSON.parse(JSON.stringify(state)); copy.checkpoints = {}; return copy; }
  function save() { if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadSaved() { try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY)); return data?.version === 1 ? data : null; } catch { return null; } }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function signed(value) { return value > 0 ? `+${value}` : String(value); }
  function spokenDelta(value) { return value > 0 ? `增加 ${value}` : value < 0 ? `降低 ${Math.abs(value)}` : "不變"; }
  function escapeHtml(value = "") { return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]); }

  init();
})();
