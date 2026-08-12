/* =========================================================
   CH3 · AI 共創工作坊 (256 張版)
   - 4 維直接索引：theme + character + scene + prop
   - 階段四：6 種 CSS 視覺濾鏡（無 fallback / 替換）
   - 圖片載入失敗時顯示 prompt 暫位卡
   ========================================================= */

(function () {
  'use strict';

  const state = {
    imageDB: [],
    tags: [],
    styles: [],
    selected: { theme: null, character: null, scene: null, prop: null },
    purpose: null,
    targetData: null,
    style: 'normal',
    creator: '小創作者',
    ethicsChecked: { ok1: false, ok2: false, bad: false },
  };

  const STAGE_ORDER = [
    'screen-welcome', 'screen-tags', 'screen-processing',
    'screen-review', 'screen-ethics', 'screen-result',
  ];

  const STEPS = ['theme', 'character', 'scene', 'prop'];

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    try {
      await Promise.all([
        loadCSV('data/image_database.csv', 'imageDB'),
        loadCSV('data/tags.csv', 'tags'),
        loadCSV('data/style_filters.csv', 'styles'),
      ]);
      renderThemeGrid();
      bindEvents();
    } catch (err) {
      console.error('資料載入失敗:', err);
      document.getElementById('load-error').classList.remove('hidden');
    }
  }

  async function loadCSV(path, key) {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error('Fetch failed: ' + path);
    const text = await resp.text();
    state[key] = window.CSVParser.parse(text);
  }

  function bindEvents() {
    document.getElementById('btn-start').addEventListener('click', () => goStage(1));
    document.getElementById('btn-shoot').addEventListener('click', onShoot);

    // 用途 chip：點選即直接縮小淡出進場（無需確認按鈕）
    document.querySelectorAll('.purpose-chip').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('.purpose-chip').forEach(b => b.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        state.purpose = e.currentTarget.dataset.purpose;

        // 觸發縮小動畫，動畫結束後關閉彈窗並啟動傳送特效 → 運算
        const modal = document.getElementById('onee-modal');
        modal.classList.add('is-closing');
        setTimeout(() => {
          modal.classList.add('hidden');
          modal.classList.remove('is-closing');
          playWaveAndProcess();
        }, 450);
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

  // 移除字串開頭的 emoji / 符號 / 空白（用於敘述文字顯示）
  function stripLeadingEmoji(s) {
    if (!s) return s;
    // 涵蓋常見 emoji 範圍 + ZWJ + variation selectors + 空白
    return s.replace(/^[\s‍️☀-➿\u{1f300}-\u{1f9ff}\u{1fa00}-\u{1faff}]+/u, '');
  }

  // ----------------------------------------------------
  // 階段二：四步式選擇
  // ----------------------------------------------------
  function renderThemeGrid() {
    const grid = document.getElementById('theme-grid');
    grid.innerHTML = '';
    const themes = state.tags.filter(t => t.category === 'theme');
    themes.forEach(t => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'theme-card';
      card.dataset.theme = t.tag_id;
      card.dataset.tagId = t.tag_id;
      card.innerHTML =
        '<span class="theme-emoji">' + (t.emoji || '🎯') + '</span>' +
        '<span class="theme-label">' + t.label + '</span>' +
        '<span class="theme-en">' + (t.tag_id || '') + '</span>';
      card.addEventListener('click', () => onThemeSelect(t, card));
      grid.appendChild(card);
    });
  }

  function onThemeSelect(theme, card) {
    document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.selected.theme = theme;
    updateStepStatus('theme', theme.label);

    // 解鎖步驟 2/3/4 並渲染對應主軸的選項
    ['character', 'scene', 'prop'].forEach(cat => {
      const sec = document.getElementById('step-' + cat);
      sec.classList.remove('locked');
      renderTagRow(cat);
    });

    // 重置之前的選擇
    state.selected.character = null;
    state.selected.scene = null;
    state.selected.prop = null;
    ['character', 'scene', 'prop'].forEach(cat => updateStepStatus(cat, null));
    updateShootButton();
  }

  function renderTagRow(category) {
    const row = document.getElementById(category + '-row');
    row.innerHTML = '';
    const themeId = state.selected.theme.tag_id;
    const items = state.tags.filter(t => t.category === category && t.theme === themeId);
    items.forEach(item => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'tag-chip';
      chip.dataset.tagId = item.tag_id;
      chip.dataset.category = category;
      chip.innerHTML =
        '<span class="emoji">' + (item.emoji || '') + '</span>' +
        '<span>' + item.label + '</span>';
      chip.addEventListener('click', () => onTagSelect(category, item, chip));
      row.appendChild(chip);
    });
  }

  function onTagSelect(category, item, chip) {
    chip.parentElement.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
    state.selected[category] = item;
    updateStepStatus(category, item.label);
    updateShootButton();
  }

  function updateStepStatus(step, label) {
    const el = document.querySelector('.step-status[data-step="' + step + '"]');
    if (!el) return;
    if (label) {
      el.textContent = '✓ ' + label;
      el.classList.remove('empty');
    } else {
      el.textContent = '未選擇';
      el.classList.add('empty');
    }
  }

  function updateShootButton() {
    const allSelected = STEPS.every(k => state.selected[k] !== null);
    document.getElementById('btn-shoot').disabled = !allSelected;
  }

  function onShoot() {
    document.getElementById('onee-modal').classList.remove('hidden');
    document.querySelectorAll('.purpose-chip').forEach(b => b.classList.remove('selected'));
    state.purpose = null;
  }

  // 電波傳送特效 → 運算階段
  function playWaveAndProcess() {
    const fx = document.getElementById('wave-fx');
    if (!fx) { runProcessing(); return; }
    fx.classList.remove('hidden');
    // 1.4 秒動畫後進入運算階段
    setTimeout(() => {
      fx.classList.add('hidden');
      runProcessing();
    }, 1400);
  }

  // ----------------------------------------------------
  // 階段三：直接索引（256 張版）
  // ----------------------------------------------------
  function lookupImage() {
    const sel = state.selected;
    state.targetData = state.imageDB.find(d =>
      d.theme === sel.theme.tag_id &&
      d.character === sel.character.tag_id &&
      d.scene === sel.scene.tag_id &&
      d.prop === sel.prop.tag_id
    );
  }

  function runProcessing() {
    goStage(2);
    lookupImage();

    const fill = document.getElementById('processing-fill');
    const status = document.getElementById('processing-status');
    const sel = state.selected;

    const stages = [
      { p: 20, s: '解析主軸：' + themeChinese(sel.theme.tag_id) },
      { p: 45, s: '對應角色：' + sel.character.label + '、場景：' + sel.scene.label },
      { p: 70, s: '加入配件：' + sel.prop.label + '…' },
      { p: 90, s: '從 256 張素材中找到唯一匹配：' + (state.targetData ? state.targetData.id : '?') + '…' },
      { p: 100, s: '完成！準備呈現初稿…' },
    ];

    let i = 0;
    fill.style.width = '5%';
    status.textContent = '開始解析…';
    const tick = () => {
      const cur = stages[i];
      fill.style.width = cur.p + '%';
      status.textContent = cur.s;
      i++;
      if (i < stages.length) setTimeout(tick, 700);
      else setTimeout(() => enterReview(), 800);
    };
    setTimeout(tick, 400);
  }

  // ----------------------------------------------------
  // 階段四：檢視 + 視覺濾鏡
  // ----------------------------------------------------
  function enterReview() {
    goStage(3);
    if (!state.targetData) return;
    setupImageWithFallback('review-frame', 'review-image', 'review-ph-prompt', 'review-ph-emoji');

    // 渲染 6 個風格按鈕
    renderStyleButtons();
    state.style = 'normal';
    applyStyle();
  }

  function setupImageWithFallback(frameId, imgId, promptId, emojiId) {
    const frame = document.getElementById(frameId);
    const img   = document.getElementById(imgId);
    const promptEl = document.getElementById(promptId);

    frame.classList.remove('is-placeholder');
    if (promptEl) promptEl.textContent = state.targetData.desc_kid + '\n\n[英文 prompt]\n' + state.targetData.prompt_en;

    img.onload = () => { frame.classList.remove('is-placeholder'); };
    img.onerror = () => { frame.classList.add('is-placeholder'); };
    img.src = state.targetData.src + '?t=' + Date.now();
    img.classList.remove('unblurred');
  }

  function renderStyleButtons() {
    const row = document.getElementById('style-row');
    row.innerHTML = '';
    state.styles.forEach(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'style-btn' + (s.style_id === 'normal' ? ' selected' : '');
      btn.dataset.styleId = s.style_id;
      btn.innerHTML =
        '<span class="style-emoji">' + (s.emoji || '🎭') + '</span>' +
        '<span>' + s.label_zh + '</span>';
      btn.addEventListener('click', () => {
        state.style = s.style_id;
        document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        applyStyle();
      });
      row.appendChild(btn);
    });
  }

  function getStyle(id) {
    return state.styles.find(s => s.style_id === id) || state.styles[0];
  }

  function applyStyle() {
    const cur = getStyle(state.style);
    const img = document.getElementById('review-image');
    const text = document.getElementById('narrative-text');
    if (!state.targetData) return;

    // 套 CSS 濾鏡（保留 blur 邏輯）
    const isUnblurred = img.classList.contains('unblurred');
    img.style.filter = (isUnblurred ? '' : 'blur(15px) ') + (cur.css_filter === 'none' ? '' : cur.css_filter);

    // 敘述文字 = 預設敘述（去除前置 emoji） + 風格後綴
    const baseText = stripLeadingEmoji(state.targetData.desc_kid);
    const suffix = cur.suffix_zh ? ' ' + cur.suffix_zh + '。' : '';
    text.textContent = baseText + suffix;

    // 階段五圖片同步
    const ethicsImg = document.getElementById('ethics-image');
    if (ethicsImg) {
      ethicsImg.style.filter = (ethicsImg.classList.contains('unblurred') ? '' : 'blur(15px) ') + (cur.css_filter === 'none' ? '' : cur.css_filter);
    }
  }

  // ----------------------------------------------------
  // 階段五：倫理
  // ----------------------------------------------------
  function setupEthicsImage() {
    const ethicsImg = document.getElementById('ethics-image');
    const ethicsFrame = document.getElementById('ethics-frame');
    const promptEl = document.getElementById('ethics-ph-prompt');
    if (promptEl) promptEl.textContent = state.targetData.desc_kid;
    ethicsImg.onload  = () => ethicsFrame.classList.remove('is-placeholder');
    ethicsImg.onerror = () => ethicsFrame.classList.add('is-placeholder');
    ethicsImg.src = state.targetData.src + '?t=' + Date.now();
    ethicsImg.classList.remove('unblurred');
    applyStyle();
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

  // 進入階段五前先設定圖片
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-to-ethics') {
      setTimeout(setupEthicsImage, 100);
    }
  });

  // ----------------------------------------------------
  // 階段六：成果
  // ----------------------------------------------------
  function enterResult() {
    goStage(5);
    document.getElementById('review-image').classList.add('unblurred');
    document.getElementById('ethics-image').classList.add('unblurred');
    applyStyle();
    drawFinalImage();
  }

  function drawFinalImage() {
    const canvas = document.getElementById('resultCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;
    ctx.fillStyle = '#FFFCF3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cur = getStyle(state.style);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // 套用 CSS-equivalent filter
      ctx.filter = cur.css_filter === 'none' ? 'none' : cur.css_filter;
      const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * ratio, h = img.height * ratio;
      const x = (canvas.width - w) / 2, y = (canvas.height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      ctx.filter = 'none';
      drawWatermark(ctx, canvas);
    };
    img.onerror = () => {
      // 圖片不存在 → 畫暫位卡到 canvas
      ctx.filter = 'none';
      ctx.fillStyle = '#F1E8D6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#3A2A6B';
      ctx.font = 'bold 24px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🖼️ 圖片素材尚在製作中', canvas.width/2, 80);
      ctx.font = '16px "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#7A6E8A';
      const lines = wrapText(ctx, state.targetData.desc_kid, canvas.width - 60);
      lines.forEach((line, i) => {
        ctx.fillText(line, canvas.width/2, 130 + i * 24);
      });
      ctx.fillStyle = '#3A2A6B';
      ctx.font = 'bold 14px "Noto Sans TC", sans-serif';
      ctx.fillText('id: ' + state.targetData.id, canvas.width/2, canvas.height - 80);
      drawWatermark(ctx, canvas);
    };
    img.src = state.targetData.src;
  }

  function drawWatermark(ctx, canvas) {
    ctx.fillStyle = 'rgba(58, 42, 107, 0.85)';
    const wmH = 50;
    ctx.fillRect(10, canvas.height - wmH - 10, 380, wmH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const wmText = '✔ 本圖由 AI 生成 ｜ 創作者：' + (state.creator || '小創作者');
    ctx.fillText(wmText, 22, canvas.height - wmH/2 - 10);
  }

  function wrapText(ctx, text, maxWidth) {
    const lines = [];
    let line = '';
    for (let ch of text) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines.slice(0, 6);
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
    state.selected = { theme: null, character: null, scene: null, prop: null };
    state.purpose = null;
    state.targetData = null;
    state.style = 'normal';
    state.ethicsChecked = { ok1: false, ok2: false, bad: false };

    document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.check-item').forEach(li => li.classList.remove('checked'));
    ['character', 'scene', 'prop'].forEach(cat => {
      document.getElementById('step-' + cat).classList.add('locked');
      document.getElementById(cat + '-row').innerHTML = '';
    });
    STEPS.forEach(s => updateStepStatus(s, null));

    document.getElementById('ethics-feedback').classList.add('hidden');
    document.getElementById('btn-shoot').disabled = true;
    goStage(0);
  }

})();
