import fs from 'node:fs/promises';
import test, { after, before, beforeEach } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where
} from 'firebase/firestore';

let environment;
const projectId = 'demo-stoplight-class';
const sessionId = 'session123456';

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await fs.readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
      host: process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] || '127.0.0.1',
      port: Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] || 8080)
    }
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'sessions', sessionId), { sessionId, code: '4821', status: 'open' });
    await setDoc(doc(db, 'sessionMembers', `${sessionId}_teacher-1`), { sessionId, uid: 'teacher-1', role: 'teacher', joinedAt: new Date() });
    await setDoc(doc(db, 'sessionMembers', `${sessionId}_student-1`), { sessionId, uid: 'student-1', role: 'student', displayName: '匿名 01', joinedAt: new Date() });
    await setDoc(doc(db, 'submissions', `${sessionId}_student-1`), { sessionId, uid: 'student-1', phase: 'basic', updatedAt: new Date() });
    await setDoc(doc(db, 'sessionSecrets', sessionId), { hash: 'never-public' });
  });
});

after(async () => environment?.cleanup());

test('teacher can read the dashboard collections but not session secrets', async () => {
  const db = environment.authenticatedContext('teacher-1').firestore();
  await assertSucceeds(getDoc(doc(db, 'sessions', sessionId)));
  await assertSucceeds(getDocs(query(collection(db, 'sessionMembers'), where('sessionId', '==', sessionId))));
  await assertSucceeds(getDocs(query(collection(db, 'submissions'), where('sessionId', '==', sessionId))));
  await assertFails(getDoc(doc(db, 'sessionSecrets', sessionId)));
});

test('student can read only their own member and submission records', async () => {
  const db = environment.authenticatedContext('student-1').firestore();
  await assertSucceeds(getDoc(doc(db, 'sessionMembers', `${sessionId}_student-1`)));
  await assertSucceeds(getDoc(doc(db, 'submissions', `${sessionId}_student-1`)));
  await assertFails(getDoc(doc(db, 'sessions', sessionId)));
  await assertFails(getDoc(doc(db, 'sessionMembers', `${sessionId}_teacher-1`)));
});

test('all browser writes are denied', async () => {
  const db = environment.authenticatedContext('teacher-1').firestore();
  await assertFails(setDoc(doc(db, 'sessions', sessionId), { status: 'closed' }, { merge: true }));
  await assertFails(setDoc(doc(db, 'questionBank', 'evil'), { active: true }));
});

test('unauthenticated visitors cannot read classroom data', async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'sessions', sessionId)));
  await assertFails(getDoc(doc(db, 'submissions', `${sessionId}_student-1`)));
});
