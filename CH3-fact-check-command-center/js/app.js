(() => {
  "use strict";

  const state = {
    story: null,
    cases: null,
    nodeId: "intro_01",
    typingTimer: null,
    isTyping: false,
    selectedAction: null,
    soundEnabled: false,
    currentClueId: null,
    discoveredClues: [],
    completedClues: {},
    selectedQuestion: null,
    actionLog: []
  };

  const elements = {
    screens: [...document.querySelectorAll(".screen")],
    home: document.querySelector("#home-screen"),
    story: document.querySelector("#story-screen"),
    caseScreen: document.querySelector("#case-screen"),
    end: document.querySelector("#prototype-end"),
    start: document.querySelector("#start-button"),
    replay: document.querySelector("#replay-button"),
    dialoguePanel: document.querySelector("#dialogue-panel"),
    speaker: document.querySelector("#speaker-name"),
    text: document.querySelector("#dialogue-text"),
    next: document.querySelector("#next-dialogue"),
    skip: document.querySelector("#skip-typing"),
    character: document.querySelector("#character-image"),
    characterStage: document.querySelector("#character-stage"),
    choicePanel: document.querySelector("#choice-panel"),
    choicePrompt: document.querySelector("#choice-prompt"),
    choiceList: document.querySelector("#choice-list"),
    progress: document.querySelector("#progress-dots"),
    sound: document.querySelector("#sound-toggle"),
    exploreView: document.querySelector("#explore-view"),
    reviewView: document.querySelector("#review-view"),
    summaryView: document.querySelector("#summary-view"),
    hotspots: [...document.querySelectorAll(".hotspot")],
    questionButtons: [...document.querySelectorAll("#three-question-actions button")],
    followupPanel: document.querySelector("#followup-panel"),
    followupPrompt: document.querySelector("#followup-prompt"),
    followupActions: document.querySelector("#followup-actions"),
    reviewClueText: document.querySelector("#review-clue-text"),
    clueSequence: document.querySelector("#clue-sequence"),
    stageNumber: document.querySelector("#stage-number"),
    taskHeading: document.querySelector("#task-heading"),
    taskHint: document.querySelector("#task-hint"),
    evidenceStatus: document.querySelector("#evidence-status-text"),
    backToExplore: document.querySelector("#back-to-explore"),
    nextClue: document.querySelector("#next-clue"),
    questionReport: document.querySelector("#question-report"),
    missingEvidence: document.querySelector("#missing-evidence-text"),
    placedCount: document.querySelector("#placed-count"),
    totalClues: document.querySelector("#total-clues"),
    feedbackText: document.querySelector("#case-feedback-text"),
    finishCase: document.querySelector("#finish-case"),
    logToggle: document.querySelector("#case-log-toggle"),
    actionLog: document.querySelector("#action-log"),
    actionLogList: document.querySelector("#action-log-list")
  };

  const characterFiles = {
    system: null,
    koko: "./assets/characters/koko.png",
    sisi: "./assets/characters/sisi.png",
    xiaocheng: "./assets/characters/xiaocheng.png",
    ouni: "./assets/characters/ouni.png"
  };

  async function loadStory() {
    try {
      const [storyResponse, casesResponse] = await Promise.all([
        fetch("./data/prologue.json"),
        fetch("./data/cases.json")
      ]);
      if (!storyResponse.ok || !casesResponse.ok) throw new Error("教材資料載入失敗");
      state.story = await storyResponse.json();
      state.cases = await casesResponse.json();
    } catch (error) {
      console.error(error);
      elements.home.querySelector(".home-note").textContent = "教材資料載入失敗。請使用本機 HTTP 伺服器預覽。";
      elements.start.disabled = true;
    }
  }

  function showScreen(target) {
    elements.screens.forEach((screen) => screen.classList.toggle("is-active", screen === target));
    const heading = target.querySelector("h1, h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }

  function startStory() {
    if (!state.story) return;
    state.nodeId = state.story.start;
    state.selectedAction = null;
    showScreen(elements.story);
    renderNode();
  }

  function getNode() {
    return state.story.nodes.find((node) => node.id === state.nodeId);
  }

  function renderNode() {
    const node = getNode();
    if (!node) return finishStory();

    clearTyping();
    elements.choicePanel.hidden = true;
    elements.dialoguePanel.hidden = false;
    if (node.presentation === "choice" && node.choices) {
      setCharacter(node.character, node.speaker);
      setProgress(node.progress);
      revealChoicesIfNeeded();
      return;
    }
    elements.next.hidden = Boolean(node.choices);
    elements.skip.hidden = false;
    elements.speaker.textContent = node.speaker;
    setCharacter(node.character, node.speaker);
    setProgress(node.progress);
    typeText(node.text);
  }

  function setCharacter(characterId, speaker) {
    const file = characterFiles[characterId];
    if (!file) {
      elements.characterStage.hidden = true;
      return;
    }
    elements.characterStage.hidden = false;
    elements.character.src = file;
    elements.character.alt = speaker;
    elements.character.className = `character-${characterId}`;
    elements.character.animate(
      [{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 320, easing: "ease-out" }
    );
  }

  function setProgress(current) {
    const total = state.story.progressSteps;
    elements.progress.innerHTML = Array.from({ length: total }, (_, index) =>
      `<i class="${index + 1 === current ? "is-current" : ""}" aria-hidden="true"></i>`
    ).join("");
    elements.progress.setAttribute("aria-label", `序幕進度 ${current} / ${total}`);
  }

  function typeText(fullText) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    elements.text.textContent = "";
    elements.text.dataset.fullText = fullText;

    if (reduceMotion) {
      elements.text.textContent = fullText;
      state.isTyping = false;
      elements.skip.hidden = true;
      revealChoicesIfNeeded();
      return;
    }

    state.isTyping = true;
    let index = 0;
    state.typingTimer = window.setInterval(() => {
      index += 1;
      elements.text.textContent = fullText.slice(0, index);
      if (index >= fullText.length) completeTyping();
    }, 28);
  }

  function completeTyping() {
    clearTyping();
    elements.text.textContent = elements.text.dataset.fullText || "";
    elements.skip.hidden = true;
    revealChoicesIfNeeded();
  }

  function clearTyping() {
    if (state.typingTimer) window.clearInterval(state.typingTimer);
    state.typingTimer = null;
    state.isTyping = false;
  }

  function revealChoicesIfNeeded() {
    const node = getNode();
    if (!node?.choices) return;
    elements.dialoguePanel.hidden = true;
    elements.choicePanel.hidden = false;
    elements.choicePrompt.textContent = node.prompt || "你要採取什麼行動？";
    elements.choiceList.innerHTML = "";

    node.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-button";
      button.dataset.index = index + 1;
      button.textContent = choice.label;
      button.addEventListener("click", () => {
        state.selectedAction = choice.id;
        state.nodeId = choice.next;
        renderNode();
      }, { once: true });
      elements.choiceList.append(button);
    });
    elements.choiceList.querySelector("button")?.focus();
  }

  function advance() {
    if (state.isTyping) return completeTyping();
    const node = getNode();
    if (!node || node.choices) return;
    if (node.next === "END") return finishStory();
    if (node.next === "CASE_01") return startCase();
    state.nodeId = node.next;
    renderNode();
  }

  function finishStory() {
    clearTyping();
    showScreen(elements.end);
  }

  function startCase() {
    clearTyping();
    state.currentClueId = null;
    state.discoveredClues = [];
    state.completedClues = {};
    state.selectedQuestion = null;
    state.actionLog = [];
    elements.actionLog.classList.remove("is-open");
    elements.logToggle.setAttribute("aria-expanded", "false");
    showScreen(elements.caseScreen);
    renderCase();
  }

  function getActiveCase() {
    return state.cases?.cases?.[0];
  }

  function renderCase() {
    const caseData = getActiveCase();
    if (!caseData) return;
    elements.totalClues.textContent = String(caseData.clues.length);
    elements.hotspots.forEach((button) => {
      button.classList.remove("is-found");
      button.disabled = false;
      button.onclick = () => discoverClue(button.dataset.clueId);
    });
    showExploreView();
    updateInvestigationStatus();
  }

  function getClue(clueId) {
    return getActiveCase().clues.find((clue) => clue.id === clueId);
  }

  function discoverClue(clueId) {
    if (!state.discoveredClues.includes(clueId)) state.discoveredClues.push(clueId);
    state.currentClueId = clueId;
    state.selectedQuestion = null;
    showReviewView();
  }

  function showExploreView() {
    const completedCount = Object.keys(state.completedClues).length;
    elements.exploreView.hidden = false;
    elements.reviewView.hidden = true;
    elements.summaryView.hidden = true;
    elements.backToExplore.hidden = true;
    elements.nextClue.hidden = true;
    elements.finishCase.hidden = true;
    elements.stageNumber.textContent = "STEP 1";
    elements.taskHeading.textContent = "找出需要查核的位置";
    const remaining = getActiveCase().clues.length - completedCount;
    elements.hotspots.forEach((button) => {
      const completed = Boolean(state.completedClues[button.dataset.clueId]);
      button.disabled = completed;
      button.classList.toggle("is-found", completed);
    });
    elements.taskHint.textContent = remaining
      ? `還有 ${remaining} 個調查點。帶有虛線底線的資訊都可以點擊。`
      : "五個調查點都已找到，準備整理三問與證據缺口。";
    elements.feedbackText.textContent = remaining
      ? "先讀完整則消息，再點擊你覺得需要查核的位置。"
      : "調查點都找到了。現在把三問的結果整理成判斷依據。";
    if (!remaining) showSummaryView();
  }

  function showReviewView() {
    const clue = getClue(state.currentClueId);
    const index = state.discoveredClues.indexOf(clue.id) + 1;
    elements.exploreView.hidden = true;
    elements.reviewView.hidden = false;
    elements.summaryView.hidden = true;
    elements.followupPanel.hidden = true;
    elements.followupActions.innerHTML = "";
    elements.backToExplore.hidden = false;
    elements.nextClue.hidden = true;
    elements.finishCase.hidden = true;
    elements.stageNumber.textContent = "STEP 2";
    elements.taskHeading.textContent = "逐張審視線索";
    elements.clueSequence.textContent = `已發現第 ${index} 個調查點`;
    elements.reviewClueText.textContent = clue.text;
    elements.taskHint.textContent = "先選擇書本三問，再決定下一步要確認什麼。";
    elements.feedbackText.textContent = "這張線索提醒了什麼？先用書本三問選出最直接的檢查方向。";
    elements.questionButtons.forEach((button) => {
      button.disabled = false;
      button.classList.remove("is-selected", "is-wrong");
      button.onclick = () => answerQuestion(button.dataset.question);
    });
    elements.questionButtons[0]?.focus();
  }

  function answerQuestion(questionId) {
    const clue = getClue(state.currentClueId);
    const correct = clue.question === questionId;
    elements.questionButtons.forEach((button) => {
      button.classList.toggle("is-selected", correct && button.dataset.question === questionId);
      button.classList.toggle("is-wrong", !correct && button.dataset.question === questionId);
    });
    if (!correct) {
      elements.feedbackText.textContent = clue.wrongFeedback;
      elements.taskHint.textContent = "這次不直接公布答案；請根據小澄的追問再選一次。";
      return;
    }
    state.selectedQuestion = questionId;
    elements.feedbackText.textContent = clue.questionFeedback;
    elements.taskHint.textContent = "方向確認後，再選擇最能補足證據的下一步行動。";
    elements.questionButtons.forEach((button) => { button.disabled = true; });
    renderFollowup(clue);
  }

  function renderFollowup(clue) {
    elements.followupPanel.hidden = false;
    elements.followupPrompt.textContent = clue.followupPrompt;
    elements.followupActions.innerHTML = "";
    clue.options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = option.text;
      button.onclick = () => answerFollowup(clue, option, button);
      elements.followupActions.append(button);
    });
    elements.followupActions.querySelector("button")?.focus();
  }

  function answerFollowup(clue, option, selectedButton) {
    [...elements.followupActions.querySelectorAll("button")].forEach((button) => button.classList.remove("is-wrong"));
    if (!option.correct) {
      selectedButton.classList.add("is-wrong");
      elements.feedbackText.textContent = option.feedback;
      elements.taskHint.textContent = "這個做法還不能補足證據。讀完回饋後可以再選一次。";
      return;
    }
    [...elements.followupActions.querySelectorAll("button")].forEach((button) => { button.disabled = true; });
    selectedButton.classList.add("is-correct");
    state.completedClues[clue.id] = { question: clue.question, action: option.text };
    state.actionLog.push({ question: clue.question, text: clue.text, action: option.text });
    elements.feedbackText.textContent = option.feedback;
    elements.taskHint.textContent = "這個調查點已完成。回到案件，繼續找下一個可疑位置。";
    elements.backToExplore.hidden = true;
    elements.nextClue.hidden = false;
    updateInvestigationStatus();
  }

  function updateInvestigationStatus() {
    const caseData = getActiveCase();
    const completed = Object.keys(state.completedClues).length;
    elements.placedCount.textContent = String(completed);
    elements.evidenceStatus.textContent = completed
      ? `已完成 ${completed} 項，仍有證據缺口`
      : "尚未開始調查";
    elements.actionLogList.innerHTML = state.actionLog.length
      ? state.actionLog.map((entry) => `<li class="is-correct"><strong>${caseData.questions[entry.question].label}</strong><br>${entry.action}</li>`).join("")
      : "<li>案件已送達，等待第一項行動。</li>";
  }

  function showSummaryView() {
    const caseData = getActiveCase();
    elements.exploreView.hidden = true;
    elements.reviewView.hidden = true;
    elements.summaryView.hidden = false;
    elements.backToExplore.hidden = true;
    elements.nextClue.hidden = true;
    elements.finishCase.hidden = false;
    elements.stageNumber.textContent = "STEP 3";
    elements.taskHeading.textContent = "整理三問與證據缺口";
    elements.feedbackText.textContent = "三問不是三個答案，而是三條查核路徑。請用目前取得的結果決定警報狀態。";
    elements.evidenceStatus.textContent = "證據不足，建議黃色警報";
    elements.taskHint.textContent = "尚未查到可靠支持，不等於消息正確；也不必在證據不足時急著宣布是假消息。";
    elements.questionReport.innerHTML = Object.entries(caseData.questions).map(([id, question]) => {
      const count = Object.values(state.completedClues).filter((item) => item.question === id).length;
      return `<article><span>${count} 項調查</span><strong>${question.label}</strong><p>${question.description}</p></article>`;
    }).join("");
    elements.missingEvidence.textContent = caseData.missingEvidence;
    elements.finishCase.focus();
  }

  function completeCase() {
    const caseData = getActiveCase();
    document.querySelector("#case-summary").textContent = caseData.completion;
    showScreen(elements.end);
  }

  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    elements.sound.setAttribute("aria-pressed", String(state.soundEnabled));
    elements.sound.setAttribute("aria-label", `音效目前${state.soundEnabled ? "開啟" : "關閉"}`);
    elements.sound.textContent = `音效：${state.soundEnabled ? "開" : "關"}`;
  }

  elements.start.addEventListener("click", startStory);
  elements.replay.addEventListener("click", () => showScreen(elements.home));
  elements.next.addEventListener("click", (event) => { event.stopPropagation(); advance(); });
  elements.skip.addEventListener("click", (event) => { event.stopPropagation(); completeTyping(); });
  elements.dialoguePanel.addEventListener("click", advance);
  elements.sound.addEventListener("click", toggleSound);
  elements.finishCase.addEventListener("click", completeCase);
  elements.backToExplore.addEventListener("click", showExploreView);
  elements.nextClue.addEventListener("click", showExploreView);
  elements.logToggle.addEventListener("click", () => {
    const open = elements.actionLog.classList.toggle("is-open");
    elements.logToggle.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && elements.story.classList.contains("is-active") && document.activeElement === document.body) {
      event.preventDefault();
      advance();
    }
  });

  loadStory();
})();
