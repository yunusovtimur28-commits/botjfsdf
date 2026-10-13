const { initializeApp } = require('firebase/app');
const { initializeFirestore, collection, getDocs } = require('firebase/firestore');
const config = require('../firebase-applet-config.json');

const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
});

const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
}, config.firestoreDatabaseId || '(default)');

async function run() {
  const snap = await getDocs(collection(db, 'submissions'));
  console.log('Total submissions:', snap.size);
  snap.forEach(doc => {
    const data = doc.data();
    console.log('--- SUBMISSION:', doc.id, '---');
    console.log('Student:', data.studentName, 'HW ID:', data.homeworkId, 'Status:', data.status, 'SubmittedAt:', data.submittedAt);
    console.log('reRecordRequestedTaskIds:', data.reRecordRequestedTaskIds);
    console.log('Attachments (top-level):', data.attachments);
    console.log('SolutionImages (top-level):', data.solutionImages);
    console.log('ImageUrls (top-level):', data.imageUrls);
    if (data.taskAnswers) {
      Object.entries(data.taskAnswers).forEach(([tid, ans]) => {
        console.log(`  Task ${tid}:`, {
          hasVoiceUrl: Boolean(ans.voiceAudioUrl),
          voiceUrl: ans.voiceAudioUrl,
          hasVoiceBase64: Boolean(ans.voiceAudioBase64),
          voiceBase64Len: ans.voiceAudioBase64 ? ans.voiceAudioBase64.length : 0,
          textAnswer: ans.textAnswer ? ans.textAnswer.substring(0, 30) : undefined,
          imageUrls: ans.imageUrls,
          images: ans.images,
          attachments: ans.attachments
        });
      });
    }
  });
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
