'use strict';

const crypto = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const {
  CALLABLE_OPTIONS,
  REGION,
  SESSION_ACTIVE_MS,
  RETENTION_MS,
  SUBMISSION_GRACE_MS,
  LOGIN_LOCK_MS,
  LOGIN_MAX_FAILURES
} = require('./config');
const { hashPassword, isValidPassword, verifyPassword } = require('./security');
const {
  normalizeDisplayName,
  normalizeQuestion,
  orderQuestionsForStudent,
  scoreAttempts,
  selectQuestions
} = require('./domain');
const { cleanupExpiredSessions } = require('./maintenance');

initializeApp();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

function requireAuth(request) {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Authentication is required.');
  return request.auth.uid;
}

function cleanCode(value) {
  const code = String(value || '').replace(/\s+/g, '');
  return /^\d{4}$/.test(code) ? code : '';
}

function validDocumentId(value) {
  const id = String(value || '');
  return /^[A-Za-z0-9_-]{10,160}$/.test(id) ? id : '';
}

function genericLoginError() {
  return new HttpsError('permission-denied', 'Unable to enter the session.');
}

async function loadQuestionBank() {
  const snapshot = await db.collection('questionBank').where('active', '==', true).get();
  return snapshot.docs.map((item) => ({ questionId: item.id, ...item.data() }));
}

async function reserveCode(sessionId, activeUntil, retentionUntil) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const code = String(crypto.randomInt(1000, 10000));
    const ref = db.collection('activeCodes').doc(code);
    const reserved = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const expiration = snapshot.exists && snapshot.get('retentionUntil');
      if (snapshot.exists && expiration && expiration.toMillis() > Date.now()) return false;
      transaction.set(ref, { sessionId, code, activeUntil, retentionUntil, createdAt: FieldValue.serverTimestamp() });
      return true;
    });
    if (reserved) return code;
  }
  throw new HttpsError('resource-exhausted', 'No class code is currently available.');
}

async function assertTeacher(sessionId, uid) {
  const member = await db.collection('sessionMembers').doc(`${sessionId}_${uid}`).get();
  if (!member.exists || member.get('role') !== 'teacher') throw new HttpsError('permission-denied', 'Teacher permission is required.');
  return member.data();
}

async function getSessionQuestions(session) {
  const ids = Array.isArray(session.questionIds) ? session.questionIds : [];
  if (!ids.length) return [];
  const refs = ids.map((id) => db.collection('sessionQuestions').doc(`${session.sessionId}_${id}`));
  const snapshots = await db.getAll(...refs);
  return snapshots.map((item) => item.exists ? normalizeQuestion(item.data(), item.get('questionId')) : null).filter(Boolean);
}

exports.createSession = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = requireAuth(request);
  const password = request.data && request.data.password;
  if (!isValidPassword(password)) throw new HttpsError('invalid-argument', 'Password must contain 8-64 characters.');

  const bank = await loadQuestionBank();
  let selected;
  try {
    selected = selectQuestions(bank);
  } catch (error) {
    logger.error('Question bank cannot create a session.', { errorName: error.name });
    throw new HttpsError('failed-precondition', 'The question bank is not ready.');
  }

  const sessionRef = db.collection('sessions').doc();
  const sessionId = sessionRef.id;
  const now = Date.now();
  const activeUntil = Timestamp.fromMillis(now + SESSION_ACTIVE_MS);
  const retentionUntil = Timestamp.fromMillis(now + RETENTION_MS);
  const secret = await hashPassword(password);
  const code = await reserveCode(sessionId, activeUntil, retentionUntil);

  try {
    const batch = db.batch();
    batch.set(sessionRef, {
      sessionId,
      code,
      ownerUid: uid,
      status: 'open',
      questionIds: selected.map((question) => question.id),
      questionCount: selected.length,
      nextAnonymousNumber: 1,
      bankVersion: '260423',
      activeUntil,
      retentionUntil,
      submissionsCloseAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    batch.set(db.collection('sessionSecrets').doc(sessionId), {
      ...secret,
      failedAttempts: 0,
      lockUntil: null,
      updatedAt: FieldValue.serverTimestamp()
    });
    batch.set(db.collection('sessionMembers').doc(`${sessionId}_${uid}`), {
      sessionId,
      uid,
      role: 'teacher',
      joinedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    selected.forEach((question, order) => {
      batch.set(db.collection('sessionQuestions').doc(`${sessionId}_${question.id}`), {
        sessionId,
        questionId: String(question.id),
        tier: question.tier,
        signal: question.signal,
        scenarioText: question.scenarioText,
        feedbackText: question.feedbackText,
        order
      });
    });
    await batch.commit();
    return { sessionId, code, status: 'open' };
  } catch (error) {
    await db.collection('activeCodes').doc(code).delete().catch(() => undefined);
    throw error;
  }
});

exports.teacherLogin = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = requireAuth(request);
  const code = cleanCode(request.data && request.data.code);
  const password = request.data && request.data.password;
  if (!code || !isValidPassword(password)) throw genericLoginError();

  const codeSnapshot = await db.collection('activeCodes').doc(code).get();
  if (!codeSnapshot.exists) throw genericLoginError();
  const sessionId = codeSnapshot.get('sessionId');
  const secretRef = db.collection('sessionSecrets').doc(sessionId);
  const sessionRef = db.collection('sessions').doc(sessionId);
  const memberRef = db.collection('sessionMembers').doc(`${sessionId}_${uid}`);

  const result = await db.runTransaction(async (transaction) => {
    const secretSnapshot = await transaction.get(secretRef);
    const sessionSnapshot = await transaction.get(sessionRef);
    if (!secretSnapshot.exists || !sessionSnapshot.exists) return { ok: false };

    const secret = secretSnapshot.data();
    const now = Date.now();
    const lockUntil = secret.lockUntil && secret.lockUntil.toMillis();
    if (lockUntil && lockUntil > now) return { ok: false };

    const verified = await verifyPassword(password, secret);
    if (!verified) {
      const previousFailures = lockUntil && lockUntil <= now ? 0 : Number(secret.failedAttempts || 0);
      const failedAttempts = previousFailures + 1;
      transaction.update(secretRef, {
        failedAttempts,
        lockUntil: failedAttempts >= LOGIN_MAX_FAILURES ? Timestamp.fromMillis(now + LOGIN_LOCK_MS) : null,
        updatedAt: FieldValue.serverTimestamp()
      });
      return { ok: false };
    }

    transaction.update(secretRef, { failedAttempts: 0, lockUntil: null, updatedAt: FieldValue.serverTimestamp() });
    transaction.set(memberRef, {
      sessionId,
      uid,
      role: 'teacher',
      joinedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return { ok: true, session: sessionSnapshot.data() };
  });

  if (!result.ok) throw genericLoginError();
  return { sessionId, code, status: result.session.status };
});

exports.joinSession = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = requireAuth(request);
  const code = cleanCode(request.data && request.data.code);
  const requestedName = normalizeDisplayName(request.data && request.data.name);
  if (!code) throw new HttpsError('invalid-argument', 'A four-digit class code is required.');

  const codeSnapshot = await db.collection('activeCodes').doc(code).get();
  if (!codeSnapshot.exists) throw new HttpsError('not-found', 'The class is unavailable.');
  const sessionId = codeSnapshot.get('sessionId');
  const sessionRef = db.collection('sessions').doc(sessionId);
  const memberRef = db.collection('sessionMembers').doc(`${sessionId}_${uid}`);

  let joined;
  try {
    joined = await db.runTransaction(async (transaction) => {
      const sessionSnapshot = await transaction.get(sessionRef);
      const memberSnapshot = await transaction.get(memberRef);
    if (!sessionSnapshot.exists) throw new HttpsError('not-found', 'The class is unavailable.');
    const session = sessionSnapshot.data();
    const now = Date.now();
    const activeUntil = session.activeUntil && session.activeUntil.toMillis();
    const submissionsCloseAt = session.submissionsCloseAt && session.submissionsCloseAt.toMillis();
    const existingStudent = memberSnapshot.exists && memberSnapshot.get('role') === 'student';
    const canContinue = existingStudent && (session.status === 'open' || (submissionsCloseAt && submissionsCloseAt >= now));

    if (existingStudent && canContinue) {
      return { session: { sessionId, ...session }, displayName: memberSnapshot.get('displayName') };
    }
    if (session.status !== 'open' || !activeUntil || activeUntil < now) {
      throw new HttpsError('failed-precondition', 'The class is no longer accepting students.');
    }
    if (memberSnapshot.exists) throw new HttpsError('permission-denied', 'This identity cannot join as a student.');

    const anonymousNumber = Number(session.nextAnonymousNumber || 1);
    const displayName = requestedName || `\u533f\u540d ${String(anonymousNumber).padStart(2, '0')}`;
    if (!requestedName) transaction.update(sessionRef, { nextAnonymousNumber: anonymousNumber + 1, updatedAt: FieldValue.serverTimestamp() });
    transaction.set(memberRef, {
      sessionId,
      uid,
      role: 'student',
      displayName,
      nameProvided: Boolean(requestedName),
      status: 'joined',
      checkpoint: 'none',
      joinedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
      return { session: { sessionId, ...session }, displayName };
    });
  } catch (error) {
    logger.error('Student join transaction failed.', {
      errorName: error && error.name,
      errorCode: error && error.code,
      errorMessage: error && error.message
    });
    throw error;
  }

  const questions = orderQuestionsForStudent(await getSessionQuestions(joined.session), uid, sessionId);
  return {
    sessionId,
    code,
    displayName: joined.displayName,
    questions: questions.map((question) => ({
      id: question.id,
      tier: question.tier,
      signal: question.signal,
      scenario_text: question.scenarioText,
      feedback_text: question.feedbackText
    }))
  };
});

exports.saveCheckpoint = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = requireAuth(request);
  const sessionId = validDocumentId(request.data && request.data.sessionId);
  const phase = request.data && request.data.phase;
  const attemptSessionId = validDocumentId(request.data && request.data.attemptSessionId);
  const submissionId = validDocumentId(request.data && request.data.submissionId);
  if (!sessionId || !attemptSessionId || !submissionId || !['basic', 'final'].includes(phase)) {
    logger.warn('Checkpoint metadata validation failed.', {
      hasSessionId: Boolean(sessionId),
      hasAttemptSessionId: Boolean(attemptSessionId),
      hasSubmissionId: Boolean(submissionId),
      validPhase: ['basic', 'final'].includes(phase)
    });
    throw new HttpsError('invalid-argument', 'Invalid checkpoint metadata.');
  }

  const sessionRef = db.collection('sessions').doc(sessionId);
  const memberRef = db.collection('sessionMembers').doc(`${sessionId}_${uid}`);
  const [sessionSnapshot, memberSnapshot] = await Promise.all([sessionRef.get(), memberRef.get()]);
  if (!sessionSnapshot.exists || !memberSnapshot.exists || memberSnapshot.get('role') !== 'student') {
    throw new HttpsError('permission-denied', 'Student permission is required.');
  }
  const session = sessionSnapshot.data();
  const now = Date.now();
  const closeAt = session.submissionsCloseAt && session.submissionsCloseAt.toMillis();
  if (session.status !== 'open' && (!closeAt || closeAt < now)) {
    throw new HttpsError('failed-precondition', 'The submission window is closed.');
  }

  const questions = await getSessionQuestions({ sessionId, ...session });
  let scored;
  try {
    scored = scoreAttempts(request.data && request.data.attempts, questions, phase);
  } catch (error) {
    logger.warn('Checkpoint attempt validation failed.', { reason: error.message });
    throw new HttpsError('invalid-argument', 'Invalid checkpoint data.');
  }

  const submissionRef = db.collection('submissions').doc(`${sessionId}_${uid}_${attemptSessionId}`);
  const result = await db.runTransaction(async (transaction) => {
    const existingSnapshot = await transaction.get(submissionRef);
    const existing = existingSnapshot.exists ? existingSnapshot.data() : null;
    const processed = existing && Array.isArray(existing.processedSubmissionIds) ? existing.processedSubmissionIds : [];
    if (existing && (processed.includes(submissionId) || (existing.phase === 'final' && phase === 'basic'))) {
      return {
        phase: existing.phase,
        totalScore: existing.totalScore,
        basicCorrect: existing.basicCorrect,
        advancedCorrect: existing.advancedCorrect,
        duplicate: true
      };
    }

    const nextProcessed = [...processed.slice(-5), submissionId];
    const record = {
      sessionId,
      uid,
      attemptSessionId,
      phase,
      attempts: scored.normalized,
      basicScore: scored.basicScore,
      advancedScore: scored.advancedScore,
      totalScore: scored.totalScore,
      basicCorrect: scored.basicCorrect,
      advancedCorrect: scored.advancedCorrect,
      processedSubmissionIds: nextProcessed,
      createdAt: existing && existing.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: phase === 'final' ? FieldValue.serverTimestamp() : null
    };
    transaction.set(submissionRef, record);
    transaction.update(memberRef, {
      status: phase === 'final' ? 'completed' : 'basic-complete',
      checkpoint: phase,
      totalScore: scored.totalScore,
      updatedAt: FieldValue.serverTimestamp()
    });
    return {
      phase,
      totalScore: scored.totalScore,
      basicCorrect: scored.basicCorrect,
      advancedCorrect: scored.advancedCorrect,
      duplicate: false
    };
  });
  return result;
});

exports.closeSession = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = requireAuth(request);
  const sessionId = validDocumentId(request.data && request.data.sessionId);
  if (!sessionId) throw new HttpsError('invalid-argument', 'A session ID is required.');
  await assertTeacher(sessionId, uid);

  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionSnapshot = await sessionRef.get();
  if (!sessionSnapshot.exists) throw new HttpsError('not-found', 'The class does not exist.');
  if (sessionSnapshot.get('status') !== 'open') {
    return { sessionId, status: 'closed', submissionsCloseAt: sessionSnapshot.get('submissionsCloseAt') };
  }
  const submissionsCloseAt = Timestamp.fromMillis(Date.now() + SUBMISSION_GRACE_MS);
  await sessionRef.update({
    status: 'closed',
    closedAt: FieldValue.serverTimestamp(),
    submissionsCloseAt,
    updatedAt: FieldValue.serverTimestamp()
  });
  return { sessionId, status: 'closed', submissionsCloseAt };
});

exports.changeTeacherPassword = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = requireAuth(request);
  const sessionId = validDocumentId(request.data && request.data.sessionId);
  const newPassword = request.data && request.data.newPassword;
  if (!sessionId || !isValidPassword(newPassword)) {
    throw new HttpsError('invalid-argument', 'The new password must contain 8??4 characters.');
  }
  await assertTeacher(sessionId, uid);
  const secret = await hashPassword(newPassword);
  await db.collection('sessionSecrets').doc(sessionId).set({
    ...secret,
    failedAttempts: 0,
    lockUntil: null,
    updatedAt: FieldValue.serverTimestamp()
  });
  return { changed: true };
});

exports.cleanupExpiredSessions = onSchedule({
  region: REGION,
  schedule: '30 3 * * *',
  timeZone: 'Asia/Taipei',
  memory: '256MiB',
  timeoutSeconds: 300,
  minInstances: 0,
  maxInstances: 1,
  retryCount: 0
}, async () => {
  const result = await cleanupExpiredSessions(db, Timestamp.now());
  if (result.sessionCount) logger.info('Expired sessions cleaned up.', result);
});







