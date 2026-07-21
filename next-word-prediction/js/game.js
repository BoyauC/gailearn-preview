(() => {
  "use strict";

  const DATA_FILES = {
    cases: "data/cases.csv",
    segments: "data/segments.csv",
    nodes: "data/nodes.csv"
  };

  const app = document.querySelector("#app");
  const announcer = document.querySelector("#announcer");
  const counter = document.querySelector("#case-counter");
  const state = {
    cases: [],
    segments: [],
    nodes: [],
    current: null,
    lastCaseId: null,
    selectedSegments: new Set(),
    noticedSuspicion: false,
    groupId: "root",
    path: [],
    verdict: ""
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
    app.innerHTML = markup;
    focusTitle();
  }

  function currentSegments() {
    return state.segments
      .filter((item) => item.case_id === state.current.case_id)
      .sort((a, b) => Number(a.order) - Number(b.order));
  }

  function nodesFor(groupId) {
    return state.nodes
      .filter((node) => node.case_id === state.current.case_id && node.group_id === groupId)
      .sort((a, b) => Number(a.option_order) - Number(b.option_order));
  }

  function generatedPhrase() {
    return state.path.map((node) => node.token).join("");
  }

  function generatedStory() {
    return `${state.current.story_prefix}${generatedPhrase()}${state.current.story_suffix}`;
  }

  function currentSources() {
    return [
      { label: state.current.source_label, url: state.current.source_url },
      { label: state.current.source_label_2, url: state.current.source_url_2 }
    ].filter((source) => source.label && source.url);
  }

  function validateData() {
    const activeCases = state.cases.filter((item) => item.active === "1");
    if (!activeCases.length) throw new Error("cases.csv 沒有 active=1 的案例");

    activeCases.forEach((gameCase) => {
      const groups = new Map();
      state.nodes.filter((node) => node.case_id === gameCase.case_id).forEach((node) => {
        if (!groups.has(node.group_id)) groups.set(node.group_id, []);
        groups.get(node.group_id).push(node);
      });
      if (!groups.has("root")) throw new Error(`${gameCase.case_id} 缺少 root 節點群組`);
      groups.forEach((nodes, groupId) => {
        const sum = nodes.reduce((total, node) => total + Number(node.probability), 0);
        if (nodes.length !== 3 || sum !== 100) {
          throw new Error(`${gameCase.case_id}/${groupId} 必須有三個節點且機率合計為 100`);
        }

        const step = Number(nodes[0].step);
        if (nodes.some((node) => Number(node.step) !== step)) {
          throw new Error(`${gameCase.case_id}/${groupId} 不可混用不同步驟`);
        }
        if (step < 4 && new Set(nodes.map((node) => node.next_group)).size !== nodes.length) {
          throw new Error(`${gameCase.case_id}/${groupId} 的每個選項必須指向不同的完整路徑群組`);
        }

        nodes.forEach((node) => {
          if (step < 4) {
            const nextNodes = groups.get(node.next_group);
            if (!node.next_group || !nextNodes) {
              throw new Error(`${gameCase.case_id}/${groupId}/${node.label} 缺少下一個完整路徑群組`);
            }
            if (nextNodes.some((nextNode) => Number(nextNode.step) !== step + 1)) {
              throw new Error(`${gameCase.case_id}/${groupId}/${node.label} 的下一群組步驟錯誤`);
            }
          } else if (node.next_group) {
            throw new Error(`${gameCase.case_id}/${groupId}/${node.label} 已是第四步，不可再指定 next_group`);
          }
        });
      });
    });
  }

  function showHome() {
    state.current = null;
    const activeCount = state.cases.filter((item) => item.active === "1").length;
    counter.textContent = `${activeCount} 個可玩案例`;
    setScreen(`
      <section class="screen hero" aria-labelledby="home-title">
        <div class="hero-copy">
          <p class="eyebrow">NEXT WORD PREDICTION</p>
          <h1 id="home-title">AI提供的，<span>會是真的嗎？</span></h1>
          <p class="lead">跟著 AI 的預測路徑，每一步選出統計上可能接續的詞，看看一段流暢的歷史敘述，是否真的經得起查證。</p>
          <div class="button-row">
            <button class="primary-btn" id="start-game">開始探索</button>
            <span class="selection-count">一局約 5 分鐘・共四次預測</span>
          </div>
        </div>
        <div class="hero-map" aria-hidden="true">
          <div class="orbit-ring ring-one"></div>
          <div class="orbit-ring ring-two"></div>
          <span class="float-node">高機率 ≠ 正確</span>
          <span class="float-node">上下文</span>
          <span class="float-node">重新預測</span>
          <img class="sisi-character" src="assets/images/sisi-60427.png" alt="">
          <div class="sisi-tablet"><span>下一個詞</span></div>
        </div>
      </section>
    `);
    document.querySelector("#start-game").addEventListener("click", startGame);
  }

  function startGame() {
    const active = state.cases.filter((item) => item.active === "1");
    let pool = active.filter((item) => item.case_id !== state.lastCaseId);
    if (!pool.length) pool = active;
    state.current = pool[Math.floor(Math.random() * pool.length)];
    state.lastCaseId = state.current.case_id;
    state.selectedSegments = new Set();
    state.noticedSuspicion = false;
    state.groupId = "root";
    state.path = [];
    state.verdict = "";
    counter.textContent = `${state.current.category}・${state.current.difficulty}`;
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
          <div class="story-select" id="story-segments" aria-label="可選取的歷史敘述">
            ${segments.map((segment) => `<button class="segment" data-order="${segment.order}" aria-pressed="false">${escapeHTML(segment.text)}</button>`).join("")}
          </div>
          <div class="selection-meta">
            <span class="selection-count" id="selection-count">尚未標記；也可以直接提交判斷</span>
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
    const message = state.noticedSuspicion ? state.current.reveal_hit : state.current.reveal_miss;
    setScreen(`
      <section class="screen" aria-labelledby="reveal-title">
        <div class="glass-panel reveal-card">
          <div class="reveal-icon" aria-hidden="true">⌖</div>
          <p class="eyebrow">調查點已鎖定</p>
          <h2 id="reveal-title">先別急著找答案</h2>
          <p>${escapeHTML(message)}</p>
          <button class="primary-btn" id="enter-stars">看看 AI 如何預測</button>
        </div>
      </section>
    `);
    announce(message);
    document.querySelector("#enter-stars").addEventListener("click", showPrediction);
  }

  function showPrediction() {
    const options = nodesFor(state.groupId);
    if (options.length !== 3) return showError(new Error(`找不到節點群組：${state.groupId}`));
    const step = Number(options[0].step);
    const context = `${state.current.story_prefix}${generatedPhrase()}`;
    setScreen(`
      <section class="screen prediction-layout" aria-labelledby="prediction-title">
        <div class="progress-row" aria-label="目前是四步中的第 ${step} 步">
          ${[1, 2, 3, 4].map((value) => `<span class="progress-step ${value < step ? "done" : value === step ? "active" : ""}"></span>`).join("")}
        </div>
        <div class="step-header">
          <div>
            <p class="eyebrow">任務 02・第 ${step} / 4 次預測</p>
            <h2 id="prediction-title">哪個詞最可能接在後面？</h2>
            <p class="instruction">${escapeHTML(state.current.prediction_prompt)}</p>
          </div>
          <span class="case-chip">節點大小＝模擬機率</span>
        </div>
        <div class="glass-panel context-box">
          <div class="context-label">目前完整上下文</div>
          <p class="context-text">${escapeHTML(context)}<span class="cursor" aria-hidden="true"></span></p>
          <div class="live-trail" aria-label="已走過的詞語節點">
            ${state.path.map((node) => `<span>${escapeHTML(node.label)} <b>${node.probability}%</b></span>`).join("")}
            <i aria-hidden="true">第 ${step} 步</i>
          </div>
        </div>
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
        <div class="reason-box" id="reason-box">節點越亮、越大，代表它在目前上下文中的模擬權重越高；這不是正確答案提示。</div>
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
    document.querySelector("#reason-box").textContent = node.reason;
    state.path.push(node);
    announce(`你選擇了${node.label}，${node.probability}%。${node.reason}`);
    window.setTimeout(() => {
      if (state.path.length === 4) showVerdict();
      else {
        state.groupId = node.next_group;
        showPrediction();
      }
    }, 1150);
  }

  function showVerdict() {
    setScreen(`
      <section class="screen" aria-labelledby="verdict-title">
        <div class="step-header">
          <div>
            <p class="eyebrow">任務 03・流暢度陷阱</p>
            <h2 id="verdict-title">句子完成了，但它可信嗎？</h2>
            <p class="instruction">${escapeHTML(state.current.verdict_question)}</p>
          </div>
          <span class="case-chip">你走完了四個節點</span>
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
    const ending = historicallyAligned ? state.current.ending_right : state.current.ending_wrong;
    const awareness = state.verdict === "verify" ? "有保留" : state.verdict === "unsure" ? "願意停看" : "被流暢度說服";
    const sources = currentSources();
    setScreen(`
      <section class="screen result-screen" aria-labelledby="result-title">
        <div class="result-hero">
          <div>
            <p class="eyebrow">路徑分析完成</p>
            <h2 id="result-title">流暢，是預測的成果；<br>真實，需要另外查證。</h2>
            <p class="result-message">${escapeHTML(ending)}</p>
          </div>
          <div class="score-orb"><strong>${escapeHTML(awareness)}</strong><span>查證意識</span></div>
        </div>

        <div class="glass-panel path-review" aria-label="你的四步預測路徑">
          ${state.path.map((node, index) => `<div class="path-item"><span>第 ${index + 1} 步</span>${escapeHTML(node.label)} <strong>${node.probability}%</strong></div>`).join("")}
        </div>

        <div class="compare-grid">
          <article class="glass-panel compare-card">
            <span class="compare-label">AI 路徑生成</span>
            <p>${escapeHTML(generatedStory())}</p>
          </article>
          <article class="glass-panel compare-card verified">
            <span class="compare-label">查證後敘述</span>
            <p>${escapeHTML(state.current.verified_story)}</p>
          </article>
        </div>

        <div class="lesson-note">
          <h3>為什麼會有落差？</h3>
          <p>${escapeHTML(state.current.comparison_note)}</p>
        </div>

        <div class="source-row">
          <div class="sources-block">
            <h3>查證文獻</h3>
            <ol class="source-list">
              ${sources.map((source) => `<li><a class="source-link" href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.label)}</a></li>`).join("")}
            </ol>
            <p class="simulation-note">${escapeHTML(state.current.simulation_note)}</p>
          </div>
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
      : "請確認 data 資料夾與三份 CSV 已一併部署。";
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
      const [cases, segments, nodes] = await Promise.all(Object.values(DATA_FILES).map(fetchCSV));
      state.cases = cases;
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
