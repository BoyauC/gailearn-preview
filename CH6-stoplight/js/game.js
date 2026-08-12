/* =========================================================
   AI 三色燈判斷遊戲 — 主程式
   - 狀態管理 / 題庫載入 / 計分 / 計時 / 回饋流程
   - Responsible AI 原則：
       * 不蒐集、不上傳任何個資（只在記憶體中運算）
       * 不使用 localStorage / cookie
       * 所有錯誤回饋為鼓勵式、非羞辱式
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 常數 ---------- */
  const CSV_PATH = 'data/scenario_bank260423.csv';
  const BASIC_COUNT = 5;
  const ADVANCED_COUNT = 3;
  const ADVANCED_TIME_LIMIT = 10; // 秒
  const PASS_THRESHOLD = 4;      // 基礎關答對 4 題以上才能進階
  const VALID_SIGNALS = ['red', 'yellow', 'green'];

  /* ---------- 遊戲狀態 ---------- */
  const state = {
    bank: { basic: [], advanced: [] },
    level: 'basic',             // 'basic' | 'advanced'
    queue: [],                  // 本關抽出的題目序列
    index: 0,                   // 目前題目 index
    attempts: 0,                // 當題已作答次數
    score: { basic: 0, advanced: 0 },         // 用於分數加總 (1 / 0.5)
    correct: { basic: 0, advanced: 0 },       // 答對題數 (1 或 2 次內答對)
    timer: null,                // 倒數 interval
    timerRemaining: 0,
    locked: false               // 防連點
  };

  /* ---------- DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    body: document.body,
    screenStart: $('screen-start'),
    screenGame: $('screen-game'),
    screenTransition: $('screen-transition'),
    screenResult: $('screen-result'),

    btnStart: $('btn-start'),
    btnGoAdvanced: $('btn-go-advanced'),
    btnFinishEarly: $('btn-finish-early'),
    btnRestart: $('btn-restart'),

    levelLabel: $('level-label'),
    progress: $('progress'),
    score: $('score'),
    scenarioText: $('scenario-text'),
    lights: document.querySelectorAll('.light'),

    timerWrap: $('timer-wrap'),
    timerText: $('timer-text'),
    timerRing: $('timer-ring-progress'),

    overlay: $('feedback-overlay'),
    correctRing: $('correct-ring'),
    feedbackTitle: $('feedback-title'),
    feedbackText: $('feedback-text'),
    feedbackCorrect: $('feedback-correct'),
    btnRetry: $('btn-retry'),
    btnNext: $('btn-next'),

    transitionTitle: $('transition-title'),
    transitionMsg: $('transition-msg'),

    cups: $('cups'),
    stars: $('stars'),
    cupsCaption: $('cups-caption'),
    starsCaption: $('stars-caption'),

    loadError: $('load-error'),
    loadErrorDetail: $('load-error-detail')
  };

  /* =========================================================
     ★ 題庫載入
     ========================================================= */
  async function loadBank() {
    try {
      const res = await fetch(CSV_PATH, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      const rows = window.CSVParser.parse(text);
      ingestRows(rows);
    } catch (err) {
      // 可能是 file:// 環境造成的失敗 — 顯示提示
      showLoadError(err && err.message);
      throw err;
    }
  }

  function ingestRows(rows) {
    const basic = [];
    const advanced = [];

    rows.forEach((r) => {
      const tier = (r.tier || '').trim().toLowerCase();
      const signal = (r.signal || '').trim().toLowerCase();
      const scenario = (r.scenario_text || '').trim();
      const feedback = (r.feedback_text || '').trim();

      if (!scenario || !VALID_SIGNALS.includes(signal)) return;

      const item = {
        id: r.item_id || '',
        signal: signal,
        scenario_text: scenario,
        feedback_text: feedback
      };

      if (tier === 'basic') basic.push(item);
      else if (tier === 'advanced') advanced.push(item);
    });

    state.bank.basic = basic;
    state.bank.advanced = advanced;

    if (basic.length === 0 || advanced.length === 0) {
      showLoadError('題庫為空或格式不符');
      throw new Error('empty bank');
    }
  }

  function showLoadError(detail) {
    el.loadError.classList.remove('hidden');
    if (detail) el.loadErrorDetail.textContent = '錯誤訊息：' + detail;
  }

  /* =========================================================
     ★ 題目抽取
     ========================================================= */

  // 基礎：5 題，三色皆出現至少 1 次、最多 2 次
  function pickBasic() {
    const bySignal = groupBySignal(state.bank.basic);

    // 可能的分配（5 題、每色 1~2）
    const distributions = [
      { red: 2, yellow: 2, green: 1 },
      { red: 2, yellow: 1, green: 2 },
      { red: 1, yellow: 2, green: 2 }
    ];
    // 過濾掉題庫數量不足的分配
    const viable = distributions.filter(d =>
      (bySignal.red || []).length >= d.red &&
      (bySignal.yellow || []).length >= d.yellow &&
      (bySignal.green || []).length >= d.green
    );
    const pickDist = viable.length ? viable[randInt(viable.length)] : distributions[0];

    const chosen = [];
    ['red', 'yellow', 'green'].forEach(sig => {
      const pool = shuffle((bySignal[sig] || []).slice());
      for (let i = 0; i < pickDist[sig] && i < pool.length; i++) chosen.push(pool[i]);
    });

    return shuffle(chosen);
  }

  // 進階：3 題，隨機，但盡量每色都有（若題庫允許）
  function pickAdvanced() {
    const bySignal = groupBySignal(state.bank.advanced);
    const chosen = [];
    const used = new Set();

    // 先嘗試每色 1 題
    ['red', 'yellow', 'green'].forEach(sig => {
      const pool = shuffle((bySignal[sig] || []).slice());
      if (pool.length && chosen.length < ADVANCED_COUNT) {
        chosen.push(pool[0]);
        used.add(pool[0].id);
      }
    });
    // 補滿至 ADVANCED_COUNT
    const rest = shuffle(state.bank.advanced.filter(q => !used.has(q.id)));
    while (chosen.length < ADVANCED_COUNT && rest.length) chosen.push(rest.shift());

    return shuffle(chosen);
  }

  function groupBySignal(list) {
    return list.reduce((acc, item) => {
      (acc[item.signal] = acc[item.signal] || []).push(item);
      return acc;
    }, {});
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function randInt(n) { return Math.floor(Math.random() * n); }

  /* =========================================================
     ★ 畫面切換
     ========================================================= */
  function showScreen(screenEl) {
    [el.screenStart, el.screenGame, el.screenTransition, el.screenResult]
      .forEach(s => s.classList.remove('screen--active'));
    screenEl.classList.add('screen--active');
  }

  /* =========================================================
     ★ 遊戲流程
     ========================================================= */
  function startBasic() {
    state.level = 'basic';
    el.body.dataset.level = 'basic';
    state.queue = pickBasic();
    state.index = 0;
    state.attempts = 0;
    // 重置兩關卡的計分（避免「再玩一次」保留上一輪的進階聖杯數）
    state.score.basic = 0;
    state.score.advanced = 0;
    state.correct.basic = 0;
    state.correct.advanced = 0;
    updateHUD();
    el.timerWrap.classList.add('hidden');
    showScreen(el.screenGame);
    renderQuestion();
  }

  function startAdvanced() {
    state.level = 'advanced';
    el.body.dataset.level = 'advanced';
    state.queue = pickAdvanced();
    state.index = 0;
    state.attempts = 0;
    state.score.advanced = 0;
    state.correct.advanced = 0;
    updateHUD();
    el.timerWrap.classList.remove('hidden');
    showScreen(el.screenGame);
    renderQuestion();
  }

  function updateHUD() {
    el.levelLabel.textContent = state.level === 'basic' ? '基礎關卡' : '進階關卡';
    const total = state.queue.length || (state.level === 'basic' ? BASIC_COUNT : ADVANCED_COUNT);
    el.progress.textContent = `第 ${state.index + 1} / ${total} 題`;
    const s = state.score[state.level];
    el.score.textContent = `分數 ${formatScore(s)}`;
  }

  function formatScore(n) {
    // 保留至多 1 位小數
    return Math.round(n * 10) / 10;
  }

  function renderQuestion() {
    const q = state.queue[state.index];
    if (!q) { onLevelEnd(); return; }

    state.attempts = 0;
    state.locked = false;

    el.scenarioText.textContent = q.scenario_text;
    resetLights();

    if (state.level === 'advanced') startTimer();
  }

  function resetLights() {
    el.lights.forEach(btn => {
      btn.disabled = false;
      btn.classList.remove('is-pulse');
    });
  }

  function onLightPick(signal) {
    if (state.locked) return;
    state.locked = true;

    const q = state.queue[state.index];
    const btn = Array.from(el.lights).find(b => b.dataset.signal === signal);
    if (btn) btn.classList.add('is-pulse');

    stopTimer();
    state.attempts++;

    const correct = signal === q.signal;
    if (correct) handleCorrect(); else handleWrong(false);
  }

  function handleCorrect() {
    const q = state.queue[state.index];
    const add = state.attempts === 1 ? 1 : 0.5;
    state.score[state.level] += add;
    state.correct[state.level] += 1;
    updateHUD();

    if (state.attempts === 1) {
      // 第一次答對：3 發煙火 → 煙火結束後彈出「超棒」對話框，使用者按下才進下一題
      showFireworks(3);
      setTimeout(() => {
        showFeedback({
          title: '超棒！',
          body: '',
          showRetry: false,
          showNext: true,
          isCorrect: true,
          nextBtnText: '進入下一題'
        });
      }, 1900);
    } else {
      // 第二次答對：1 發煙火 → 約 1 秒後開啟對話框（顯示 feedback_text）
      showFireworks(1);
      setTimeout(() => {
        showFeedback({
          title: '答對了！',
          body: q.feedback_text || '',
          showRetry: false,
          showNext: true,
          isCorrect: true,
          nextBtnText: '進入下一題'
        });
      }, 1000);
    }
  }

  function handleWrong(timedOut) {
    disableLights();
    const q = state.queue[state.index];
    const isFinal = state.attempts >= 2;

    if (isFinal) {
      // 第二次答錯：顯示 feedback_text + 正確燈號
      showFeedback({
        title: '再想一下下...',
        body: q.feedback_text || '',
        correctHint: `（這題的正確燈號是：${signalZh(q.signal)}）`,
        showRetry: false,
        showNext: true,
        isCorrect: false
      });
    } else {
      // 第一次答錯：只顯示「再想一下」，無 feedback_text
      showFeedback({
        title: '再想一下',
        body: timedOut ? '時間到了，再試一次！' : '',
        showRetry: true,
        showNext: false,
        isCorrect: false
      });
    }
  }

  function signalZh(sig) {
    return { red: '紅燈 🔴', yellow: '黃燈 🟡', green: '綠燈 🟢' }[sig] || sig;
  }

  /* =========================================================
     ★ 煙火效果
     - count = 3：第 1 次答對，3 發從下方升空，左上 / 正上 / 右上爆開，總時長 1.5s
     - count = 1：第 2 次答對，1 發從下方升空，於畫面上方爆開
     ========================================================= */
  const FW_PALETTE = ['#FFD700', '#FF6B6B', '#C87890', '#F4C430', '#2EB67D', '#FFB300', '#FF8FA3', '#7DD3FC'];
  const FW_STREAK_COLORS = ['#FFD700', '#FF6B6B', '#C87890', '#F4C430', '#FFB300', '#7DD3FC'];

  function showFireworks(count) {
    const root = el.correctRing;
    root.innerHTML = '';
    void root.offsetWidth;

    // 爆點位置（相對 #correct-ring，亦即畫面中心）
    // y 為負＝中心以上；x 為負＝中心以左
    const bursts = (count === 3)
      ? [
          { x: -180, y: -150, delay: 0,   color: '#FF6B6B' }, // 向上偏左
          { x:    0, y: -200, delay: 100, color: '#FFD700' }, // 正上方
          { x:  180, y: -150, delay: 200, color: '#7DD3FC' }  // 向上偏右
        ]
      : [
          { x: 0, y: -140, delay: 0, color: '#FFD700' }
        ];

    const launchDur = 380;

    bursts.forEach((b) => {
      spawnRocket(root, b, launchDur);
      // 火箭抵達爆點時，產生爆炸群組
      setTimeout(() => spawnBurst(root, b), b.delay + launchDur - 30);
    });

    // 全部清除（粒子動畫 1.4s，給最後一發完整 fade 的時間）
    const totalLife = (count === 3 ? 2050 : 1700) + 100;
    setTimeout(() => { root.innerHTML = ''; }, totalLife);
  }

  function spawnRocket(root, b, dur) {
    const rocket = document.createElement('div');
    rocket.className = 'firework-rocket';
    // 起點：畫面下方（46vh = 距中心約半個畫面高度）；x 從爆點下方略偏移升上去
    rocket.style.setProperty('--start-x', (b.x * 0.4) + 'px');
    rocket.style.setProperty('--start-y', '46vh');
    rocket.style.setProperty('--burst-x', b.x + 'px');
    rocket.style.setProperty('--burst-y', b.y + 'px');
    rocket.style.setProperty('--rocket-dur', dur + 'ms');
    rocket.style.setProperty('--rocket-delay', b.delay + 'ms');
    rocket.style.setProperty('--rocket-color', b.color);
    root.appendChild(rocket);
  }

  function spawnBurst(root, b) {
    const group = document.createElement('div');
    group.className = 'fw-burst';
    group.style.setProperty('--burst-x', b.x + 'px');
    group.style.setProperty('--burst-y', b.y + 'px');

    // 中央閃光
    const flash = document.createElement('div');
    flash.className = 'firework-flash';
    group.appendChild(flash);

    // 放射粒子（36 顆，飛散半徑 ×1.5）
    const N = 36;
    for (let i = 0; i < N; i++) {
      const p = document.createElement('span');
      p.className = 'firework-particle';
      const angle = (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.30;
      const radius = 135 + Math.random() * 105;       // 原 90~160 → 135~240 px (×1.5)
      const tx = Math.cos(angle) * radius;
      const ty = Math.sin(angle) * radius;
      const size = 5 + Math.random() * 6;             // 5~11 px
      const c = FW_PALETTE[Math.floor(Math.random() * FW_PALETTE.length)];
      p.style.setProperty('--tx', tx + 'px');
      p.style.setProperty('--ty', ty + 'px');
      p.style.width = p.style.height = size + 'px';
      p.style.backgroundColor = c;
      p.style.boxShadow = '0 0 10px ' + c + ', 0 0 4px #fff';
      p.style.animationDelay = (Math.random() * 60) + 'ms';
      group.appendChild(p);
    }

    // 流星長條（6 條）
    for (let i = 0; i < 6; i++) {
      const s = document.createElement('span');
      s.className = 'firework-streak';
      const deg = (i / 6) * 360 + (Math.random() - 0.5) * 25;
      s.style.setProperty('--angle', deg + 'deg');
      s.style.color = FW_STREAK_COLORS[i % FW_STREAK_COLORS.length];
      group.appendChild(s);
    }

    root.appendChild(group);
  }

  function showFeedback({ title, body, correctHint, showRetry, showNext, isCorrect, nextBtnText, retryBtnText }) {
    el.feedbackTitle.textContent = title || 'AI 領航員的溫馨提醒';
    el.feedbackText.textContent = body || '';
    el.feedbackCorrect.textContent = correctHint || '';
    el.btnRetry.classList.toggle('hidden', !showRetry);
    el.btnNext.classList.toggle('hidden', !showNext);

    // 按鈕文字可被覆寫；未指定則回到預設值，避免下次仍顯示前一題的文字
    el.btnNext.textContent  = nextBtnText  || '再加油，前往下一題';
    el.btnRetry.textContent = retryBtnText || '再次選擇';

    // 空欄位收合，避免 dialog 出現大塊空白
    el.feedbackText.style.display    = body        ? '' : 'none';
    el.feedbackCorrect.style.display = correctHint ? '' : 'none';

    el.feedbackTitle.style.color = isCorrect ? '#d4af37' : '';

    el.overlay.classList.remove('hidden');
  }

  function closeFeedback() {
    el.overlay.classList.add('hidden');
  }

  function onRetry() {
    closeFeedback();
    resetLights();
    state.locked = false;
    if (state.level === 'advanced') startTimer();
  }

  function onNext() {
    closeFeedback();
    nextQuestion();
  }

  function nextQuestion() {
    state.index++;
    if (state.index >= state.queue.length) {
      onLevelEnd();
      return;
    }
    updateHUD();
    renderQuestion();
  }

  function disableLights() {
    el.lights.forEach(b => b.disabled = true);
  }

  /* =========================================================
     ★ 倒數計時（僅進階關）
     ========================================================= */
  function startTimer() {
    stopTimer();
    state.timerRemaining = ADVANCED_TIME_LIMIT;
    updateTimerUI(state.timerRemaining, ADVANCED_TIME_LIMIT);
    state.timer = setInterval(() => {
      state.timerRemaining--;
      if (state.timerRemaining <= 0) {
        updateTimerUI(0, ADVANCED_TIME_LIMIT);
        stopTimer();
        onTimeOut();
      } else {
        updateTimerUI(state.timerRemaining, ADVANCED_TIME_LIMIT);
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
  }

  function updateTimerUI(remaining, total) {
    el.timerText.textContent = Math.max(0, remaining);
    // 圓環 stroke-dasharray 是 100, offset 0~100
    const pct = Math.max(0, remaining) / total;
    const offset = (1 - pct) * 100;
    el.timerRing.style.strokeDashoffset = String(offset);
    el.timerRing.classList.toggle('warn', remaining <= 2);
  }

  function onTimeOut() {
    if (state.locked) return;
    state.locked = true;
    state.attempts++;
    handleWrong(true);
  }

  /* =========================================================
     ★ 關卡結束
     ========================================================= */
  function onLevelEnd() {
    stopTimer();
    if (state.level === 'basic') {
      renderTransition();
      showScreen(el.screenTransition);
    } else {
      renderResult();
      showScreen(el.screenResult);
    }
  }

  function renderTransition() {
    const c = state.correct.basic;
    el.transitionTitle.textContent = '基礎關卡完成！';
    if (c >= PASS_THRESHOLD) {
      el.transitionMsg.innerHTML =
        `你答對了 <strong>${c}</strong> 題，很棒的思考！<br />準備好挑戰限時 5 秒的進階題了嗎？`;
      el.btnGoAdvanced.classList.remove('hidden');
      el.btnFinishEarly.textContent = '直接看學習回饋';
    } else {
      el.transitionMsg.innerHTML =
        `這次答對 <strong>${c}</strong> 題，差一點就可以挑戰進階關了。<br />先看看你的學習回饋吧，錯誤都是進步的養分 💪`;
      el.btnGoAdvanced.classList.add('hidden');
      el.btnFinishEarly.textContent = '看看學習回饋';
    }
  }

  function renderResult() {
    el.cups.innerHTML = buildIcons('cup', ADVANCED_COUNT, state.correct.advanced);
    el.stars.innerHTML = buildIcons('star', BASIC_COUNT, state.correct.basic);

    el.cupsCaption.textContent =
      state.level === 'advanced'
        ? `你在進階關答對 ${state.correct.advanced} / ${ADVANCED_COUNT} 題，累積 ${formatScore(state.score.advanced)} 分。`
        : '這次沒有挑戰進階關，下次再試！';

    el.starsCaption.textContent =
      `你在基礎關答對 ${state.correct.basic} / ${BASIC_COUNT} 題，累積 ${formatScore(state.score.basic)} 分。`;
  }

  function buildIcons(kind, total, earned) {
    let html = '';
    for (let i = 0; i < total; i++) {
      const filled = i < earned;
      html += `<span class="icon">${kind === 'cup' ? cupSVG(filled) : starSVG(filled)}</span>`;
    }
    return html;
  }

  function starSVG(filled) {
    const fill = filled ? 'var(--star-gold)' : 'none';
    const stroke = filled ? 'var(--star-gold)' : 'var(--star-gray)';
    return `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.3l2.9 6.6 7.1.7-5.4 4.8 1.7 7L12 17.8 5.7 21.4l1.7-7L2 9.6l7.1-.7L12 2.3z"
        fill="${fill}" stroke="${stroke}" stroke-width="1.4" stroke-linejoin="round"/>
    </svg>`;
  }

  function cupSVG(filled) {
    const fill = filled ? 'var(--cup-gold)' : 'none';
    const stroke = filled ? 'var(--cup-gold)' : 'var(--cup-gray)';
    return `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h12v3a5 5 0 0 1-4 4.9V15h3v2H7v-2h3v-4.1A5 5 0 0 1 6 6V3zm2 2v1a3 3 0 0 0 8 0V5H8z
               M5 18h14v2H5z"
        fill="${fill}" stroke="${stroke}" stroke-width="1.4" stroke-linejoin="round"/>
    </svg>`;
  }

  /* =========================================================
     ★ 事件綁定
     ========================================================= */
  function bindEvents() {
    // 用 pointerdown 讓平板更即時回饋
    el.btnStart.addEventListener('pointerdown', onStartClick);
    el.btnGoAdvanced.addEventListener('pointerdown', () => startAdvanced());
    el.btnFinishEarly.addEventListener('pointerdown', () => { renderResult(); showScreen(el.screenResult); });
    el.btnRestart.addEventListener('pointerdown', () => startBasic());

    el.btnRetry.addEventListener('pointerdown', onRetry);
    el.btnNext.addEventListener('pointerdown', onNext);

    // 三色燈：pointerdown
    el.lights.forEach(btn => {
      btn.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        if (btn.disabled) return;
        onLightPick(btn.dataset.signal);
      });
    });

    // 阻止按鈕被長按選取
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.light')) e.preventDefault();
    });
  }

  function onStartClick() {
    startBasic();
  }

  /* =========================================================
     ★ 啟動
     ========================================================= */
  async function boot() {
    bindEvents();
    try {
      await loadBank();
      // 預設停在開始畫面
      showScreen(el.screenStart);
    } catch (e) {
      // 讀取失敗已在 showLoadError() 顯示提示
      console.error('[stoplight] CSV load failed:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
