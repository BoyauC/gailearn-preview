'use strict';

async function deleteDocumentsForSession(db, collectionName, sessionId, bulkWriter) {
  const snapshot = await db.collection(collectionName).where('sessionId', '==', sessionId).limit(500).get();
  snapshot.docs.forEach((item) => bulkWriter.delete(item.ref));
  return snapshot.size;
}

async function cleanupExpiredSessions(db, cutoff) {
  const expired = await db.collection('sessions').where('retentionUntil', '<=', cutoff).limit(50).get();
  if (expired.empty) return { sessionCount: 0, childDocumentCount: 0 };

  const bulkWriter = db.bulkWriter();
  let childDocumentCount = 0;
  for (const sessionSnapshot of expired.docs) {
    const sessionId = sessionSnapshot.id;
    for (const collectionName of ['sessionMembers', 'sessionQuestions', 'submissions']) {
      childDocumentCount += await deleteDocumentsForSession(db, collectionName, sessionId, bulkWriter);
    }
    const code = sessionSnapshot.get('code');
    if (code) bulkWriter.delete(db.collection('activeCodes').doc(code));
    bulkWriter.delete(db.collection('sessionSecrets').doc(sessionId));
    bulkWriter.delete(sessionSnapshot.ref);
  }
  await bulkWriter.close();
  return { sessionCount: expired.size, childDocumentCount };
}

module.exports = { cleanupExpiredSessions };
