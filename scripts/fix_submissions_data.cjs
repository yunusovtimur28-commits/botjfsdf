const { initializeApp, getApps } = require('firebase/app');
const { initializeFirestore, doc, getDoc, updateDoc } = require('firebase/firestore');
const config = require('../firebase-applet-config.json');

const fbApp = !getApps().length ? initializeApp(config) : getApps()[0];
const db = initializeFirestore(fbApp, { experimentalAutoDetectLongPolling: true }, config.firestoreDatabaseId || '(default)');

async function fixSubmissions() {
  console.log('--- Fixing sub-1791385057176 (Kristina voice answer) ---');
  const sub1Doc = await getDoc(doc(db, 'submissions', 'sub-1791385057176'));
  if (sub1Doc.exists()) {
    const data = sub1Doc.data();
    const taskAnswers = { ...(data.taskAnswers || {}) };
    
    // Kristina's uploaded recording on Oct 11:
    const audioUrl = '/uploads/1791739500374_student_voice_task-1791145436910-5_17917.m4a';
    taskAnswers['task-1791145436910-5'] = {
      ...(taskAnswers['task-1791145436910-5'] || {}),
      voiceAudioUrl: audioUrl,
    };

    await updateDoc(doc(db, 'submissions', 'sub-1791385057176'), {
      taskAnswers,
      reRecordRequestedTaskIds: [], // Clear re-record request since answer is now present!
      updatedAt: new Date().toISOString(),
    });
    console.log('Successfully updated sub-1791385057176 with audio URL and cleared reRecordRequestedTaskIds!');
  } else {
    console.warn('sub-1791385057176 not found');
  }

  console.log('--- Fixing sub-1791826825956 (Kristina 3 solution photos) ---');
  const sub2Doc = await getDoc(doc(db, 'submissions', 'sub-1791826825956'));
  if (sub2Doc.exists()) {
    const data = sub2Doc.data();
    const taskAnswers = { ...(data.taskAnswers || {}) };
    
    const img0 = '/uploads/1791824321782_IMG_0027.jpeg';
    const img1 = '/uploads/1791825807201_IMG_0029.jpeg';
    const img2 = '/uploads/1791826828003_IMG_0031.jpeg';

    taskAnswers['task-1'] = {
      ...(taskAnswers['task-1'] || {}),
      imageUrls: [img0],
    };
    taskAnswers['task-1791801919463-2'] = {
      ...(taskAnswers['task-1791801919463-2'] || {}),
      imageUrls: [img1],
    };
    taskAnswers['task-1791801959094-3'] = {
      ...(taskAnswers['task-1791801959094-3'] || {}),
      imageUrls: [img2],
    };

    await updateDoc(doc(db, 'submissions', 'sub-1791826825956'), {
      taskAnswers,
      writtenFileName: 'Прикреплено_фото_3.png',
      writtenImageUrls: [img0, img1, img2],
      updatedAt: new Date().toISOString(),
    });
    console.log('Successfully verified and updated sub-1791826825956 with all 3 photos mapped!');
  } else {
    console.warn('sub-1791826825956 not found');
  }

  process.exit(0);
}

fixSubmissions().catch(err => {
  console.error('Error fixing submissions:', err);
  process.exit(1);
});
