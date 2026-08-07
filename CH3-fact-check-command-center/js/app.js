(() => {
  "use strict";

  const state = {
    story: null,
    cases: null,
    mission2: null,
    mission3: null,
    mission4: null,
    nodeId: "intro_01",
    typingTimer: null,
    isTyping: false,
    selectedAction: null,
    soundEnabled: false,
    currentClueId: null,
    discoveredClues: [],
    completedClues: {},
    selectedQuestion: null,
    actionLog: [],
    mission2Sequence: [],
    mission2Phase: "opening",
    mission2Judgment: null,
    mission2TransitionTimer: null,
    mission3Index: 0,
    mission3Order: [],
    mission3Selected: [],
    mission3Solved: false,
    mission3History: [],
    mission3TransitionTimer: null,
    mission4Phase: "opening",
    mission4Selected: [],
    mission4Evidence: []
  };

  const elements = {
    screens: [...document.querySelectorAll(".screen")],
    home: document.querySelector("#home-screen"),
    story: document.querySelector("#story-screen"),
    caseScreen: document.querySelector("#case-screen"),
    end: document.querySelector("#prototype-end"),
    mission2Screen: document.querySelector("#mission2-screen"),
    start: document.querySelector("#start-button"),
    replay: document.querySelector("#replay-button"),
    continueMission2: document.querySelector("#continue-mission2"),
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
    greenAlert: document.querySelector("#green-alert"),
    greenAlertDialog: document.querySelector("#green-alert-dialog"),
    restartCaseInvestigation: document.querySelector("#restart-case-investigation"),
    finishCase: document.querySelector("#finish-case"),
    logToggle: document.querySelector("#case-log-toggle"),
    actionLog: document.querySelector("#action-log"),
    actionLogList: document.querySelector("#action-log-list"),
    mission2Step: document.querySelector("#mission2-step"),
    mission2Feedback: document.querySelector("#mission2-feedback"),
    mission2Energy: document.querySelector("#mission2-energy"),
    mission2Actions: document.querySelector("#mission2-actions"),
    mission2Route: document.querySelector("#mission2-route"),
    mission2Hint: document.querySelector("#mission2-hint"),
    mission2Undo: document.querySelector("#mission2-undo"),
    mission2Finish: document.querySelector("#mission2-finish"),
    mission2Log: document.querySelector("#mission2-log"),
    mission2LogToggle: document.querySelector("#mission2-log-toggle"),
    mission2LogList: document.querySelector("#mission2-log-list"),
    continueMission3: document.querySelector("#continue-mission3"),
    mission3Screen: document.querySelector("#mission3-screen"),
    mission3Step: document.querySelector("#mission3-step"),
    mission3Feedback: document.querySelector("#mission3-feedback"),
    mission3Status: document.querySelector("#mission3-status"),
    mission3Tag: document.querySelector("#mission3-tag"),
    mission3CaseTitle: document.querySelector("#mission3-case-title"),
    mission3Summary: document.querySelector("#mission3-summary"),
    mission3CaseCard: document.querySelector(".tool-case-card"),
    mission3SelectionBox: document.querySelector("#mission3-selection"),
    mission3Toolbox: document.querySelector(".toolbox"),
    mission3Selection: document.querySelector("#mission3-selection p"),
    mission3Tools: document.querySelector("#mission3-tools"),
    mission3Result: document.querySelector("#mission3-result"),
    mission3Completion: document.querySelector("#mission3-completion"),
    mission3Hint: document.querySelector("#mission3-hint"),
    mission3Check: document.querySelector("#mission3-check"),
    mission3Next: document.querySelector("#mission3-next"),
    continueMission4: document.querySelector("#continue-mission4"),
    mission4Screen: document.querySelector("#mission4-screen"),
    mission4Phase: document.querySelector("#mission4-phase"),
    callerName: document.querySelector("#caller-name"),
    callerMessage: document.querySelector("#caller-message"),
    mission4ActionTitle: document.querySelector("#mission4-action-title"),
    mission4Evidence: document.querySelector("#mission4-evidence"),
    mission4Feedback: document.querySelector("#mission4-feedback p"),
    mission4Actions: document.querySelector("#mission4-actions"),
    mission4Hint: document.querySelector("#mission4-hint"),
    mission4Check: document.querySelector("#mission4-check"),
    mission4Complete: document.querySelector("#mission4-complete")
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
      const [storyResponse, casesResponse, mission2Response, mission3Response, mission4Response] = await Promise.all([
        fetch("./data/prologue.json"),
        fetch("./data/cases.json"),
        fetch("./data/mission2.json"),
        fetch("./data/mission3.json"),
        fetch("./data/mission4.json")
      ]);
      if (!storyResponse.ok || !casesResponse.ok || !mission2Response.ok || !mission3Response.ok || !mission4Response.ok) throw new Error("教材資料載入失敗");
      state.story = await storyResponse.json();
      state.cases = await casesResponse.json();
      state.mission2 = await mission2Response.json();
      state.mission3 = await mission3Response.json();
      state.mission4 = await mission4Response.json();
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
    elements.greenAlert.hidden = true;
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
    elements.greenAlert.hidden = true;
    elements.finishCase.hidden = true;
    elements.stageNumber.textContent = "STEP 2";
    elements.taskHeading.textContent = "逐張審視線索";
    elements.clueSequence.textContent = `已發現第 ${index} 個調查點`;
    elements.reviewClueText.textContent = clue.text;
    elements.taskHint.textContent = "先選擇簡易查核小技巧的三問，再決定下一步要確認什麼。";
    elements.feedbackText.textContent = "這張線索提醒了什麼？先用簡易查核小技巧的三問，選出最直接的檢查方向。";
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
    const shuffledOptions = [...clue.options];
    for (let index = shuffledOptions.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffledOptions[index], shuffledOptions[randomIndex]] = [shuffledOptions[randomIndex], shuffledOptions[index]];
    }
    shuffledOptions.forEach((option) => {
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
    elements.greenAlert.hidden = false;
    elements.finishCase.hidden = false;
    elements.stageNumber.textContent = "STEP 3";
    elements.taskHeading.textContent = "整理三問與證據缺口";
    elements.feedbackText.textContent = "審核資訊有基本的三問，請用目前取得的結果決定目前的警報狀態。";
    elements.evidenceStatus.textContent = "證據不足，建議黃色警報";
    elements.taskHint.textContent = "尚未查到可靠支持，不等於消息正確；也不必在證據不足時急著宣布是假消息。";
    const keywordMap = {
      who: ["健康分享站", "多位專家已證實"],
      when: ["今天 08:20"],
      reasonable: ["喝三天就有效", "趕快分享給所有家人"]
    };
    elements.questionReport.innerHTML = Object.entries(caseData.questions).map(([id, question]) => `
      <article><strong>${question.label}</strong><div class="report-keywords">${keywordMap[id].map((keyword) => `<span>${keyword}</span>`).join("")}</div><p>${question.description}</p></article>`).join("");
    elements.missingEvidence.textContent = caseData.missingEvidence;
    elements.finishCase.focus();
  }

  function rejectGreenAlert() {
    if (typeof elements.greenAlertDialog.showModal === "function") elements.greenAlertDialog.showModal();
  }

  function restartCaseInvestigation() {
    elements.greenAlertDialog.close();
    startCase();
  }

  function completeCase() {
    const caseData = getActiveCase();
    document.querySelector("#case-summary").textContent = caseData.completion;
    showScreen(elements.end);
    const briefing = document.querySelector(".next-case-briefing");
    briefing.classList.remove("is-alerting", "is-alerted");
    briefing.onanimationend = (event) => {
      if (event.animationName !== "briefing-alert") return;
      briefing.classList.remove("is-alerting");
      briefing.classList.add("is-alerted");
    };
    window.requestAnimationFrame(() => briefing.classList.add("is-alerting"));
  }

  function startMission2() {
    if (!state.mission2) return;
    window.clearTimeout(state.mission2TransitionTimer);
    state.mission2Sequence = [];
    state.mission2Phase = "opening";
    state.mission2Judgment = null;
    elements.mission2Route.parentElement.classList.remove("is-complete");
    elements.mission2Log.classList.remove("is-open");
    elements.mission2LogToggle.setAttribute("aria-expanded", "false");
    elements.mission2Feedback.textContent = "先別急著行動，看到資訊第一步只有一件事，你覺得是哪一件呢？";
    showScreen(elements.mission2Screen);
    renderMission2();
  }

  function renderMission2() {
    const data = state.mission2;
    const completedCount = state.mission2Sequence.length;
    elements.mission2Step.textContent = String(completedCount);
    elements.mission2Energy.textContent = state.mission2Phase === "opening"
      ? "尚未開始查核"
      : state.mission2Phase === "investigate"
        ? `已取得 ${completedCount}／${data.investigations.length} 項結果`
        : state.mission2Phase === "judge"
          ? "證據已備妥，等待判斷"
          : "等待後續行動";
    elements.mission2Undo.disabled = state.mission2Phase !== "investigate" || completedCount === 0;
    elements.mission2Undo.hidden = state.mission2Phase === "opening" || state.mission2Phase === "judge" || state.mission2Phase === "final";
    elements.mission2Finish.hidden = true;
    elements.mission2Actions.innerHTML = "";

    elements.mission2Route.innerHTML = state.mission2Sequence.length
      ? state.mission2Sequence.map((id, index) => {
          const action = data.investigations.find((item) => item.id === id);
          return `<span><b>${index + 1}</b>${action.label}</span>`;
        }).join("")
      : "<p>完成查核行動後，取得的結果會放在這裡。</p>";

    elements.mission2LogList.innerHTML = state.mission2Sequence.length
      ? state.mission2Sequence.map((id) => {
          const item = data.investigations.find((investigation) => investigation.id === id);
          return `<li class="is-correct"><strong>${item.label}</strong><br>${item.result}</li>`;
        }).join("")
      : "<li>尚未取得查核結果。</li>";

    if (state.mission2Phase === "opening") return renderMission2Opening();
    if (state.mission2Phase === "investigate") return renderMission2Investigations();
    if (state.mission2Phase === "judge") return renderMission2Judgments();
    if (state.mission2Phase === "final") return renderMission2FinalActions();
  }

  function renderMission2Opening() {
    const data = state.mission2;
    document.querySelector("#mission2-task-title").textContent = "先停止擴散";
    document.querySelector("#action-library-title").textContent = "收到可疑消息時，第一個行動是什麼？";
    elements.mission2Hint.textContent = "查核行動沒有固定順序，但應先停止轉傳，保留查證時間。";
    renderMission2Buttons([data.opening, ...data.distractors], chooseMission2Opening);
  }

  function chooseMission2Opening(actionId) {
    const data = state.mission2;
    const distractor = data.distractors.find((item) => item.id === actionId);
    if (distractor) {
      elements.mission2Feedback.textContent = distractor.feedback;
      return markMission2Choice(actionId, false);
    }
    elements.mission2Feedback.textContent = data.opening.feedback;
    state.mission2Phase = "investigate";
    renderMission2();
  }

  function renderMission2Investigations() {
    const data = state.mission2;
    const remaining = data.investigations.filter((item) => !state.mission2Sequence.includes(item.id));
    document.querySelector("#mission2-task-title").textContent = "自由選擇查核行動";
    document.querySelector("#action-library-title").textContent = remaining.length ? "接下來想查哪一項？" : "查核結果已備妥";
    if (!remaining.length) {
      elements.mission2Hint.textContent = "四項查核結果已取得，請整理目前的判斷依據。";
      state.mission2TransitionTimer = window.setTimeout(() => {
        state.mission2Phase = "judge";
        renderMission2();
        elements.mission2Feedback.textContent = "依照你目前的查核動作，你覺得這個屬於哪個警報？";
      }, 1000);
      return;
    }
    elements.mission2Hint.textContent = `還有 ${remaining.length} 項可查。這些行動沒有唯一順序，可依情境自由選擇。`;
    renderMission2Buttons([...remaining, ...data.distractors], chooseMission2Investigation);
  }

  function chooseMission2Investigation(actionId) {
    const data = state.mission2;
    const distractor = data.distractors.find((item) => item.id === actionId);
    if (distractor) {
      elements.mission2Feedback.textContent = distractor.feedback;
      return markMission2Choice(actionId, false);
    }
    const investigation = data.investigations.find((item) => item.id === actionId);
    state.mission2Sequence.push(actionId);
    elements.mission2Feedback.textContent = `${investigation.feedback} 查核結果：${investigation.result}`;
    renderMission2();
  }

  function renderMission2Judgments() {
    const data = state.mission2;
    document.querySelector("#mission2-task-title").textContent = "根據證據下達警報";
    document.querySelector("#action-library-title").textContent = "這則停課消息應判定為哪一種警報？";
    elements.mission2Hint.textContent = "判斷放在蒐集證據之後。請根據調查紀錄，而不是直覺選擇。";
    renderMission2Buttons(data.judgments, chooseMission2Judgment);
  }

  function chooseMission2Judgment(actionId) {
    const judgment = state.mission2.judgments.find((item) => item.id === actionId);
    elements.mission2Feedback.textContent = judgment.feedback;
    if (!judgment.correct) return markMission2Choice(actionId, false);
    elements.mission2Feedback.textContent = `${judgment.feedback} 接下來要怎麼做？`;
    state.mission2Judgment = actionId;
    state.mission2Phase = "final";
    renderMission2();
  }

  function renderMission2FinalActions() {
    const data = state.mission2;
    document.querySelector("#mission2-task-title").textContent = "選擇查核後的行動";
    document.querySelector("#action-library-title").textContent = "";
    elements.mission2Hint.textContent = "最後依查核結果選擇是否分享，以及要如何提醒他人。";
    renderMission2Buttons(data.finalActions, chooseMission2FinalAction);
  }

  function chooseMission2FinalAction(actionId) {
    const action = state.mission2.finalActions.find((item) => item.id === actionId);
    if (!action.safe) {
      elements.mission2Feedback.textContent = action.feedback;
      return markMission2Choice(actionId, false);
    }
    elements.mission2Feedback.textContent = action.completion;
    elements.mission2Finish.hidden = false;
    elements.mission2Hint.textContent = "這項行動符合目前的查核結果。確認後完成案件02。";
    [...elements.mission2Actions.querySelectorAll("button")].forEach((button) => { button.disabled = true; });
    markMission2Choice(actionId, true);
  }

  function renderMission2Buttons(actions, handler) {
    const shuffledActions = [...actions];
    for (let index = shuffledActions.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffledActions[index], shuffledActions[randomIndex]] = [shuffledActions[randomIndex], shuffledActions[index]];
    }
    shuffledActions.forEach((action, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.actionId = action.id;
      button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><strong>${action.label}</strong>`;
      button.onclick = () => handler(action.id);
      elements.mission2Actions.append(button);
    });
  }

  function markMission2Choice(actionId, correct) {
    [...elements.mission2Actions.querySelectorAll("button")].forEach((button) => {
      button.classList.remove("is-correct", "is-wrong");
      button.classList.toggle(correct ? "is-correct" : "is-wrong", button.dataset.actionId === actionId);
    });
  }

  function undoMission2() {
    if (!state.mission2Sequence.length) return;
    window.clearTimeout(state.mission2TransitionTimer);
    const removedId = state.mission2Sequence.pop();
    const removed = state.mission2.investigations.find((item) => item.id === removedId);
    elements.mission2Feedback.textContent = `已撤回「${removed.label}」的查核結果，你可以重新選擇查核行動。`;
    renderMission2();
  }

  function finishMission2() {
    elements.mission2Feedback.textContent = `太棒了！${state.mission2.completion}`;
    elements.mission2Hint.textContent = "案件02完成。下一關將練習依案件選擇合適的查核工具。";
    elements.mission2Finish.hidden = true;
    elements.mission2Undo.hidden = true;
    const completedRoute = [
      state.mission2.opening.label,
      ...state.mission2Sequence.map((id) => state.mission2.investigations.find((item) => item.id === id).label),
      state.mission2.judgments.find((item) => item.id === state.mission2Judgment).label
    ];
    elements.mission2Route.parentElement.classList.add("is-complete");
    elements.mission2Route.innerHTML = completedRoute.map((label, index) => `<span><b>${index + 1}</b>${label}</span>`).join("");
    elements.mission2Actions.innerHTML = `<div class="mission-complete-card"><span>MISSION COMPLETE</span><strong>案件02已完成查核</strong><p>${state.mission2.completion}</p></div>`;
    elements.continueMission3.hidden = false;
  }

  function startMission3() {
    if (!state.mission3) return;
    window.clearTimeout(state.mission3TransitionTimer);
    state.mission3Index = 0;
    state.mission3Order = [...state.mission3.cases];
    for (let index = state.mission3Order.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [state.mission3Order[index], state.mission3Order[randomIndex]] = [state.mission3Order[randomIndex], state.mission3Order[index]];
    }
    state.mission3Selected = [];
    state.mission3Solved = false;
    state.mission3History = [];
    showScreen(elements.mission3Screen);
    renderMission3Case();
  }

  function renderMission3Case() {
    const item = state.mission3Order[state.mission3Index];
    state.mission3Selected = [];
    state.mission3Solved = false;
    elements.mission3Step.textContent = String(state.mission3Index + 1);
    elements.mission3Tag.textContent = item.tag;
    elements.mission3CaseTitle.textContent = item.title;
    elements.mission3Summary.textContent = item.summary;
    elements.mission3Selection.textContent = "請從四項工具中選出兩項。";
    elements.mission3Feedback.textContent = "先瞭解想確認的問題，再選擇能直接取得證據的查核工具或平台。";
    elements.mission3Status.textContent = "尚未選擇";
    elements.mission3Hint.textContent = "四選二：點選工具即可加入或取消，不需要拖曳。";
    elements.mission3Check.disabled = true;
    elements.mission3Check.hidden = false;
    elements.mission3Next.hidden = true;
    elements.mission3Result.hidden = true;
    elements.mission3Completion.hidden = true;
    elements.mission3CaseCard.hidden = false;
    elements.mission3SelectionBox.hidden = false;
    elements.mission3Toolbox.hidden = false;
    renderMission3Tools();
  }

  function renderMission3Tools() {
    const item = state.mission3Order[state.mission3Index];
    const tools = item.options.map((id) => state.mission3.tools.find((tool) => tool.id === id));
    for (let index = tools.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [tools[index], tools[randomIndex]] = [tools[randomIndex], tools[index]];
    }
    elements.mission3Tools.innerHTML = "";
    tools.forEach((tool) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.toolId = tool.id;
      button.setAttribute("aria-pressed", "false");
      button.innerHTML = `<span>${tool.icon}</span><strong>${tool.label}</strong>`;
      button.onclick = () => toggleMission3Tool(tool.id);
      elements.mission3Tools.append(button);
    });
  }

  function toggleMission3Tool(toolId) {
    if (state.mission3Solved) return;
    const selectedIndex = state.mission3Selected.indexOf(toolId);
    if (selectedIndex >= 0) state.mission3Selected.splice(selectedIndex, 1);
    else if (state.mission3Selected.length < 2) state.mission3Selected.push(toolId);
    else {
      elements.mission3Feedback.textContent = "一次先集中使用兩項主要工具。若要更換，請先取消一項。";
      return;
    }
    [...elements.mission3Tools.querySelectorAll("button")].forEach((button) => {
      const selected = state.mission3Selected.includes(button.dataset.toolId);
      button.classList.toggle("is-selected", selected);
      button.classList.remove("is-wrong");
      button.setAttribute("aria-pressed", String(selected));
    });
    const labels = state.mission3Selected.map((id) => state.mission3.tools.find((tool) => tool.id === id).label);
    elements.mission3Selection.textContent = labels.length ? labels.map((label, index) => `${index + 1}. ${label}`).join("　") : "請從四項工具中選出兩項。";
    elements.mission3Status.textContent = labels.length ? `已選 ${labels.length}／2 項` : "尚未選擇";
    elements.mission3Check.disabled = labels.length !== 2;
  }

  function checkMission3Tools() {
    const item = state.mission3Order[state.mission3Index];
    const hasCore = state.mission3Selected.includes(item.core);
    const hasSupport = item.supports.some((id) => state.mission3Selected.includes(id));
    if (!hasCore || !hasSupport || state.mission3Selected.length !== 2) {
      elements.mission3Feedback.textContent = item.partial;
      elements.mission3Status.textContent = "證據仍有缺口，請重新選擇";
      elements.mission3Hint.textContent = "這組工具尚未補足證據。選項已重設，請重新選擇兩項。";
      state.mission3Selected = [];
      [...elements.mission3Tools.querySelectorAll("button")].forEach((button) => {
        button.classList.remove("is-selected", "is-wrong");
        button.setAttribute("aria-pressed", "false");
      });
      elements.mission3Selection.textContent = "請從四項工具中選出兩項。";
      elements.mission3Check.disabled = true;
      return;
    }
    state.mission3Solved = true;
    state.mission3History.push({
      title: item.title,
      tools: state.mission3Selected.map((id) => state.mission3.tools.find((tool) => tool.id === id).label)
    });
    elements.mission3Feedback.textContent = item.success;
    elements.mission3Status.textContent = "工具調度完成";
    elements.mission3Result.querySelector("p").textContent = item.result;
    elements.mission3Result.hidden = false;
    elements.mission3Hint.textContent = "工具能取得查核結果；最後仍要比較證據並說明判斷依據。";
    elements.mission3Check.hidden = true;
    const isLastCase = state.mission3Index === state.mission3Order.length - 1;
    elements.mission3Next.hidden = isLastCase;
    elements.mission3Next.textContent = "下一件短案件";
    [...elements.mission3Tools.querySelectorAll("button")].forEach((button) => { button.disabled = true; });
    if (isLastCase) {
      elements.mission3Hint.textContent = "請先閱讀這個情境的模擬查核結果，3 秒後進入任務總結。";
      state.mission3TransitionTimer = window.setTimeout(nextMission3Case, 3000);
    }
  }

  function nextMission3Case() {
    if (state.mission3Index < state.mission3Order.length - 1) {
      state.mission3Index += 1;
      renderMission3Case();
      return;
    }
    elements.mission3Feedback.textContent = state.mission3.completion;
    elements.mission3Status.textContent = "任務 03 完成";
    elements.mission3Hint.textContent = "下一輪將進入親友視訊要求匯款的綜合安全挑戰。";
    elements.mission3Next.hidden = true;
    elements.mission3CaseCard.hidden = true;
    elements.mission3SelectionBox.hidden = true;
    elements.mission3Toolbox.hidden = true;
    elements.mission3Result.hidden = true;
    elements.mission3Completion.hidden = false;
    elements.mission3Completion.innerHTML = `<span>MISSION COMPLETE</span><h3>查核工具選擇所完成</h3><p>${state.mission3.completion}</p><div class="mission3-summary-list">${state.mission3History.map((entry, index) => `<article><b>${String(index + 1).padStart(2, "0")}</b><div><strong>${entry.title}</strong><p>${entry.tools.join(" ＋ ")}</p></div></article>`).join("")}</div>`;
    elements.continueMission4.hidden = false;
  }

  function startMission4() {
    if (!state.mission4) return;
    state.mission4Phase = "opening";
    document.querySelector("#mission4-title").textContent = state.mission4.title;
    document.querySelector(".video-call-panel")?.classList.remove("is-ended");
    document.querySelector(".response-console")?.classList.remove("is-chapter-summary");
    document.querySelector(".final-workspace")?.classList.remove("is-summary");
    state.mission4Selected = [];
    state.mission4Evidence = [];
    elements.callerName.textContent = state.mission4.caller;
    elements.callerMessage.textContent = state.mission4.openingMessage;
    showScreen(elements.mission4Screen);
    renderMission4Opening();
  }

  function renderMission4Opening() {
    state.mission4Phase = "opening";
    elements.mission4Phase.textContent = "通話進行中";
    elements.mission4ActionTitle.textContent = "面對催促，先做什麼？";
    elements.mission4Feedback.textContent = "不要因為看起來像本人，就跳過其他管道的確認。";
    elements.mission4Hint.textContent = "高風險選擇會被安全攔截，你仍可重新判斷。";
    elements.mission4Evidence.innerHTML = "<p>尚未取得獨立證據。</p>";
    elements.mission4Check.hidden = true;
    elements.mission4Complete.hidden = true;
    renderMission4Buttons(state.mission4.opening, chooseMission4Opening);
  }

  function chooseMission4Opening(actionId) {
    const action = state.mission4.opening.find((item) => item.id === actionId);
    elements.mission4Feedback.textContent = action.feedback;
    if (!action.safe) {
      markMission4Choice(actionId, "is-danger");
      return;
    }
    markMission4Choice(actionId, "is-safe");
    [...elements.mission4Actions.querySelectorAll("button")].forEach((button) => { button.disabled = true; });
    window.setTimeout(() => {
      document.querySelector(".video-call-panel").classList.add("is-ended");
      elements.callerMessage.textContent = "通話已結束。現在請用原本可信的管道確認身分與狀況。";
      renderMission4Verification();
    }, 500);
  }

  function renderMission4Verification() {
    state.mission4Phase = "verification";
    state.mission4Selected = [];
    state.mission4Evidence = [];
    elements.mission4Phase.textContent = "獨立查證";
    elements.mission4ActionTitle.textContent = "為了辨識真偽，你會進行哪兩項查證行動？";
    elements.mission4Hint.textContent = "請選兩項；再次點選同一項可以取消。";
    elements.mission4Check.hidden = false;
    elements.mission4Check.disabled = true;
    renderMission4Buttons(state.mission4.verification, toggleMission4Verification);
  }

  function toggleMission4Verification(actionId) {
    const index = state.mission4Selected.indexOf(actionId);
    if (index >= 0) state.mission4Selected.splice(index, 1);
    else if (state.mission4Selected.length < 2) state.mission4Selected.push(actionId);
    else {
      elements.mission4Feedback.textContent = "一次先選兩項查證行動；若要更換，請先取消一項。";
      return;
    }
    [...elements.mission4Actions.querySelectorAll("button")].forEach((button) => {
      const selected = state.mission4Selected.includes(button.dataset.actionId);
      button.classList.toggle("is-selected", selected);
      button.classList.remove("is-danger");
      button.setAttribute("aria-pressed", String(selected));
    });
    elements.mission4Check.disabled = state.mission4Selected.length !== 2;
    elements.mission4Feedback.textContent = state.mission4Selected.length === 2
      ? "已選兩項。執行後比較它們是否能獨立確認身分。"
      : "至少要改用一個原本可信的聯絡管道。";
  }

  function checkMission4Verification() {
    const actions = state.mission4Selected.map((id) => state.mission4.verification.find((item) => item.id === id));
    const selectedIds = new Set(state.mission4Selected);
    const hasCore = actions.some((item) => item.core);
    const hasSupport = actions.some((item) => item.support);
    const hasUnsafe = actions.some((item) => item.unsafe);
    if (!hasCore || !hasSupport || hasUnsafe) {
      const onlyIndirectSources = selectedIds.has("mutual_contact") && selectedIds.has("anti_fraud");
      elements.mission4Feedback.textContent = onlyIndirectSources
        ? "無法獨立確認，因可能共同親友無法提供狀況。選項已重設。"
        : "無法獨立確認，因回撥的電話可能是詐騙的電話。選項已重設。";
      state.mission4Selected = [];
      [...elements.mission4Actions.querySelectorAll("button")].forEach((button) => {
        button.classList.remove("is-selected", "is-danger");
        button.setAttribute("aria-pressed", "false");
      });
      elements.mission4Check.disabled = true;
      return;
    }
    state.mission4Evidence = actions;
    elements.mission4Evidence.innerHTML = actions.map((item) => `<article><strong>${item.label}</strong><p>${item.result}</p></article>`).join("");
    elements.mission4Feedback.textContent = "你的選項雖然有進行求證，但還需要進行最後的安全決定。";
    renderMission4Final();
  }

  function renderMission4Final() {
    state.mission4Phase = "final";
    elements.mission4Phase.textContent = "安全決策";
    elements.mission4ActionTitle.textContent = "根據查證結果，你要怎麼做？";
    elements.mission4Hint.textContent = "不要用匯款測試對方；請選擇能停止損失並保護親友的行動。";
    elements.mission4Check.hidden = true;
    renderMission4Buttons(state.mission4.finalActions, chooseMission4Final);
  }

  function chooseMission4Final(actionId) {
    const action = state.mission4.finalActions.find((item) => item.id === actionId);
    elements.mission4Feedback.textContent = action.feedback;
    if (!action.safe) {
      markMission4Choice(actionId, "is-danger");
      return;
    }
    markMission4Choice(actionId, "is-safe");
    [...elements.mission4Actions.querySelectorAll("button")].forEach((button) => { button.disabled = true; });
    elements.mission4Hint.textContent = "請先閱讀安全提醒，4 秒後將進入全章行動總結。";
    elements.mission4Complete.hidden = true;
    window.setTimeout(completeMission4, 4000);
  }

  function renderMission4Buttons(actions, handler) {
    const shuffled = [...actions];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    elements.mission4Actions.innerHTML = "";
    shuffled.forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.actionId = action.id;
      button.setAttribute("aria-pressed", "false");
      button.textContent = action.label;
      button.onclick = () => handler(action.id);
      elements.mission4Actions.append(button);
    });
  }

  function markMission4Choice(actionId, className) {
    [...elements.mission4Actions.querySelectorAll("button")].forEach((button) => {
      button.classList.remove("is-danger", "is-safe");
      button.classList.toggle(className, button.dataset.actionId === actionId);
    });
  }

  function completeMission4() {
    document.querySelector("#mission4-title").textContent = "CH3 查核行動指揮中心";
    elements.mission4Phase.textContent = "全章總結";
    elements.mission4ActionTitle.textContent = "查核行動指揮中心｜全章行動總結";
    elements.mission4Feedback.textContent = "你已完成從審視資訊、安排查核行動、選擇工具到安全決策的完整訓練。";
    elements.mission4Hint.textContent = "面對任何可疑資訊，都可以再次運用這套查核行動。";
    elements.mission4Complete.hidden = true;
    document.querySelector(".response-console")?.classList.add("is-chapter-summary");
    document.querySelector(".final-workspace")?.classList.add("is-summary");
    elements.mission4Evidence.innerHTML = `
      <div class="chapter-flow" aria-label="查核行動順序">
        <article><span>先停</span><strong>審視資訊</strong><p>先停下來，不急著相信或轉傳；問誰說的、何時發布、合不合理。</p></article>
        <b aria-hidden="true">→</b>
        <article><span>看</span><strong>安排查核</strong><p>看清楚可疑之處與證據缺口，再決定要優先確認什麼。</p></article>
        <b aria-hidden="true">→</b>
        <article><span>查核</span><strong>調用工具</strong><p>依情境選用官方來源、查核平台、防詐管道或可信聯絡方式。</p></article>
        <b aria-hidden="true">→</b>
        <article><span>決策</span><strong>安全決策</strong><p>根據查核結果，決定停止轉傳、提醒他人、保留紀錄或通報。</p></article>
      </div>`;
    elements.mission4Actions.innerHTML = `<div class="final-complete-card"><span>CHAPTER COMPLETE</span><strong>數位安全守門員</strong><div class="chapter-final-reminder"><b>最後安全提醒</b><p>${state.mission4.completion}</p></div><div class="chapter-summary-actions"><button id="restart-mission4" class="secondary-button" type="button">重新挑戰綜合關卡</button><button id="restart-all" class="primary-button" type="button">回到首頁</button></div></div>`;
    document.querySelector("#restart-mission4").addEventListener("click", startMission4);
    document.querySelector("#restart-all").addEventListener("click", () => showScreen(elements.home));
  }

  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    elements.sound.setAttribute("aria-pressed", String(state.soundEnabled));
    elements.sound.setAttribute("aria-label", `音效目前${state.soundEnabled ? "開啟" : "關閉"}`);
    elements.sound.textContent = `音效：${state.soundEnabled ? "開" : "關"}`;
  }

  elements.start.addEventListener("click", startStory);
  elements.replay.addEventListener("click", () => showScreen(elements.home));
  elements.continueMission2.addEventListener("click", startMission2);
  elements.next.addEventListener("click", (event) => { event.stopPropagation(); advance(); });
  elements.skip.addEventListener("click", (event) => { event.stopPropagation(); completeTyping(); });
  elements.dialoguePanel.addEventListener("click", advance);
  elements.sound.addEventListener("click", toggleSound);
  elements.finishCase.addEventListener("click", completeCase);
  elements.greenAlert.addEventListener("click", rejectGreenAlert);
  elements.restartCaseInvestigation.addEventListener("click", restartCaseInvestigation);
  elements.backToExplore.addEventListener("click", showExploreView);
  elements.nextClue.addEventListener("click", showExploreView);
  elements.logToggle.addEventListener("click", () => {
    const open = elements.actionLog.classList.toggle("is-open");
    elements.logToggle.setAttribute("aria-expanded", String(open));
  });
  elements.mission2Undo.addEventListener("click", undoMission2);
  elements.mission2Finish.addEventListener("click", finishMission2);
  elements.continueMission3.addEventListener("click", startMission3);
  elements.mission2LogToggle.addEventListener("click", () => {
    const open = elements.mission2Log.classList.toggle("is-open");
    elements.mission2LogToggle.setAttribute("aria-expanded", String(open));
  });
  elements.mission3Check.addEventListener("click", checkMission3Tools);
  elements.mission3Next.addEventListener("click", nextMission3Case);
  elements.continueMission4.addEventListener("click", startMission4);
  elements.mission4Check.addEventListener("click", checkMission4Verification);
  elements.mission4Complete.addEventListener("click", completeMission4);
  document.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && elements.story.classList.contains("is-active") && document.activeElement === document.body) {
      event.preventDefault();
      advance();
    }
  });

  loadStory();
})();
