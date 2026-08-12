/* =========================================================
   CH2 - 提問魔法師（怎麼和 AI 溝通？）
   - 平板優先互動，題庫由 CSV 載入
   - 評分：第一次答對 +2 分；第二次答對 +1 分；兩次都錯 0 分
   ========================================================= */

(function () {
  'use strict';

  /* ── 設備識別 ── */
  const DEVICE = (() => {
    if (!('ontouchstart' in window) && navigator.maxTouchPoints === 0) return 'pc';
    return Math.min(window.screen.width, window.screen.height) >= 600 ? 'tablet' : 'phone';
  })();
  document.documentElement.classList.add('device-' + DEVICE);

  /* ── 載入位置 ── */
  const DATA_PATH = 'data/';
  const IMG_PATH  = ''; // 圖片完整路徑已在 characters.csv 的 image 欄位（assets/images/characters/...）

  /* ── 全域狀態 ── */
  let CHARACTERS = [];
  let ALL_SCENARIOS = [];   // 由 CSV 解析後依 scenario_id 重組
  let G = null;             // 遊戲狀態

  /* =========================================================
     ① 啟動
     ========================================================= */
  document.addEventListener('DOMContentLoaded', boot);

  async function boot() {
    bindStartCardActions();
    let charText = '', sceneText = '';
    try {
      [charText, sceneText] = await Promise.all([
        fetchText(DATA_PATH + 'characters.csv'),
        fetchText(DATA_PATH + 'scenarios.csv')
      ]);
    } catch (e) {
      console.warn('[CH2] CSV fetch 失敗，改用內嵌備援資料', e);
      // 備援：當以 file:// 開啟時 fetch 會失敗，使用內嵌資料
      if (window.CH2_FALLBACK_DATA) {
        charText  = window.CH2_FALLBACK_DATA.characters || '';
        sceneText = window.CH2_FALLBACK_DATA.scenarios  || '';
      }
    }
    if (!charText || !sceneText) {
      showLoadError('找不到題庫，請用本地伺服器開啟或檢查 data/*.csv');
      return;
    }
    CHARACTERS = window.CSVParser.parse(charText);
    const scenarioRows = window.CSVParser.parse(sceneText);
    ALL_SCENARIOS = groupScenarios(scenarioRows);
    buildCharacterCards();
  }

  async function fetchText(url) {
    const res = await fetch(url + '?v=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
    return res.text();
  }

  function showLoadError(msg) {
    const el = document.getElementById('load-error');
    if (!el) return;
    el.style.display = 'flex';
    const detail = document.getElementById('load-error-detail');
    if (detail) detail.textContent = msg;
  }

  /* =========================================================
     ② CSV → Scenario 結構
     ========================================================= */
  function groupScenarios(rows) {
    const map = new Map();
    rows.forEach(r => {
      const key = r.scenario_id;
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, {
          character_id: r.character_id,
          scenario_id: key,
          title: r.scenario_title,
          icon: r.scenario_icon,
          situation: r.scenario_situation,
          char_says: r.character_says,
          options: []
        });
      }
      const sc = map.get(key);
      sc.options.push({
        id: r.option_id,
        text: r.option_text,
        is_best: r.is_best === '1' || r.is_best === 1,
        ai_response: r.ai_response,
        explanation: r.explanation,
        tip: r.tip
      });
    });
    return Array.from(map.values());
  }

  function getScenariosForCharacter(characterId) {
    return ALL_SCENARIOS.filter(s => s.character_id === characterId);
  }

  /* =========================================================
     ③ 開始/說明頁
     ========================================================= */
  function bindStartCardActions() {
    document.getElementById('btn-start').addEventListener('click', () => {
      switchScreen('screen-char');
    });
    document.getElementById('btn-go-options').addEventListener('click', goToOptions);
  }

  /* =========================================================
     ④ 角色選擇
     ========================================================= */
  function buildCharacterCards() {
    const grid = document.getElementById('char-grid');
    grid.innerHTML = '';
    CHARACTERS.forEach(c => {
      const card = document.createElement('div');
      card.className = 'char-card';
      card.dataset.id = c.character_id;
      card.innerHTML = `
        <div class="char-img-wrap">
          <img src="${IMG_PATH}${c.image}" alt="${c.name}" />
        </div>
        <div class="char-name">${c.name}</div>
        <div class="char-trait">${c.trait_short}</div>
        <div class="char-desc">${c.trait_full}</div>
        <span class="char-style-tag">${c.response_style}・${c.option_count} 個選項</span>
      `;
      card.addEventListener('click', () => selectCharacter(c, card));
      grid.appendChild(card);
    });

    document.getElementById('btn-confirm-char').addEventListener('click', startGame);
    document.getElementById('btn-back-start').addEventListener('click', () => {
      switchScreen('screen-start');
    });
  }

  let _selectedChar = null;
  function selectCharacter(c, card) {
    _selectedChar = c;
    document.querySelectorAll('.char-card').forEach(x => x.classList.remove('selected'));
    card.classList.add('selected');
    const btn = document.getElementById('btn-confirm-char');
    btn.disabled = false;
    btn.textContent = `和 ${c.name} 一起出發 →`;
  }

  /* =========================================================
     ⑤ 遊戲主流程
     ========================================================= */
  function startGame() {
    if (!_selectedChar) return;
    const scenes = getScenariosForCharacter(_selectedChar.character_id);
    if (scenes.length < 1) {
      alert('題庫尚未準備好');
      return;
    }
    G = {
      character: _selectedChar,
      scenes: scenes.slice(0, 3),     // 每場 3 個情境
      sceneIndex: 0,
      score: 0,
      tries: 0,                        // 當題已試錯次數
      logs: []                         // 結算用
    };
    document.getElementById('top-bar').style.display = 'flex';
    document.getElementById('progress-row').style.display = 'flex';
    buildProgressPills(G.scenes.length);
    updateHUD();
    loadSceneIntro();
    switchScreen('screen-scene');
  }

  function loadSceneIntro() {
    const sc = G.scenes[G.sceneIndex];
    G.tries = 0;
    document.getElementById('scene-badge').textContent =
      `情境 ${G.sceneIndex + 1} / ${G.scenes.length}`;
    document.getElementById('scene-icon-big').textContent = sc.icon || '';
    document.getElementById('scene-title').textContent    = sc.title || '';
    document.getElementById('scene-mission').textContent  = sc.situation || '';
    document.getElementById('says-name').textContent      = G.character.name + '說：';
    document.getElementById('says-bubble').innerHTML      = sc.char_says || '';
    document.getElementById('says-avatar').src = IMG_PATH + G.character.image;
    document.getElementById('says-avatar').alt = G.character.name;
    updateProgress();
  }

  function goToOptions() {
    const sc = G.scenes[G.sceneIndex];
    document.getElementById('opt-icon').textContent  = sc.icon || '';
    document.getElementById('opt-mission').textContent = sc.situation || '';
    document.getElementById('opt-badge').textContent =
      `情境 ${G.sceneIndex + 1} / ${G.scenes.length}`;

    const list = document.getElementById('options-list');
    list.innerHTML = '';
    // 將原始順序打散，避免最佳解永遠出現在固定位置
    const shuffled = shuffle(sc.options.slice());
    const letters = ['A', 'B', 'C'];
    shuffled.forEach((opt, idx) => {
      const card = document.createElement('div');
      const dispId = letters[idx] || opt.id;
      card.className = 'opt-card';
      card.dataset.id = dispId;
      card.innerHTML = `
        <div class="opt-letter">${dispId}</div>
        <div class="opt-text">${escHtml(opt.text)}</div>
      `;
      card.addEventListener('click', () => handleOption(card, opt));
      list.appendChild(card);
    });

    document.getElementById('feedback-area').innerHTML = '';
    document.getElementById('action-row').innerHTML = '';
    switchScreen('screen-options');
  }

  /* =========================================================
     ⑥ 選項處理（含再試一次）
     ========================================================= */
  function handleOption(card, opt) {
    if (card.classList.contains('locked')) return;

    const sc = G.scenes[G.sceneIndex];

    if (opt.is_best) {
      // ✓ 答對 — 第一次答對 +2、第二次答對 +1、之後 0 分
      const earned = G.tries === 0 ? 2 : G.tries === 1 ? 1 : 0;
      G.score += earned;
      lockAllOptions();
      card.classList.add('selected', 'correct');
      updateHUD();
      showCorrectFeedback(opt, earned);
      G.logs.push({
        scenario: sc,
        chosen: opt.id,
        score: earned,
        retries: G.tries
      });
    } else {
      // ✗ 答錯
      G.tries += 1;
      card.classList.add('selected', 'wrong', 'tried-wrong');
      // 鎖住該選項，但其他可繼續嘗試
      card.classList.add('locked');
      showCheerFeedback(opt);
    }
  }

  function lockAllOptions() {
    document.querySelectorAll('.opt-card').forEach(c => {
      c.classList.add('locked');
      if (!c.classList.contains('selected')) c.classList.add('dimmed');
    });
  }

  /* ── 答對：顯示 AI 回應、解釋、得分、下一題按鈕 ── */
  function showCorrectFeedback(opt, earned) {
    const verdictTxt =
      earned === 2 ? '🌟 第一次就答對！' :
      earned === 1 ? '👍 第二次答對！' :
      '🙂 答對了，再多練習！';
    const fb = `
      <div class="feedback-card good fade-in">
        <div class="feedback-head">
          <span class="label">回饋</span>
          <span class="verdict">${verdictTxt}</span>
          <span class="score-pill">+${earned} 分</span>
        </div>
        <div class="ai-response">${escHtml(opt.ai_response)}</div>
        <div class="feedback-explain">
          <strong>關鍵原因：</strong>${escHtml(opt.explanation)}
        </div>
        <div class="feedback-tip">
          <span class="tag">小撇步</span>${escHtml(opt.tip)}
        </div>
      </div>
    `;
    document.getElementById('feedback-area').innerHTML = fb;

    const isLast = G.sceneIndex === G.scenes.length - 1;
    document.getElementById('action-row').innerHTML = `
      <button class="btn-primary" id="btn-next">${isLast ? '看學習回饋 →' : '下一個情境 →'}</button>
    `;
    document.getElementById('btn-next').addEventListener('click', goNextScene);

    const toastMsg = earned === 2 ? '太棒了！+2 分' : earned === 1 ? '答對了！+1 分' : '答對了';
    showToast(toastMsg, earned > 0 ? 'good' : 'cheer');
  }

  /* ── 答錯：再加油，提供再一次機會 ── */
  function showCheerFeedback(opt) {
    const cheers = ['再加油！', '再試試看！', '別放棄！', '差一點點！'];
    const cheer = cheers[Math.floor(Math.random() * cheers.length)];
    const subtitle = G.tries === 1 ? '想想看，怎樣的提問會讓 AI 更精準？' : '最後一個選項，仔細想看看！';

    const fb = `
      <div class="feedback-card cheer fade-in">
        <div class="feedback-head">
          <span class="label">提示</span>
          <span class="verdict">${cheer}</span>
        </div>
        <div class="ai-response">${escHtml(opt.ai_response)}</div>
        <div class="feedback-explain">
          ${escHtml(opt.explanation)}
        </div>
        <div class="feedback-tip">
          <span class="tag">${subtitle}</span>${escHtml(opt.tip)}
        </div>
      </div>
    `;
    document.getElementById('feedback-area').innerHTML = fb;
    document.getElementById('action-row').innerHTML = `
      <button class="btn-ghost" id="btn-retry">我再選一次 ↻</button>
    `;
    document.getElementById('btn-retry').addEventListener('click', () => {
      // 清除回饋，但保留錯誤標記讓玩家不再點
      document.getElementById('feedback-area').innerHTML = '';
      document.getElementById('action-row').innerHTML = '';
    });
    showToast(cheer, 'cheer');
  }

  /* =========================================================
     ⑦ 下一個情境 / 結算
     ========================================================= */
  function goNextScene() {
    G.sceneIndex += 1;
    if (G.sceneIndex >= G.scenes.length) {
      showEnd();
      return;
    }
    loadSceneIntro();
    switchScreen('screen-scene');
  }

  function showEnd() {
    const max = G.scenes.length * 2;
    const pct = G.score / max;

    let trophy, title, msg;
    if (pct === 1) {
      trophy = '🏆';
      title  = '提問魔法師！';
      msg    = `太棒了！${G.character.name} 全程都被你的提問驚豔到。你已經掌握「告訴 AI 你的身份、目標、想要的格式」三大關鍵，繼續保持！`;
    } else if (pct >= 0.5) {
      trophy = '⭐';
      title  = '提問小達人';
      msg    = `做得不錯！得了 ${G.score} 分。記得每次提問都要說清楚你的年級、需要什麼形式、不要被代寫，AI 就能成為更好的學習夥伴。`;
    } else {
      trophy = '💪';
      title  = '繼續加油！';
      msg    = `得了 ${G.score} 分。提問技巧需要慢慢練習，看看每題的小撇步，下一次你會更厲害！`;
    }

    document.getElementById('end-trophy').textContent = trophy;
    document.getElementById('end-title').textContent  = title;
    document.getElementById('end-score-big').innerHTML =
      `${G.score} <span>/ ${max} 分</span>`;
    document.getElementById('end-msg').textContent = msg;

    const summary = document.getElementById('end-summary');
    summary.innerHTML = G.logs.map(l => {
      let cls = 'partial';
      if (l.score === 2) cls = '';        // 預設綠色
      else if (l.score === 0) cls = 'zero';
      const label = l.score === 2 ? '+2 分' : l.score === 1 ? '+1 分' : '0 分';
      return `
        <div class="end-row">
          <span class="esr-icon">${l.scenario.icon}</span>
          <span class="esr-title">${l.scenario.title}</span>
          <span class="esr-score ${cls}">${label}</span>
        </div>
      `;
    }).join('');

    document.getElementById('btn-retry-end').onclick = () => {
      switchScreen('screen-char');
      _selectedChar = null;
      document.querySelectorAll('.char-card').forEach(x => x.classList.remove('selected'));
      document.getElementById('btn-confirm-char').disabled = true;
      document.getElementById('btn-confirm-char').textContent = '請先選一位夥伴';
      document.getElementById('top-bar').style.display = 'none';
      document.getElementById('progress-row').style.display = 'none';
    };
    document.getElementById('btn-exit-end').onclick = () => {
      switchScreen('screen-start');
      document.getElementById('top-bar').style.display = 'none';
      document.getElementById('progress-row').style.display = 'none';
    };

    switchScreen('screen-end');
  }

  /* =========================================================
     ⑧ 共用 UI
     ========================================================= */
  function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    // 在開始/結算頁時隱藏 top bar
    const showTop = id === 'screen-scene' || id === 'screen-options';
    document.getElementById('top-bar').style.display = showTop ? 'flex' : 'none';
    document.getElementById('progress-row').style.display = showTop ? 'flex' : 'none';
  }

  function buildProgressPills(n) {
    const row = document.getElementById('progress-row');
    row.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'prog-pill';
      p.id = 'pill-' + i;
      row.appendChild(p);
    }
  }

  function updateProgress() {
    if (!G) return;
    G.scenes.forEach((_, i) => {
      const el = document.getElementById('pill-' + i);
      if (!el) return;
      el.classList.remove('done', 'active');
      if (i < G.sceneIndex) el.classList.add('done');
      else if (i === G.sceneIndex) el.classList.add('active');
    });
  }

  function updateHUD() {
    const s = G ? G.score : 0;
    const c = G ? G.sceneIndex + 1 : 1;
    const total = G ? G.scenes.length : 3;
    document.getElementById('score-val').textContent = s;
    document.getElementById('scene-count').textContent = `${c} / ${total}`;
  }

  function showToast(text, type = 'good') {
    const el = document.getElementById('toast');
    el.textContent = text;
    el.className = 'toast show ' + type;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { el.className = 'toast ' + type; }, 1400);
  }

  function escHtml(t) {
    if (t == null) return '';
    return String(t)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

})();
