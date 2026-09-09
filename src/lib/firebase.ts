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
  where,
  getDocs,
} from 'firebase/firestore';
import config from '../../firebase-applet-config.json';
import { Webinar, Homework, Submission, TGNotification, RegisteredStudent } from '../types';

setLogLevel('silent');

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
  ignoreUndefinedProperties: true,
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

function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as unknown as T;
  }
  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(obj as Record<string, any>)) {
    const value = (obj as Record<string, any>)[key];
    if (value !== undefined) {
      cleaned[key] = cleanUndefined(value);
    }
  }
  return cleaned as T;
}

export async function dbAddHomework(hw: Homework) {
  try {
    const docRef = doc(db, 'homeworks', hw.id);
    const cleaned = cleanUndefined({ ...hw, createdAt: new Date().toISOString() });
    await setDoc(docRef, cleaned, { merge: true });
  } catch (e) {
    console.error('Error adding homework to Firestore:', e);
  }
}

export async function dbUpdateHomework(hw: Homework) {
  try {
    const docRef = doc(db, 'homeworks', hw.id);
    const cleaned = cleanUndefined(hw);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (e) {
    console.error('Error updating homework in Firestore:', e);
  }
}

export async function dbDeleteHomework(hwId: string) {
  try {
    const docRef = doc(db, 'homeworks', hwId);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('Error deleting homework from Firestore:', e);
  }
}

export async function dbAddSubmission(submission: Submission) {
  try {
    const docRef = doc(db, 'submissions', submission.id);
    const cleaned = cleanUndefined({ ...submission, createdAt: new Date().toISOString() });
    await setDoc(docRef, cleaned, { merge: true });
  } catch (e) {
    console.error('Error adding submission to Firestore:', e);
  }
}

export async function dbUpdateSubmission(submissionId: string, updatedData: Partial<Submission>) {
  try {
    const docRef = doc(db, 'submissions', submissionId);
    const cleaned = cleanUndefined(updatedData);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (e) {
    console.error('Error updating submission in Firestore:', e);
  }
}

export async function dbDeleteSubmission(submissionId: string) {
  try {
    const docRef = doc(db, 'submissions', submissionId);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('Error deleting submission from Firestore:', e);
  }
}

export async function dbDeleteSubmissionsForHomework(hwId: string) {
  try {
    const q = query(collection(db, 'submissions'), where('homeworkId', '==', hwId));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (e) {
    console.error('Error deleting homework submissions from Firestore:', e);
  }
}

export async function dbAddNotification(notification: TGNotification) {
  try {
    const docRef = doc(db, 'notifications', notification.id);
    const cleaned = cleanUndefined({ ...notification, createdAt: new Date().toISOString() });
    await setDoc(docRef, cleaned, { merge: true });
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

export async function dbDeleteNotification(id: string) {
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (e) {
    console.error('Error deleting notification from Firestore:', e);
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
