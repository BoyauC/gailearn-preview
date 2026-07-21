const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1];
const ids = ['game', 'message', 'level', 'score', 'toast', 'brain', 'success',
  'wrongName', 'wrongPct', 'wrongBar', 'wrongReason', 'rightName', 'rightPct',
  'rightBar', 'rightReason', 'factors', 'factorResult', 'retrain', 'feedback', 'next'];

function element() {
  return {
    classList: { values: new Set(), add(value) { this.values.add(value); }, remove(value) { this.values.delete(value); }, contains(value) { return this.values.has(value); } },
    style: {}, textContent: '', innerHTML: '', disabled: false, onclick: null, offsetWidth: 0,
    querySelectorAll(selector) {
      if (selector === '.factor') {
        if (!this.factors) this.factors = [...this.innerHTML.matchAll(/data-factor="(\d)"/g)]
          .map((match) => ({ dataset: { factor: match[1] }, classList: { values: new Set(), add(value) { this.values.add(value); }, remove(value) { this.values.delete(value); }, contains(value) { return this.values.has(value); } }, onclick: null }));
        return this.factors;
      }
      if (!this.words) this.words = [...this.innerHTML.matchAll(/data-is-bug=['\"](true|false)['\"]/g)]
        .map((match) => ({ dataset: { isBug: match[1] }, classList: { values: new Set(), add(value) { this.values.add(value); }, contains(value) { return this.values.has(value); } }, onclick: null }));
      return this.words;
    },
  };
}

async function boot({ fail = false } = {}) {
  const elements = Object.fromEntries(ids.map((id) => [id, element()]));
  const timers = [];
  const context = {
    document: { getElementById: (id) => elements[id] },
    fetch: async (url) => fail ? { ok: false } : { ok: true, text: async () => fs.readFileSync(path.join(root, url), 'utf8') },
    Error, Object, Promise, String, setTimeout: (callback) => timers.push(callback),
    requestAnimationFrame: (callback) => callback(),
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  await new Promise(setImmediate);
  return { context, elements, timers };
}

test('loads every level and renders the first question with its score', async () => {
  const { elements } = await boot();
  assert.equal(elements.level.textContent, 'LEVEL 1 / 5');
  assert.equal(elements.score.textContent, 'TRAINING XP 000');
  assert.match(elements.message.innerHTML, /data-is-bug='true'/);
});

test('every level offers one hallucination among three choices and three data-bias factors', () => {
  for (let level = 1; level <= 5; level += 1) {
    const text = fs.readFileSync(path.join(root, `questions/level-0${level}.csv`), 'utf8');
    assert.equal((text.match(/data-is-bug='true'/g) || []).length, 1);
    assert.equal((text.match(/data-is-bug='false'/g) || []).length, 2);
    const [header, row] = text.trim().split(/\r?\n/);
    const data = Object.fromEntries(header.split(',').map((key, index) => [key, row.split(',')[index]]));
    for (const factor of ['factor1', 'factor2', 'factor3']) {
      assert.ok(data[factor]);
      assert.ok(data[`${factor}_result`]);
    }
  }
});

test('wrong choice provides feedback without opening the retraining panel', async () => {
  const { elements, timers } = await boot();
  const choice = elements.message.querySelectorAll('.word-btn').find((item) => item.dataset.isBug === 'false');
  choice.onclick();
  assert.ok(choice.classList.contains('wrong'));
  assert.ok(elements.game.classList.contains('shake'));
  assert.equal(elements.toast.textContent, '這不是幻覺，再找找！');
  assert.equal(elements.brain.classList.contains('show'), false);
  timers.pop()();
  assert.equal(elements.toast.textContent, '');
});

test('correct choice retrains, awards XP, and advances to the next level', async () => {
  const { elements, timers } = await boot();
  const bug = elements.message.querySelectorAll('.word-btn').find((item) => item.dataset.isBug === 'true');
  bug.onclick();
  assert.ok(elements.brain.classList.contains('show'));
  assert.equal(elements.wrongPct.textContent, '80%');
  assert.equal(elements.rightPct.textContent, '20%');
  assert.equal(elements.retrain.disabled, true);
  elements.factors.querySelectorAll('.factor')[0].onclick();
  assert.equal(elements.retrain.disabled, false);
  assert.match(elements.factorResult.textContent, /模型/);

  elements.retrain.onclick();
  assert.equal(elements.retrain.disabled, true);
  timers.pop()();
  assert.equal(elements.score.textContent, 'TRAINING XP 100');
  assert.ok(elements.success.classList.contains('show'));
  assert.equal(elements.next.textContent, '下一關 ▶');

  elements.next.onclick();
  assert.equal(elements.level.textContent, 'LEVEL 2 / 5');
  assert.equal(elements.score.textContent, 'TRAINING XP 100');
});

test('shows the load error when a question file cannot be fetched', async () => {
  const { elements } = await boot({ fail: true });
  assert.equal(elements.message.textContent, '題庫讀取失敗。請確認 questions 資料夾存在，並使用網站伺服器開啟。');
});
