import React, { useState, useEffect } from 'react';
import {
  UserRole,
  Webinar,
  Homework,
  Submission,
  StudentProfile as StudentProfileType,
  TGNotification,
  ExamBlockScore,
} from './types';
import { getFormattedDateTime, getCurrentMonthLabel } from './lib/dateUtils';
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
import { isDesktopScreen } from './lib/platform';
import { DesktopLayout } from './components/DesktopLayout';
import { MonitorSmartphone } from 'lucide-react';
import {
  subscribeWebinars,
  subscribeHomeworks,
  subscribeSubmissions,
  subscribeNotifications,
  subscribeStudents,
  dbAddWebinar,
  dbUpdateWebinar,
  dbDeleteWebinar,
  dbAddHomework,
  dbUpdateHomework,
  dbDeleteHomework,
  dbAddSubmission,
  dbUpdateSubmission,
  dbDeleteSubmission,
  dbDeleteSubmissionsForHomework,
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
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name && parsed.name.toLowerCase().includes('ковалев')) {
          parsed.name = 'Дмитрий Волков';
          parsed.telegramHandle = '@dima_volk';
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load auth from localStorage', e);
    }
    return {
      name: 'Дмитрий Волков',
      role: 'student',
      telegramHandle: '@dima_volk',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    };
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('webinars');
  const [targetHomeworkId, setTargetHomeworkId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [forceMobile, setForceMobile] = useState(false);
  const showDesktop = isDesktopScreen() && !forceMobile;

  // Firestore Real-time Application State
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [notifications, setNotifications] = useState<TGNotification[]>([]);
  const [registeredStudents, setRegisteredStudents] = useState<RegisteredStudent[]>([]);

  // Deleted Items Persistence
  const [deletedSubIds, setDeletedSubIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ege_app_deleted_sub_ids');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('ege_app_deleted_sub_ids', JSON.stringify(deletedSubIds));
    } catch (e) {
      console.error(e);
    }
  }, [deletedSubIds]);

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

  const [deletedWebinarIds, setDeletedWebinarIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ege_app_deleted_webinar_ids');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('ege_app_deleted_webinar_ids', JSON.stringify(deletedWebinarIds));
    } catch (e) {
      console.error(e);
    }
  }, [deletedWebinarIds]);

  const handleAddStudent = (login: string, name?: string) => {
    const cleanLogin = login.trim().toLowerCase().replace('@', '');
    const newStudent: RegisteredStudent = {
      id: `st-${Date.now()}`,
      login: cleanLogin,
      name: name?.trim() || '',
      telegramHandle: `@${cleanLogin}`,
      password: '',
      addedAt: 'Сегодня',
      isFirstLogin: true,
      accessibleMonths: [],
    };
    setRegisteredStudents((prev) => [newStudent, ...prev]);
    dbAddStudent(newStudent);
  };

  const handleDeleteStudent = (studentId: string) => {
    const targetStudent = registeredStudents.find((st) => st.id === studentId);
    const targetName = targetStudent?.name?.toLowerCase() || '';

    setRegisteredStudents((prev) => prev.filter((st) => st.id !== studentId));

    // Clean up all submissions belonging to this student or matching Kovalev
    setSubmissions((prev) =>
      prev.filter((sub) => {
        const sName = sub.studentName?.toLowerCase() || '';
        if (targetName && sName.includes(targetName)) return false;
        if (sName.includes('ковалев') || sName.includes('ковалёв')) return false;
        return true;
      })
    );

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
          accessibleMonths: [],
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

  // Dynamic student profile based on logged in user & their actual submissions
  const currentStudentSubmissions = submissions.filter((s) => s.studentName === currentUser.name);

  // Server-side + Local streak tracking (Bulletproof with legacy support)
  useEffect(() => {
    if (!isLoggedIn || currentUser.role !== 'student') return;
    const student = registeredStudents.find(
      (s) =>
        s.telegramHandle === currentUser.telegramHandle ||
        (s.telegramHandle &&
          currentUser.telegramHandle &&
          s.telegramHandle.replace('@', '').toLowerCase() === currentUser.telegramHandle.replace('@', '').toLowerCase())
    );
    if (!student) return;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    // Функция-переводчик старых дат (timestamp) в новый формат
    const normalizeDateStr = (dateVal: string | undefined | null) => {
      if (!dateVal) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return dateVal;
      const num = parseInt(dateVal, 10);
      if (!isNaN(num) && num > 1000000000000) {
        const d = new Date(num);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      return null;
    };

    const localLastVisit = localStorage.getItem(`last_visit_${student.id}`);
    const localStreak = localStorage.getItem(`streak_${student.id}`);
    const normalizedDbDate = normalizeDateStr(student.lastVisitDate);

    // 1. Берем самую свежую дату (защита от медленного ответа базы данных)
    let actualLastVisit = normalizedDbDate;
    if (!actualLastVisit || (localLastVisit && localLastVisit > actualLastVisit)) {
      actualLastVisit = localLastVisit;
    }

    // 2. Берем максимальный стрик, чтобы не откатиться назад из-за лага
    const dbStreak = student.streakDays || 1;
    const locStreak = parseInt(localStreak || '0', 10);
    const currentActualStreak = Math.max(dbStreak, locStreak);

    if (actualLastVisit !== todayStr) {
      let newStreak = currentActualStreak;
      if (actualLastVisit === yesterdayStr) {
        newStreak += 1;
      } else if (actualLastVisit && actualLastVisit !== todayStr) {
        newStreak = 1;
      }
      
      // Мгновенно сохраняем локально, чтобы заблокировать повторные триггеры
      localStorage.setItem(`last_visit_${student.id}`, todayStr);
      localStorage.setItem(`streak_${student.id}`, newStreak.toString());
      
      dbUpdateStudent(student.id, { streakDays: newStreak, lastVisitDate: todayStr });
      setRegisteredStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, streakDays: newStreak, lastVisitDate: todayStr } : s))
      );
    } else {
      // Если сегодня уже заходили, но в базе почему-то цифра меньше локальной — обновляем базу
      if (student.streakDays !== currentActualStreak) {
         dbUpdateStudent(student.id, { streakDays: currentActualStreak, lastVisitDate: todayStr });
      }
    }
  }, [currentUser, isLoggedIn, registeredStudents]);

  const activeStudentProfile: StudentProfileType = React.useMemo(() => {
    const currentStudent = registeredStudents.find(
      (s) =>
        s.telegramHandle === currentUser.telegramHandle ||
        (s.telegramHandle &&
          currentUser.telegramHandle &&
          s.telegramHandle.replace('@', '').toLowerCase() === currentUser.telegramHandle.replace('@', '').toLowerCase())
    );
    const currentStreak = currentStudent?.streakDays || 1;

    const isNinjaUnlocked = currentStudentSubmissions.some((s) => s.type === 'test' && s.status === 'graded');
    const isSpeakingUnlocked = currentStudentSubmissions.some((s) => s.type === 'speaking' && s.status === 'graded');
    const isEssayUnlocked = currentStudentSubmissions.some((s) => s.type === 'written' && s.status === 'graded');
    const isSprinterUnlocked = currentStreak >= 7;

    // Dynamic exam progress for student based on actual graded submissions
    const gradedUserSubs = currentStudentSubmissions.filter((s) => s.status === 'graded');
    let dynamicExamProgress: ExamBlockScore[] = [];

    if (gradedUserSubs.length > 0) {
      gradedUserSubs.forEach((sub, idx) => {
        const hw = homeworks.find((h) => h.id === sub.homeworkId);
        const score = sub.totalScore !== undefined ? sub.totalScore : (sub.testScore || 0);
        const max = sub.maxScore || hw?.maxPoints || 14;
        const totalPct = Math.round(Math.min(100, Math.max(0, (score / max) * 100)));
        const block20 = Math.round(Math.min(20, Math.max(0, (score / max) * 20)));

        let listening = 0;
        let reading = 0;
        let grammarVocabulary = 0;
        let writing = 0;
        let speaking = 0;

        const block = hw?.block || (sub.type === 'speaking' ? 'speaking' : sub.type === 'written' ? 'writing' : 'grammar');
        if (block === 'speaking') speaking = block20;
        else if (block === 'writing') writing = block20;
        else if (block === 'grammar' || block === 'vocabulary') grammarVocabulary = block20;
        else if (block === 'reading') reading = block20;
        else if (block === 'listening') listening = block20;

        dynamicExamProgress.push({
          trialName: hw?.title || `ДЗ №${idx + 1}`,
          date: sub.teacherCheckedAt || sub.submittedAt || getFormattedDateTime(),
          listening,
          reading,
          grammarVocabulary,
          writing,
          speaking,
          total: totalPct,
        });
      });
    }

    const formatRegDate = (dateStr?: string) => {
      if (!dateStr) return 'Недавно';
      // Если дата уже в формате "03 Мар 2026", делаем её красивее
      const months: Record<string, string> = {
        'Янв': 'января', 'Фев': 'февраля', 'Мар': 'марта', 'Апр': 'апреля',
        'Май': 'мая', 'Июн': 'июня', 'Июл': 'июля', 'Авг': 'августа',
        'Сен': 'сентября', 'Окт': 'октября', 'Ноя': 'ноября', 'Дек': 'декабря'
      };
      const parts = dateStr.split(' ');
      if (parts.length === 3) {
        const [day, mon, year] = parts;
        const fullMonth = months[mon] || mon;
        return `${parseInt(day, 10)} ${fullMonth} ${year} года`;
      }
      return dateStr;
    };

    return {
      name: currentUser.name,
      telegramHandle: currentUser.telegramHandle,
      avatarUrl: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=300&q=80',
      streakDays: currentStreak,
      streakHistory: [false, false, false, false, false, false, true],
      totalHwSubmitted: currentStudentSubmissions.length,
      averageScorePercent: gradedUserSubs.length > 0
        ? Math.round(
            gradedUserSubs.reduce((acc, sub) => {
              const score = sub.totalScore !== undefined ? sub.totalScore : (sub.testScore || 0);
              const max = sub.maxScore || 14;
              return acc + Math.min(100, (score / max) * 100);
            }, 0) / gradedUserSubs.length
          )
        : 0,
      targetExamScore: customTargetScore,
      badges: [
        {
          id: 'b-welcome',
          title: '🚀 Старт обучения',
          description: 'Успешная авторизация в платформе «Делай и Точка»',
          iconName: 'Flame',
          unlocked: true,
          unlockedAt: currentStudent?.addedAt ? formatRegDate(currentStudent.addedAt) : 'Недавно',
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
          description: 'Сдай устное ДЗ',
          iconName: 'Crown',
          unlocked: isSpeakingUnlocked,
          unlockedAt: isSpeakingUnlocked ? 'Сегодня' : undefined,
        },
        {
          id: 'b3',
          title: '⚡ Грамматический ниндзя',
          description: 'Реши тест на грамматику',
          iconName: 'Zap',
          unlocked: isNinjaUnlocked,
          unlockedAt: isNinjaUnlocked ? 'Сегодня' : undefined,
        },
        {
          id: 'b4',
          title: '✍️ Мастер Эссе',
          description: 'Сдай эссе задание 38',
          iconName: 'Feather',
          unlocked: isEssayUnlocked,
          unlockedAt: isEssayUnlocked ? 'Сегодня' : undefined,
        },
      ],
      examProgress: dynamicExamProgress,
    };
  }, [currentUser, currentStudentSubmissions, customTargetScore, homeworks, registeredStudents]);

  // Save Auth User to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('ege_app_user_auth', JSON.stringify(currentUser));
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  // Connect Real-Time Listeners
  useEffect(() => {
    const unsubWebinars = subscribeWebinars(
      (list) => {
        setWebinars(list);
      },
      () => setWebinars([])
    );

    const unsubHomeworks = subscribeHomeworks(
      (list) => {
        setHomeworks(list);
      },
      () => setHomeworks([])
    );

    const unsubSubmissions = subscribeSubmissions(
      (list) => {
        setSubmissions(list);
      },
      () => setSubmissions([])
    );

    const unsubNotifications = subscribeNotifications(
      (list) => {
        setNotifications(list);
      },
      () => setNotifications([])
    );

    const unsubStudents = subscribeStudents(
      (list) => {
        setRegisteredStudents(list);
      },
      () => setRegisteredStudents([])
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
    setWebinars((prev) => [newWebinar, ...prev.filter((w) => w.id !== newWebinar.id)]);
    await dbAddWebinar(newWebinar);

    // Send Notification to Students
    const newNotif: TGNotification = {
      id: `n-${Date.now()}`,
      title: '🎥 Новый видеоурок от Ангелины!',
      text: `Опубликован новый урок: «${newWebinar.title}». Смотрите с таймкодами и конспектом!`,
      time: getFormattedDateTime(),
      isRead: false,
      type: 'webinar',
    };
    await dbAddNotification(newNotif);
  };

  // Delete Video Lesson (Admin Feature)
  const handleDeleteWebinar = async (webinarId: string) => {
    const updated = Array.from(new Set([...deletedWebinarIds, webinarId]));
    setDeletedWebinarIds(updated);
    try {
      localStorage.setItem('ege_app_deleted_webinar_ids', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setWebinars((prev) => prev.filter((w) => w.id !== webinarId));
    await dbDeleteWebinar(webinarId);
  };

  const handleUpdateWebinar = async (updatedWebinar: Webinar) => {
    setWebinars((prev) => prev.map((w) => (w.id === updatedWebinar.id ? updatedWebinar : w)));
    await dbUpdateWebinar(updatedWebinar.id, updatedWebinar);
  };

  // Add Homework (Admin Feature)
  const handleAddHomework = async (newHw: Homework) => {
    setHomeworks((prev) => [newHw, ...prev.filter((h) => h.id !== newHw.id)]);
    await dbAddHomework(newHw);

    const newNotif: TGNotification = {
      id: `n-${Date.now()}`,
      title: '📌 Новое домашнее задание!',
      text: `Ангелина опубликовала задание: «${newHw.title}». Дедлайн: ${newHw.deadline}`,
      time: getFormattedDateTime(),
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
      time: getFormattedDateTime(),
      isRead: false,
      type: 'webinar',
    };
    await dbAddNotification(newNotif);
  };

  // Delete Homework (Admin Feature)
  const handleDeleteHomework = async (hwId: string) => {
    // 1. Mark Homework as deleted
    const updatedDeletedHw = Array.from(new Set([...deletedHwIds, hwId]));
    setDeletedHwIds(updatedDeletedHw);
    try {
      localStorage.setItem('ege_app_deleted_hw_ids', JSON.stringify(updatedDeletedHw));
    } catch (e) {
      console.error(e);
    }
    setHomeworks((prev) => prev.filter((h) => h.id !== hwId));

    // 2. Mark related Submissions as deleted
    const subIdsToDelete = submissions.filter((s) => s.homeworkId === hwId).map((s) => s.id);
    const updatedDeletedSub = Array.from(new Set([...deletedSubIds, ...subIdsToDelete]));
    setDeletedSubIds(updatedDeletedSub);
    try {
      localStorage.setItem('ege_app_deleted_sub_ids', JSON.stringify(updatedDeletedSub));
    } catch (e) {
      console.error(e);
    }
    setSubmissions((prev) => prev.filter((s) => s.homeworkId !== hwId));

    // 3. Delete from Firestore
    await dbDeleteHomework(hwId);
    await dbDeleteSubmissionsForHomework(hwId);
  };

  // Delete Submission (Admin Feature)
  const handleDeleteSubmission = async (submissionId: string) => {
    // 1. Mark Submission as deleted
    const updatedDeletedSub = Array.from(new Set([...deletedSubIds, submissionId]));
    setDeletedSubIds(updatedDeletedSub);
    try {
      localStorage.setItem('ege_app_deleted_sub_ids', JSON.stringify(updatedDeletedSub));
    } catch (e) {
      console.error(e);
    }

    // 2. Filter local state
    setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));

    // 3. Delete from Firestore
    await dbDeleteSubmission(submissionId);
  };

  // Delete Individual Notification
  const handleDeleteNotification = async (notifId: string) => {
    const updated = Array.from(new Set([...deletedNotifIds, notifId]));
    setDeletedNotifIds(updated);
    try {
      localStorage.setItem('ege_app_deleted_notif_ids', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    await dbDeleteNotification(notifId);
  };

  // Clear All Notifications
  const handleClearAllNotifications = async () => {
    const idsToClear = visibleNotifications.map((n) => n.id);
    const updated = Array.from(new Set([...deletedNotifIds, ...idsToClear]));
    setDeletedNotifIds(updated);
    try {
      localStorage.setItem('ege_app_deleted_notif_ids', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
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

    const now = new Date();
    const formattedDateTime = `${now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}, ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;

    const targetHw = homeworks.find(h => h.id === submissionData.homeworkId);
    const isLate = targetHw?.deadlineDate ? Date.now() > new Date(targetHw.deadlineDate).getTime() : false;

    const newSub: Submission = {
      id: `sub-${Date.now()}`,
      homeworkId: submissionData.homeworkId,
      studentName: currentUser.name,
      submittedAt: submissionData.submittedAt && submissionData.submittedAt !== 'Только что' ? submissionData.submittedAt : formattedDateTime,
      status: submissionData.status || 'pending',
      type: submissionData.type || 'written',
      isLate,
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
  };

  // Teacher Grades Submission
  const handleGradeSubmission = async (submissionId: string, updatedData: Partial<Submission>) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === submissionId ? { ...s, ...updatedData } : s))
    );
    await dbUpdateSubmission(submissionId, updatedData);
  };

  // Finish Speaking Simulator -> Auto create submission
  const handleFinishSimulatedSpeaking = async (audioUrl: string) => {
    let targetHw = homeworks.find((h) => h.type === 'speaking');

    if (!targetHw) {
      targetHw = {
        id: `hw-sim-${Date.now()}`,
        title: 'Тренажер Speaking (Системная запись)',
        block: 'speaking',
        type: 'speaking',
        deadline: 'Без дедлайна',
        deadlineDate: new Date(Date.now() + 86400000 * 30).toISOString(),
        month: getCurrentMonthLabel(),
        maxPoints: 20,
        description: 'Ответ отправлен учеником из свободного тренажера.',
      };
      setHomeworks((prev) => [targetHw!, ...prev]);
      await dbAddHomework(targetHw);
    }

    handleSubmitHomework({
      homeworkId: targetHw.id,
      status: 'pending',
      type: 'speaking',
      speakingAudioUrl: audioUrl,
    });

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

  // Получаем доступы текущего ученика
  const currentStudentAccess = React.useMemo(() => {
    if (currentUser.role === 'teacher') return ['ALL'];
    const st = registeredStudents.find(s => s.telegramHandle?.toLowerCase() === currentUser.telegramHandle?.toLowerCase() || s.login === currentUser.name);
    return st?.accessibleMonths || [];
  }, [currentUser, registeredStudents]);

  const visibleHomeworks = React.useMemo(() => {
    let hwList = homeworks.filter((hw) => !deletedHwIds.includes(hw.id));
    if (currentUser.role === 'student') {
      hwList = hwList.filter(hw => currentStudentAccess.includes(hw.month || getCurrentMonthLabel()));
    }
    return hwList;
  }, [homeworks, deletedHwIds, currentUser.role, currentStudentAccess]);

  const visibleWebinars = React.useMemo(() => {
    let webList = webinars.filter(w => !deletedWebinarIds.includes(w.id));
    if (currentUser.role === 'student') {
      webList = webList.filter(w => currentStudentAccess.includes(w.month || getCurrentMonthLabel()));
    }
    return webList;
  }, [webinars, deletedWebinarIds, currentUser.role, currentStudentAccess]);

  const visibleSubmissions = React.useMemo(() => {
    return submissions.filter(
      (s) => !deletedSubIds.includes(s.id) && !deletedHwIds.includes(s.homeworkId)
    );
  }, [submissions, deletedSubIds, deletedHwIds]);

  // Compute notifications based on current user role & active profile
  const visibleNotifications = React.useMemo(() => {
    if (!isLoggedIn) return [];

    if (currentUser.role === 'teacher') {
      const list: TGNotification[] = [];

      // 1. Уведомление о реальном входе ученика на платформу
      registeredStudents.forEach((st) => {
        // Пока ученик ни разу не заходил (нет lastVisitDate), уведомление не показываем
        if (st.lastVisitDate) {
          list.push({
            id: `notif-joined-${st.id}`,
            title: `Ученик начал обучение: ${st.name || st.login}`,
            text: `Ученик вошел на платформу и приступил к занятиям (${st.telegramHandle || `@${st.login}`}).`,
            time: st.lastVisitDate,
            isRead: false,
            type: 'webinar',
          });
        }
      });

      // 2. Submissions submitted by real students
      const realStudentSubmissions = visibleSubmissions.filter((s) =>
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
          title: `������ Рекорд по стрику дней: ${st.name}`,
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
        time: getFormattedDateTime(),
        isRead: false,
        type: 'webinar',
      });

      // 2. Dynamic Streak Notification (1st day or current streak)
      list.push({
        id: `streak-${currentUser.name}`,
        title: `🔥 Твой ударный счёт: ${streakDaysStr}!`,
        text: `Так держать, ${currentUser.name}! Твоя серия активности составляет ${streakDaysStr}. Выполняй задания ежедневно!`,
        time: getFormattedDateTime(),
        isRead: false,
        type: 'streak',
      });

      // 3. Homework Available Notification
      list.push({
        id: `hw-notice-${currentUser.name}`,
        title: '⏳ Доступны практические ДЗ к ЕГЭ 2026',
        text: 'Перейдите во вкладку «ДЗ», чтобы сдать первое домашнее задание преподавателю Ангелине.',
        time: getFormattedDateTime(),
        isRead: true,
        type: 'deadline',
      });

      // 4. Any real checked HW notifications for THIS student specifically
      const userGradedHWs = currentStudentSubmissions.filter((s) => s.status === 'graded');
      userGradedHWs.forEach((sub) => {
        const hw = visibleHomeworks.find((h) => h.id === sub.homeworkId);
        list.push({
          id: `graded-${sub.id}`,
          title: `🎧 Ангелина проверила твой ${hw?.title || 'ответ'}!`,
          text: `Оценка: ${sub.totalScore}/${sub.maxScore || 14} баллов. Заходи посмотреть комментарий и аудиоразбор!`,
          time: sub.teacherCheckedAt || sub.submittedAt || getFormattedDateTime(),
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
  }, [currentUser.name, activeStudentProfile.streakDays, currentStudentSubmissions, visibleHomeworks, notifications, readNotifIds, deletedNotifIds]);

  // Mark notification read
  const handleNotificationRead = async (id: string) => {
    setReadNotifIds((prev) => [...prev, id]);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    await dbMarkNotificationRead(id);
  };

  const pendingHwCount = visibleHomeworks.filter((hw) => {
    const sub = visibleSubmissions.find((s) => s.homeworkId === hw.id && s.studentName === currentUser.name);
    return !sub && hw.deadline !== 'Просрочено' && hw.deadline !== 'Без дедлайна';
  }).length;

  const handleUpdateStudentAccess = async (studentId: string, months: string[]) => {
    setRegisteredStudents(prev => prev.map(s => s.id === studentId ? { ...s, accessibleMonths: months } : s));
    await dbUpdateStudent(studentId, { accessibleMonths: months });
  };

  const handleUpdateStudent = async (studentId: string, updatedData: Partial<RegisteredStudent>) => {
    setRegisteredStudents(prev =>
      prev.map(s => (s.id === studentId ? { ...s, ...updatedData } : s))
    );
    await dbUpdateStudent(studentId, updatedData);
  };

  const handleNavigateToSpecificHomework = (hwId: string) => {
    setTargetHomeworkId(hwId);
    setActiveTab('homeworks');
  };

  const appContent = (
    <>
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
              webinars={visibleWebinars}
              homeworks={visibleHomeworks}
              onNavigateToTab={setActiveTab}
              onNavigateToHomeworkItem={handleNavigateToSpecificHomework}
              isDarkMode={isDarkMode}
              onSaveProgress={handleSaveWebinarProgress}
            />
          )}
          {activeTab === 'homeworks' && (
            <HomeworkList 
              homeworks={visibleHomeworks} 
              submissions={visibleSubmissions} 
              onSubmitHomework={handleSubmitHomework} 
              isDarkMode={isDarkMode} 
              currentUserName={currentUser.name}
              currentUserId={registeredStudents.find(s => s.name === currentUser.name || s.login === currentUser.name)?.id}
              targetHomeworkId={targetHomeworkId}
              onClearTargetHomework={() => setTargetHomeworkId(null)}
            />
          )}
          {activeTab === 'simulator' && (
            <SpeakingSimulator isDarkMode={isDarkMode} onFinishSimulatedSpeaking={handleFinishSimulatedSpeaking} />
          )}
          {activeTab === 'profile' && (
            <StudentProfile profile={activeStudentProfile} isDarkMode={isDarkMode} onUpdateProfile={handleUpdateProfile} isAdmin={currentUser.role === 'teacher'} registeredStudents={registeredStudents} submissions={visibleSubmissions} homeworks={visibleHomeworks} />
          )}
          {activeTab === 'teacher' && (
            <TeacherCabinet submissions={visibleSubmissions} homeworks={visibleHomeworks} webinars={webinars} registeredStudents={registeredStudents} onAddStudent={handleAddStudent} onDeleteStudent={handleDeleteStudent} onGradeSubmission={handleGradeSubmission} onAddWebinar={handleAddWebinar} onUpdateWebinar={handleUpdateWebinar} onDeleteWebinar={handleDeleteWebinar} onAddHomework={handleAddHomework} onUpdateHomework={handleUpdateHomework} onDeleteHomework={handleDeleteHomework} onDeleteSubmission={handleDeleteSubmission} isDarkMode={isDarkMode} onUpdateStudentAccess={handleUpdateStudentAccess} onUpdateStudent={handleUpdateStudent} />
          )}
        </>
      )}
    </>
  );

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors duration-200 ${isDarkMode ? 'bg-[#0f1721] text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      {showDesktop ? (
        <DesktopLayout
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onForceMobile={() => setForceMobile(true)}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          currentUser={currentUser}
          isLoggedIn={isLoggedIn}
          onLogout={handleLogout}
          pendingCount={pendingHwCount}
          streakDays={activeStudentProfile.streakDays}
          notifications={visibleNotifications}
          onNotificationRead={handleNotificationRead}
          onDeleteNotification={handleDeleteNotification}
          onClearAllNotifications={handleClearAllNotifications}
        >
          {appContent}
        </DesktopLayout>
      ) : (
        <>
          <div className="max-w-md mx-auto min-h-screen flex flex-col shadow-2xl relative bg-inherit">
            <HeaderTelegram currentUser={currentUser} isLoggedIn={isLoggedIn} onOpenAuthModal={() => setIsAuthModalOpen(true)} onSelectTab={setActiveTab} onLogout={handleLogout} streakDays={activeStudentProfile.streakDays} notifications={visibleNotifications} onNotificationRead={handleNotificationRead} onDeleteNotification={handleDeleteNotification} onClearAllNotifications={handleClearAllNotifications} isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} />
            <main className="flex-1 px-3.5 pt-3 pb-20">{appContent}</main>
            {isLoggedIn && <Navigation activeTab={activeTab} onSelectTab={setActiveTab} pendingCount={pendingHwCount} currentRole={currentUser.role} isDarkMode={isDarkMode} />}
          </div>
          
          {/* Плавающая кнопка возврата на десктоп */}
          {isDesktopScreen() && forceMobile && (
            <button
              onClick={() => setForceMobile(false)}
              className="fixed bottom-8 right-8 z-50 px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl shadow-2xl border border-slate-600 flex items-center space-x-2 transition-all hover:scale-105"
            >
              <MonitorSmartphone className="w-5 h-5" />
              <span>Вернуться на ПК</span>
            </button>
          )}
        </>
      )}
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} currentUser={currentUser} isLoggedIn={isLoggedIn} onLogin={handleLogin} onLogout={handleLogout} isDarkMode={isDarkMode} registeredStudents={registeredStudents} />
    </div>
  );
}
