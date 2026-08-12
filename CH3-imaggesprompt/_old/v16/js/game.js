/* =========================================================
   CH3 · AI 共創工作坊 主要遊戲邏輯
   - 階段一 → 階段六的流程控制
   - 標籤權重判定 + 平手 fallback + 主軸投票視覺化
   - CSS 濾鏡語氣切換
   - 倫理檢核
   - Canvas 浮水印合成 / 下載
   ========================================================= */

(function () {
  'use strict';

  const state = {
    imageDB: [],
    tags: [],
    ui: {},
    selected: { character: null, scene: null, prop: null, emotion: null },
    purpose: null,
    winning: null,
    targetData: null,
    tone: 'default',
    creator: '小創作者',
    ethicsChecked: { ok1: false, ok2: false, bad: false },
  };

  const STAGE_ORDER = [
    'screen-welcome', 'screen-tags', 'screen-processing',
    'screen-review', 'screen-ethics', 'screen-result',
  ];

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    try {
      await Promise.all([
        loadCSV('data/image_database.csv', 'imageDB'),
        loadCSV('data/tags.csv',           'tags'),
        loadCSV('data/ui_texts.csv',       'ui_texts'),
      ]);
      state.ui = {};
      state.ui_raw.forEach(row => { state.ui[row.key] = row.text; });
      preloadImages();
      renderTagSection();
      bindEvents();
    } catch (err) {
      console.error('資料載入失敗:', err);
      document.getElementById('load-error').classList.remove('hidden');
    }
  }

  async function loadCSV(path, stateKey) {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error('Fetch failed: ' + path);
    const text = await resp.text();
    const rows = window.CSVParser.parse(text);
    if (stateKey === 'imageDB')      state.imageDB = rows;
    else if (stateKey === 'tags')    state.tags = rows;
    else if (stateKey === 'ui_texts') state.ui_raw = rows;
  }

  function preloadImages() {
    state.imageDB.forEach(item => { const img = new Image(); img.src = item.src; });
  }

  function bindEvents() {
    document.getElementById('btn-start').addEventListener('click', () => goStage(1));
    document.getElementById('btn-shoot').addEventListener('click', onShoot);

    document.querySelectorAll('.purpose-chip').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('.purpose-chip').forEach(b => b.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        state.purpose = e.currentTarget.dataset.purpose;
        document.getElementById('btn-purpose-confirm').disabled = false;
      });
    });
    document.getElementById('btn-purpose-confirm').addEventListener('click', () => {
      document.getElementById('onee-modal').classList.add('hidden');
      runProcessing();
    });

    document.querySelectorAll('.tone-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const tone = e.currentTarget.dataset.tone;
        document.querySelectorAll('.tone-btn').forEach(b => b.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        state.tone = tone;
        applyTone();
      });
    });

    document.getElementById('btn-to-ethics').addEventListener('click', () => goStage(4));

    document.querySelectorAll('#ethics-checklist .check-item').forEach(li => {
      li.addEventListener('click', e => {
        e.preventDefault();
        const key = li.dataset.key;
        state.ethicsChecked[key] = !state.ethicsChecked[key];
        li.classList.toggle('checked', state.ethicsChecked[key]);
      });
    });
    document.getElementById('btn-ethics-confirm').addEventListener('click', onEthicsConfirm);

    document.getElementById('btn-redraw-watermark').addEventListener('click', () => {
      const v = document.getElementById('creator-name').value.trim();
      if (v) state.creator = v.slice(0, 12);
      drawFinalImage();
    });
    document.getElementById('creator-name').addEventListener('input', e => {
      state.creator = e.target.value.trim().slice(0, 12) || '小創作者';
    });

    document.getElementById('btn-save').addEventListener('click', saveImage);
    document.getElementById('btn-restart').addEventListener('click', restart);
  }

  function goStage(idx) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('screen--active'));
    document.getElementById(STAGE_ORDER[idx]).classList.add('screen--active');
    document.getElementById('stage-chip').textContent = '階段 ' + (idx + 1) + ' / 6';

    const steps = document.querySelectorAll('#progress-bar .progress-step');
    steps.forEach((s, i) => {
      s.classList.remove('is-active', 'is-done');
      if (i < idx) s.classList.add('is-done');
      else if (i === idx) s.classList.add('is-active');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function themeChinese(t) {
    return ({ scifi: '科幻', campus: '校園', fairy: '童話', nature: '自然' })[t] || t;
  }

  function renderTagSection() {
    const root = document.getElementById('tag-section');
    root.innerHTML = '';
    const groups = [
      { key: 'character', title: '角色',     emoji: '🦸', cat: 'character' },
      { key: 'scene',     title: '場景',     emoji: '🌍', cat: 'scene' },
      { key: 'prop',      title: '配件',     emoji: '🎁', cat: 'prop' },
      { key: 'emotion',   title: '心情/動作', emoji: '🎭', cat: 'emotion' },
    ];
    groups.forEach(g => {
      const items = state.tags.filter(t => t.category === g.cat);
      const wrap = document.createElement('div');
      wrap.className = 'tag-group';
      wrap.innerHTML =
        '<div class="tag-group-title">' + g.emoji + ' ' + g.title +
        ' <span class="badge">擇一</span></div>' +
        '<div class="tag-grid" data-group="' + g.key + '"></div>';
      const grid = wrap.querySelector('.tag-grid');
      items.forEach(item => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'tag-chip';
        if (item.theme) chip.dataset.theme = item.theme;
        chip.dataset.tagId = item.tag_id;
        chip.dataset.category = g.cat;
        const themeLabel = themeChinese(item.theme) || '通用';
        chip.innerHTML =
          '<span class="emoji">' + (item.emoji || '') + '</span>' +
          '<span>' + item.label + '</span>' +
          '<span class="theme-tag">' + themeLabel + '</span>';
        chip.addEventListener('click', () => onSelectTag(g.key, item, chip));
        grid.appendChild(chip);
      });
      root.appendChild(wrap);
    });
  }

  function onSelectTag(groupKey, item, chip) {
    chip.parentElement.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
    state.selected[groupKey] = item;
    updateThemeBalance();
    const allSelected = ['character', 'scene', 'prop', 'emotion']
      .every(k => state.selected[k] !== null);
    document.getElementById('btn-shoot').disabled = !allSelected;
  }

  function calcScore(charTag, sceneTag, propTag) {
    const score = { scifi: 0, campus: 0, fairy: 0, nature: 0 };
    if (charTag  && charTag.theme  in score) score[charTag.theme]  += 2;
    if (sceneTag && sceneTag.theme in score) score[sceneTag.theme] += 2;
    if (propTag  && propTag.theme  in score) score[propTag.theme]  += 1;
    return score;
  }

  function updateThemeBalance() {
    const score = calcScore(state.selected.character, state.selected.scene, state.selected.prop);
    const max = Math.max(5, Math.max.apply(null, Object.values(score)));
    document.querySelectorAll('#theme-bars .theme-bar').forEach(bar => {
      const t = bar.dataset.theme;
      const v = score[t] || 0;
      bar.querySelector('.theme-bar-fill').style.width = (v / max * 100) + '%';
      bar.querySelector('.theme-bar-value').textContent = v;
    });
    const hint = document.getElementById('theme-hint');
    const charT = state.selected.character && state.selected.character.theme;
    const sceneT = state.selected.scene && state.selected.scene.theme;
    if (charT && sceneT) {
      if (charT === sceneT) {
        hint.innerHTML = '✨ 你的角色和場景都屬於 <b>' + themeChinese(charT) +
          '</b> 主軸，AI 一定能準確畫出來！';
      } else {
        hint.innerHTML = '⚠️ 你的角色屬於 <b>' + themeChinese(charT) +
          '</b>，場景屬於 <b>' + themeChinese(sceneT) +
          '</b>。AI 只能挑一個主軸畫圖，不勝出的那邊會被替換成預設。';
      }
    } else {
      hint.innerHTML = '提示：AI 只認得這 16 張圖。同主軸的關鍵字選越多，AI 越能準確畫出你想要的內容！';
    }
  }

  function onShoot() {
    document.getElementById('onee-modal').classList.remove('hidden');
    document.querySelectorAll('.purpose-chip').forEach(b => b.classList.remove('selected'));
    document.getElementById('btn-purpose-confirm').disabled = true;
    state.purpose = null;
  }

  function calcWinning() {
    const charTag  = state.selected.character;
    const sceneTag = state.selected.scene;
    const propTag  = state.selected.prop;
    const score = calcScore(charTag, sceneTag, propTag);

    let max = -1, winners = [];
    Object.entries(score).forEach(([t, v]) => {
      if (v > max) { max = v; winners = [t]; }
      else if (v === max) winners.push(t);
    });

    let winningTheme;
    if (winners.length === 1) winningTheme = winners[0];
    else if (winners.includes(sceneTag.theme)) winningTheme = sceneTag.theme;
    else if (winners.includes(charTag.theme)) winningTheme = charTag.theme;
    else winningTheme = winners[0];

    const swapped = {
      character: charTag.theme  !== winningTheme,
      scene:     sceneTag.theme !== winningTheme,
    };
    const finalCharId  = swapped.character ? getDefaultByTheme('character', winningTheme) : charTag.tag_id;
    const finalSceneId = swapped.scene     ? getDefaultByTheme('scene',     winningTheme) : sceneTag.tag_id;

    const finalCharTag  = state.tags.find(t => t.tag_id === finalCharId  && t.category === 'character');
    const finalSceneTag = state.tags.find(t => t.tag_id === finalSceneId && t.category === 'scene');

    state.winning = {
      theme: winningTheme,
      character: finalCharId,
      scene: finalSceneId,
      finalCharTag, finalSceneTag,
      swapped,
      fallback: swapped.character || swapped.scene,
      score,
    };
    state.targetData = state.imageDB.find(d =>
      d.theme === winningTheme && d.character === finalCharId && d.scene === finalSceneId
    );
  }

  function getDefaultByTheme(category, theme) {
    const list = state.tags.filter(t => t.category === category && t.theme === theme);
    return list.length > 0 ? list[0].tag_id : null;
  }

  function runProcessing() {
    goStage(2);
    calcWinning();

    const fill = document.getElementById('processing-fill');
    const status = document.getElementById('processing-status');
    const score = state.winning.score;
    const max = Math.max(5, Math.max.apply(null, Object.values(score)));

    document.querySelectorAll('#processing-vote .theme-bar').forEach(bar => {
      bar.querySelector('.theme-bar-fill').style.width = '0%';
      bar.querySelector('.theme-bar-value').textContent = '0';
    });

    const charTag  = state.selected.character;
    const sceneTag = state.selected.scene;
    const propTag  = state.selected.prop;

    function partialAfterChar() {
      const s = { scifi: 0, campus: 0, fairy: 0, nature: 0 };
      if (charTag.theme in s) s[charTag.theme] += 2;
      return s;
    }
    function partialAfterScene() {
      const s = partialAfterChar();
      if (sceneTag.theme in s) s[sceneTag.theme] += 2;
      return s;
    }
    function partialAfterProp() {
      const s = partialAfterScene();
      if (propTag.theme in s) s[propTag.theme] += 1;
      return s;
    }

    const stages = [
      { p: 15, s: '解析角色「' + charTag.label + '」→ ' + themeChinese(charTag.theme) + ' +2',
        partial: partialAfterChar() },
      { p: 35, s: '解析場景「' + sceneTag.label + '」→ ' + themeChinese(sceneTag.theme) + ' +2',
        partial: partialAfterScene() },
      { p: 55, s: '解析配件「' + propTag.label + '」→ ' + themeChinese(propTag.theme) + ' +1',
        partial: partialAfterProp() },
      { p: 75, s: '📣 主軸投票結果：' + themeChinese(state.winning.theme) + ' 勝出！',
        partial: score },
      { p: 90, s: state.winning.fallback
                    ? '⚠️ 部分關鍵字不在勝出主軸，改套用預設角色/場景…'
                    : '✓ 全部關鍵字都對應到勝出主軸，直接取出素材…',
        partial: score },
      { p: 100, s: '完成！準備呈現初稿…', partial: score },
    ];

    function paintBars(partial) {
      Object.keys(partial).forEach(t => {
        const bar = document.querySelector('#processing-vote .theme-bar[data-theme="' + t + '"]');
        if (!bar) return;
        bar.querySelector('.theme-bar-fill').style.width = ((partial[t] || 0) / max * 100) + '%';
        bar.querySelector('.theme-bar-value').textContent = partial[t] || 0;
      });
    }

    let i = 0;
    fill.style.width = '5%';
    status.textContent = '開始解析…';

    const tick = () => {
      const cur = stages[i];
      fill.style.width = cur.p + '%';
      status.textContent = cur.s;
      paintBars(cur.partial);
      i++;
      if (i < stages.length) setTimeout(tick, 850);
      else setTimeout(() => enterReview(), 900);
    };
    setTimeout(tick, 400);
  }

  function enterReview() {
    goStage(3);
    if (!state.targetData) return;
    const img = document.getElementById('review-image');
    img.src = state.targetData.src;
    img.classList.remove('unblurred');
    renderSwapNotice();

    state.tone = 'default';
    document.querySelectorAll('.tone-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.tone === 'default');
    });
    applyTone();
  }

  function renderSwapNotice() {
    const notice = document.getElementById('swap-notice');
    const text = document.getElementById('swap-text');
    const w = state.winning;
    const charTag = state.selected.character;
    const sceneTag = state.selected.scene;

    notice.classList.remove('hidden');

    if (!w.fallback) {
      text.innerHTML = '🎉 太棒了！你的關鍵字都屬於 <b>' + themeChinese(w.theme) +
        '</b> 主軸，AI 完整呈現了你選的「' + charTag.label + '」與「' + sceneTag.label + '」。';
      notice.style.background = 'rgba(46, 182, 125, 0.18)';
      return;
    }

    notice.style.background = 'rgba(255, 176, 79, 0.22)';

    const parts = [];
    parts.push('📊 主軸投票結果：<b>' + themeChinese(w.theme) + '</b> 勝出！');
    parts.push('AI 圖庫只有這 16 張固定圖，不勝出主軸的關鍵字會被換成 <b>' +
      themeChinese(w.theme) + '</b> 的預設：');
    if (w.swapped.character) {
      parts.push('角色 <span class="swap-from">' + charTag.label +
        '</span> ➜ <span class="swap-to">' + w.finalCharTag.label + '</span>');
    }
    if (w.swapped.scene) {
      parts.push('場景 <span class="swap-from">' + sceneTag.label +
        '</span> ➜ <span class="swap-to">' + w.finalSceneTag.label + '</span>');
    }
    parts.push('💡 想看到更貼近你選擇的圖，下次試試挑同一主軸顏色的關鍵字！');
    text.innerHTML = parts.join('<br>');
  }

  function applyTone() {
    const img = document.getElementById('review-image');
    const text = document.getElementById('narrative-text');
    if (!state.targetData) return;

    const key = 'text_' + state.tone;
    text.textContent = state.targetData[key] || state.targetData.text_default;

    const filterClass = state.selected.emotion && state.selected.emotion.filter_class;
    img.className = 'ai-image-preview';
    if (filterClass) img.classList.add(filterClass);

    const ethicsImg = document.getElementById('ethics-image');
    ethicsImg.src = state.targetData.src;
    ethicsImg.className = 'ai-image-preview';
    if (filterClass) ethicsImg.classList.add(filterClass);
  }

  function onEthicsConfirm() {
    const fb = document.getElementById('ethics-feedback');
    fb.classList.remove('hidden', 'ok', 'warn');
    const ok = state.ethicsChecked.ok1 && state.ethicsChecked.ok2 && !state.ethicsChecked.bad;
    if (ok) {
      fb.classList.add('ok');
      fb.textContent = '👏 做得好！你落實了創作者的基本功——誠實標註。';
      setTimeout(() => enterResult(), 900);
    } else {
      fb.classList.add('warn');
      let hint = '再想想看：';
      if (!state.ethicsChecked.ok1) hint += '需明確標示 AI 的參與；';
      if (!state.ethicsChecked.ok2) hint += '本圖由 AI 生成；';
      if (state.ethicsChecked.bad)  hint += 'AI 創作必須說明來源；';
      fb.textContent = hint;
    }
  }

  function enterResult() {
    goStage(5);
    document.getElementById('review-image').classList.add('unblurred');
    document.getElementById('ethics-image').classList.add('unblurred');
    drawFinalImage();
  }

  function drawFinalImage() {
    const canvas = document.getElementById('resultCanvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      canvas.width = 800;
      canvas.height = 600;
      ctx.fillStyle = '#FFFCF3';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * ratio, h = img.height * ratio;
      const x = (canvas.width - w) / 2, y = (canvas.height - h) / 2;
      ctx.drawImage(img, x, y, w, h);

      const filterClass = state.selected.emotion && state.selected.emotion.filter_class;
      if (filterClass === 'filter-warm') {
        ctx.fillStyle = 'rgba(255, 180, 100, 0.18)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (filterClass === 'filter-cool') {
        ctx.fillStyle = 'rgba(120, 160, 255, 0.18)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (filterClass === 'filter-bright') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (filterClass === 'filter-soft') {
        ctx.fillStyle = 'rgba(255, 245, 230, 0.12)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.fillStyle = 'rgba(58, 42, 107, 0.85)';
      const wmH = 50;
      ctx.fillRect(10, canvas.height - wmH - 10, 380, wmH);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.textBaseline = 'middle';
      const wmText = '✔ 本圖由 AI 生成 ｜ 創作者：' + (state.creator || '小創作者');
      ctx.fillText(wmText, 22, canvas.height - wmH/2 - 10);
    };
    img.src = state.targetData.src;
  }

  function saveImage() {
    const canvas = document.getElementById('resultCanvas');
    const link = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:T.]/g, '-').slice(0, 19);
    link.download = 'AI共創作品_' + (state.creator || '小創作者') + '_' + ts + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function restart() {
    state.selected = { character: null, scene: null, prop: null, emotion: null };
    state.purpose = null;
    state.winning = null;
    state.targetData = null;
    state.tone = 'default';
    state.ethicsChecked = { ok1: false, ok2: false, bad: false };
    document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.check-item').forEach(li => li.classList.remove('checked'));
    document.getElementById('ethics-feedback').classList.add('hidden');
    document.getElementById('btn-shoot').disabled = true;
    document.getElementById('swap-notice').classList.add('hidden');
    updateThemeBalance();
    goStage(0);
  }

})();
