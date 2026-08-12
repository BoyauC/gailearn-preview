/* ===========================================================
   AI 真相大搜查 — script.js
   主程式：CSV 載入、狀態管理、畫面切換、各關邏輯
   全部邏輯走資料驅動：所有文字、題目從 /data/*.csv 載入
   =========================================================== */

(function () {
  'use strict';

  // ===========================================================
  // 0. 常數與全域命名空間
  // ===========================================================
  const COUNTDOWN_SEC = 7;             // 第一關每則訊息倒數秒數
  const LEVEL2_TIME_SEC = 60;          // 第二關總時間
  const TIMER_URGENT_THRESHOLD = 2;    // 倒數最後幾秒進入緊張狀態
  const SCREEN_TRANSITION_MS = 300;    // 場景切換動畫時間
  const REVEAL_SCREEN_MS = 2500;       // 情境揭幕停留時間

  const SCENARIO_IDS = ['s1', 's2', 's3'];

  const LS_KEYS = {
    PLAYER_NAME: 'aitruth_player_name',
    COMPLETED: 'aitruth_completed_scenarios',
    LAST_PLAYED: 'aitruth_last_played',
    MUTED: 'aitruth_settings_muted',
  };

  // 全域命名空間（避免污染 window）
  window.AITruth = window.AITruth || {};

  // ===========================================================
  // 1. 遊戲狀態（單一來源）
  // ===========================================================
  const gameState = {
    // CSV 載入後的資料
    data: {
      scenarios: [],     // 全部 3 個情境
      messages: [],      // 全部訊息題庫
      breakpoints: [],   // 全部 hotspot
      characters: [],          // 全部第三關角色
      characterResponses: [],  // 依分支的角色回應（character_responses.csv）
      ui: {},            // key -> value 的字典
      narrator: {},      // line_id -> {text, voice} 的字典
      instructions: [],  // 說明頁 3 步驟
    },
    // 玩家狀態
    playerName: '',
    completedScenarios: [],
    // 本局星數（各關 0 / 0.5 / 1）
    stars: { level1: 0, level2: 0, level3: 0 },
    muted: false,
    // 當前進行中的情境
    currentScenario: null,
    // 第一關狀態
    level1: {
      messageIndex: 0,
      correctFakes: 0,         // 已答對假訊息數
      requiredFakes: 0,        // 需要答對的假訊息數（= 該情境的 is_fake count）
      timerId: null,
      countdownRemain: 0,
      awaiting: false,         // 是否等待玩家輸入
    },
    // 第二關狀態
    level2: {
      foundBreakpoints: [],
      hintUsed: false,
      startTime: 0,
      timerId: null,
      sourceMessageOrder: null,
      sourceImage: '',
    },
    // 第三關狀態
    level3: {
      selectedCharacterId: null,
      cleared: false,
    },
    // 流程旗標（舊欄位保留以維持 state shape，目前未使用）
    instructionsStep: 0,
  };
  window.AITruth.state = gameState;

  // ===========================================================
  // 2. 工具函式
  // ===========================================================

  /**
   * 將 \n 字串占位符換成真正換行（用於從 CSV 載入的文字）
   * @param {string} text
   * @returns {string}
   */
  function unescapeText(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/\\n/g, '\n');
  }

  /**
   * 解析 CSV 文字成物件陣列
   * 支援：雙引號包覆、雙引號跳脫（""）、欄位內逗號
   * 不支援：欄位內真實換行（請用 \n 占位符）
   * @param {string} csvText
   * @returns {Array<object>}
   */
  function parseCSV(csvText) {
    const lines = csvText.replace(/\r\n/g, '\n').split('\n').filter(l => l.length > 0);
    if (lines.length < 2) return [];
    const headers = splitCSVLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const fields = splitCSVLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = fields[idx] !== undefined ? fields[idx] : '';
      });
      rows.push(row);
    }
    return rows;
  }

  /**
   * 解析一行 CSV
   * @param {string} line
   * @returns {string[]}
   */
  function splitCSVLine(line) {
    const fields = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else { inQuote = false; }
        } else { cur += ch; }
      } else {
        if (ch === '"') { inQuote = true; }
        else if (ch === ',') { fields.push(cur); cur = ''; }
        else { cur += ch; }
      }
    }
    fields.push(cur);
    return fields;
  }

  /**
   * 從伺服器載入並解析 CSV
   * 用 cache: 'no-store' + 時間戳 query 雙重保險，避免改 CSV 後瀏覽器仍用舊版
   * @param {string} path
   * @returns {Promise<Array<object>>}
   */
  async function loadCSV(path) {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${path}${sep}t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`載入 ${path} 失敗：${res.status}`);
    const text = await res.text();
    return parseCSV(text);
  }

  function $(selector) { return document.querySelector(selector); }
  function $$(selector) { return Array.from(document.querySelectorAll(selector)); }

  /**
   * 取 UI 字串（從 ui_strings.csv），找不到回傳 key 本身（方便除錯）
   * @param {string} key
   * @returns {string}
   */
  function t(key) {
    const val = gameState.data.ui[key];
    return val !== undefined ? unescapeText(val) : `[${key}]`;
  }

  function loadLocalStorage() {
    try {
      gameState.playerName = '';
      // completedScenarios 為 session 內狀態，不從 localStorage 載入
      gameState.muted = localStorage.getItem(LS_KEYS.MUTED) === 'true';
    } catch (e) {
      console.warn('localStorage 讀取失敗', e);
    }
  }
  function saveLocalStorage() {
    try {
      // completedScenarios 為 session 內狀態，不持久化
      localStorage.setItem(LS_KEYS.MUTED, gameState.muted ? 'true' : 'false');
    } catch (e) {
      console.warn('localStorage 寫入失敗', e);
    }
  }

  /**
   * 顯示 Toast 提示
   * @param {string} message
   * @param {'info'|'success'|'danger'|'warning'} variant
   * @param {number} duration ms
   */
  function showToast(message, variant = 'info', duration = 3000) {
    const container = $('#toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast--${variant}`;
    el.textContent = message;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast--visible'));
    setTimeout(() => {
      el.classList.remove('toast--visible');
      setTimeout(() => el.remove(), 400);
    }, duration);
  }

  /**
   * 顯示指定 screen，隱藏其他
   * @param {string} screenId 例如 'screen-start'
   */
  function showScreen(screenId) {
    $$('.screen').forEach(s => s.classList.remove('screen--active'));
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('screen--active');
      target.scrollTop = 0;
    }
  }

  // ===========================================================
  // 3. CSV 統一載入入口
  // ===========================================================

  async function loadAllData() {
    const [scenarios, messages, breakpoints, characterResponses, ui, narrator, instructions] = await Promise.all([
      loadCSV('data/scenarios.csv'),
      loadCSV('data/messages.csv'),
      loadCSV('data/breakpoints.csv'),
      loadCSV('data/character_responses.csv'),
      loadCSV('data/ui_strings.csv'),
      loadCSV('data/narrator_lines.csv'),
      loadCSV('data/instructions.csv'),
    ]);

    // 後處理：normalize 型別
    gameState.data.scenarios = scenarios;
    gameState.data.messages = messages.map(m => ({
      ...m,
      message_order: parseInt(m.message_order, 10),
      is_fake: String(m.is_fake).toLowerCase() === 'true',
    }));
    gameState.data.breakpoints = breakpoints.map(b => ({
      ...b,
      source_message_order: b.source_message_order ? parseInt(b.source_message_order, 10) : null,
      center_x_pct: parseFloat(b.center_x_pct),
      center_y_pct: parseFloat(b.center_y_pct),
      tolerance_pct: parseFloat(b.tolerance_pct),
    }));
    gameState.data.characterResponses = characterResponses.map(r => ({
      ...r,
      source_message_order: parseInt(r.source_message_order, 10),
      is_correct: String(r.is_correct).toLowerCase() === 'true',
    }));

    // ui_strings 轉成 key -> value 字典
    gameState.data.ui = {};
    ui.forEach(row => { gameState.data.ui[row.key] = row.value; });

    // narrator_lines 轉成 line_id -> {text, voice}
    gameState.data.narrator = {};
    narrator.forEach(row => {
      gameState.data.narrator[row.line_id] = { text: unescapeText(row.text), voice: row.voice, scene: row.scene };
    });

    // instructions 排序
    gameState.data.instructions = instructions
      .map(r => ({ ...r, step: parseInt(r.step, 10) }))
      .sort((a, b) => a.step - b.step);
  }

  // ===========================================================
  // 4. 畫面 1：單頁式開始/說明頁
  //    一頁顯示「停 / 查 / 問」三步驟 + 開始按鈕
  // ===========================================================

  function initStartScreen() {
    renderFlowGrid();
    $('#start-btn').addEventListener('click', goToIntro);
  }

  /**
   * 把 instructions.csv 的 3 個步驟渲染成 flow-grid 卡片
   */
  function renderFlowGrid() {
    const grid = $('#flow-grid');
    grid.innerHTML = '';
    gameState.data.instructions.forEach((step, idx) => {
      const card = document.createElement('div');
      card.className = 'flow-step';
      card.innerHTML = `
        <div class="flow-step__num">${idx + 1}</div>
        <img class="flow-step__icon" src="${escapeHtml(step.illustration)}" alt="${escapeHtml(step.title)}">
        <div class="flow-step__label">${escapeHtml(step.title)}</div>
        <div class="flow-step__desc">${escapeHtml(unescapeText(step.text))}</div>
      `;
      grid.appendChild(card);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  /**
   * 圖片載入失敗時的視覺占位（inline SVG data URL）
   * 讓尚未生成的訊息圖 / 主圖也能顯示一個有標示的灰底框，方便開發測試
   * @param {string} label 顯示文字
   * @param {number} w 寬
   * @param {number} h 高
   * @returns {string} data URL
   */
  function createPlaceholderImage(label, w = 1600, h = 900) {
    const safe = label.replace(/[<>&]/g, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#E0E6ED"/><rect x="20" y="20" width="${w-40}" height="${h-40}" fill="none" stroke="#7F8C8D" stroke-width="4" stroke-dasharray="20 10"/><text x="50%" y="50%" font-family="sans-serif" font-size="${Math.floor(w/24)}" fill="#2C3E50" text-anchor="middle" dominant-baseline="middle">${safe}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function goToIntro() {
    // 每次從開始頁進入都重置已完成紀錄，確保全新一輪
    gameState.completedScenarios = [];
    showScreen('screen-intro');
    initIntro();
  }

  // ===========================================================
  // 6. 畫面 3：前導動畫（18 張圖 flipbook + 對白打字機）
  // ===========================================================

  const INTRO_IMAGE_COUNT = 18;
  const INTRO_ARRIVAL_FRAME = 4;              // 吱吱抵達麥克風前面的那一幀
  // 兩階段節奏分離：
  //   走向期（frame 1 ~ ARRIVAL_FRAME-1）— 鋪陳氛圍，無對白
  //   對白期（ARRIVAL_FRAME ~ COUNT）— 與打字機同步，越短越動感
  const INTRO_PRE_DIALOGUE_INTERVAL_MS = 400; // 走向期每張圖停留時間
  const INTRO_DIALOGUE_INTERVAL_MS = 800;     // 對白期每張圖停留時間（打字速度會跟著自動換算）
  const INTRO_BASE_PATH = 'assets/images/intro/move';
  const INTRO_IMAGE_EXT = '.webp';            // WebP 比 PNG 小約 87%，加速載入；現代瀏覽器全支援

  let introCtaBound = false;

  function initIntro() {
    const line = gameState.data.narrator['intro_full'];
    if (!line) {
      console.warn('[AITruth] 找不到 intro_full 對白，跳過前導');
      pickRandomScenario();
      startLevel1();
      return;
    }

    // 提早抽情境，等等 CTA 按鈕的副標要用到情境名稱
    pickRandomScenario();

    const imgEl = $('#intro-slide');
    const textEl = $('#intro-text');

    // 重設狀態
    textEl.classList.remove('intro__text--done');
    textEl.textContent = '';
    imgEl.src = `${INTRO_BASE_PATH}1${INTRO_IMAGE_EXT}`;
    imgEl.alt = '開場動畫';
    $('#intro-cta').hidden = true;

    // 背景預載剩下 17 張，避免後續切換時短暫白屏
    preloadIntroImages();

    // 動態計算打字節奏：
    //   走向期時長 = (ARRIVAL_FRAME - 1) × PRE_DIALOGUE_INTERVAL（決定何時開始打字）
    //   對白期時長 = (COUNT - ARRIVAL_FRAME + 1) × DIALOGUE_INTERVAL（決定打字總窗口）
    //   每字時間  = 對白期時長 / 對白字數（精確對齊，浮點不四捨五入）
    const chars = Array.from(line.text);
    const framesAfterArrival = INTRO_IMAGE_COUNT - INTRO_ARRIVAL_FRAME + 1;
    const typingDurationMs = framesAfterArrival * INTRO_DIALOGUE_INTERVAL_MS;
    const charIntervalMs = typingDurationMs / chars.length;
    const typingStartDelayMs = (INTRO_ARRIVAL_FRAME - 1) * INTRO_PRE_DIALOGUE_INTERVAL_MS;

    // 用 performance.now() 共同時間軸：徹底消除 setTimeout 累積飄移
    const beginAt = performance.now();

    Promise.all([
      playIntroSlideshow(imgEl, beginAt),
      playIntroTypewriter(textEl, chars, charIntervalMs, beginAt + typingStartDelayMs),
    ])
      .then(() => {
        textEl.classList.add('intro__text--done');
        showStartInvestigationButton();
      })
      .catch(err => {
        console.error('[AITruth] 前導動畫錯誤：', err);
        showStartInvestigationButton();
      });
  }

  /**
   * 動畫結束後在 slideshow 下方出現「開始調查」按鈕
   * 玩家手動點擊才會進入第一關，給足準備時間
   */
  function showStartInvestigationButton() {
    const sc = gameState.currentScenario;
    const subEl = $('#intro-cta-subtitle');
    if (sc) {
      subEl.innerHTML = `本次任務：<strong>${escapeHtml(sc.name)}</strong>`;
    } else {
      subEl.textContent = '準備好了嗎？';
    }
    const cta = $('#intro-cta');
    cta.hidden = false;

    if (!introCtaBound) {
      $('#intro-cta-btn').addEventListener('click', () => {
        $('#intro-cta').hidden = true;
        startLevel1();
      });
      introCtaBound = true;
    }
  }

  function preloadIntroImages() {
    for (let i = 2; i <= INTRO_IMAGE_COUNT; i++) {
      const img = new Image();
      img.src = `${INTRO_BASE_PATH}${i}${INTRO_IMAGE_EXT}`;
    }
  }

  /**
   * 圖片輪播（時間軸對齊版 + 兩階段節奏）
   * 走向期用 PRE_DIALOGUE_INTERVAL，對白期用 DIALOGUE_INTERVAL
   * 用 rAF 每幀根據 elapsed 計算該顯示第幾張圖，徹底消除 setTimeout 飄移
   * @param {HTMLImageElement} imgEl
   * @param {number} beginAt performance.now() 的起點時刻
   */
  function playIntroSlideshow(imgEl, beginAt) {
    return new Promise(resolve => {
      let lastFrame = 0;
      const preFrames = INTRO_ARRIVAL_FRAME - 1;
      const phase1End = preFrames * INTRO_PRE_DIALOGUE_INTERVAL_MS;
      const dialogueFrames = INTRO_IMAGE_COUNT - INTRO_ARRIVAL_FRAME + 1;
      const totalDuration = phase1End + dialogueFrames * INTRO_DIALOGUE_INTERVAL_MS;

      const tick = () => {
        const elapsed = performance.now() - beginAt;
        let targetFrame;
        if (elapsed < phase1End) {
          // 走向期：以 PRE_DIALOGUE_INTERVAL 換算當前該顯示哪張
          targetFrame = Math.min(
            preFrames,
            Math.max(1, Math.floor(elapsed / INTRO_PRE_DIALOGUE_INTERVAL_MS) + 1)
          );
        } else {
          // 對白期：以 DIALOGUE_INTERVAL 換算，從 ARRIVAL_FRAME 起算
          const dialogueElapsed = elapsed - phase1End;
          targetFrame = Math.min(
            INTRO_IMAGE_COUNT,
            INTRO_ARRIVAL_FRAME + Math.floor(dialogueElapsed / INTRO_DIALOGUE_INTERVAL_MS)
          );
        }

        if (targetFrame !== lastFrame) {
          imgEl.src = `${INTRO_BASE_PATH}${targetFrame}${INTRO_IMAGE_EXT}`;
          lastFrame = targetFrame;
        }

        if (elapsed >= totalDuration) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /**
   * 打字機（時間軸對齊版）：用 rAF 每幀根據 elapsed 計算該顯示幾個字
   * 即使瀏覽器卡頓也會在恢復後跳到正確位置（不漏字、不慢拍）
   * 支援 Unicode（中文＋全形標點都安全）
   * @param {HTMLElement} textEl
   * @param {string[]} chars Array.from(text) 切好的字元陣列
   * @param {number} charIntervalMs 每字的時間間隔（毫秒，可為浮點）
   * @param {number} startAt performance.now() 的起點時刻（typewriter 真正開始顯字的時間）
   */
  function playIntroTypewriter(textEl, chars, charIntervalMs, startAt) {
    return new Promise(resolve => {
      const tick = () => {
        const elapsed = performance.now() - startAt;
        if (elapsed < 0) {
          // 還沒到 typewriter 啟動時間，靜默等待
          requestAnimationFrame(tick);
          return;
        }

        const charsToShow = Math.min(chars.length, Math.floor(elapsed / charIntervalMs));
        const newText = chars.slice(0, charsToShow).join('');
        if (textEl.textContent !== newText) {
          textEl.textContent = newText;
        }

        if (charsToShow >= chars.length) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===========================================================
  // 7. 畫面 4：情境揭幕（隨機抽情境）
  // ===========================================================

  function goToScenarioReveal() {
    pickRandomScenario();
    const sc = gameState.currentScenario;
    if (!sc) {
      showToast('找不到可玩的情境', 'danger');
      return;
    }
    $('#reveal-name').textContent = sc.name;
    $('#reveal-desc').textContent = sc.short_desc;
    showScreen('screen-scenario-reveal');

    setTimeout(() => {
      startLevel1();
    }, REVEAL_SCREEN_MS);
  }

  function pickRandomScenario() {
    const all = gameState.data.scenarios;
    const completed = gameState.completedScenarios;
    const remaining = all.filter(s => !completed.includes(s.scenario_id));
    const pool = remaining.length > 0 ? remaining : all;
    const idx = Math.floor(Math.random() * pool.length);
    gameState.currentScenario = pool[idx] || null;
  }

  // ===========================================================
  // 7.1 第一關：停（雙按鈕、5 秒倒數、慶祝動畫分級）
  // ===========================================================

  let level1Bound = false;
  const LEVEL1_FEEDBACK_MS = 1600;  // 答完到下一題之間的停頓
  const TIMER_DASH_CIRC = 226;       // 2π·36 ≈ 226（與 SVG circle r=36 對應）

  function startLevel1() {
    const sc = gameState.currentScenario;
    if (!sc) return;

    // 從 messages 取出本情境的 5 則訊息，隨機排序
    const messages = gameState.data.messages
      .filter(m => m.scenario_id === sc.scenario_id)
      .sort(() => Math.random() - 0.5);

    const requiredFakes = messages.filter(m => m.is_fake).length;

    gameState.level1 = {
      messages,
      messageIndex: 0,
      correctFakes: 0,
      requiredFakes,
      answers: [],
      timerId: null,
      countdownRemain: 0,
      awaiting: false,
    };

    // 重設進度顯示
    $('#level1-progress').textContent = `0 / ${requiredFakes}`;

    // 綁定按鈕（只綁一次）
    if (!level1Bound) {
      $('#level1-btn-true').addEventListener('click', () => handleLevel1Answer(false));
      $('#level1-btn-fake').addEventListener('click', () => handleLevel1Answer(true));
      level1Bound = true;
    }

    showScreen('screen-level1');
    showNextLevel1Message();
  }

  function showNextLevel1Message() {
    const L1 = gameState.level1;
    if (L1.messageIndex >= L1.messages.length) {
      finishLevel1();
      return;
    }
    const msg = L1.messages[L1.messageIndex];

    const img = $('#level1-message-image');
    img.onerror = () => {
      // 圖片載入失敗 → 顯示有標示的灰底佔位
      img.onerror = null;
      img.src = createPlaceholderImage(`訊息 ${msg.message_order}（圖待生成）`, 800, 600);
    };
    img.src = msg.image;
    img.alt = msg.text;

    $('#level1-message-text').textContent = msg.text;

    enableLevel1Buttons(true);
    startLevel1Countdown();
    L1.awaiting = true;
  }

  function startLevel1Countdown() {
    const L1 = gameState.level1;
    L1.countdownRemain = COUNTDOWN_SEC;
    const wrap = $('#level1-timer');
    const circle = $('#level1-timer-circle');
    const text = $('#level1-timer-text');

    wrap.hidden = false;
    wrap.classList.remove('timer--urgent');
    text.textContent = COUNTDOWN_SEC;

    // 重設動畫
    circle.style.transition = 'none';
    circle.style.strokeDashoffset = '0';
    // Force reflow 才能讓下一段動畫生效
    void circle.offsetWidth;

    // 啟動動畫：在 COUNTDOWN_SEC 秒內把 dashoffset 從 0 推到完整圓周
    circle.style.transition = `stroke-dashoffset ${COUNTDOWN_SEC}s linear, stroke 0.3s`;
    circle.style.strokeDashoffset = String(TIMER_DASH_CIRC);

    // 同步秒數顯示
    if (L1.timerId) clearInterval(L1.timerId);
    L1.timerId = setInterval(() => {
      L1.countdownRemain--;
      text.textContent = Math.max(L1.countdownRemain, 0);
      if (L1.countdownRemain <= TIMER_URGENT_THRESHOLD && L1.countdownRemain > 0) {
        wrap.classList.add('timer--urgent');
      }
      if (L1.countdownRemain <= 0) {
        clearInterval(L1.timerId);
        L1.timerId = null;
        if (L1.awaiting) handleLevel1Timeout();
      }
    }, 1000);
  }

  function stopLevel1Countdown() {
    const L1 = gameState.level1;
    if (L1.timerId) {
      clearInterval(L1.timerId);
      L1.timerId = null;
    }
    const circle = $('#level1-timer-circle');
    // 凍結目前進度
    circle.style.transition = 'none';
  }

  function enableLevel1Buttons(enabled) {
    $('#level1-btn-true').disabled = !enabled;
    $('#level1-btn-fake').disabled = !enabled;
  }

  /**
   * 玩家按下「通過」或「停」
   * @param {boolean} playerSaysFake true = 按停，false = 按通過
   */
  function handleLevel1Answer(playerSaysFake) {
    const L1 = gameState.level1;
    if (!L1.awaiting) return;
    L1.awaiting = false;

    stopLevel1Countdown();
    enableLevel1Buttons(false);

    const msg = L1.messages[L1.messageIndex];
    const correct = (playerSaysFake === msg.is_fake);

    L1.answers.push({
      messageOrder: msg.message_order,
      isFake: msg.is_fake,
      playerSaysFake,
      correct,
      timeout: false,
    });

    if (correct && msg.is_fake) {
      // 抓到假訊息 → 強烈慶祝
      L1.correctFakes++;
      updateLevel1Progress();
      playCelebration('fake');
      showToast(t('level1_correct_fake'), 'success', 1500);
    } else if (correct && !msg.is_fake) {
      // 真訊息按通過 → 輕量慶祝
      playCelebration('true');
      showToast(t('level1_correct_true'), 'success', 1500);
    } else if (!correct && msg.is_fake) {
      // 漏抓假訊息
      showToast(t('level1_wrong_fake'), 'danger', 1800);
    } else {
      // 真訊息誤按停
      showToast(t('level1_wrong_true'), 'danger', 1800);
    }

    setTimeout(() => {
      L1.messageIndex++;
      showNextLevel1Message();
    }, LEVEL1_FEEDBACK_MS);
  }

  function handleLevel1Timeout() {
    const L1 = gameState.level1;
    if (!L1.awaiting) return;
    L1.awaiting = false;
    enableLevel1Buttons(false);

    const msg = L1.messages[L1.messageIndex];
    // 超時：視同答錯，不額外計分
    L1.answers.push({
      messageOrder: msg.message_order,
      isFake: msg.is_fake,
      playerSaysFake: null,
      correct: false,
      timeout: true,
    });

    showToast(t('level1_timeout'), 'warning', 1800);

    setTimeout(() => {
      L1.messageIndex++;
      showNextLevel1Message();
    }, LEVEL1_FEEDBACK_MS);
  }

  function updateLevel1Progress() {
    const L1 = gameState.level1;
    $('#level1-progress').textContent = `${L1.correctFakes} / ${L1.requiredFakes}`;
  }

  /**
   * 播放慶祝動畫覆蓋層
   * @param {'true'|'fake'} variant 'true' 輕量、'fake' 強烈
   */
  function playCelebration(variant) {
    const overlay = document.createElement('div');
    overlay.className = `celebrate celebrate--${variant}`;

    if (variant === 'true') {
      overlay.innerHTML = `
        <div class="celebrate__ring"></div>
        <div class="celebrate__check">✓</div>
      `;
    } else {
      // 假訊息答對：獎章 + 8 道彩帶
      const palette = [
        'var(--color-danger)',
        'var(--color-warning)',
        'var(--color-accent)',
        'var(--color-success)',
        'var(--color-primary)',
      ];
      const trajectories = [
        [-160, -100, -160], [120, -120, 200], [-100, 100, 90], [150, 70, -120],
        [0, -150, 180], [-160, 10, -90], [160, -20, 60], [80, 130, -45],
      ];
      const confettiHTML = trajectories.map(([tx, ty, rot], i) => {
        const color = palette[i % palette.length];
        return `<span class="confetti" style="--tx:${tx}px;--ty:${ty}px;--rot:${rot}deg;background:${color};"></span>`;
      }).join('');
      overlay.innerHTML = `
        <div class="celebrate__badge">🏅</div>
        ${confettiHTML}
      `;
    }

    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 1500);
  }

  function finishLevel1() {
    $('#level1-timer').hidden = true;
    const L1 = gameState.level1;

    // 計算第一關星數
    const half = Math.ceil(L1.requiredFakes / 2);
    let star1 = 0;
    if (L1.correctFakes >= L1.requiredFakes) star1 = 1;
    else if (L1.correctFakes >= half) star1 = 0.5;
    gameState.stars.level1 = star1;

    if (star1 === 0) {
      showToast(
        `差一點！假訊息沒抓到。換個事件再挑戰！`,
        'warning',
        3500
      );
      setTimeout(() => {
        retryWithNewScenario();
      }, 3500);
    } else if (star1 === 1) {
      showToast(`${t('level1_pass_title')}　${t('level1_pass_desc')}`, 'success', 2500);
      setTimeout(() => startLevel2(), 2500);
    } else {
      // 0.5 星：部分答對，進入第二關
      const caught = L1.correctFakes;
      showToast(
        `抓到 ${caught} / ${L1.requiredFakes} 則假訊息，繼續往下查！`,
        'warning',
        2800
      );
      setTimeout(() => startLevel2(), 2800);
    }
  }

  /**
   * 第一關失敗或證書頁「再挑戰一場」共用：清關卡狀態 → 直接重抽情境 → Level 1
   * 不會經過前導動畫
   */
  function retryWithNewScenario() {
    gameState.level1 = null;
    gameState.level2 = null;
    gameState.level3 = null;
    gameState.currentScenario = null;
    gameState.stars = { level1: 0, level2: 0, level3: 0 };
    goToScenarioReveal();
  }

  // ===========================================================
  // 7.2 第二關：查（hotspot 點擊判定、90 秒倒數、提示功能）
  // ===========================================================

  let level2Bound = false;
  const LEVEL2_CARD_DURATION_MS = 3000;   // 破綻說明卡自動消失時間
  const LEVEL2_URGENT_THRESHOLD_SEC = 10;  // 倒數最後幾秒進入緊張狀態
  const LEVEL2_HINT_DURATION_MS = 2500;    // 提示閃爍持續時間

  function showLevel2MagnifierHint() {
    const wrap = document.querySelector('#level2-stage .level2__image-wrap');
    if (!wrap) return;
    let hint = wrap.querySelector('.level2-magnifier-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'level2-magnifier-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.textContent = '🔍';
      wrap.appendChild(hint);
    }
    hint.hidden = false;
  }

  function hideLevel2MagnifierHint() {
    const hint = document.querySelector('#level2-stage .level2-magnifier-hint');
    if (hint) hint.hidden = true;
  }

  function startLevel2() {
    const sc = gameState.currentScenario;
    if (!sc) return;

    const fakeMessages = (gameState.level1?.messages || []).filter(m => m.is_fake);
    const caughtFakeOrders = new Set(
      (gameState.level1?.answers || [])
        .filter(a => a.isFake && a.correct)
        .map(a => a.messageOrder)
    );
    // 0.5星：只用答對的那張假訊息；1星：隨機選一張
    let pickedFake = null;
    if (gameState.stars.level1 === 0.5) {
      pickedFake = fakeMessages.find(m => caughtFakeOrders.has(m.message_order)) || null;
    } else {
      pickedFake = fakeMessages.length > 0
        ? fakeMessages[Math.floor(Math.random() * fakeMessages.length)]
        : null;
    }
    const sourceMessageOrder = pickedFake ? pickedFake.message_order : null;
    const sourceImage = pickedFake ? pickedFake.image : sc.main_image;

    const breakpoints = gameState.data.breakpoints
      .filter((b) => {
        if (b.scenario_id !== sc.scenario_id) return false;
        if (sourceMessageOrder !== null && Number.isFinite(b.source_message_order)) {
          return b.source_message_order === sourceMessageOrder;
        }
        return b.source_message_order === null || b.source_message_order === undefined || Number.isNaN(b.source_message_order);
      });

    gameState.level2 = {
      breakpoints,
      foundIds: [],
      hintUsed: false,
      timerId: null,
      timeRemain: LEVEL2_TIME_SEC,
      finished: false,
      sourceMessageOrder,
      sourceImage,
    };

    // 重設 UI
    $('#level2-progress').textContent = `0 / ${breakpoints.length}`;
    const hintBtn = $('#level2-hint-btn');
    hintBtn.disabled = false;
    hintBtn.textContent = t('level2_hint_button');

    // 清掉舊的 hotspot 標記
    $('#level2-stage').querySelectorAll('.hotspot-marker').forEach(el => el.remove());
    showLevel2MagnifierHint();
    // 清掉殘留的說明卡
    document.querySelectorAll('.breakpoint-card').forEach(el => el.remove());

    // 載入主圖
    const img = $('#level2-main-image');
    img.onerror = () => {
      img.onerror = null;
      img.src = createPlaceholderImage(`${sc.name} 主圖（待生成）`, 1600, 900);
    };
    img.src = sourceImage;
    img.alt = sc.name;

    // 綁定事件（只綁一次）
    if (!level2Bound) {
      $('#level2-stage').addEventListener('click', handleLevel2Click);
      $('#level2-hint-btn').addEventListener('click', useLevel2Hint);
      level2Bound = true;
    }

    showScreen('screen-level2');
    // 等圖片有尺寸後再啟動計時器與互動
    if (img.complete && img.naturalWidth > 0) {
      startLevel2Countdown();
    } else {
      img.addEventListener('load', () => startLevel2Countdown(), { once: true });
    }
  }

  function startLevel2Countdown() {
    const L2 = gameState.level2;
    L2.timeRemain = LEVEL2_TIME_SEC;
    const wrap = $('#level2-timer');
    const circle = $('#level2-timer-circle');
    const text = $('#level2-timer-text');

    wrap.classList.remove('timer--urgent');
    text.textContent = LEVEL2_TIME_SEC;

    circle.style.transition = 'none';
    circle.style.strokeDashoffset = '0';
    void circle.offsetWidth;

    circle.style.transition = `stroke-dashoffset ${LEVEL2_TIME_SEC}s linear, stroke 0.3s`;
    circle.style.strokeDashoffset = String(TIMER_DASH_CIRC);

    if (L2.timerId) clearInterval(L2.timerId);
    L2.timerId = setInterval(() => {
      L2.timeRemain--;
      text.textContent = Math.max(L2.timeRemain, 0);
      if (L2.timeRemain <= LEVEL2_URGENT_THRESHOLD_SEC && L2.timeRemain > 0) {
        wrap.classList.add('timer--urgent');
      }
      if (L2.timeRemain <= 0) {
        clearInterval(L2.timerId);
        L2.timerId = null;
        if (!L2.finished) finishLevel2(false);
      }
    }, 1000);
  }

  function stopLevel2Countdown() {
    const L2 = gameState.level2;
    if (L2.timerId) {
      clearInterval(L2.timerId);
      L2.timerId = null;
    }
    $('#level2-timer-circle').style.transition = 'none';
  }

  /**
   * 玩家點擊主圖
   * 把點擊位置換算成圖片內的百分比座標，再與各 breakpoint 做距離判定
   */
  function handleLevel2Click(event) {
    const L2 = gameState.level2;
    if (!L2 || L2.finished) return;
    hideLevel2MagnifierHint();

    // 玩家有任何點擊操作時，先關閉說明卡
    document.querySelectorAll('.breakpoint-card').forEach(el => el.remove());

    const img = $('#level2-main-image');
    // 只有點到圖片本身才判定（點空白處不處理）
    if (event.target !== img) return;

    const rect = img.getBoundingClientRect();
    if (rect.width === 0) return;
    const xPct = ((event.clientX - rect.left) / rect.width) * 100;
    const yPct = ((event.clientY - rect.top) / rect.height) * 100;

    // 找出命中的尚未發現破綻（矩形優先，無矩形尺寸則圓形判定）
    for (const bp of L2.breakpoints) {
      if (L2.foundIds.includes(bp.breakpoint_id)) continue;
      const dx = xPct - Number(bp.center_x_pct);
      const dy = yPct - Number(bp.center_y_pct);
      const wPct = parseFloat(bp.width_pct);
      const hPct = parseFloat(bp.height_pct);
      let hit;
      if (wPct > 0 && hPct > 0) {
        // 矩形判定
        hit = Math.abs(dx) <= wPct / 2 && Math.abs(dy) <= hPct / 2;
      } else {
        // 圓形判定（向下相容舊資料）
        hit = dx * dx + dy * dy <= bp.tolerance_pct * bp.tolerance_pct;
      }
      if (hit) {
        onBreakpointFound(bp);
        return;
      }
    }

    // 沒命中：顯示溫和提示，無懲罰
    showToast(t('level2_wrong_click'), 'info', 1200);
  }

  function onBreakpointFound(bp) {
    const L2 = gameState.level2;
    L2.foundIds.push(bp.breakpoint_id);

    placeHotspotMarker(bp, false);
    $('#level2-progress').textContent = `${L2.foundIds.length} / ${L2.breakpoints.length}`;
    showBreakpointCard(bp);

    // 找到破綻 → 輕量慶祝（沿用 Level 1 的「真」版）
    playCelebration('true');

    if (L2.foundIds.length >= L2.breakpoints.length) {
      setTimeout(() => finishLevel2(true), 1200);
    }
  }

  /**
   * 在主圖上放置 hotspot 標記
   * 由於圖片在 stage 內被 flex 置中，需計算 image 相對 stage 的偏移
   * @param {object} bp breakpoint 物件
   * @param {boolean} isHint true 表示提示閃爍標記（自動消失）
   */
  function placeHotspotMarker(bp, isHint) {
    const stage = $('#level2-stage');
    const img = $('#level2-main-image');
    const imgRect = img.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    if (imgRect.width === 0) return;

    const offsetX = imgRect.left - stageRect.left;
    const offsetY = imgRect.top - stageRect.top;

    const cx = offsetX + (Number(bp.center_x_pct) / 100) * imgRect.width;
    const cy = offsetY + (Number(bp.center_y_pct) / 100) * imgRect.height;

    const wPct = parseFloat(bp.width_pct);
    const hPct = parseFloat(bp.height_pct);
    const isRect = wPct > 0 && hPct > 0;

    const marker = document.createElement('div');
    if (isRect) {
      const markerW = (wPct / 100) * imgRect.width;
      const markerH = (hPct / 100) * imgRect.height;
      marker.className = isHint
        ? 'hotspot-marker hotspot-marker--rect hotspot-marker--hint'
        : 'hotspot-marker hotspot-marker--rect';
      marker.style.left = `${cx}px`;
      marker.style.top  = `${cy}px`;
      marker.style.width  = `${markerW}px`;
      marker.style.height = `${markerH}px`;
    } else {
      // 圓形（舊格式相容）
      marker.className = isHint ? 'hotspot-marker hotspot-marker--hint' : 'hotspot-marker';
      marker.style.left = `${cx}px`;
      marker.style.top  = `${cy}px`;
    }
    marker.dataset.breakpointId = bp.breakpoint_id;
    stage.appendChild(marker);

    if (isHint) {
      // 提示標記限時顯示，且不阻擋玩家點擊真正破綻
      setTimeout(() => marker.remove(), LEVEL2_HINT_DURATION_MS);
    }
  }

  /**
   * 顯示破綻說明卡（底部彈出，點擊或自動消失）
   */
  function showBreakpointCard(bp) {
    // ???????
    document.querySelectorAll('.breakpoint-card').forEach(el => el.remove());

    const card = document.createElement('div');
    card.className = 'breakpoint-card';
    const zoomImage = bp.zoom_image ? String(bp.zoom_image).trim() : '';
    const imageHtml = zoomImage
      ? `<img class="breakpoint-card__image" src="${escapeHtml(zoomImage)}" alt="${escapeHtml(bp.title || 'Breakpoint image')}" onerror="this.style.display='none'">`
      : '';
    card.innerHTML = `
      ${imageHtml}
      <div class="breakpoint-card__title">?? ${escapeHtml(bp.title)}</div>
      <div class="breakpoint-card__desc">${escapeHtml(unescapeText(bp.description))}</div>
    `;

    let autoCloseId = null;
    let closed = false;
    const closeCard = () => {
      if (closed) return;
      closed = true;
      if (autoCloseId) clearTimeout(autoCloseId);
      document.removeEventListener('click', onAnyClickClose, true);
      card.remove();
    };
    const onAnyClickClose = () => closeCard();

    // ???? 3 ??????????????????
    document.addEventListener('click', onAnyClickClose, true);
    document.body.appendChild(card);

    autoCloseId = setTimeout(closeCard, LEVEL2_CARD_DURATION_MS);
  }

  /**
   * 使用提示功能（限 1 次）
   * 隨機挑一個未發現的破綻位置閃爍 2.5 秒
   */
  function useLevel2Hint() {
    const L2 = gameState.level2;
    if (!L2 || L2.hintUsed || L2.finished) return;

    const remaining = L2.breakpoints.filter(b => !L2.foundIds.includes(b.breakpoint_id));
    if (remaining.length === 0) return;

    const hintBp = remaining[Math.floor(Math.random() * remaining.length)];
    placeHotspotMarker(hintBp, true);

    L2.hintUsed = true;
    const btn = $('#level2-hint-btn');
    btn.disabled = true;
    btn.textContent = t('level2_hint_used');
  }

  function finishLevel2(passed) {
    const L2 = gameState.level2;
    if (!L2 || L2.finished) return;
    L2.finished = true;
    stopLevel2Countdown();

    // 計算第二關星數
    const total2 = L2.breakpoints.length;
    const found2 = L2.foundIds.length;
    let star2 = 0;
    if (total2 > 0) {
      if (found2 >= total2) star2 = 1;
      else if (found2 >= Math.ceil(total2 / 2)) star2 = 0.5;
    }
    gameState.stars.level2 = star2;

    // 把找到的破綻 / 沒找到的破綻記到 level3 狀態，第三關會用到
    gameState.level3 = gameState.level3 || {};
    gameState.level3.foundBreakpoints =
      L2.breakpoints.filter(b => L2.foundIds.includes(b.breakpoint_id));
    gameState.level3.missedBreakpoints =
      L2.breakpoints.filter(b => !L2.foundIds.includes(b.breakpoint_id));
    gameState.level3.sourceMessageOrder = L2.sourceMessageOrder;

    if (passed || L2.foundIds.length === L2.breakpoints.length) {
      showToast(`${t('level2_pass_title')}　${t('level2_pass_desc')}`, 'success', 2800);
    } else {
      const miss = L2.breakpoints.length - L2.foundIds.length;
      showToast(`${t('level2_timeout')}　還有 ${miss} 個破綻沒找到，沒關係，繼續下一關！`, 'warning', 4000);
    }

    setTimeout(() => {
      startLevel3();
    }, passed ? 2800 : 4000);
  }

  // ===========================================================
  // 7.3 第三關：問（破綻摘要、角色卡、選對判定）
  // ===========================================================

  const LEVEL3_AUTO_ADVANCE_MS = 8000;  // 選對後到結算頁的延遲

  function getBranchCopy(scenarioId, sourceMessageOrder) {
    const order = Number(sourceMessageOrder);
    if (!scenarioId || !Number.isFinite(order)) return null;
    const keyBase = `branch_${scenarioId}_${order}`;
    const label = t(`${keyBase}_label`);
    const hint = t(`${keyBase}_hint`);
    if (label === `${keyBase}_label` || hint === `${keyBase}_hint`) return null;
    return { label, hint };
  }

  function startLevel3() {
    const sc = gameState.currentScenario;
    if (!sc) return;

    const sourceOrder = gameState.level3?.sourceMessageOrder ?? null;
    // 從 character_responses 取出本情境、本分支的角色（去重，保留第一筆）
    const seen = new Set();
    const characters = gameState.data.characterResponses
      .filter(r => r.scenario_id === sc.scenario_id && r.source_message_order === sourceOrder)
      .filter(r => { if (seen.has(r.character_id)) return false; seen.add(r.character_id); return true; });

    // 打亂角色順序，避免正確答案永遠在固定位置
    const shuffled = shuffleArray(characters.slice());

    gameState.level3 = gameState.level3 || {};
    Object.assign(gameState.level3, {
      characters: shuffled,
      cleared: false,
      attempts: 0,
      wrongIds: [],
      selectedCorrectId: null,
    });

    // 渲染破綻摘要 chips（沿用 Level 2 的結果）
    const found = gameState.level3.foundBreakpoints || [];
    const missed = gameState.level3.missedBreakpoints || [];
    renderLevel3Breakpoints(found, missed);

    // 渲染 3 個角色卡
    renderLevel3Characters(shuffled);

    // 隱藏 / 清空回應區
    const respWrap = $('#level3-response');
    respWrap.hidden = true;
    respWrap.innerHTML = '';

    showScreen('screen-level3');
  }

  function renderLevel3Breakpoints(found, missed) {
    const wrap = $('#level3-breakpoints');
    wrap.innerHTML = '';
    found.forEach(bp => {
      const chip = document.createElement('span');
      chip.className = 'level3__breakpoint-chip level3__breakpoint-chip--found';
      chip.textContent = `✓ ${bp.title}`;
      wrap.appendChild(chip);
    });
    missed.forEach(bp => {
      const chip = document.createElement('span');
      chip.className = 'level3__breakpoint-chip level3__breakpoint-chip--missed';
      chip.textContent = `？ ${bp.title}`;
      wrap.appendChild(chip);
    });
    if (found.length === 0 && missed.length === 0) {
      const chip = document.createElement('span');
      chip.className = 'level3__breakpoint-chip level3__breakpoint-chip--missed';
      chip.textContent = '（沒找到任何破綻，先憑直覺判斷吧！）';
      wrap.appendChild(chip);
    }
  }

  function renderLevel3Characters(characters) {
    const wrap = $('#level3-characters');
    wrap.innerHTML = '';
    characters.forEach(c => {
      const card = document.createElement('div');
      card.className = 'character-card';
      card.dataset.charId = c.character_id;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');

      const avatarWrap = document.createElement('div');
      avatarWrap.className = 'character-card__avatar';

      const img = document.createElement('img');
      img.src = c.avatar;
      img.alt = c.display_name;
      img.onerror = () => {
        // 圖片載入失敗 → 用通用人物 emoji 取代
        img.remove();
        avatarWrap.textContent = '👤';
        avatarWrap.style.fontSize = '56px';
      };
      avatarWrap.appendChild(img);

      const name = document.createElement('div');
      name.className = 'character-card__name';
      name.textContent = c.display_name;

      card.appendChild(avatarWrap);
      card.appendChild(name);

      card.addEventListener('click', () => handleLevel3Pick(c, card));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleLevel3Pick(c, card);
        }
      });
      wrap.appendChild(card);
    });
  }

  function handleLevel3Pick(character, cardEl) {
    const L3 = gameState.level3;
    if (L3.cleared) return;
    if (L3.wrongIds.includes(character.character_id)) return;  // 已經答錯過的不能重點

    L3.attempts++;

    if (character.is_correct) {
      L3.cleared = true;
      L3.selectedCorrectId = character.character_id;

      // 計算第三關星數（依答對時的嘗試次數）
      gameState.stars.level3 = L3.attempts === 1 ? 1 : L3.attempts === 2 ? 0.5 : 0;

      // 標出正確角色（其餘淡化）
      $$('.character-card').forEach(c => {
        if (c.dataset.charId !== character.character_id) {
          c.classList.add('character-card--disabled');
        } else {
          c.classList.add('character-card--correct');
        }
      });

      showLevel3Response(character, true);
      playCelebration('fake');  // 用強烈版慶祝（情境終於破解）

      setTimeout(onScenarioCleared, LEVEL3_AUTO_ADVANCE_MS);
    } else {
      // 答錯：該卡淡化、顯示回應，可重選
      L3.wrongIds.push(character.character_id);
      cardEl.classList.add('character-card--disabled');
      showLevel3Response(character, false);
    }
  }

  function showLevel3Response(character, isCorrect) {
    const wrap = $('#level3-response');
    wrap.hidden = false;
    wrap.classList.remove('level3__response--correct', 'level3__response--wrong');
    wrap.classList.add(isCorrect ? 'level3__response--correct' : 'level3__response--wrong');

    const sc = gameState.currentScenario;
    const sourceOrder = gameState.level3?.sourceMessageOrder;

    // 直接從 character_responses 取回應文字（character 物件本身即來自此 CSV）
    const responseText = unescapeText(character.response_text);

    wrap.innerHTML = `
      <div class="level3__response-header">
        ${escapeHtml(character.display_name)}：
      </div>
      <div class="level3__response-body">${escapeHtml(responseText)}</div>
      ${!isCorrect ? `<p class="level3__response-retry">${escapeHtml(t('level3_wrong_choice'))}</p>` : ''}
    `;
    wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function onScenarioCleared() {
    const sc = gameState.currentScenario;
    if (!sc) return;

    // 記錄完成（不重複加入）
    if (!gameState.completedScenarios.includes(sc.scenario_id)) {
      gameState.completedScenarios.push(sc.scenario_id);
    }
    saveLocalStorage();

    showResultPage();
  }

  // ===========================================================
  // 7.4 結算頁：故事樹（玩家通關回顧）
  // ===========================================================

  function showResultPage() {
    const sc = gameState.currentScenario;
    if (!sc) return;

    const L1 = gameState.level1;
    const L3 = gameState.level3;

    // 更新標題（含情境名）
    const titleEl = document.querySelector('#screen-result .result__title');
    if (titleEl) titleEl.textContent = `${sc.name}　調查完成！`;

    const tree = $('#result-tree');
    tree.innerHTML = '';

    // ===== 第一關：停 =====
    const totalFakes = (L1?.messages || []).filter(m => m.is_fake).length;
    const caughtFakes = (L1?.answers || []).filter(a => a.isFake && a.correct);
    const step1 = document.createElement('div');
    step1.className = 'result__step';
    const fakeListItems = caughtFakes.map(a => {
      const msg = L1.messages.find(m => m.message_order === a.messageOrder);
      return `<li>✓ ${escapeHtml(msg ? msg.text : '')}</li>`;
    }).join('');
    step1.innerHTML = `
      <div class="result__step-title">${escapeHtml(t('result_step1_title'))}</div>
      <div class="result__step-content">
        ${escapeHtml(t('result_step1_caught'))} <strong>${caughtFakes.length} / ${totalFakes}</strong> 則假訊息：
        <ul class="result__step-list">${fakeListItems || '<li class="result__step-empty">（這次沒抓到，下次更小心！）</li>'}</ul>
      </div>
    `;
    tree.appendChild(step1);

    // ===== 第二關：查 =====
    const found = (L3?.foundBreakpoints || []);
    const missed = (L3?.missedBreakpoints || []);
    const totalBreakpoints = found.length + missed.length;
    const branch = getBranchCopy(sc.scenario_id, L3?.sourceMessageOrder);
    const step2 = document.createElement('div');
    step2.className = 'result__step';
    const bpListItems = found.map(bp => `<li>🔍 ${escapeHtml(bp.title)}</li>`).join('');
    step2.innerHTML = `
      <div class="result__step-title">${escapeHtml(t('result_step2_title'))}</div>
      <div class="result__step-content">
        ${escapeHtml(t('result_step2_found'))} <strong>${found.length} / ${totalBreakpoints}</strong> 個破綻：
      //${branch ? `<p>本輪主圖分支：<strong>${escapeHtml(branch.label)}</strong></p>` : ''}
        <ul class="result__step-list">${bpListItems || `<li class="result__step-empty">${escapeHtml(t('result_step2_empty'))}</li>`}</ul>
      </div>
    `;
    tree.appendChild(step2);

    // ===== 第三關：問 =====
    const correctChar = (L3?.characters || []).find(c => c.is_correct);
    const step3 = document.createElement('div');
    step3.className = 'result__step';
    step3.innerHTML = `
      <div class="result__step-title">${escapeHtml(t('result_step3_title'))}</div>
      <div class="result__step-content">
        ${escapeHtml(t('result_step3_asked'))}：<strong>${escapeHtml(correctChar?.display_name || '—')}</strong>，${escapeHtml(t('result_step3_revealed'))}
        ${branch ? `<p>本輪重點：${escapeHtml(branch.hint)}</p>` : ''}
      </div>
    `;
    tree.appendChild(step3);

    // 綁定「前往證書」按鈕（每次重新綁定，避免舊監聽殘留）
    const nextBtn = $('#result-next-btn');
    const newNextBtn = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    newNextBtn.addEventListener('click', showCertificate);

    showScreen('screen-result');
  }

  // ===========================================================
  // 7.5b SVG 星星渲染（支援半顆星）
  // ===========================================================

  /**
   * 產生 N 顆 SVG 星星的 HTML 字串（支援全顆 / 半顆 / 空顆）
   * @param {number} score  0~3，可有 0.5 增量
   * @param {number} max    最大星數（預設 3）
   */
  function renderStarsSVG(score, max = 3) {
    const STAR_SIZE = 40;
    const GAP = 6;
    const W = max * (STAR_SIZE + GAP) - GAP;
    const H = STAR_SIZE;
    // 五角星路徑（以 20,20 為中心，外圓 r=18，內圓 r=7）
    const starPath = 'M20,2 L24.9,14.5 L38.5,14.5 L27.8,22.5 L31.8,35 L20,27.5 L8.2,35 L12.2,22.5 L1.5,14.5 L15.1,14.5 Z';

    let defs = '';
    let shapes = '';

    for (let i = 0; i < max; i++) {
      const remaining = score - i;
      const x = i * (STAR_SIZE + GAP);
      const id = `hclip_${i}`;

      if (remaining >= 1) {
        // 全顆：直接填金色
        shapes += `<path d="${starPath}" transform="translate(${x},0)" fill="#FFD700" stroke="#E6B800" stroke-width="0.5"/>`;
      } else if (remaining >= 0.5) {
        // 半顆：左半金色，右半灰色
        defs += `<clipPath id="${id}"><rect x="0" y="0" width="20" height="${STAR_SIZE}"/></clipPath>`;
        // 灰色底（完整星形）
        shapes += `<path d="${starPath}" transform="translate(${x},0)" fill="#D0D0D0" stroke="#BBBBBB" stroke-width="0.5"/>`;
        // 金色左半
        shapes += `<path d="${starPath}" transform="translate(${x},0)" fill="#FFD700" stroke="#E6B800" stroke-width="0.5" clip-path="url(#${id})"/>`;
      } else {
        // 空顆：灰色
        shapes += `<path d="${starPath}" transform="translate(${x},0)" fill="#D0D0D0" stroke="#BBBBBB" stroke-width="0.5"/>`;
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-label="${score} 顆星">
      <defs>${defs}</defs>
      ${shapes}
    </svg>`;
  }

  // ===========================================================
  // 7.6 證書頁：依各關星數顯示 SVG 星星
  // ===========================================================

  let certificateBound = false;

  function showCertificate() {
    const completedCount = gameState.completedScenarios.length;
    const sc = gameState.currentScenario;

    // 依各關實際星數計算總分並顯示 SVG 星星
    const s = gameState.stars;
    const totalStars = (s.level1 || 0) + (s.level2 || 0) + (s.level3 || 0);

    $('#cert-stars').innerHTML = renderStarsSVG(totalStars, 3);

    const rank =
      totalStars >= 3   ? t('certificate_3star') :
      totalStars >= 2   ? t('certificate_2star') :
      totalStars >= 1   ? t('certificate_1star') :
                          t('certificate_0star');
    $('#cert-rank').textContent = rank;
    $('#cert-scenario').textContent = sc ? sc.name : '—';
    $('#cert-date').textContent = formatDate(new Date());

    // 累計訊息：3 個全完成 → 慶賀；否則動態顯示剩餘數量
    const totalScenarios = gameState.data.scenarios.length || 3;
    const remaining = totalScenarios - completedCount;
    const allDone = remaining <= 0;
    $('#cert-message').textContent = allDone
      ? t('certificate_message_all')
      : (remaining === totalScenarios
          ? `總共有 ${totalScenarios} 個情境可以挑戰！`
          : `還有 ${remaining} 個情境等你挑戰！`);

    // 同步證書姓名（取用 input 目前值；空白就顯示預設）
    const input = $('#cert-name-input');
    updateCertificateName(input ? input.value.trim() : '');

    // 全部完成 → 隱藏「再挑戰」、顯示「重新開始」
    $('#cert-replay-btn').hidden = allDone;
    $('#cert-restart-btn').hidden = !allDone;

    // 綁定按鈕（一次性）
    if (!certificateBound) {
      $('#cert-download-btn').addEventListener('click', downloadCertificate);
      $('#cert-replay-btn').addEventListener('click', onReplayClick);
      $('#cert-restart-btn').addEventListener('click', onRestartClick);
      certificateBound = true;
    }

    showScreen('screen-certificate');
  }

  /**
   * 用 html2canvas 把證書區塊轉成 PNG 並觸發下載
   */
  async function downloadCertificate() {
    if (typeof html2canvas === 'undefined') {
      showToast('證書工具正在載入，請稍候再試一次…', 'warning', 2500);
      return;
    }
    const target = $('#certificate-canvas');
    if (!target) return;

    const downloadBtn = $('#cert-download-btn');
    const originalLabel = downloadBtn.textContent;
    downloadBtn.disabled = true;
    downloadBtn.textContent = '產生中…';

    try {
      showToast(t('download_starting'), 'info', 1500);
      const canvas = await html2canvas(target, {
        backgroundColor: '#FFFFFF',
        scale: 2,        // 2x 提高證書解析度
        useCORS: true,
        logging: false,
      });

      const name = (gameState.playerName || '').trim() || '探員';
      const scName = gameState.currentScenario?.name || '';
      const filename = scName
        ? `${t('download_filename_prefix')}_${scName}_${name}.png`
        : `${t('download_filename_prefix')}_${name}.png`;

      // 以 Blob 觸發下載，避免 Safari 對 dataURL 過大時失效
      canvas.toBlob((blob) => {
        if (!blob) {
          showToast(t('download_failed'), 'danger', 2500);
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast(t('download_success'), 'success', 2000);
      }, 'image/png');
    } catch (err) {
      console.error('[AITruth] 證書下載失敗：', err);
      showToast(t('download_failed'), 'danger', 2500);
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.textContent = originalLabel;
    }
  }

  /**
   * 「再挑戰一場」：保留已完成記錄，重抽下一個情境（優先抽未玩過的）
   * 與第一關失敗 retryWithNewScenario 共用同一個跳過前導的流程
   */
  function onReplayClick() {
    retryWithNewScenario();
  }

  /**
   * 「重新開始」：拿到三星後完整清檔，回到開始頁
   */
  function onRestartClick() {
    gameState.completedScenarios = [];
    gameState.level1 = null;
    gameState.level2 = null;
    gameState.level3 = null;
    gameState.currentScenario = null;
    gameState.stars = { level1: 0, level2: 0, level3: 0 };
    saveLocalStorage();
    showScreen('screen-start');
  }

  /**
   * 格式化日期：2026 / 05 / 12
   */
  function formatDate(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy} / ${mm} / ${dd}`;
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ===========================================================
  // 7.5 證書頁姓名輸入（選填，即時更新證書畫布上的姓名）
  // ===========================================================

  const DEFAULT_CERT_NAME = '未具名小偵探';

  function initCertificateNameInput() {
    const input = $('#cert-name-input');
    if (!input) return;
    // 每次啟動都從空白開始，避免殘留上次使用者姓名
    input.value = '';
    updateCertificateName(input.value);

    input.addEventListener('input', () => {
      const name = input.value.trim();
      gameState.playerName = name;
      saveLocalStorage();
      updateCertificateName(name);
    });
  }

  function updateCertificateName(name) {
    const el = $('#cert-name');
    if (!el) return;
    el.textContent = name && name.length > 0 ? name : DEFAULT_CERT_NAME;
  }

  // ===========================================================
  // 8. 初始化入口
  // ===========================================================

  async function init() {
    try {
      loadLocalStorage();
      await loadAllData();

      // 顯示主容器（CSV 載入完成才秀，避免空殼閃爍）
      $('#game-container').hidden = false;

      // 設定文件標題
      document.title = t('app_title');

      // 初始化證書頁姓名輸入（之後會用到，先綁好）
      initCertificateNameInput();

      // 開始第一個畫面：單頁式開始頁
      initStartScreen();
      showScreen('screen-start');

      console.info('[AITruth] 初始化完成', gameState.data);
    } catch (e) {
      console.error('[AITruth] 初始化失敗', e);
      showLoadErrorBanner(e);
    }
  }

  /**
   * CSV 載入失敗時顯示的橫幅（極少觸發；通常是沒用 Live Server 直接雙擊 index.html）
   */
  function showLoadErrorBanner(err) {
    const banner = document.createElement('div');
    banner.className = 'load-error-banner';
    banner.innerHTML = `
      <div class="load-error-banner__inner">
        <p class="load-error-banner__title">資料載入失敗</p>
        <p>請確認是用本機伺服器（VS Code Live Server 或 <code>python -m http.server</code>）開啟，然後重新整理頁面。</p>
      </div>
    `;
    document.body.appendChild(banner);
  }

  // DOM 載入後啟動
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 公開部分 API 供 console 除錯
  window.AITruth.showScreen = showScreen;
  window.AITruth.showToast = showToast;
  window.AITruth.pickRandomScenario = pickRandomScenario;
  window.AITruth.reset = function () {
    localStorage.removeItem(LS_KEYS.PLAYER_NAME);
    localStorage.removeItem(LS_KEYS.COMPLETED);
    localStorage.removeItem(LS_KEYS.LAST_PLAYED);
    console.info('[AITruth] localStorage 已清空');
  };
})();
