import {
  callFunction,
  collection,
  doc,
  getDoc,
  getFirebaseServices,
  isFirebaseConfigured,
  onSnapshot,
  orderBy,
  query,
  where
} from './firebase-client.js';

const GENERIC_LOGIN_ERROR = '無法進入課堂，請確認代碼與管理密碼是否正確。';
const $ = (id) => document.getElementById(id);
const authView = $('teacher-auth-view');
const createdView = $('session-created-view');
const dashboard = $('teacher-dashboard');
const createForm = $('create-session-form');
const loginForm = $('teacher-login-form');
const createPassword = $('create-password');
const confirmPassword = $('confirm-password');
const loginCode = $('teacher-code');
const loginPassword = $('teacher-password');
const createError = $('create-error');
const loginError = $('login-error');
const createButton = $('btn-create-session');
const loginButton = $('btn-teacher-login');

let activeSession = null;
let createdLoginPassword = '';
let members = [];
let submissions = [];
let questions = [];
let unsubscribeListeners = [];

function normalizeCode(value) {
  return String(value || '').replace(/\s+/g, '').replace(/\D/g, '').slice(0, 4);
}

function setMessage(element, message = '', isError = false) {
  element.textContent = message;
  element.classList.toggle('hidden', !message);
  element.classList.toggle('form-message--error', Boolean(isError));
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 64;
}

function setButtonBusy(button, busy, busyText, normalText) {
  button.disabled = busy;
  button.textContent = busy ? busyText : normalText;
}

async function copyText(text, statusElement, successMessage) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setMessage(statusElement, successMessage);
  } catch (_) {
    setMessage(statusElement, '無法自動複製，請手動抄下資訊。', true);
  }
}

function saveTeacherContext(session) {
  try {
    localStorage.setItem('stoplightTeacherSession', JSON.stringify({
      sessionId: session.sessionId,
      code: session.code
    }));
  } catch (_) {
    // 隱私模式下無法使用 localStorage 時，仍可在本次頁面操作。
  }
}

function clearTeacherContext() {
  try { localStorage.removeItem('stoplightTeacherSession'); } catch (_) { /* noop */ }
}

function readTeacherContext() {
  try {
    const value = JSON.parse(localStorage.getItem('stoplightTeacherSession') || 'null');
    return value && value.sessionId && /^\d{4}$/.test(value.code) ? value : null;
  } catch (_) {
    return null;
  }
}

document.querySelectorAll('.password-toggle').forEach((button) => {
  button.addEventListener('click', () => {
    const input = $(button.dataset.target);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.textContent = show ? '隱藏' : '顯示';
    button.setAttribute('aria-label', show ? '隱藏密碼' : '顯示密碼');
    button.setAttribute('aria-pressed', String(show));
  });
});

[loginCode].forEach((input) => input.addEventListener('input', () => {
  input.value = normalizeCode(input.value);
  input.removeAttribute('aria-invalid');
  setMessage(loginError);
}));

createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(createError);
  const password = createPassword.value;

  if (!validatePassword(password)) {
    createPassword.setAttribute('aria-invalid', 'true');
    setMessage(createError, '管理密碼需為 8–64 個字元。', true);
    createPassword.focus();
    return;
  }
  if (password !== confirmPassword.value) {
    confirmPassword.setAttribute('aria-invalid', 'true');
    setMessage(createError, '兩次輸入的管理密碼不一致。', true);
    confirmPassword.focus();
    return;
  }

  setButtonBusy(createButton, true, '正在建立…', '建立課堂');
  try {
    const session = await callFunction('createSession', { password });
    activeSession = session;
    createdLoginPassword = password;
    saveTeacherContext(session);
    createForm.reset();
    authView.classList.add('hidden');
    $('created-code').textContent = session.code;
    createdView.classList.remove('hidden');
  } catch (error) {
    const message = error && error.message === 'FIREBASE_NOT_CONFIGURED'
      ? 'Firebase 尚未設定完成，請依 README 完成專案設定。'
      : '目前無法建立課堂，請稍候再試。';
    setMessage(createError, message, true);
  } finally {
    setButtonBusy(createButton, false, '正在建立…', '建立課堂');
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(loginError);
  const code = normalizeCode(loginCode.value);
  const password = loginPassword.value;

  if (!/^\d{4}$/.test(code)) {
    loginCode.setAttribute('aria-invalid', 'true');
    setMessage(loginError, GENERIC_LOGIN_ERROR, true);
    loginCode.focus();
    return;
  }
  if (!password) {
    loginPassword.setAttribute('aria-invalid', 'true');
    setMessage(loginError, GENERIC_LOGIN_ERROR, true);
    loginPassword.focus();
    return;
  }

  setButtonBusy(loginButton, true, '正在驗證…', '進入教師後台');
  try {
    const session = await callFunction('teacherLogin', { code, password });
    loginPassword.value = '';
    activeSession = session;
    saveTeacherContext(session);
    await enterDashboard();
  } catch (_) {
    loginPassword.value = '';
    setMessage(loginError, GENERIC_LOGIN_ERROR, true);
  } finally {
    setButtonBusy(loginButton, false, '正在驗證…', '進入教師後台');
  }
});

$('copy-student-code').addEventListener('click', () => {
  if (activeSession) copyText(activeSession.code, $('copy-status'), '✓ 學生代碼已複製');
});

$('copy-teacher-info').addEventListener('click', () => {
  if (!activeSession || !createdLoginPassword) return;
  copyText(
    `AI 三色燈教師登入資訊\n課堂代碼：${activeSession.code}\n教師管理密碼：${createdLoginPassword}\n\n請勿將管理密碼提供給學生。`,
    $('copy-status'),
    '✓ 教師登入資訊已複製，請存放在安全的位置'
  );
});

$('enter-created-session').addEventListener('click', async () => {
  createdLoginPassword = '';
  await enterDashboard();
});

async function enterDashboard() {
  if (!activeSession) return;
  authView.classList.add('hidden');
  createdView.classList.add('hidden');
  dashboard.classList.remove('hidden');
  $('dashboard-code').textContent = activeSession.code;
  await subscribeToDashboard();
}

function stopSubscriptions() {
  unsubscribeListeners.forEach((unsubscribe) => unsubscribe());
  unsubscribeListeners = [];
}

async function subscribeToDashboard() {
  stopSubscriptions();
  const { db } = await getFirebaseServices();
  const sessionId = activeSession.sessionId;
  const errorHandler = () => setMessage($('dashboard-message'), '資料更新暫時中斷，請按「重新整理」。', true);

  unsubscribeListeners.push(onSnapshot(doc(db, 'sessions', sessionId), (snapshot) => {
    if (!snapshot.exists()) return;
    const session = snapshot.data();
    const open = session.status === 'open';
    $('session-state-text').textContent = open ? '開放學生加入中' : '課堂已關閉；已加入學生可在 10 分鐘內補交';
    $('close-session').disabled = !open;
    $('close-session-settings').disabled = !open;
  }, errorHandler));

  const memberQuery = query(collection(db, 'sessionMembers'), where('sessionId', '==', sessionId), orderBy('joinedAt', 'asc'));
  unsubscribeListeners.push(onSnapshot(memberQuery, (snapshot) => {
    members = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => item.role === 'student');
    renderDashboard();
  }, errorHandler));

  const submissionQuery = query(collection(db, 'submissions'), where('sessionId', '==', sessionId), orderBy('updatedAt', 'desc'));
  unsubscribeListeners.push(onSnapshot(submissionQuery, (snapshot) => {
    submissions = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderDashboard();
  }, errorHandler));

  const questionQuery = query(collection(db, 'sessionQuestions'), where('sessionId', '==', sessionId), orderBy('order', 'asc'));
  unsubscribeListeners.push(onSnapshot(questionQuery, (snapshot) => {
    questions = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderQuestionSummary();
  }, errorHandler));
}

function renderDashboard() {
  const memberByUid = new Map(members.map((member) => [member.uid, member]));
  $('stat-joined').textContent = members.length;
  $('stat-basic').textContent = submissions.filter((item) => ['basic', 'final'].includes(item.phase)).length;
  const finals = submissions.filter((item) => item.phase === 'final');
  $('stat-final').textContent = finals.length;
  $('stat-average').textContent = finals.length
    ? (finals.reduce((sum, item) => sum + Number(item.totalScore || 0), 0) / finals.length).toFixed(1)
    : '—';

  const tbody = $('student-table-body');
  tbody.replaceChildren();
  const rows = submissions.map((submission) => ({
    member: memberByUid.get(submission.uid),
    submission
  }));
  const submittedUids = new Set(submissions.map((submission) => submission.uid));
  members.filter((member) => !submittedUids.has(member.uid)).forEach((member) => {
    rows.push({ member, submission: null });
  });

  if (!rows.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'empty-cell';
    cell.textContent = '尚無學生加入';
    row.appendChild(cell);
    tbody.appendChild(row);
  } else {
    rows.forEach(({ member, submission }) => {
      const row = document.createElement('tr');
      const values = [
        member && member.displayName || '匿名',
        submission ? (submission.phase === 'final' ? '已完成' : '基礎關完成') : '作答中',
        submission ? `${submission.basicCorrect || 0} / 5` : '—',
        submission && submission.phase === 'final' ? `${submission.advancedCorrect || 0} / 3` : '—',
        submission ? Number(submission.totalScore || 0).toFixed(1) : '—',
        formatTimestamp(submission && submission.updatedAt || member && member.joinedAt)
      ];
      values.forEach((value, index) => {
        const cell = document.createElement('td');
        if (index === 1) {
          const pill = document.createElement('span');
          pill.className = `status-pill${submission && submission.phase === 'final' ? ' status-pill--done' : ''}`;
          pill.textContent = value;
          cell.appendChild(pill);
        } else {
          cell.textContent = value;
        }
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    });
  }
  renderQuestionSummary();
}

function formatTimestamp(value) {
  if (!value) return '—';
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function renderQuestionSummary() {
  const container = $('question-summary');
  const byQuestion = new Map();
  submissions.forEach((submission) => {
    (submission.attempts || []).forEach((attempt) => {
      if (attempt.attemptNumber !== 1) return;
      const stat = byQuestion.get(attempt.questionId) || { total: 0, correct: 0 };
      stat.total += 1;
      if (attempt.isCorrect) stat.correct += 1;
      byQuestion.set(attempt.questionId, stat);
    });
  });

  container.replaceChildren();
  if (!questions.length || !byQuestion.size) {
    const empty = document.createElement('p');
    empty.className = 'empty-cell';
    empty.textContent = '尚無作答紀錄';
    container.appendChild(empty);
    return;
  }

  questions.forEach((question, index) => {
    const stat = byQuestion.get(String(question.questionId)) || { total: 0, correct: 0 };
    const row = document.createElement('article');
    row.className = 'question-row';
    const text = document.createElement('p');
    text.textContent = `${index + 1}. ${question.scenarioText}`;
    const rate = document.createElement('div');
    rate.className = 'question-rate';
    rate.textContent = stat.total ? `${Math.round(stat.correct / stat.total * 100)}%` : '—';
    const detail = document.createElement('small');
    detail.textContent = `${stat.correct} / ${stat.total} 首答正確`;
    rate.appendChild(detail);
    row.append(text, rate);
    container.appendChild(row);
  });
}

async function closeCurrentSession() {
  if (!activeSession) return;
  const confirmed = window.confirm('確定要關閉課堂嗎？關閉後不接受新學生加入，已加入學生仍可在 10 分鐘內補交。');
  if (!confirmed) return;
  try {
    await callFunction('closeSession', { sessionId: activeSession.sessionId });
    setMessage($('dashboard-message'), '✓ 課堂已關閉，補交期限為 10 分鐘。');
  } catch (_) {
    setMessage($('dashboard-message'), '無法關閉課堂，請稍候再試。', true);
  }
}

$('close-session').addEventListener('click', closeCurrentSession);
$('close-session-settings').addEventListener('click', closeCurrentSession);
$('copy-dashboard-code').addEventListener('click', () => activeSession && copyText(activeSession.code, $('dashboard-message'), '✓ 學生代碼已複製'));
$('refresh-dashboard').addEventListener('click', subscribeToDashboard);

document.querySelectorAll('.tab-button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach((item) => item.classList.toggle('is-active', item === button));
    document.querySelectorAll('.dashboard-panel').forEach((panel) => panel.classList.toggle('hidden', panel.id !== button.dataset.panel));
  });
});

$('change-password-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = $('new-teacher-password').value;
  const confirmation = $('confirm-new-password').value;
  const status = $('change-password-status');
  if (!validatePassword(password)) return setMessage(status, '新密碼需為 8–64 個字元。', true);
  if (password !== confirmation) return setMessage(status, '兩次輸入的新密碼不一致。', true);
  try {
    await callFunction('changeTeacherPassword', { sessionId: activeSession.sessionId, newPassword: password });
    event.currentTarget.reset();
    setMessage(status, '✓ 管理密碼已更新，請妥善保存新密碼。');
  } catch (_) {
    setMessage(status, '無法更新管理密碼，請稍候再試。', true);
  }
});

$('export-csv').addEventListener('click', () => {
  const memberByUid = new Map(members.map((member) => [member.uid, member]));
  const rows = [['姓名', '狀態', '基礎答對', '進階答對', '總分']];
  submissions.forEach((item) => {
    const member = memberByUid.get(item.uid);
    rows.push([
      member && member.displayName || '匿名',
      item.phase === 'final' ? '已完成' : '基礎關完成',
      item.basicCorrect || 0,
      item.phase === 'final' ? item.advancedCorrect || 0 : '',
      item.totalScore || 0
    ]);
  });
  const submittedUids = new Set(submissions.map((item) => item.uid));
  members.filter((member) => !submittedUids.has(member.uid)).forEach((member) => {
    rows.push([member.displayName || '匿名', '作答中', '', '', '']);
  });
  const csv = '\uFEFF' + rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `stoplight-${activeSession.code}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

async function restoreTeacherSession() {
  if (!isFirebaseConfigured()) {
    setMessage(createError, 'Firebase 尚未設定完成；開發者可依 README 填入專案設定。', true);
    return;
  }
  const saved = readTeacherContext();
  if (!saved) return;
  try {
    const { db } = await getFirebaseServices();
    const snapshot = await getDoc(doc(db, 'sessions', saved.sessionId));
    if (!snapshot.exists()) throw new Error('missing');
    activeSession = saved;
    await enterDashboard();
  } catch (_) {
    clearTeacherContext();
  }
}

restoreTeacherSession();
window.addEventListener('beforeunload', stopSubscriptions);


