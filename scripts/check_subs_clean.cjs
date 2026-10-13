const { initializeApp, getApps } = require('firebase/app');
const { initializeFirestore, collection, getDocs } = require('firebase/firestore');
const config = require('../firebase-applet-config.json');

const fbApp = !getApps().length ? initializeApp(config) : getApps()[0];
const db = initializeFirestore(fbApp, { experimentalAutoDetectLongPolling: true }, config.firestoreDatabaseId || '(default)');

async function check() {
  const snap = await getDocs(collection(db, 'submissions'));
  console.log('Total submissions:', snap.size);
  snap.docs.forEach(d => {
    const data = d.data();
    console.log('==============================================');
    console.log('SUB ID:', d.id);
    console.log('Student:', data.studentName, '| HW:', data.homeworkId, '| SubmittedAt:', data.submittedAt, '| Status:', data.status);
    console.log('reRecordRequestedTaskIds:', data.reRecordRequestedTaskIds);
    if (data.writtenImageUrls) {
      console.log('writtenImageUrls count:', data.writtenImageUrls.length);
      data.writtenImageUrls.forEach((url, i) => {
        console.log(`  photo[${i}]:`, url.slice(0, 100), 'len:', url.length);
      });
    }
    if (data.taskAnswers) {
      console.log('taskAnswers count:', Object.keys(data.taskAnswers).length);
      for (const [k, v] of Object.entries(data.taskAnswers)) {
        console.log(`  taskAnswer[${k}]:`);
        if (v.voiceAudioUrl) console.log(`    voiceAudioUrl: ${v.voiceAudioUrl.slice(0, 80)}`);
        if (v.voiceAudioBase64) console.log(`    voiceAudioBase64 len: ${v.voiceAudioBase64.length}`);
        if (v.imageUrls) {
          console.log(`    imageUrls count: ${v.imageUrls.length}`);
          v.imageUrls.forEach((u, i) => console.log(`      img[${i}]: ${u.slice(0, 80)}`));
        }
      }
    }
  });
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
