import React, { useState, useEffect } from 'react';
import {
  UserRole,
  Webinar,
  Homework,
  Submission,
  StudentProfile as StudentProfileType,
  TGNotification,
} from './types';
import {
  initialWebinars,
  initialHomeworks,
  initialSubmissions,
  initialStudentProfile,
  initialNotifications,
  initialRegisteredStudents,
} from './data/mockData';
import { RegisteredStudent } from './types';
import { HeaderTelegram } from './components/HeaderTelegram';
import { Navigation, NavTab } from './components/Navigation';
import { WebinarLibrary } from './components/WebinarLibrary';
import { HomeworkList } from './components/HomeworkList';
import { SpeakingSimulator } from './components/SpeakingSimulator';
import { StudentProfile } from './components/StudentProfile';
import { TeacherCabinet } from './components/TeacherCabinet';
import { AuthModal, AuthUser } from './components/AuthModal';
import { WelcomeAuthScreen } from './components/WelcomeAuthScreen';
import {
  subscribeWebinars,
  subscribeHomeworks,
  subscribeSubmissions,
  subscribeNotifications,
  subscribeStudents,
  dbAddWebinar,
  dbDeleteWebinar,
  dbAddHomework,
  dbUpdateHomework,
  dbDeleteHomework,
  dbAddSubmission,
  dbUpdateSubmission,
  dbAddNotification,
  dbMarkNotificationRead,
  dbDeleteNotification,
  dbAddStudent,
  dbDeleteStudent,
  dbUpdateStudent,
} from './lib/firebase';

export default function App() {
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ege_app_is_logged_in') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<AuthUser>(() => {
    try {
      const saved = localStorage.getItem('ege_app_user_auth');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load auth from localStorage', e);
    }
    return {
      name: 'Александр Ковалев',
      role: 'student',
      telegramHandle: '@sasha_koval',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    };
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('webinars');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Firestore Real-time Application State with Fallback Defaults
  const [webinars, setWebinars] = useState<Webinar[]>(initialWebinars);
  const [homeworks, setHomeworks] = useState<Homework[]>(initialHomeworks);
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [notifications, setNotifications] = useState<TGNotification[]>(initialNotifications);

  // Deleted Homeworks & Notifications Persistence
  const [deletedHwIds, setDeletedHwIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ege_app_deleted_hw_ids');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('ege_app_deleted_hw_ids', JSON.stringify(deletedHwIds));
    } catch (e) {
      console.error(e);
    }
  }, [deletedHwIds]);

  const [deletedNotifIds, setDeletedNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ege_app_deleted_notif_ids');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('ege_app_deleted_notif_ids', JSON.stringify(deletedNotifIds));
    } catch (e) {
      console.error(e);
    }
  }, [deletedNotifIds]);
  const [registeredStudents, setRegisteredStudents] = useState<RegisteredStudent[]>(() => {
    try {
      const saved = localStorage.getItem('ege_app_registered_students');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return initialRegisteredStudents;
  });

  useEffect(() => {
    try {
      localStorage.setItem('ege_app_registered_students', JSON.stringify(registeredStudents));
    } catch (e) {
      console.error(e);
    }
  }, [registeredStudents]);

  const handleAddStudent = (login: string, name?: string) => {
    localStorage.setItem('ege_app_students_seeded', 'true');
    const cleanLogin = login.trim().toLowerCase().replace('@', '');
    const newStudent: RegisteredStudent = {
      id: `st-${Date.now()}`,
      login: cleanLogin,
      name: name?.trim() || '',
      telegramHandle: `@${cleanLogin}`,
      password: '',
      addedAt: 'Сегодня',
      isFirstLogin: true,
    };
    setRegisteredStudents((prev) => [newStudent, ...prev]);
    dbAddStudent(newStudent);
  };

  const handleDeleteStudent = (studentId: string) => {
    localStorage.setItem('ege_app_students_seeded', 'true');
    setRegisteredStudents((prev) => prev.filter((st) => st.id !== studentId));
    dbDeleteStudent(studentId);
  };

  const handleSetStudentPassword = (studentLogin: string, newPassword: string, studentName?: string) => {
    const cleanLogin = studentLogin.trim().toLowerCase().replace('@', '');
    setRegisteredStudents((prev) => {
      let matched = false;
      const updated = prev.map((st) => {
        const matches =
          (st.login && st.login.trim().toLowerCase() === cleanLogin) ||
          (st.telegramHandle && st.telegramHandle.trim().toLowerCase().replace('@', '') === cleanLogin) ||
          (st.name && st.name.trim().toLowerCase() === cleanLogin) ||
          (st.id === studentLogin);
        if (matches) {
          matched = true;
          const finalName = studentName?.trim() || st.name || 'Ученик';
          dbUpdateStudent(st.id, { login: st.login || cleanLogin, name: finalName, password: newPassword, isFirstLogin: false });
          return {
            ...st,
            login: st.login || cleanLogin,
            name: finalName,
            password: newPassword,
            isFirstLogin: false,
          };
        }
        return st;
      });

      if (!matched) {
        const newStudent: RegisteredStudent = {
          id: `st-${Date.now()}`,
          login: cleanLogin,
          name: studentName?.trim() || cleanLogin,
          telegramHandle: `@${cleanLogin}`,
          password: newPassword,
          addedAt: 'Сегодня',
          isFirstLogin: false,
        };
        dbAddStudent(newStudent);
        return [newStudent, ...updated];
      }

      return updated;
    });
  };

  const [customTargetScore, setCustomTargetScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ege_app_target_score');
      if (saved) return Number(saved);
    } catch (e) {
      console.error(e);
    }
    return 90;
  });

  // Helper to track and accumulate daily visits per student across calendar days
  const getUserStreakDays = (userName: string, defaultBaselineStreak: number = 1): number => {
    const storageKey = `ege_app_user_visits_${userName}`;
    const now = new Date();

    const getLocalDateStr = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = getLocalDateStr(now);

    let visits: string[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        visits = JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }

    // Populate baseline if visits is not initialized yet
    if (!Array.isArray(visits) || visits.length === 0) {
      visits = [];
      for (let i = defaultBaselineStreak - 1; i >= 0; i--) {
        const pastDate = new Date(now);
        pastDate.setDate(pastDate.getDate() - i);
        visits.push(getLocalDateStr(pastDate));
      }
    }

    // Always register today's login visit
    if (!visits.includes(todayStr)) {
      visits.push(todayStr);
    }

    // Persist unique visit dates
    visits = Array.from(new Set(visits));
    try {
      localStorage.setItem(storageKey, JSON.stringify(visits));
    } catch (e) {
      console.error(e);
    }

    // Accumulate total active training days across calendar logins without upper limits or resets
    return Math.max(1, visits.length);
  };

  // Dynamic student profile based on logged in user & their actual submissions
  const currentStudentSubmissions = submissions.filter((s) => s.studentName === currentUser.name);

  const activeStudentProfile: StudentProfileType = React.useMemo(() => {
    const defaultBaseline = currentUser.name === initialStudentProfile.name ? (initialStudentProfile.streakDays || 7) : 1;
    const currentStreak = getUserStreakDays(currentUser.name, defaultBaseline);

    if (currentUser.name === initialStudentProfile.name) {
      const isSprinterUnlocked = currentStreak >= 7;
      return {
        ...initialStudentProfile,
        streakDays: currentStreak,
        targetExamScore: customTargetScore,
        avatarUrl: currentUser.avatarUrl || initialStudentProfile.avatarUrl,
        telegramHandle: currentUser.telegramHandle || initialStudentProfile.telegramHandle,
        totalHwSubmitted: currentStudentSubmissions.length || initialStudentProfile.totalHwSubmitted,
        badges: initialStudentProfile.badges.map((b) =>
          b.id === 'b1'
            ? { ...b, unlocked: isSprinterUnlocked, unlockedAt: isSprinterUnlocked ? 'Сегодня' : b.unlockedAt }
            : b
        ),
      };
    }

    const isNinjaUnlocked = currentStudentSubmissions.some((s) => s.type === 'test' && s.status === 'graded');
    const isSprinterUnlocked = currentStreak >= 7;

    // Dynamic exam progress based on student activity
    let dynamicExamProgress = [
      {
        trialName: 'Старт обучения',
        date: 'Старт',
        listening: 0,
        reading: 0,
        grammarVocabulary: 0,
        writing: 0,
        speaking: 0,
        total: 0,
      },
    ];

    if (currentStudentSubmissions.length === 1) {
      dynamicExamProgress.push({
        trialName: 'ДЗ №1 (Первый результат)',
        date: 'Сегодня',
        listening: 14,
        reading: 14,
        grammarVocabulary: 12,
        writing: 12,
        speaking: 12,
        total: 64,
      });
    } else if (currentStudentSubmissions.length >= 2) {
      dynamicExamProgress.push(
        {
          trialName: 'ДЗ №1 (Первый результат)',
          date: 'Вчера',
          listening: 15,
          reading: 15,
          grammarVocabulary: 14,
          writing: 13,
          speaking: 13,
          total: 70,
        },
        {
          trialName: 'Пробник №2 (Высокий балл)',
          date: 'Сегодня',
          listening: 18,
          reading: 18,
          grammarVocabulary: 17,
          writing: 16,
          speaking: 16,
          total: 85,
        }
      );
    }

    return {
      name: currentUser.name,
      telegramHandle: currentUser.telegramHandle,
      avatarUrl: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=300&q=80',
      streakDays: currentStreak,
      streakHistory: [false, false, false, false, false, false, true],
      totalHwSubmitted: currentStudentSubmissions.length,
      averageScorePercent: currentStudentSubmissions.length > 0 ? 100 : 0,
      targetExamScore: customTargetScore,
      badges: [
        {
          id: 'b-welcome',
          title: '🚀 Старт обучения',
          description: 'Успешная авторизация в платформе «Делай и Точка»',
          iconName: 'Flame',
          unlocked: true,
          unlockedAt: 'Сегодня',
        },
        {
          id: 'b1',
          title: '🔥 Спринтер 7 Дней',
          description: 'Сдавай ДЗ и смотри вебинары 7 дней подряд без пропусков',
          iconName: 'Flame',
          unlocked: isSprinterUnlocked,
          unlockedAt: isSprinterUnlocked ? 'Сегодня' : undefined,
        },
        {
          id: 'b2',
          title: '👑 Король Speaking',
          description: 'Получи максимум за устные ДЗ',
          iconName: 'Crown',
          unlocked: false,
        },
        {
          id: 'b3',
          title: '⚡ Грамматический ниндзя',
          description: 'Реши тест на грамматику на 100% результат',
          iconName: 'Zap',
          unlocked: isNinjaUnlocked,
          unlockedAt: isNinjaUnlocked ? 'Сегодня' : undefined,
        },
        {
          id: 'b4',
          title: '✍️ Мастер Эссе',
          description: 'Сдай эссе задание 38 на высший балл',
          iconName: 'Feather',
          unlocked: false,
        },
      ],
      examProgress: dynamicExamProgress,
    };
  }, [currentUser, currentStudentSubmissions]);

  // Save Auth User to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('ege_app_user_auth', JSON.stringify(currentUser));
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  // Connect Real-Time Listeners & Seed Firestore if empty
  useEffect(() => {
    const unsubWebinars = subscribeWebinars(
      (list) => {
        const isSeeded = localStorage.getItem('ege_app_webinars_seeded');
        if (list.length === 0 && !isSeeded) {
          localStorage.setItem('ege_app_webinars_seeded', 'true');
          initialWebinars.forEach((w) => dbAddWebinar(w));
          setWebinars(initialWebinars);
        } else {
          localStorage.setItem('ege_app_webinars_seeded', 'true');
          setWebinars(list);
        }
      },
      () => setWebinars((prev) => (prev.length > 0 ? prev : initialWebinars))
    );

    const unsubHomeworks = subscribeHomeworks(
      (list) => {
        const isSeeded = localStorage.getItem('ege_app_homeworks_seeded');
        if (list.length === 0 && !isSeeded) {
          localStorage.setItem('ege_app_homeworks_seeded', 'true');
          initialHomeworks.forEach((h) => dbAddHomework(h));
          setHomeworks(initialHomeworks);
        } else {
          localStorage.setItem('ege_app_homeworks_seeded', 'true');
          setHomeworks(list);
        }
      },
      () => setHomeworks((prev) => (prev.length > 0 ? prev : initialHomeworks))
    );

    const unsubSubmissions = subscribeSubmissions(
      (list) => {
        const isSeeded = localStorage.getItem('ege_app_submissions_seeded');
        if (list.length === 0 && !isSeeded) {
          localStorage.setItem('ege_app_submissions_seeded', 'true');
          initialSubmissions.forEach((s) => dbAddSubmission(s));
          setSubmissions(initialSubmissions);
        } else {
          localStorage.setItem('ege_app_submissions_seeded', 'true');
          setSubmissions(list);
        }
      },
      () => setSubmissions((prev) => (prev.length > 0 ? prev : initialSubmissions))
    );

    const unsubNotifications = subscribeNotifications(
      (list) => {
        const isSeeded = localStorage.getItem('ege_app_notifs_seeded');
        if (list.length === 0 && !isSeeded) {
          localStorage.setItem('ege_app_notifs_seeded', 'true');
          initialNotifications.forEach((n) => dbAddNotification(n));
          setNotifications(initialNotifications);
        } else {
          localStorage.setItem('ege_app_notifs_seeded', 'true');
          setNotifications(list);
        }
      },
      () => setNotifications((prev) => (prev.length > 0 ? prev : initialNotifications))
    );

    const unsubStudents = subscribeStudents(
      (list) => {
        const isSeeded = localStorage.getItem('ege_app_students_seeded');
        if (list.length === 0 && !isSeeded) {
          localStorage.setItem('ege_app_students_seeded', 'true');
          initialRegisteredStudents.forEach((st) => dbAddStudent(st));
          setRegisteredStudents(initialRegisteredStudents);
        } else {
          localStorage.setItem('ege_app_students_seeded', 'true');
          setRegisteredStudents(list);
        }
      },
      () => setRegisteredStudents((prev) => prev)
    );

    return () => {
      unsubWebinars();
      unsubHomeworks();
      unsubSubmissions();
      unsubNotifications();
      unsubStudents();
    };
  }, []);

  // Handle Login / Switch Account
  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    try {
      localStorage.setItem('ege_app_is_logged_in', 'true');
      localStorage.setItem('ege_app_user_auth', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    if (user.role === 'teacher') {
      setActiveTab('teacher');
    } else {
      setActiveTab('webinars');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    try {
      localStorage.setItem('ege_app_is_logged_in', 'false');
    } catch (e) {
      console.error(e);
    }
  };

  // Add Video Lesson / Webinar (Admin Feature)
  const handleAddWebinar = async (newWebinar: Webinar) => {
    localStorage.setItem('ege_app_webinars_seeded', 'true');
    setWebinars((prev) => [newWebinar, ...prev.filter((w) => w.id !== newWebinar.id)]);
    await dbAddWebinar(newWebinar);

    // Send Notification to Students
    const newNotif: TGNotification = {
      id: `n-${Date.now()}`,
      title: '🎥 Новый видеоурок от Ангелины!',
      text: `Опубликован новый урок: «${newWebinar.title}». Смотрите с таймкодами и конспектом!`,
      time: 'Только что',
      isRead: false,
      type: 'webinar',
    };
    await dbAddNotification(newNotif);
  };

  // Delete Video Lesson (Admin Feature)
  const handleDeleteWebinar = async (webinarId: string) => {
    localStorage.setItem('ege_app_webinars_seeded', 'true');
    setWebinars((prev) => prev.filter((w) => w.id !== webinarId));
    await dbDeleteWebinar(webinarId);
  };

  // Add Homework (Admin Feature)
  const handleAddHomework = async (newHw: Homework) => {
    setHomeworks((prev) => [newHw, ...prev.filter((h) => h.id !== newHw.id)]);
    await dbAddHomework(newHw);

    const newNotif: TGNotification = {
      id: `n-${Date.now()}`,
      title: '📌 Новое домашнее задание!',
      text: `Ангелина опубликовала задание: «${newHw.title}». Дедлайн: ${newHw.deadline}`,
      time: 'Только что',
      isRead: false,
      type: 'deadline',
    };
    await dbAddNotification(newNotif);
  };

  // Update Homework (Admin Feature)
  const handleUpdateHomework = async (updatedHw: Homework) => {
    setHomeworks((prev) => prev.map((h) => (h.id === updatedHw.id ? updatedHw : h)));
    await dbUpdateHomework(updatedHw);

    const newNotif: TGNotification = {
      id: `n-${Date.now()}`,
      title: `📝 ДЗ обновлено: «${updatedHw.title}»`,
      text: 'Преподаватель внес изменения в домашнее задание. Ознакомьтесь с обновленными инструкциями!',
      time: 'Только что',
      isRead: false,
      type: 'webinar',
    };
    await dbAddNotification(newNotif);
  };

  // Delete Homework (Admin Feature)
  const handleDeleteHomework = async (hwId: string) => {
    localStorage.setItem('ege_app_homeworks_seeded', 'true');
    setDeletedHwIds((prev) => [...prev, hwId]);
    setHomeworks((prev) => prev.filter((h) => h.id !== hwId));
    await dbDeleteHomework(hwId);
  };

  // Delete Individual Notification
  const handleDeleteNotification = async (notifId: string) => {
    setDeletedNotifIds((prev) => [...prev, notifId]);
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    await dbDeleteNotification(notifId);
  };

  // Clear All Notifications
  const handleClearAllNotifications = async () => {
    const idsToClear = visibleNotifications.map((n) => n.id);
    setDeletedNotifIds((prev) => Array.from(new Set([...prev, ...idsToClear])));
    setNotifications([]);
    for (const id of idsToClear) {
      await dbDeleteNotification(id);
    }
  };

  // Save Webinar Video Progress
  const handleSaveWebinarProgress = (webinarId: string, positionSeconds: number) => {
    setWebinars((prev) =>
      prev.map((w) =>
        w.id === webinarId ? { ...w, viewedPositionSeconds: positionSeconds } : w
      )
    );
  };

  // Student Submits HW
  const handleSubmitHomework = async (submissionData: Partial<Submission>) => {
    if (!submissionData.homeworkId) return;

    const newSub: Submission = {
      id: `sub-${Date.now()}`,
      homeworkId: submissionData.homeworkId,
      studentName: currentUser.name,
      submittedAt: 'Только что',
      status: submissionData.status || 'pending',
      type: submissionData.type || 'written',
      testAnswers: submissionData.testAnswers,
      testScore: submissionData.testScore,
      speakingAudioUrl: submissionData.speakingAudioUrl,
      essayText: submissionData.essayText,
      writtenFileName: submissionData.writtenFileName,
      writtenImageUrls: submissionData.writtenImageUrls,
      taskAnswers: submissionData.taskAnswers,
      aiPreviewFeedback: submissionData.aiPreviewFeedback,
      totalScore: submissionData.totalScore,
      maxScore: submissionData.maxScore,
      teacherFeedbackText: submissionData.teacherFeedbackText,
    };

    setSubmissions((prev) => [newSub, ...prev.filter((s) => s.id !== newSub.id)]);
    await dbAddSubmission(newSub);

    const newNotif: TGNotification = {
      id: `n-${Date.now()}`,
      title: '📤 ДЗ отправлено Ангелине!',
      text: 'Ангелина скоро проверит работу и вышлет разбор. Ожидайте уведомления!',
      time: 'Только что',
      isRead: false,
      type: 'check',
    };
    await dbAddNotification(newNotif);
  };

  // Teacher Grades Submission
  const handleGradeSubmission = async (submissionId: string, updatedData: Partial<Submission>) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === submissionId ? { ...s, ...updatedData } : s))
    );
    await dbUpdateSubmission(submissionId, updatedData);

    const sub = submissions.find((s) => s.id === submissionId);
    if (sub) {
      const hw = visibleHomeworks.find((h) => h.id === sub.homeworkId);
      const newNotif: TGNotification = {
        id: `n-${Date.now()}`,
        title: '🎧 Ангелина проверила твой ' + (hw?.title || 'ДЗ') + '!',
        text: `Оценка: ${updatedData.totalScore}/${updatedData.maxScore || 14} баллов. Послушай разбор!`,
        time: 'Только что',
        isRead: false,
        type: 'check',
      };
      await dbAddNotification(newNotif);
    }
  };

  // Finish Speaking Simulator -> Auto create submission
  const handleFinishSimulatedSpeaking = (audioUrl: string) => {
    const hw = homeworks.find((h) => h.type === 'speaking') || homeworks[0];
    if (hw) {
      handleSubmitHomework({
        homeworkId: hw.id,
        status: 'pending',
        type: 'speaking',
        speakingAudioUrl: audioUrl,
      });
    }
    setActiveTab('homeworks');
  };

  // Update Student Profile (Name, Avatar, Target Score, Telegram Handle)
  const handleUpdateProfile = async (updated: {
    name: string;
    targetExamScore: number;
    avatarUrl: string;
    telegramHandle: string;
    newPassword?: string;
  }) => {
    const prevName = currentUser.name;

    setCurrentUser((prev) => ({
      ...prev,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
      telegramHandle: updated.telegramHandle,
    }));

    setCustomTargetScore(updated.targetExamScore);

    // If password was changed
    if (updated.newPassword) {
      if (currentUser.role === 'student') {
        const studentToUpdate = registeredStudents.find(
          (s) => s.name === prevName || s.name === updated.name || s.login === currentUser.login
        );
        if (studentToUpdate) {
          const updatedStudentObj = {
            ...studentToUpdate,
            name: updated.name,
            password: updated.newPassword,
            isFirstLogin: false,
          };
          setRegisteredStudents((prev) =>
            prev.map((s) => (s.id === studentToUpdate.id ? updatedStudentObj : s))
          );
          await dbUpdateStudent(studentToUpdate.id, updatedStudentObj);
        }
      } else {
        localStorage.setItem('ege_app_admin_pin', updated.newPassword);
        localStorage.setItem('ege_app_admin_password', updated.newPassword);
      }
    }

    // If student changed their name, update active submissions studentName
    if (prevName !== updated.name) {
      setSubmissions((prev) =>
        prev.map((s) => (s.studentName === prevName ? { ...s, studentName: updated.name } : s))
      );
    }

    try {
      localStorage.setItem('ege_app_target_score', String(updated.targetExamScore));
      localStorage.setItem(
        'ege_app_user_auth',
        JSON.stringify({
          ...currentUser,
          name: updated.name,
          avatarUrl: updated.avatarUrl,
          telegramHandle: updated.telegramHandle,
        })
      );
    } catch (e) {
      console.error(e);
    }
  };

  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ege_app_read_notif_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ege_app_read_notif_ids', JSON.stringify(readNotifIds));
    } catch (e) {
      console.error(e);
    }
  }, [readNotifIds]);

  const visibleHomeworks = React.useMemo(() => {
    return homeworks.filter((hw) => !deletedHwIds.includes(hw.id));
  }, [homeworks, deletedHwIds]);

  // Compute notifications based on current user role & active profile
  const visibleNotifications = React.useMemo(() => {
    if (!isLoggedIn) return [];

    if (currentUser.role === 'teacher') {
      const list: TGNotification[] = [];

      // 1. Student joined notifications
      registeredStudents.forEach((st) => {
        list.push({
          id: `notif-joined-${st.id}`,
          title: `👤 Ученик присоединился: ${st.name}`,
          text: `Ученик авторизовался в системе (${st.telegramHandle}).`,
          time: st.addedAt || 'Недавно',
          isRead: false,
          type: 'webinar',
        });
      });

      // 2. Submissions submitted by real students
      const realStudentSubmissions = submissions.filter((s) =>
        registeredStudents.some((st) => st.name === s.studentName)
      );
      realStudentSubmissions.forEach((sub) => {
        const hw = homeworks.find((h) => h.id === sub.homeworkId);
        list.push({
          id: `notif-sub-${sub.id}`,
          title: `📝 Ученик ${sub.studentName} сдал ДЗ!`,
          text: `Задание "${hw?.title || 'Практическое ДЗ'}" ожидает вашей проверки в кабинете.`,
          time: sub.submittedAt || 'Недавно',
          isRead: sub.status === 'graded',
          type: 'check',
        });
      });

      // 3. Streak record notifications for students with streaks
      registeredStudents.forEach((st) => {
        list.push({
          id: `notif-streak-${st.id}`,
          title: `🔥 Рекорд по стрику дней: ${st.name}`,
          text: `Ученик успешно заходит в систему и поддерживает ежедневную активность!`,
          time: 'Сегодня',
          isRead: true,
          type: 'streak',
        });
      });

      // 4. Achievement notification
      if (registeredStudents.length > 0) {
        list.push({
          id: `notif-achievement-active`,
          title: `🏆 Достижение: Активная группа 2026`,
          text: `Все ученики успешно приступили к подготовке к ЕГЭ!`,
          time: 'Сегодня',
          isRead: false,
          type: 'streak',
        });
      }

      return list
        .map((n) => (readNotifIds.includes(n.id) ? { ...n, isRead: true } : n))
        .filter((n) => !deletedNotifIds.includes(n.id));
    }

    const isDefaultStudent = currentUser.name === initialStudentProfile.name;
    const streakDays = activeStudentProfile.streakDays;
    const streakDaysStr =
      streakDays % 10 === 1 && streakDays % 100 !== 11
        ? `${streakDays} день`
        : streakDays % 10 >= 2 && streakDays % 10 <= 4 && (streakDays % 100 < 10 || streakDays % 100 >= 20)
        ? `${streakDays} дня`
        : `${streakDays} дней`;

    if (!isDefaultStudent) {
      // New or custom student (e.g. Тимур)
      const list: TGNotification[] = [];

      // 1. Welcome Notification
      list.push({
        id: `welcome-${currentUser.name}`,
        title: `👋 Добро пожаловать, ${currentUser.name}!`,
        text: `Вы успешно авторизовались в платформе «Делай и Точка». Смотрите видеоуроки, сдавайте ДЗ и развивайте свой ударный счёт!`,
        time: 'Только что',
        isRead: false,
        type: 'webinar',
      });

      // 2. Dynamic Streak Notification (1st day or current streak)
      list.push({
        id: `streak-${currentUser.name}`,
        title: `🔥 Твой ударный счёт: ${streakDaysStr}!`,
        text: `Так держать, ${currentUser.name}! Твоя серия активности составляет ${streakDaysStr}. Выполняй задания ежедневно!`,
        time: 'Сегодня',
        isRead: false,
        type: 'streak',
      });

      // 3. Homework Available Notification
      list.push({
        id: `hw-notice-${currentUser.name}`,
        title: '⏳ Доступны практические ДЗ к ЕГЭ 2026',
        text: 'Перейдите во вкладку «ДЗ», чтобы сдать первое домашнее задание преподавателю Ангелине.',
        time: 'Сегодня',
        isRead: true,
        type: 'deadline',
      });

      // 4. Any real checked HW notifications for THIS student specifically
      const userGradedHWs = currentStudentSubmissions.filter((s) => s.status === 'graded');
      userGradedHWs.forEach((sub) => {
        const hw = homeworks.find((h) => h.id === sub.homeworkId);
        list.push({
          id: `graded-${sub.id}`,
          title: `🎧 Ангелина проверила твой ${hw?.title || 'ответ'}!`,
          text: `Оценка: ${sub.totalScore}/${sub.maxScore || 14} баллов. Заходи посмотреть комментарий и аудиоразбор!`,
          time: sub.submittedAt || 'Недавно',
          isRead: false,
          type: 'check',
        });
      });

      // Append any new notifications created during session (excluding n1/n2/n3 defaults)
      const sessionNewNotifs = notifications.filter(
        (n) => n.id !== 'n1' && n.id !== 'n2' && n.id !== 'n3' && !n.id.startsWith('welcome-') && !n.id.startsWith('streak-')
      );

      const combined = [...list, ...sessionNewNotifs];
      return combined
        .map((n) => (readNotifIds.includes(n.id) ? { ...n, isRead: true } : n))
        .filter((n) => !deletedNotifIds.includes(n.id));
    }

    // Default student (Александр Ковалев) - update streak notification text to match actual streakDays
    const result = notifications.map((n) => {
      if (n.type === 'streak') {
        return {
          ...n,
          title: `🔥 Твой ударный счёт: ${streakDaysStr}!`,
          text: `Так держать! Твоя серия активности составляет ${streakDaysStr}.`,
        };
      }
      return n;
    });

    return result
      .map((n) => (readNotifIds.includes(n.id) ? { ...n, isRead: true } : n))
      .filter((n) => !deletedNotifIds.includes(n.id));
  }, [currentUser.name, activeStudentProfile.streakDays, currentStudentSubmissions, homeworks, notifications, readNotifIds, deletedNotifIds]);

  // Mark notification read
  const handleNotificationRead = async (id: string) => {
    setReadNotifIds((prev) => [...prev, id]);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    await dbMarkNotificationRead(id);
  };

  const pendingHwCount = homeworks.filter((hw) => {
    const sub = submissions.find((s) => s.homeworkId === hw.id && s.studentName === currentUser.name);
    return !sub && hw.deadline !== 'Просрочено';
  }).length;

  return (
    <div
      className={`min-h-screen font-sans antialiased transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0f1721] text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Telegram App Frame Container */}
      <div className="max-w-md mx-auto min-h-screen flex flex-col shadow-2xl relative bg-inherit">
        {/* Top Header */}
        <HeaderTelegram
          currentUser={currentUser}
          isLoggedIn={isLoggedIn}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onSelectTab={setActiveTab}
          onLogout={handleLogout}
          streakDays={activeStudentProfile.streakDays}
          notifications={visibleNotifications}
          onNotificationRead={handleNotificationRead}
          onDeleteNotification={handleDeleteNotification}
          onClearAllNotifications={handleClearAllNotifications}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        />

        {/* Main View Body */}
        <main className="flex-1 px-3.5 pt-3 pb-20">
          {!isLoggedIn ? (
            <WelcomeAuthScreen
              onLogin={handleLogin}
              registeredStudents={registeredStudents}
              onSetStudentPassword={handleSetStudentPassword}
              isDarkMode={isDarkMode}
            />
          ) : (
            <>
              {activeTab === 'webinars' && (
                <WebinarLibrary
                  webinars={webinars}
                  isDarkMode={isDarkMode}
                  onSaveProgress={handleSaveWebinarProgress}
                />
              )}

              {activeTab === 'homeworks' && (
                <HomeworkList
                  homeworks={visibleHomeworks}
                  submissions={submissions}
                  onSubmitHomework={handleSubmitHomework}
                  isDarkMode={isDarkMode}
                  currentUserName={currentUser.name}
                />
              )}

              {activeTab === 'simulator' && (
                <SpeakingSimulator
                  isDarkMode={isDarkMode}
                  onFinishSimulatedSpeaking={handleFinishSimulatedSpeaking}
                />
              )}

              {activeTab === 'profile' && (
                <StudentProfile
                  profile={activeStudentProfile}
                  isDarkMode={isDarkMode}
                  onUpdateProfile={handleUpdateProfile}
                  isAdmin={currentUser.role === 'teacher'}
                  registeredStudents={registeredStudents}
                  submissions={submissions}
                />
              )}

              {activeTab === 'teacher' && (
                <TeacherCabinet
                  submissions={submissions}
                  homeworks={visibleHomeworks}
                  webinars={webinars}
                  registeredStudents={registeredStudents}
                  onAddStudent={handleAddStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onGradeSubmission={handleGradeSubmission}
                  onAddWebinar={handleAddWebinar}
                  onDeleteWebinar={handleDeleteWebinar}
                  onAddHomework={handleAddHomework}
                  onUpdateHomework={handleUpdateHomework}
                  onDeleteHomework={handleDeleteHomework}
                  isDarkMode={isDarkMode}
                />
              )}
            </>
          )}
        </main>

        {/* Bottom Navigation (Only visible after authorization) */}
        {isLoggedIn && (
          <Navigation
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            pendingCount={pendingHwCount}
            currentRole={currentUser.role}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Auth & Role Switch Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={currentUser}
          isLoggedIn={isLoggedIn}
          onLogin={handleLogin}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          registeredStudents={registeredStudents}
        />
      </div>
    </div>
  );
}
