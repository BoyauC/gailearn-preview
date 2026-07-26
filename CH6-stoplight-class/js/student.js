import { callFunction, isFirebaseConfigured } from './firebase-client.js';

const joinForm = document.getElementById('student-join-form');
const codeInput = document.getElementById('student-code');
const nameInput = document.getElementById('student-name');
const joinButton = document.getElementById('btn-join');
const formError = document.getElementById('student-form-error');
const displayName = document.getElementById('student-display-name');
const displayCode = document.getElementById('student-session-code');
const syncStatus = document.getElementById('sync-status');
const checkpointStatus = document.getElementById('checkpoint-status');
const finalSyncStatus = document.getElementById('final-sync-status');
const submissionIds = new Map();

function normalizeCode(value) {
  return String(value || '').replace(/\s+/g, '').replace(/\D/g, '').slice(0, 4);
}

function setError(message = '') {
  formError.textContent = message;
  formError.classList.toggle('hidden', !message);
}

function setBusy(isBusy) {
  joinButton.disabled = isBusy;
  joinButton.textContent = isBusy ? '正在加入…' : '加入課堂';
  codeInput.readOnly = isBusy;
  nameInput.readOnly = isBusy;
}

function randomSubmissionId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function submissionIdFor(attemptSessionId, phase) {
  const key = `${attemptSessionId}:${phase}`;
  if (!submissionIds.has(key)) submissionIds.set(key, randomSubmissionId());
  return submissionIds.get(key);
}

function friendlyJoinError(error) {
  if (error && error.message === 'FIREBASE_NOT_CONFIGURED') {
    return 'Firebase 尚未設定完成，請通知網站管理者。';
  }
  const code = String(error && error.code || '');
  if (code.includes('not-found') || code.includes('failed-precondition') || code.includes('permission-denied')) {
    return '無法加入課堂，請確認代碼是否正確，以及老師是否仍開放加入。';
  }
  if (code.includes('resource-exhausted')) return '目前加入人數較多，請稍候再試。';
  if (!navigator.onLine) return '目前沒有網路連線，請連線後再試。';
  return '暫時無法加入課堂，請稍候再試或告知老師。';
}

function updateSync(message, kind = '') {
  syncStatus.textContent = message;
  syncStatus.classList.toggle('is-saved', kind === 'saved');
  syncStatus.classList.toggle('is-error', kind === 'error');
}

async function saveCheckpoint(sessionId, attemptSessionId, phase, attempts) {
  const target = phase === 'basic' ? checkpointStatus : finalSyncStatus;
  target.textContent = phase === 'basic' ? '正在備份基礎關紀錄…' : '正在送出完整紀錄…';
  target.classList.remove('form-message--error');
  updateSync('正在同步…');

  try {
    const result = await callFunction('saveCheckpoint', {
      sessionId,
      phase,
      attemptSessionId,
      attempts,
      submissionId: submissionIdFor(attemptSessionId, phase)
    });
    target.textContent = phase === 'basic' ? '✓ 基礎關紀錄已備份' : '✓ 完整紀錄已送出給老師';
    updateSync('紀錄已同步', 'saved');
    return result;
  } catch (error) {
    target.textContent = '紀錄尚未送出，請保持此頁開啟並按「重試送出」。';
    target.classList.add('form-message--error');
    updateSync('同步失敗', 'error');

    let retry = target.nextElementSibling;
    if (!retry || !retry.classList.contains('checkpoint-retry')) {
      retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'btn btn-ghost checkpoint-retry';
      retry.textContent = '重試送出';
      retry.addEventListener('click', async () => {
        retry.disabled = true;
        try {
          await saveCheckpoint(sessionId, attemptSessionId, phase, attempts);
          retry.remove();
        } finally {
          retry.disabled = false;
        }
      });
      target.insertAdjacentElement('afterend', retry);
    }
    throw error;
  }
}

codeInput.addEventListener('input', () => {
  codeInput.value = normalizeCode(codeInput.value);
  codeInput.removeAttribute('aria-invalid');
  setError();
});

joinForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setError();
  const code = normalizeCode(codeInput.value);
  const name = nameInput.value.trim().replace(/\s+/g, ' ').slice(0, 30);

  if (!/^\d{4}$/.test(code)) {
    codeInput.setAttribute('aria-invalid', 'true');
    setError('請輸入老師提供的 4 位數課堂代碼。');
    codeInput.focus();
    return;
  }

  setBusy(true);
  try {
    const session = await callFunction('joinSession', { code, name: name || undefined });
    displayName.textContent = session.displayName;
    displayCode.textContent = `課堂 ${session.code}`;

    window.StoplightClassBridge = {
      sessionId: session.sessionId,
      code: session.code,
      displayName: session.displayName,
      questions: session.questions,
      attemptSessionId: '',
      beginAttempt() {
        this.attemptSessionId = randomSubmissionId();
        return this.attemptSessionId;
      },
      saveCheckpoint(phase, attempts) {
        if (!this.attemptSessionId) this.beginAttempt();
        return saveCheckpoint(session.sessionId, this.attemptSessionId, phase, attempts);
      }
    };
    window.dispatchEvent(new CustomEvent('stoplight:session-ready', { detail: window.StoplightClassBridge }));
  } catch (error) {
    setError(friendlyJoinError(error));
    setBusy(false);
  }
});

if (!isFirebaseConfigured()) {
  setError('Firebase 尚未設定完成；開發者可依 README 填入專案設定。');
}

