(() => {
  "use strict";

  const DATA_FILES = {
    cases: "data/cases.csv",
    openings: "data/openings.csv",
    segments: "data/segments.csv",
    nodes: "data/nodes.csv"
  };

  const THEME_CYCLE_KEY = "nextWordPrediction.themeCycle.v2";
  const THEME_CYCLE_VERSION = 2;

  const app = document.querySelector("#app");
  const announcer = document.querySelector("#announcer");
  const counter = document.querySelector("#case-counter");
  const state = {
    cases: [],
    openings: [],
    segments: [],
    nodes: [],
    current: null,
    currentThemeId: null,
    lastCaseId: null,
    openingId: null,
    lastOpeningKey: null,
    selectedSegments: new Set(),
    noticedSuspicion: false,
    groupId: "root",
    path: [],
    verdict: "",
    transitionTimer: null
  };

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"' && quoted && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        row.push(field);
        field = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(field);
        if (row.some((value) => value !== "")) rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
    if (field || row.length) {
      row.push(field);
      rows.push(row);
    }

    const headers = rows.shift().map((header) => header.replace(/^\uFEFF/, "").trim());
    return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  }

  async function fetchCSV(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url} (${response.status})`);
    return parseCSV(await response.text());
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[char]);
  }

  function announce(message) {
    announcer.textContent = "";
    window.setTimeout(() => { announcer.textContent = message; }, 30);
  }

  function focusTitle() {
    const title = app.querySelector("h1, h2");
    if (title) {
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setScreen(markup) {
    if (state.transitionTimer) {
      window.clearInterval(state.transitionTimer);
      state.transitionTimer = null;
    }
    app.innerHTML = markup;
    focusTitle();
  }

  function currentSegments() {
    return state.segments
      .filter((item) => item.case_id === state.current.case_id && (item.opening_id || "default") === state.openingId)
      .sort((a, b) => Number(a.order) - Number(b.order));
  }

  function openingIdsFor(caseId) {
    return [...new Set(state.segments
      .filter((item) => item.case_id === caseId)
      .map((item) => item.opening_id || "default"))];
  }

  function nodesFor(groupId) {
    return state.nodes
      .filter((node) => node.case_id === state.current.case_id && node.group_id === groupId)
      .sort((a, b) => Number(a.option_order) - Number(b.option_order));
  }

  function generatedPhrase() {
    return state.path.map((node) => node.token).join("");
  }

  function predictionSteps(gameCase = state.current) {
    const steps = Number(gameCase?.prediction_steps || 4);
    return Number.isInteger(steps) && steps >= 1 ? steps : 4;
  }

  function generatedStory() {
    return `${state.current.story_prefix}${generatedPhrase()}${state.current.story_suffix}`;
  }

  function comparisonConfig() {
    const labels = state.current.comparison_role_labels.split("|").map((value) => value.trim());
    const groups = state.current.comparison_path_groups.split("|").map((group) => group.split("+").map(Number));
    const verifiedTerms = state.current.verified_compare_terms.split("|").map((value) => value.trim());
    const playerTerms = groups.map((group) => group.map((step) => state.path[step - 1]?.token || "").join(""));
    return { labels, groups, verifiedTerms, playerTerms };
  }

  function semanticStoryMarkup(story, terms, labels) {
    let cursor = 0;
    let markup = "";
    terms.forEach((term, index) => {
      const position = story.indexOf(term, cursor);
      if (position < 0) return;
      markup += escapeHTML(story.slice(cursor, position));
      markup += `<mark class="semantic-mark" aria-label="${escapeHTML(labels[index])}：${escapeHTML(term)}">${escapeHTML(term)}</mark>`;
      cursor = position + term.length;
    });
    return `${markup}${escapeHTML(story.slice(cursor))}`;
  }

  function emphasizedEndingMarkup(text) {
    const sentenceEnd = text.indexOf("。");
    if (sentenceEnd < 0) return `<strong>${escapeHTML(text)}</strong>`;
    return `<strong>${escapeHTML(text.slice(0, sentenceEnd))}</strong>${escapeHTML(text.slice(sentenceEnd))}`;
  }

  function originalStoryMarkup() {
    return currentSegments().map((segment) => {
      const text = escapeHTML(segment.text);
      return segment.suspicious === "1" ? `<mark class="generated-word">${text}</mark>` : text;
    }).join("");
  }

  function currentSources() {
    return [
      { label: state.current.source_label, url: state.current.source_url },
      { label: state.current.source_label_2, url: state.current.source_url_2 },
      { label: state.current.source_label_3, url: state.current.source_url_3 }
    ].filter((source) => source.label && source.url);
  }

  function currentOpening() {
    return state.openings.find((opening) => opening.case_id === state.current.case_id && opening.opening_id === state.openingId);
  }

  function verdictLabel() {
    return {
      trust: "可以，機率很高",
      verify: "不可以，仍需查證",
      unsure: "我不確定"
    }[state.verdict] || "未作答";
  }

  function activeThemeIds() {
    return [...new Set(state.cases.filter((item) => item.active === "1").map((item) => item.theme_id || item.case_id))];
  }

  function readThemeCycle() {
    const themeIds = activeThemeIds();
    try {
      const saved = JSON.parse(localStorage.getItem(THEME_CYCLE_KEY) || "null");
      const themeListChanged = !Array.isArray(saved?.themeIds)
        || saved.themeIds.length !== themeIds.length
        || themeIds.some((themeId) => !saved.themeIds.includes(themeId));
      if (!saved || saved.version !== THEME_CYCLE_VERSION || !Array.isArray(saved.remainingThemeIds) || themeListChanged) {
        return { version: THEME_CYCLE_VERSION, remainingThemeIds: [], lastThemeId: "" };
      }
      return {
        version: THEME_CYCLE_VERSION,
        remainingThemeIds: [...new Set(saved.remainingThemeIds)].filter((themeId) => themeIds.includes(themeId)),
        lastThemeId: themeIds.includes(saved.lastThemeId) ? saved.lastThemeId : ""
      };
    } catch (error) {
      console.warn("主題循環紀錄無法讀取，已重新建立。", error);
      return { version: THEME_CYCLE_VERSION, remainingThemeIds: [], lastThemeId: "" };
    }
  }

  function writeThemeCycle(cycle) {
    try { localStorage.setItem(THEME_CYCLE_KEY, JSON.stringify(cycle)); }
    catch (error) { console.warn("主題循環紀錄無法儲存，本次仍可繼續遊戲。", error); }
  }

  function shuffledThemeIds(themeIds) {
    const shuffled = [...themeIds];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function createThemeQueue(themeIds, lastThemeId) {
    const queue = shuffledThemeIds(themeIds);
    if (queue.length > 1 && queue[0] === lastThemeId) {
      const replacementIndex = queue.findIndex((themeId) => themeId !== lastThemeId);
      [queue[0], queue[replacementIndex]] = [queue[replacementIndex], queue[0]];
    }
    return queue;
  }

  function chooseThemeId() {
    const themeIds = activeThemeIds();
    const cycle = readThemeCycle();
    const remainingThemeIds = cycle.remainingThemeIds.length
      ? [...cycle.remainingThemeIds]
      : createThemeQueue(themeIds, cycle.lastThemeId);
    const selectedThemeId = remainingThemeIds.shift();
    writeThemeCycle({
      version: THEME_CYCLE_VERSION,
      themeIds,
      remainingThemeIds,
      lastThemeId: selectedThemeId
    });
    return selectedThemeId;
  }

  function validateData() {
    const activeCases = state.cases.filter((item) => item.active === "1");
    if (!activeCases.length) throw new Error("cases.csv 沒有 active=1 的案例");

    activeCases.forEach((gameCase) => {
      if (!gameCase.theme_id || !gameCase.theme_label) throw new Error(gameCase.case_id + " 缺少主題分類欄位");
      const roleLabels = gameCase.comparison_role_labels.split("|").map((value) => value.trim()).filter(Boolean);
      const pathGroups = gameCase.comparison_path_groups.split("|").map((group) => group.split("+").map(Number));
      const verifiedTerms = gameCase.verified_compare_terms.split("|").map((value) => value.trim()).filter(Boolean);
      const totalSteps = predictionSteps(gameCase);
      const groupedSteps = pathGroups.flat().sort((a, b) => a - b);
      const expectedSteps = Array.from({ length: totalSteps }, (_, index) => index + 1).join(",");
      if (roleLabels.length !== pathGroups.length || roleLabels.length !== verifiedTerms.length || groupedSteps.join(",") !== expectedSteps) {
        throw new Error(`${gameCase.case_id} 的語意位置對照設定不完整`);
      }
      if (verifiedTerms.some((term) => !gameCase.verified_story.includes(term))) {
        throw new Error(`${gameCase.case_id} 的查證關鍵詞未出現在 verified_story`);
      }

      const openingIds = openingIdsFor(gameCase.case_id);
      if (!openingIds.length) throw new Error(`${gameCase.case_id} 沒有開場敘述`);
      openingIds.forEach((openingId) => {
        const segments = state.segments
          .filter((item) => item.case_id === gameCase.case_id && (item.opening_id || "default") === openingId)
          .sort((a, b) => Number(a.order) - Number(b.order));
        const orders = segments.map((segment) => Number(segment.order));
        if (orders.some((order, index) => order !== index + 1)) {
          throw new Error(`${gameCase.case_id}/${openingId} 的片段 order 必須從 1 連續排列`);
        }
        if (!segments.some((segment) => segment.suspicious === "1")) {
          throw new Error(`${gameCase.case_id}/${openingId} 至少需要一個可疑片段`);
        }
        const story = segments.map((segment) => segment.text).join("");
        if (!story.startsWith(gameCase.story_prefix) || !story.endsWith(gameCase.story_suffix)) {
          throw new Error(`${gameCase.case_id}/${openingId} 拼接後必須符合案例的前後敘述`);
        }
      });

      const groups = new Map();
      state.nodes.filter((node) => node.case_id === gameCase.case_id).forEach((node) => {
        if (!groups.has(node.group_id)) groups.set(node.group_id, []);
        groups.get(node.group_id).push(node);
      });
      if (!groups.has("root")) throw new Error(`${gameCase.case_id} 缺少 root 節點群組`);
      const pathSignatures = new Set();
      const collectPaths = (groupId, labels = []) => {
        const nodes = groups.get(groupId) || [];
        nodes.forEach((node) => {
          const nextLabels = [...labels, node.label];
          if (Number(node.step) === totalSteps) pathSignatures.add(nextLabels.join(">"));
          else collectPaths(node.next_group, nextLabels);
        });
      };
      collectPaths("root");

      const openingRecords = state.openings.filter((opening) => opening.case_id === gameCase.case_id);
      if (openingRecords.length !== openingIds.length || openingIds.some((openingId) => !openingRecords.some((opening) => opening.opening_id === openingId))) {
        throw new Error(`${gameCase.case_id} 的 openings.csv 與 segments.csv 版本不一致`);
      }
      openingRecords.forEach((opening) => {
        if (!pathSignatures.has(opening.matching_path)) {
          throw new Error(`${gameCase.case_id}/${opening.opening_id} 的 matching_path 不存在`);
        }
      });

      groups.forEach((nodes, groupId) => {
        const sum = nodes.reduce((total, node) => total + Number(node.probability), 0);
        if (nodes.length !== 3 || sum !== 100) {
          throw new Error(`${gameCase.case_id}/${groupId} 必須有三個節點且機率合計為 100`);
        }

        const step = Number(nodes[0].step);
        if (nodes.some((node) => Number(node.step) !== step)) {
          throw new Error(`${gameCase.case_id}/${groupId} 不可混用不同步驟`);
        }
        if (step < totalSteps && new Set(nodes.map((node) => node.next_group)).size !== nodes.length) {
          throw new Error(`${gameCase.case_id}/${groupId} 的每個選項必須指向不同的完整路徑群組`);
        }

        nodes.forEach((node) => {
          if (step < totalSteps) {
            const nextNodes = groups.get(node.next_group);
            if (!node.next_group || !nextNodes) {
              throw new Error(`${gameCase.case_id}/${groupId}/${node.label} 缺少下一個完整路徑群組`);
            }
            if (nextNodes.some((nextNode) => Number(nextNode.step) !== step + 1)) {
              throw new Error(`${gameCase.case_id}/${groupId}/${node.label} 的下一群組步驟錯誤`);
            }
          } else if (node.next_group) {
            throw new Error(`${gameCase.case_id}/${groupId}/${node.label} 已是最後一步，不可再指定 next_group`);
          }
        });
      });
    });
  }

  function showHome() {
    state.current = null;
    const themeCount = activeThemeIds().length;
    counter.textContent = themeCount + " 個主題・隨機挑戰";
    setScreen(`
      <section class="screen hero" aria-labelledby="home-title">
        <div class="hero-copy">
          <p class="eyebrow">NEXT WORD PREDICTION</p>
          <h1 id="home-title">比比看<span>你跟 AI 一不一樣</span></h1>
          <div class="home-intro">
            <p>跟著 AI 的預測路徑，每一步選出統計上可能接續的詞，看看一段流暢的敘述，是否真的經得起查證。</p>
            <p>AI 看起來很聰明，其實主要是依靠大量運算、統計規律，還有「下一個字可能是什麼」的文字接龍預測能力。</p>
            <p>接下來 AI 會根據資料庫裡的上下文，拼出一小段看起來很合理、但可能有錯的內容，請你用自己的所學來幫 AI 把關，看看你的理解和 AI 的預測是不是一樣喔。</p>
          </div>
          <div class="button-row">
            <button class="primary-btn" id="start-game">開始探索</button>
            <span class="selection-count">一局約 5 分鐘・3～4 次預測</span>
          </div>
        </div>
        <div class="hero-map">
          <div class="orbit-ring ring-one" aria-hidden="true"></div>
          <div class="orbit-ring ring-two" aria-hidden="true"></div>
          <span class="float-node" aria-hidden="true">高機率 ≠ 正確</span>
          <span class="float-node" aria-hidden="true">上下文</span>
          <span class="float-node" aria-hidden="true">重新預測</span>
          <img class="sisi-character" src="assets/images/sisi-60427.png" alt="">
          <button class="sisi-tablet" id="start-from-tablet" type="button"><span>下一個詞</span></button>
        </div>
      </section>
    `);
    document.querySelector("#start-game").addEventListener("click", startGame);
    document.querySelector("#start-from-tablet").addEventListener("click", startGame);
  }

  function startGame() {
    const active = state.cases.filter((item) => item.active === "1");
    state.currentThemeId = chooseThemeId();
    const themeCases = active.filter((item) => (item.theme_id || item.case_id) === state.currentThemeId);
    const pool = themeCases;
    state.current = pool[Math.floor(Math.random() * pool.length)];
    state.lastCaseId = state.current.case_id;
    const openingIds = openingIdsFor(state.current.case_id);
    let openingPool = openingIds.filter((openingId) => `${state.current.case_id}/${openingId}` !== state.lastOpeningKey);
    if (!openingPool.length) openingPool = openingIds;
    state.openingId = openingPool[Math.floor(Math.random() * openingPool.length)];
    state.lastOpeningKey = `${state.current.case_id}/${state.openingId}`;
    state.selectedSegments = new Set();
    state.noticedSuspicion = false;
    state.groupId = "root";
    state.path = [];
    state.verdict = "";
    counter.textContent = state.current.theme_label + "・" + state.current.difficulty;
    showScan();
  }

  function showScan() {
    const segments = currentSegments();
    setScreen(`
      <section class="screen" aria-labelledby="scan-title">
        <div class="glass-panel content-panel">
          <div class="step-header">
            <div>
              <p class="eyebrow">任務 01・批判閱讀</p>
              <h2 id="scan-title">${escapeHTML(state.current.title)}</h2>
              <p class="instruction">${escapeHTML(state.current.intro_instruction)}</p>
            </div>
            <span class="case-chip">AI 生成敘述</span>
          </div>
          <div class="story-select" id="story-segments" aria-label="可選取的 AI 生成敘述">
            ${segments.map((segment) => `<button class="segment" data-order="${segment.order}" aria-pressed="false">${escapeHTML(segment.text)}</button>`).join("")}
          </div>
          <div class="selection-meta">
            <span class="selection-count" id="selection-count">未標記；也可以直接提交判斷</span>
            <button class="primary-btn" id="submit-scan">提交判斷</button>
          </div>
        </div>
      </section>
    `);

    const count = document.querySelector("#selection-count");
    app.querySelectorAll(".segment").forEach((button) => {
      button.addEventListener("click", () => {
        const order = button.dataset.order;
        if (state.selectedSegments.has(order)) state.selectedSegments.delete(order);
        else state.selectedSegments.add(order);
        const selected = state.selectedSegments.has(order);
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
        count.textContent = state.selectedSegments.size ? `已標記 ${state.selectedSegments.size} 個片段` : "尚未標記；也可以直接提交判斷";
      });
    });
    document.querySelector("#submit-scan").addEventListener("click", submitScan);
  }

  function submitScan() {
    state.noticedSuspicion = currentSegments().some((segment) => segment.suspicious === "1" && state.selectedSegments.has(segment.order));
    const selected = currentSegments().filter((segment) => state.selectedSegments.has(segment.order));
    const selectedMarkup = selected.length
      ? selected.map((segment) => `<span>${escapeHTML(segment.text)}</span>`).join("")
      : `<span class="empty-selection">未標記任何詞語</span>`;
    const explanation = state.noticedSuspicion ? state.current.reveal_hit : state.current.reveal_miss;
    setScreen(`
      <section class="screen" aria-labelledby="reveal-title">
        <div class="glass-panel reveal-card">
          <div class="reveal-icon" aria-hidden="true">⌖</div>
          <p class="eyebrow">調查點已鎖定</p>
          <h2 id="reveal-title">先別急著找答案</h2>
          <p class="selected-label">這是你認為需要查證的詞語：</p>
          <div class="reveal-selections" aria-label="你標記的詞語">${selectedMarkup}</div>
          <p class="reveal-explanation">${escapeHTML(explanation).replace("現在追蹤", "<br>現在追蹤")}</p>
          <button class="primary-btn" id="enter-stars">看看 AI 如何預測</button>
        </div>
      </section>
    `);
    const selectedAnnouncement = selected.length ? selected.map((segment) => segment.text).join("、") : "未標記任何詞語";
    announce(`這是你認為需要查證的詞語：${selectedAnnouncement}。${explanation}`);
    document.querySelector("#enter-stars").addEventListener("click", showPrediction);
  }

  function showPrediction() {
    const options = nodesFor(state.groupId);
    if (options.length !== 3) return showError(new Error(`找不到節點群組：${state.groupId}`));
    const step = Number(options[0].step);
    const totalSteps = predictionSteps();
    const context = `${state.current.story_prefix}${generatedPhrase()}`;
    setScreen(`
      <section class="screen prediction-layout" aria-labelledby="prediction-title">
        <div class="progress-row" aria-label="目前是 ${totalSteps} 步中的第 ${step} 步">
          ${Array.from({ length: totalSteps }, (_, index) => index + 1).map((value) => `<span class="progress-step ${value < step ? "done" : value === step ? "active" : ""}"></span>`).join("")}
        </div>
        <div class="step-header">
          <div>
            <p class="eyebrow">任務 02・第 ${step} / ${totalSteps} 次預測</p>
            <h2 id="prediction-title">哪個詞最可能接在後面？</h2>
            <p class="instruction">${escapeHTML(state.current.prediction_prompt)}</p>
          </div>
          <span class="case-chip">球體大小＝模擬機率</span>
        </div>
        <div class="glass-panel context-box">
          <div class="context-label">目前完整上下文</div>
          <p class="context-text">${escapeHTML(context)}<span class="cursor" aria-hidden="true"></span></p>
          <div class="live-trail" aria-label="已走過的詞語節點">
            ${state.path.map((node) => `<span>${escapeHTML(node.label)} <b>${node.probability}%</b></span>`).join("")}
            <i aria-hidden="true">第 ${step} 步</i>
          </div>
        </div>
        <div class="reason-box" id="reason-box" aria-live="polite">球體越亮、越大，代表它在目前上下文中的模擬權重越高；不一定是正確答案提示。</div>
        <div class="node-field" id="node-field">
          ${options.map((node) => {
            const probability = Number(node.probability);
            return `<button class="word-node" style="--weight:${probability / 100}" data-order="${node.option_order}" aria-label="${escapeHTML(node.label)}，模擬機率 ${probability}%">
              <strong>${escapeHTML(node.label)}</strong>
              <span class="probability">${probability}%</span>
              <span class="node-caption">預測權重</span>
            </button>`;
          }).join("")}
        </div>
      </section>
    `);

    app.querySelectorAll(".word-node").forEach((button) => {
      button.addEventListener("click", () => selectNode(options.find((node) => node.option_order === button.dataset.order), button), { once: true });
    });
  }

  function selectNode(node, selectedButton) {
    app.querySelectorAll(".word-node").forEach((button) => { button.disabled = true; });
    selectedButton.style.borderColor = "var(--gold)";
    selectedButton.style.transform = "scale(1.06)";
    const reasonBox = document.querySelector("#reason-box");
    reasonBox.textContent = node.reason;
    const totalSteps = predictionSteps();
    const waitMessage = document.createElement("span");
    waitMessage.className = "reason-wait";
    const countdown = document.createElement("span");
    countdown.className = "reason-countdown";
    countdown.setAttribute("role", "timer");
    countdown.setAttribute("aria-label", "剩餘 5 秒");
    countdown.textContent = "5";
    const waitLabel = document.createElement("span");
    waitLabel.textContent = state.path.length === totalSteps - 1 ? "即將進入可信度判斷" : "即將進入下一次預測";
    waitMessage.append(countdown, waitLabel);
    reasonBox.append(waitMessage);
    state.path.push(node);
    announce(`你選擇了${node.label}，${node.probability}%。${node.reason}`);
    let remainingSeconds = 5;
    state.transitionTimer = window.setInterval(() => {
      remainingSeconds -= 1;
      if (remainingSeconds > 0) {
        countdown.textContent = String(remainingSeconds);
        countdown.setAttribute("aria-label", `剩餘 ${remainingSeconds} 秒`);
        return;
      }
      window.clearInterval(state.transitionTimer);
      state.transitionTimer = null;
      if (state.path.length === totalSteps) showVerdict();
      else {
        state.groupId = node.next_group;
        showPrediction();
      }
    }, 1000);
  }

  function showVerdict() {
    const totalSteps = predictionSteps();
    setScreen(`
      <section class="screen" aria-labelledby="verdict-title">
        <div class="step-header">
          <div>
            <p class="eyebrow">任務 03・流暢度陷阱</p>
            <h2 id="verdict-title">句子完成了，但它可信嗎？</h2>
            <p class="instruction">${escapeHTML(state.current.verdict_question)}</p>
          </div>
          <span class="case-chip">你走完了 ${totalSteps} 個節點</span>
        </div>
        <div class="verdict-grid">
          <article class="glass-panel generated-card">
            <p class="eyebrow">路徑生成結果</p>
            <p class="generated-story">${escapeHTML(state.current.story_prefix)}<mark class="generated-word">${escapeHTML(generatedPhrase())}</mark>${escapeHTML(state.current.story_suffix)}</p>
          </article>
          <div class="verdict-actions" aria-label="可信度判斷">
            <button class="choice-btn" data-verdict="trust">可以，機率很高</button>
            <button class="choice-btn" data-verdict="verify">不可以，仍需查證</button>
            <button class="choice-btn" data-verdict="unsure">我不確定</button>
          </div>
        </div>
      </section>
    `);
    app.querySelectorAll("[data-verdict]").forEach((button) => {
      button.addEventListener("click", () => {
        state.verdict = button.dataset.verdict;
        showResults();
      });
    });
  }

  function showResults() {
    const historicallyAligned = state.path.every((node) => node.is_verified_direction === "1");
    const opening = currentOpening();
    const pathSignature = state.path.map((node) => node.label).join(">");
    const followedOpening = !historicallyAligned && opening && pathSignature === opening.matching_path;
    const ending = historicallyAligned
      ? state.current.ending_right
      : followedOpening
        ? state.current.ending_opening_match
        : state.current.ending_wrong;
    const comparison = comparisonConfig();
    const sources = currentSources();
    setScreen(`
      <section class="screen result-screen" aria-labelledby="result-title">
        <div class="result-hero">
          <div>
            <p class="eyebrow">路徑分析完成</p>
            <h2 id="result-title">流暢，是預測的成果；<br>真實，需要另外查證。</h2>
            <p class="result-message">${emphasizedEndingMarkup(ending)}</p>
            <div class="reflection-note">
              <p>你剛才的判斷：<strong>${escapeHTML(verdictLabel())}</strong></p>
              <p>${escapeHTML(state.current.reflection_prompt)}</p>
            </div>
          </div>
        </div>

        <article class="glass-panel result-story-card original-result-card">
          <div class="result-section-label"><span>1</span>原本 AI 生成敘述</div>
          <p>${originalStoryMarkup()}</p>
        </article>

        <section class="glass-panel player-result-card" aria-labelledby="player-route-title">
          <div class="result-section-label" id="player-route-title"><span>2</span>你的選擇路線與生成敘述</div>
          <div class="path-review" aria-label="你的 ${predictionSteps()} 步選擇與預測比例">
            ${state.path.map((node, index) => `<div class="path-item"><span>第 ${index + 1} 步</span>${escapeHTML(node.label)} <strong>${node.probability}%</strong></div>`).join("")}
          </div>
          <p class="player-generated-story">${semanticStoryMarkup(generatedStory(), comparison.playerTerms, comparison.labels)}</p>
        </section>

        <article class="glass-panel result-story-card verified-result-card">
          <div class="result-section-label"><span>3</span>實際查證內容</div>
          <p>${semanticStoryMarkup(state.current.verified_story, comparison.verifiedTerms, comparison.labels)}</p>
        </article>

        <div class="result-bottom-grid">
          <article class="lesson-note">
            <h3>為什麼會有落差？</h3>
            <p>${escapeHTML(opening?.comparison_note || state.current.comparison_note)}</p>
          </article>
          <div class="glass-panel sources-block">
            <h3>查證文獻</h3>
            <ol class="source-list">
              ${sources.map((source) => `<li><a class="source-link" href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.label)}</a></li>`).join("")}
            </ol>
            <p class="simulation-note">${escapeHTML(state.current.simulation_note)}</p>
          </div>
        </div>

        <div class="source-row result-actions">
          <div class="button-row">
            <button class="secondary-btn" id="leave-game">離開遊戲</button>
            <button class="primary-btn" id="play-again">再玩一個案例</button>
          </div>
        </div>
      </section>
    `);
    document.querySelector("#play-again").addEventListener("click", startGame);
    document.querySelector("#leave-game").addEventListener("click", showHome);
    announce(ending);
  }

  function showError(error) {
    console.error(error);
    const localHint = location.protocol === "file:"
      ? "目前是直接開啟檔案。瀏覽器會阻擋 CSV 讀取；請以本機 HTTP 伺服器開啟，或部署到 GitHub Pages。"
      : "請確認 data 資料夾與四份 CSV 已一併部署。";
    counter.textContent = "資料載入失敗";
    setScreen(`
      <section class="screen" aria-labelledby="error-title">
        <div class="glass-panel error-card">
          <p class="eyebrow">無法建立星圖</p>
          <h2 id="error-title">案例資料沒有成功載入</h2>
          <p>${escapeHTML(localHint)}</p>
          <p class="simulation-note">開發時可在本目錄執行 <code>python -m http.server 8000</code>，再開啟 <code>http://localhost:8000</code>。</p>
          <button class="primary-btn" onclick="location.reload()">重新載入</button>
        </div>
      </section>
    `);
  }

  function initStarfield() {
    const canvas = document.querySelector("#starfield");
    const context = canvas.getContext("2d");
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars = [];
    let width = 0;
    let height = 0;
    let frame = 0;

    function resize() {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      width = innerWidth;
      height = innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(180, Math.floor((width * height) / 8500));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.4 + .2,
        alpha: Math.random() * .55 + .18,
        speed: Math.random() * .003 + .001
      }));
      draw();
    }

    function draw() {
      context.clearRect(0, 0, width, height);
      stars.forEach((star) => {
        const pulse = reducedMotion ? 1 : .72 + Math.sin(frame * star.speed * 10 + star.x) * .28;
        context.beginPath();
        context.fillStyle = `rgba(190, 221, 255, ${star.alpha * pulse})`;
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fill();
      });
    }

    function animate() {
      frame += 1;
      draw();
      requestAnimationFrame(animate);
    }

    addEventListener("resize", resize, { passive: true });
    resize();
    if (!reducedMotion) animate();
  }

  document.querySelector("[data-action='home']").addEventListener("click", (event) => {
    event.preventDefault();
    if (state.cases.length) showHome();
  });

  async function init() {
    initStarfield();
    try {
      const [cases, openings, segments, nodes] = await Promise.all(Object.values(DATA_FILES).map(fetchCSV));
      state.cases = cases;
      state.openings = openings;
      state.segments = segments;
      state.nodes = nodes;
      validateData();
      showHome();
    } catch (error) {
      showError(error);
    }
  }

  init();
})();
