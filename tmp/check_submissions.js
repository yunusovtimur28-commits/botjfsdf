const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp(config);
const db = getFirestore(app);

async function check() {
  const snap = await getDocs(collection(db, 'submissions'));
  console.log('Submissions count:', snap.size);
  snap.docs.forEach(doc => {
    const data = doc.data();
    console.log('--- Submission ID:', doc.id);
    console.log('studentName:', data.studentName, 'hwId:', data.homeworkId, 'submittedAt:', data.submittedAt);
    if (data.answers) {
      console.log('answers count:', data.answers.length);
      data.answers.forEach((ans, idx) => {
        const url = ans.voiceAudioUrl || ans.audioUrl || '';
        console.log(`ans[${idx}] taskId: ${ans.taskId}, textAnswer: ${ans.textAnswer}, voiceAudioUrl preview: ${url.slice(0, 100)}, total len: ${url.length}`);
      });
    }
    if (data.speakingAudioUrl) {
      console.log('speakingAudioUrl preview:', data.speakingAudioUrl.slice(0, 100), 'len:', data.speakingAudioUrl.length);
    }
  });
}
check().catch(console.error);
