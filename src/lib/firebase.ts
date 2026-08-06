import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
} from 'firebase/firestore';
import config from '../../firebase-applet-config.json';
import { Webinar, Homework, Submission, TGNotification, RegisteredStudent } from '../types';

setLogLevel('error');

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, config.firestoreDatabaseId || '(default)');

// Collection references
export const webinarsCol = collection(db, 'webinars');
export const homeworksCol = collection(db, 'homeworks');
export const submissionsCol = collection(db, 'submissions');
export const notificationsCol = collection(db, 'notifications');
export const studentsCol = collection(db, 'students');

// Real-time Listeners with error handling
export function subscribeWebinars(
  callback: (data: Webinar[]) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(
    webinarsCol,
    (snapshot) => {
      const list: Webinar[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Webinar);
      });
      callback(list);
    },
    (error) => {
      console.warn('Firestore webinars snapshot error:', error);
      if (onError) onError(error);
    }
  );
}

export function subscribeHomeworks(
  callback: (data: Homework[]) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(
    homeworksCol,
    (snapshot) => {
      const list: Homework[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Homework);
      });
      callback(list);
    },
    (error) => {
      console.warn('Firestore homeworks snapshot error:', error);
      if (onError) onError(error);
    }
  );
}

export function subscribeSubmissions(
  callback: (data: Submission[]) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(
    submissionsCol,
    (snapshot) => {
      const list: Submission[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Submission);
      });
      callback(list);
    },
    (error) => {
      console.warn('Firestore submissions snapshot error:', error);
      if (onError) onError(error);
    }
  );
}

export function subscribeNotifications(
  callback: (data: TGNotification[]) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(
    notificationsCol,
    (snapshot) => {
      const list: TGNotification[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as TGNotification);
      });
      callback(list);
    },
    (error) => {
      console.warn('Firestore notifications snapshot error:', error);
      if (onError) onError(error);
    }
  );
}

// Write / Mutation Operations with try-catch
export async function dbAddWebinar(webinar: Webinar) {
  try {
    const docRef = doc(db, 'webinars', webinar.id);
    await setDoc(docRef, { ...webinar, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('Error adding webinar to Firestore:', e);
  }
}

export async function dbDeleteWebinar(webinarId: string) {
  try {
    await deleteDoc(doc(db, 'webinars', webinarId));
  } catch (e) {
    console.error('Error deleting webinar from Firestore:', e);
  }
}

export async function dbAddHomework(hw: Homework) {
  try {
    const docRef = doc(db, 'homeworks', hw.id);
    await setDoc(docRef, { ...hw, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('Error adding homework to Firestore:', e);
  }
}

export async function dbAddSubmission(submission: Submission) {
  try {
    const docRef = doc(db, 'submissions', submission.id);
    await setDoc(docRef, { ...submission, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('Error adding submission to Firestore:', e);
  }
}

export async function dbUpdateSubmission(submissionId: string, updatedData: Partial<Submission>) {
  try {
    const docRef = doc(db, 'submissions', submissionId);
    await updateDoc(docRef, updatedData);
  } catch (e) {
    console.error('Error updating submission in Firestore:', e);
  }
}

export async function dbAddNotification(notification: TGNotification) {
  try {
    const docRef = doc(db, 'notifications', notification.id);
    await setDoc(docRef, { ...notification, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('Error adding notification to Firestore:', e);
  }
}

export async function dbMarkNotificationRead(id: string) {
  try {
    const docRef = doc(db, 'notifications', id);
    await setDoc(docRef, { isRead: true }, { merge: true });
  } catch (e) {
    console.error('Error marking notification read in Firestore:', e);
  }
}

export function subscribeStudents(
  callback: (data: RegisteredStudent[]) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(
    studentsCol,
    (snapshot) => {
      const list: RegisteredStudent[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as RegisteredStudent);
      });
      callback(list);
    },
    (error) => {
      console.warn('Firestore students snapshot error:', error);
      if (onError) onError(error);
    }
  );
}

export async function dbAddStudent(student: RegisteredStudent) {
  try {
    const docRef = doc(db, 'students', student.id);
    await setDoc(docRef, student);
  } catch (e) {
    console.error('Error adding student to Firestore:', e);
  }
}

export async function dbDeleteStudent(studentId: string) {
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (e) {
    console.error('Error deleting student from Firestore:', e);
  }
}

export async function dbUpdateStudent(studentId: string, updatedData: Partial<RegisteredStudent>) {
  try {
    const docRef = doc(db, 'students', studentId);
    await setDoc(docRef, updatedData, { merge: true });
  } catch (e) {
    console.error('Error updating student in Firestore:', e);
  }
}
