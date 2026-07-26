'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { initializeApp } = require('firebase-admin/app');
const { Timestamp, getFirestore } = require('firebase-admin/firestore');
const { cleanupExpiredSessions } = require('../src/maintenance');

const projectId = 'demo-stoplight-class';
const functionsBase = `http://127.0.0.1:5001/${projectId}/asia-east1`;
const integrationApp = initializeApp({ projectId }, 'stoplight-integration');
const db = getFirestore(integrationApp);

async function createAnonymousToken() {
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true })
  });
  const result = await response.json();
  assert.equal(response.ok, true, JSON.stringify(result));
  return result.idToken;
}

async function call(name, token, data) {
  const response = await fetch(`${functionsBase}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data })
  });
  const payload = await response.json();
  if (payload.error) {
    const error = new Error(payload.error.message || 'Callable failed');
    error.status = payload.error.status;
    throw error;
  }
  assert.equal(response.ok, true, JSON.stringify(payload));
  return payload.result;
}

async function seedQuestionBank() {
  const batch = db.batch();
  ['red', 'yellow', 'green'].forEach((signal, signalIndex) => {
    for (let offset = 0; offset < 3; offset += 1) {
      for (const tier of ['basic', 'advanced']) {
        const id = `${tier[0]}${signalIndex}${offset}`;
        batch.set(db.collection('questionBank').doc(id), {
          tier,
          signal,
          scenarioText: `${tier} ${signal} ${offset}`,
          feedbackText: `feedback ${id}`,
          active: true,
          version: 'integration'
        });
      }
    }
  });
  await batch.commit();
}

test('callable functions complete the classroom lifecycle', async () => {
  await seedQuestionBank();
  const teacherToken = await createAnonymousToken();
  const created = await call('createSession', teacherToken, { password: 'teacher-pass-01' });
  assert.match(created.code, /^\d{4}$/);

  const studentToken = await createAnonymousToken();
  const joined = await call('joinSession', studentToken, { code: created.code });
  assert.equal(joined.displayName, '匿名 01');
  assert.equal(joined.questions.length, 8);

  const basicAttempts = joined.questions.filter((question) => question.tier === 'basic').map((question) => ({
    questionId: question.id,
    tier: question.tier,
    attemptNumber: 1,
    choice: question.signal,
    timedOut: false,
    elapsedMs: 800
  }));
  const basic = await call('saveCheckpoint', studentToken, {
    sessionId: created.sessionId,
    phase: 'basic',
    attemptSessionId: 'attempt-session-0001',
    attempts: basicAttempts,
    submissionId: 'basic-submit-0001'
  });
  assert.equal(basic.basicCorrect, 5);
  assert.equal(basic.totalScore, 5);

  const duplicate = await call('saveCheckpoint', studentToken, {
    sessionId: created.sessionId,
    phase: 'basic',
    attemptSessionId: 'attempt-session-0001',
    attempts: basicAttempts,
    submissionId: 'basic-submit-0001'
  });
  assert.equal(duplicate.duplicate, true);

  const finalAttempts = joined.questions.map((question) => ({
    questionId: question.id,
    tier: question.tier,
    attemptNumber: 1,
    choice: question.signal,
    timedOut: false,
    elapsedMs: 900
  }));
  const final = await call('saveCheckpoint', studentToken, {
    sessionId: created.sessionId,
    phase: 'final',
    attemptSessionId: 'attempt-session-0001',
    attempts: finalAttempts,
    submissionId: 'final-submit-0001'
  });
  assert.equal(final.totalScore, 8);
  assert.equal(final.advancedCorrect, 3);

  const secondFinal = await call('saveCheckpoint', studentToken, {
    sessionId: created.sessionId,
    phase: 'final',
    attemptSessionId: 'attempt-session-0002',
    attempts: finalAttempts,
    submissionId: 'final-submit-0002'
  });
  assert.equal(secondFinal.duplicate, false);
  const savedAttempts = await db.collection('submissions').where('sessionId', '==', created.sessionId).get();
  assert.equal(savedAttempts.size, 2);

  await call('changeTeacherPassword', teacherToken, { sessionId: created.sessionId, newPassword: 'teacher-pass-02' });
  const secondTeacher = await createAnonymousToken();
  await assert.rejects(call('teacherLogin', secondTeacher, { code: created.code, password: 'teacher-pass-01' }));
  const loggedIn = await call('teacherLogin', secondTeacher, { code: created.code, password: 'teacher-pass-02' });
  assert.equal(loggedIn.sessionId, created.sessionId);

  await call('closeSession', teacherToken, { sessionId: created.sessionId });
  const lateStudent = await createAnonymousToken();
  await assert.rejects(call('joinSession', lateStudent, { code: created.code }), (error) => error.status === 'FAILED_PRECONDITION');
  const rejoined = await call('joinSession', studentToken, { code: created.code });
  assert.equal(rejoined.displayName, '匿名 01');
});

test('code reservations remain unique and login locks after five failures', async () => {
  await seedQuestionBank();
  const teacherToken = await createAnonymousToken();
  const sessions = await Promise.all(Array.from({ length: 12 }, (_, index) =>
    call('createSession', teacherToken, { password: `collision-pass-${String(index).padStart(2, '0')}` })
  ));
  assert.equal(new Set(sessions.map((session) => session.code)).size, sessions.length);

  const target = sessions[0];
  const otherBrowser = await createAnonymousToken();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await assert.rejects(call('teacherLogin', otherBrowser, { code: target.code, password: 'definitely-wrong' }));
  }
  await assert.rejects(call('teacherLogin', otherBrowser, { code: target.code, password: 'collision-pass-00' }), (error) => error.status === 'PERMISSION_DENIED');
});

test('daily maintenance removes expired class documents but keeps active classes', async () => {
  const sessionId = 'expiredsession123';
  const code = '1111';
  const expiredAt = Timestamp.fromMillis(Date.now() - 1000);
  const batch = db.batch();
  batch.set(db.collection('sessions').doc(sessionId), { sessionId, code, retentionUntil: expiredAt });
  batch.set(db.collection('sessionSecrets').doc(sessionId), { hash: 'secret' });
  batch.set(db.collection('activeCodes').doc(code), { sessionId, retentionUntil: expiredAt });
  batch.set(db.collection('sessionMembers').doc(`${sessionId}_member`), { sessionId, uid: 'member' });
  batch.set(db.collection('sessionQuestions').doc(`${sessionId}_question`), { sessionId, questionId: 'q1' });
  batch.set(db.collection('submissions').doc(`${sessionId}_student`), { sessionId, uid: 'student' });
  await batch.commit();

  const result = await cleanupExpiredSessions(db, Timestamp.now());
  assert.ok(result.sessionCount >= 1);
  const [session, secret, activeCode] = await Promise.all([
    db.collection('sessions').doc(sessionId).get(),
    db.collection('sessionSecrets').doc(sessionId).get(),
    db.collection('activeCodes').doc(code).get()
  ]);
  assert.equal(session.exists, false);
  assert.equal(secret.exists, false);
  assert.equal(activeCode.exists, false);
});

