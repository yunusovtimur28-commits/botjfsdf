import React, { useState, useRef, useEffect } from 'react';
import { Submission, Homework, Webinar, FipiCriteriaScores, BlockCategory, MaterialFile, Timecode, RegisteredStudent } from '../types';
import { getCurrentMonthLabel, getFormattedDateTime } from '../lib/dateUtils';
import {
  GraduationCap,
  Mic,
  Square,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  CheckCircle,
  FileText,
  Clock,
  Volume2,
  Award,
  Sliders,
  X,
  Plus,
  Video,
  UploadCloud,
  ListVideo,
  PlusCircle,
  Trash2,
  BookOpen,
  Users,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Flame,
  KeyRound,
  Lock,
  UserPlus,
  ShieldAlert,
  Paperclip,
  Image as ImageIcon,
  Download,
  Search,
  Edit2,
} from 'lucide-react';

interface TeacherCabinetProps {
  submissions: Submission[];
  homeworks: Homework[];
  webinars: Webinar[];
  registeredStudents?: RegisteredStudent[];
  onAddStudent?: (name: string, telegramHandle: string) => void;
  onDeleteStudent?: (studentId: string) => void;
  onGradeSubmission: (submissionId: string, updatedData: Partial<Submission>) => void;
  onAddWebinar: (newWebinar: Webinar) => void;
  onDeleteWebinar?: (webinarId: string) => void;
  onAddHomework?: (newHw: Homework) => void;
  onUpdateHomework?: (updatedHw: Homework) => void;
  onDeleteHomework?: (hwId: string) => void;
  onDeleteSubmission?: (submissionId: string) => void;
  isDarkMode: boolean;
}

type AdminTab = 'upload_video' | 'review_hw' | 'archive_graded' | 'create_hw' | 'analytics' | 'settings';

export const TeacherCabinet: React.FC<TeacherCabinetProps> = ({
  submissions,
  homeworks,
  webinars,
  registeredStudents = [],
  onAddStudent,
  onDeleteStudent,
  onGradeSubmission,
  onAddWebinar,
  onDeleteWebinar,
  onAddHomework,
  onUpdateHomework,
  onDeleteHomework,
  onDeleteSubmission,
  isDarkMode,
}) => {
  const [adminTab, setAdminTab] = useState<AdminTab>('upload_video');

  // State for Archive of Graded HWs ("База проверенных ДЗ")
  const [archiveSelectedStudent, setArchiveSelectedStudent] = useState<string>('all');
  const [archiveSelectedMonth, setArchiveSelectedMonth] = useState<string>('all');
  const [archiveSelectedBlock, setArchiveSelectedBlock] = useState<string>('all');
  const [archiveSearchQuery, setArchiveSearchQuery] = useState<string>('');

  // SOFT DELETION & 5s UNDO TIMER STATE
  const [softDeletedStudentIds, setSoftDeletedStudentIds] = useState<string[]>([]);
  const [softDeletedWebinarIds, setSoftDeletedWebinarIds] = useState<string[]>([]);
  const [softDeletedHwIds, setSoftDeletedHwIds] = useState<string[]>([]);
  const [softDeletedSubmissionIds, setSoftDeletedSubmissionIds] = useState<string[]>([]);

  // Active items excluding soft-deleted
  const activeRegisteredStudents = React.useMemo(() => {
    return registeredStudents.filter((st) => !softDeletedStudentIds.includes(st.id));
  }, [registeredStudents, softDeletedStudentIds]);

  const activeWebinars = React.useMemo(() => {
    return webinars.filter((web) => !softDeletedWebinarIds.includes(web.id));
  }, [webinars, softDeletedWebinarIds]);

  const activeHomeworks = React.useMemo(() => {
    return homeworks.filter((hw) => !softDeletedHwIds.includes(hw.id));
  }, [homeworks, softDeletedHwIds]);

  const activeSubmissions = React.useMemo(() => {
    return submissions.filter(
      (sub) => !softDeletedSubmissionIds.includes(sub.id) && !softDeletedHwIds.includes(sub.homeworkId)
    );
  }, [submissions, softDeletedSubmissionIds, softDeletedHwIds]);

  // Dynamic list of student names for archive filters (all registered students + any in submissions)
  const archiveStudentOptions = React.useMemo(() => {
    const set = new Set<string>();
    registeredStudents.forEach((s) => {
      if (!softDeletedStudentIds.includes(s.id)) set.add(s.name);
    });
    submissions.forEach((s) => {
      if (s.studentName) set.add(s.studentName);
    });
    return Array.from(set);
  }, [registeredStudents, softDeletedStudentIds, submissions]);

  const gradedArchiveSubmissions = React.useMemo(() => {
    return activeSubmissions.filter((sub) => {
      if (sub.status !== 'graded') return false;

      const hw = homeworks.find((h) => h.id === sub.homeworkId);
      const hwMonth = hw?.month || getCurrentMonthLabel();
      const hwBlock = hw?.block || 'writing';

      if (archiveSelectedStudent !== 'all' && sub.studentName !== archiveSelectedStudent) {
        return false;
      }
      if (archiveSelectedMonth !== 'all' && hwMonth !== archiveSelectedMonth) {
        return false;
      }
      if (archiveSelectedBlock !== 'all' && hwBlock !== archiveSelectedBlock) {
        return false;
      }
      if (archiveSearchQuery.trim()) {
        const q = archiveSearchQuery.toLowerCase();
        const matchName = sub.studentName?.toLowerCase().includes(q);
        const matchTitle = hw?.title.toLowerCase().includes(q);
        const matchFeedback = sub.teacherFeedbackText?.toLowerCase().includes(q);
        if (!matchName && !matchTitle && !matchFeedback) return false;
      }
      return true;
    });
  }, [
    activeSubmissions,
    homeworks,
    archiveSelectedStudent,
    archiveSelectedMonth,
    archiveSelectedBlock,
    archiveSearchQuery,
  ]);

  const handleExportGradedArchive = () => {
    if (gradedArchiveSubmissions.length === 0) {
      alert('Нет проверенных работ для выгрузки по текущим фильтрам.');
      return;
    }

    let report = `========================================================\n`;
    report += `ОТЧЕТ ПО ПРОВЕРЕННЫМ ДОМАШНИМ ЗАДАНИЯМ (Курс ЕГЭ Английский)\n`;
    report += `Сформирован: ${new Date().toLocaleString('ru-RU')}\n`;
    report += `Всего работ в выборке: ${gradedArchiveSubmissions.length}\n`;
    report += `========================================================\n\n`;

    gradedArchiveSubmissions.forEach((sub, i) => {
      const hw = homeworks.find((h) => h.id === sub.homeworkId);
      report += `${i + 1}. Ученик: ${sub.studentName}\n`;
      report += `   Задание: ${hw?.title || 'Домашнее задание'} (${hw?.month || 'Май 2026'})\n`;
      report += `   Формат: ${hw?.type || sub.type} | Блок: ${hw?.block || 'writing'}\n`;
      report += `   Итоговый балл: ${sub.totalScore ?? 0} / ${sub.maxScore ?? 14}\n`;
      if (sub.criteriaScores) {
        report += `   Критерии ФИПИ: К1=${sub.criteriaScores.k1_taskSolution}, К2=${sub.criteriaScores.k2_organization}, К3=${sub.criteriaScores.k3_vocabulary}, К4=${sub.criteriaScores.k4_grammar}\n`;
      }
      report += `   Дата сдачи: ${sub.submittedAt || 'Н/Д'}\n`;
      report += `   Проверено учителем: ${sub.teacherCheckedAt || 'Да'}\n`;
      if (sub.teacherFeedbackText) {
        report += `   Комментарий Ангелины: ${sub.teacherFeedbackText}\n`;
      }
      report += `--------------------------------------------------------\n\n`;
    });

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Проверенные_ДЗ_${archiveSelectedStudent === 'all' ? 'Все_ученики' : archiveSelectedStudent}_${archiveSelectedMonth === 'all' ? 'Все_месяцы' : archiveSelectedMonth}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ title: string; onConfirm: () => void } | null>(null);

  const handleTriggerDeleteStudent = (studentId: string, studentName: string) => {
    setDeleteConfirm({
      title: `Вы уверены, что хотите безвозвратно удалить ученика: "${studentName}"?`,
      onConfirm: () => {
        setSoftDeletedStudentIds((prev) => [...prev, studentId]);
        if (onDeleteStudent) onDeleteStudent(studentId);
        setDeleteConfirm(null);
      },
    });
  };

  const handleTriggerDeleteWebinar = (webinarId: string, webinarTitle: string) => {
    setDeleteConfirm({
      title: `Вы уверены, что хотите безвозвратно удалить вебинар: "${webinarTitle}"?`,
      onConfirm: () => {
        setSoftDeletedWebinarIds((prev) => [...prev, webinarId]);
        if (onDeleteWebinar) onDeleteWebinar(webinarId);
        setDeleteConfirm(null);
      },
    });
  };

  const handleTriggerDeleteHomework = (hwId: string, hwTitle: string) => {
    setDeleteConfirm({
      title: `Вы уверены, что хотите безвозвратно удалить ДЗ: "${hwTitle}"?`,
      onConfirm: () => {
        setSoftDeletedHwIds((prev) => [...prev, hwId]);
        if (onDeleteHomework) onDeleteHomework(hwId);
        setDeleteConfirm(null);
      },
    });
  };

  const handleTriggerDeleteSubmission = (submissionId: string, studentName: string) => {
    setDeleteConfirm({
      title: `Вы уверены, что хотите безвозвратно удалить работу ученика ${studentName || ''}?`,
      onConfirm: () => {
        setSoftDeletedSubmissionIds((prev) => [...prev, submissionId]);
        if (onDeleteSubmission) onDeleteSubmission(submissionId);
        setDeleteConfirm(null);
      },
    });
  };

  // Dynamic calculations strictly from active students & submissions
  const averageScorePercent = React.useMemo(() => {
    const graded = activeSubmissions.filter((s) => s.status === 'graded');
    if (graded.length === 0) return null;
    const sum = graded.reduce((acc, sub) => {
      if (sub.totalScore !== undefined && sub.maxScore && sub.maxScore > 0) {
        return acc + (sub.totalScore / sub.maxScore) * 100;
      }
      if (sub.testScore !== undefined) return acc + sub.testScore;
      return acc;
    }, 0);
    return Math.round(sum / graded.length);
  }, [activeSubmissions]);

  const averageStreakDays = React.useMemo(() => {
    if (activeRegisteredStudents.length === 0) return 0;
    let totalStreak = 0;
    activeRegisteredStudents.forEach((st) => {
      try {
        const stored = localStorage.getItem(`ege_app_user_visits_${st.name}`);
        if (stored) {
          const visits = JSON.parse(stored);
          totalStreak += Array.isArray(visits) ? Math.max(1, visits.length) : 7;
        } else {
          totalStreak += st.name === 'Дмитрий Волков' ? 7 : 1;
        }
      } catch (e) {
        totalStreak += 7;
      }
    });
    return Math.round(totalStreak / activeRegisteredStudents.length);
  }, [activeRegisteredStudents]);

  // MANUALLY ADD STUDENT STATE
  const [addStudentLogin, setAddStudentLogin] = useState('');
  const [addStudentName, setAddStudentName] = useState('');
  const [addStudentToast, setAddStudentToast] = useState<string | null>(null);

  const handleCreateStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLogin = addStudentLogin.trim().toLowerCase().replace('@', '');
    if (!cleanLogin) return;

    if (onAddStudent) {
      onAddStudent(cleanLogin, addStudentName.trim());
    }

    setAddStudentToast(`Аккаунт создан! Передайте ученику логин для входа: "${cleanLogin}"`);
    setAddStudentLogin('');
    setAddStudentName('');
    setTimeout(() => {
      setAddStudentToast(null);
    }, 5000);
  };

  // Submissions state for grading
  const [reviewSubTab, setReviewSubTab] = useState<'pending' | 'graded'>('pending');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'hw' | 'simulator'>('all');

  const filteredReviewSubmissions = React.useMemo(() => {
    return activeSubmissions.filter((sub) => {
      if (reviewFilter === 'hw') {
        return !sub.homeworkId.startsWith('hw-sim-');
      }
      if (reviewFilter === 'simulator') {
        return sub.homeworkId.startsWith('hw-sim-');
      }
      return true;
    });
  }, [activeSubmissions, reviewFilter]);
  const [gradeSuccessToast, setGradeSuccessToast] = useState<{
    studentName: string;
    scoreStr: string;
  } | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(
    submissions.find((s) => s.status === 'pending') || submissions[0] || null
  );

  // Grading form state
  const [criteria, setCriteria] = useState<FipiCriteriaScores>({
    k1_taskSolution: selectedSubmission?.criteriaScores?.k1_taskSolution ?? 3,
    k2_organization: selectedSubmission?.criteriaScores?.k2_organization ?? 3,
    k3_vocabulary: selectedSubmission?.criteriaScores?.k3_vocabulary ?? 3,
    k4_grammar: selectedSubmission?.criteriaScores?.k4_grammar ?? 3,
  });

  const [feedbackText, setFeedbackText] = useState(
    selectedSubmission?.teacherFeedbackText || ''
  );

  // Voice recording by Angelina (Teacher)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingVoiceSeconds, setRecordingVoiceSeconds] = useState(0);
  const [teacherVoiceUrl, setTeacherVoiceUrl] = useState<string | null>(
    selectedSubmission?.teacherVoiceAudioUrl || null
  );
  const teacherMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const teacherAudioChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<any>(null);
  const [teacherVoiceError, setTeacherVoiceError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      if (teacherMediaRecorderRef.current && teacherMediaRecorderRef.current.state !== 'inactive') {
        teacherMediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
        teacherMediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startTeacherVoiceRecording = async () => {
    setTeacherVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      teacherMediaRecorderRef.current = mediaRecorder;
      teacherAudioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          teacherAudioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(teacherAudioChunksRef.current, { type: 'audio/mp3' });
        const voiceUrl = URL.createObjectURL(audioBlob);
        setTeacherVoiceUrl(voiceUrl);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingVoiceSeconds(0);
      voiceTimerRef.current = setInterval(() => {
        setRecordingVoiceSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone permission error', err);
      setIsRecordingVoice(false);
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      setTeacherVoiceError('Доступ к микрофону запрещен или не поддерживается.');
    }
  };

  const stopTeacherVoiceRecording = () => {
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    setIsRecordingVoice(false);

    if (teacherMediaRecorderRef.current && teacherMediaRecorderRef.current.state !== 'inactive') {
      teacherMediaRecorderRef.current.stop();
    }
  };

  const toggleTeacherVoiceRecording = () => {
    if (isRecordingVoice) {
      stopTeacherVoiceRecording();
    } else if (teacherVoiceUrl) {
      setTeacherVoiceUrl(null);
      startTeacherVoiceRecording();
    } else {
      startTeacherVoiceRecording();
    }
  };
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const studentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);

  // VIDEO UPLOAD FORM STATE
  const [videoTitle, setVideoTitle] = useState('');
  const [videoBlock, setVideoBlock] = useState<BlockCategory>('speaking');
  const [videoUrl, setVideoUrl] = useState('');
  const [presetVideoSelect, setPresetVideoSelect] = useState('custom');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [videoDuration, setVideoDuration] = useState('45:00');
  const [videoDescription, setVideoDescription] = useState('');
  const [isGeneratingTimecodes, setIsGeneratingTimecodes] = useState(false);

  // Timecodes state
  const [timecodes, setTimecodes] = useState<{ timeInSeconds: number; timeStr: string; label: string }[]>([
    { timeInSeconds: 0, timeStr: '00:00', label: 'Введение и структура ФИПИ' },
    { timeInSeconds: 300, timeStr: '05:00', label: 'Разбор типичных ошибок' },
  ]);
  const [newTcTime, setNewTcTime] = useState('10:00');
  const [newTcLabel, setNewTcLabel] = useState('');

  // Materials state
  const [materials, setMaterials] = useState<MaterialFile[]>([
    {
      id: 'm-1',
      name: 'Конспект_урока_Ангелины.pdf',
      type: 'pdf',
      size: '2.5 МБ',
      url: '#',
    },
  ]);
  const [newMatName, setNewMatName] = useState('');
  const [uploadSuccessToast, setUploadSuccessToast] = useState<string | null>(null);

  // CREATE / EDIT HOMEWORK FORM STATE
  const [editingHomeworkId, setEditingHomeworkId] = useState<string | null>(null);
  const [hwTitle, setHwTitle] = useState('');
  const [hwBlock, setHwBlock] = useState<BlockCategory>('speaking');
  const [hwType, setHwType] = useState<'test' | 'speaking' | 'written'>('speaking');
  const [hwDeadline, setHwDeadline] = useState('Завтра, 18:00');
  const [hwDescription, setHwDescription] = useState('');
  const [hwSuccessToast, setHwSuccessToast] = useState<string | null>(null);

  // Multi-Task HW builder state
  const [recordingTaskIdx, setRecordingTaskIdx] = useState<number | null>(null);
  const [teacherMediaRecorder, setTeacherMediaRecorder] = useState<MediaRecorder | null>(null);
  const [teacherRecordingSeconds, setTeacherRecordingSeconds] = useState<number>(0);
  const [selectedPublishedMonth, setSelectedPublishedMonth] = useState<string>('all');

  const [hwTasks, setHwTasks] = useState<
    {
      id: string;
      block: BlockCategory;
      taskType: 'test' | 'written' | 'speaking';
      taskNumber: string;
      instruction: string;
      taskPrompt: string;
      taskImageUrl?: string;
      taskAudioUrl?: string;
      options?: string[];
      correctOptionIndex?: number;
    }[]
  >([
    {
      id: 'task-1',
      block: 'speaking',
      taskType: 'speaking',
      taskNumber: 'Задание №1',
      instruction: 'Прочитайте текст вслух. У вас есть 1.5 минуты на подготовку и 1.5 минуты на чтение.',
      taskPrompt: 'Text prompt for speaking task...',
      options: ['Вариант A', 'Вариант B', 'Вариант C', 'Вариант D'],
      correctOptionIndex: 0,
    },
  ]);

  React.useEffect(() => {
    let interval: any;
    if (recordingTaskIdx !== null) {
      interval = setInterval(() => {
        setTeacherRecordingSeconds((s) => s + 1);
      }, 1000);
    } else {
      setTeacherRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [recordingTaskIdx]);

  const startTeacherRecording = async (idx: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        setHwTasks((prev) =>
          prev.map((t, i) => (i === idx ? { ...t, taskAudioUrl: audioUrl } : t))
        );
        stream.getTracks().forEach((track) => track.stop());
        setRecordingTaskIdx(null);
      };
      recorder.start();
      setTeacherMediaRecorder(recorder);
      setRecordingTaskIdx(idx);
      setTeacherRecordingSeconds(0);
    } catch (err) {
      alert('Не удалось получить доступ к микрофону. Разрешите доступ к микрофону в браузере.');
    }
  };

  const stopTeacherRecording = () => {
    if (teacherMediaRecorder && teacherMediaRecorder.state !== 'inactive') {
      teacherMediaRecorder.stop();
    }
  };

  const getTaskNumberOptions = (block: BlockCategory): string[] => {
    switch (block) {
      case 'listening':
        return Array.from({ length: 9 }, (_, i) => `Задание №${i + 1}`);
      case 'reading':
        return Array.from({ length: 9 }, (_, i) => `Задание №${i + 10}`);
      case 'grammar_vocabulary':
        return Array.from({ length: 18 }, (_, i) => `Задание №${i + 19}`);
      case 'writing':
        return ['Задание №37 (Письмо)', 'Задание №38 (Эссе)'];
      case 'speaking':
        return ['Задание №1', 'Задание №2', 'Задание №3', 'Задание №4'];
      default:
        return ['Задание №1'];
    }
  };

  const handleAddTask = () => {
    const defaultBlock: BlockCategory = 'speaking';
    const options = getTaskNumberOptions(defaultBlock);
    setHwTasks((prev) => [
      ...prev,
      {
        id: `task-${Date.now()}-${prev.length + 1}`,
        block: defaultBlock,
        taskNumber: options[0],
        instruction: 'Инструкция к выполнению задания...',
        taskPrompt: 'Задание / Условие...',
      },
    ]);
  };

  const handleRemoveTask = (index: number) => {
    if (hwTasks.length <= 1) return;
    setHwTasks((prev) => prev.filter((_, i) => i !== index));
  };

  // ADMIN PIN MANAGEMENT STATE
  const [newPinInput, setNewPinInput] = useState('');
  const [pinChangeToast, setPinChangeToast] = useState<string | null>(null);

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinInput.trim()) return;
    const cleanPin = newPinInput.trim();
    localStorage.setItem('ege_app_admin_pin', cleanPin);
    setPinChangeToast(cleanPin);
    setNewPinInput('');
    setTimeout(() => {
      setPinChangeToast(null);
    }, 6000);
  };

  // Preset videos for fast testing
  const sampleVideos = [
    {
      label: '🗣 Speaking: Разбор Задания 3 устной части (MP4)',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumb: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=800&q=80',
    },
    {
      label: '📝 Грамматика: Ловушки в Паст Симпл и Презент Перфект (MP4)',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      thumb: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80',
    },
    {
      label: '✍️ Эссе 38: Анализ таблиц и диаграмм ФИПИ (MP4)',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumb: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80',
    },
    {
      label: '📚 Лексика: Продвинутые фреймы и фразовые глаголы (MP4)',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumb: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const handleSelectPresetVideo = (indexStr: string) => {
    setPresetVideoSelect(indexStr);
    if (indexStr === 'custom') return;
    const idx = parseInt(indexStr, 10);
    const video = sampleVideos[idx];
    if (video) {
      setVideoUrl(video.url);
      setThumbnailUrl(video.thumb);
    }
  };

  const parseTimeToSeconds = (str: string): number => {
    const parts = str.split(':').map((p) => parseInt(p, 10) || 0);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  const handleAddTimecode = () => {
    if (!newTcLabel.trim()) return;
    const sec = parseTimeToSeconds(newTcTime);
    setTimecodes((prev) => [...prev, { timeInSeconds: sec, timeStr: newTcTime, label: newTcLabel.trim() }]);
    setNewTcLabel('');
  };

  const handleRemoveTimecode = (index: number) => {
    setTimecodes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddMaterial = () => {
    if (!newMatName.trim()) return;
    setMaterials((prev) => [
      ...prev,
      {
        id: `mat-${Date.now()}`,
        name: newMatName.trim().endsWith('.pdf') ? newMatName.trim() : `${newMatName.trim()}.pdf`,
        type: 'pdf',
        size: '1.8 МБ',
        url: '#',
      },
    ]);
    setNewMatName('');
  };

  const handleRemoveMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const handleVideoUrlInputChange = async (url: string) => {
    setVideoUrl(url);
    if (!url.trim()) return;

    const cleanUrl = url.trim();

    // YouTube Auto-Detection
    const ytMatch = cleanUrl.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i
    );
    if (ytMatch && ytMatch[1]) {
      const ytId = ytMatch[1];
      const autoThumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      if (!thumbnailUrl || thumbnailUrl.includes('unsplash')) {
        setThumbnailUrl(autoThumb);
      }
      fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`)
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            if (data.title && (!videoTitle || videoTitle.startsWith('Задание') || videoTitle === '')) {
              setVideoTitle(data.title);
            }
            if (data.thumbnail_url) {
              setThumbnailUrl(data.thumbnail_url);
            }
          }
        })
        .catch(() => {});

      try {
        const res = await fetch('/api/yt-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cleanUrl }),
        });
        const data = await res.json();
        if (data && data.success && data.duration) {
          setVideoDuration(data.duration);
        }
      } catch (err) {
        console.error('yt-info error:', err);
      }
    } else if (cleanUrl.includes('rutube.ru')) {
      fetch(`https://rutube.ru/api/oembed/?url=${encodeURIComponent(cleanUrl)}&format=json`)
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            if (data.title && (!videoTitle || videoTitle === '')) {
              setVideoTitle(data.title);
            }
            if (data.thumbnail_url) {
              setThumbnailUrl(data.thumbnail_url);
            }
          }
        })
        .catch(() => {});
    }
  };

  // PUBLISH VIDEO LESSON / WEBINAR
  const handlePublishWebinar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle.trim()) {
      alert('Пожалуйста, укажите название ролика');
      return;
    }

    const finalVideoUrl =
      videoUrl.trim() ||
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    
    // Auto cover detection if not specified
    let finalThumbUrl = thumbnailUrl.trim();
    if (!finalThumbUrl) {
      const ytMatch = finalVideoUrl.match(
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i
      );
      if (ytMatch && ytMatch[1]) {
        finalThumbUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      } else {
        finalThumbUrl =
          'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=800&q=80';
      }
    }

    const durSec = parseTimeToSeconds(videoDuration) || 2700;

    const newWebinar: Webinar = {
      id: `web-${Date.now()}`,
      title: videoTitle.trim(),
      block: videoBlock,
      description: videoDescription.trim() || 'Эксклюзивный видеоурок от Ангелины с подробным разбором темы.',
      videoUrl: finalVideoUrl,
      thumbnailUrl: finalThumbUrl,
      duration: videoDuration || '45:00',
      durationSeconds: durSec,
      date: getFormattedDateTime(),
      timecodes: timecodes.map((tc) => ({
        timeInSeconds: tc.timeInSeconds,
        label: tc.label.includes('—') ? tc.label : `${tc.timeStr || '00:00'} — ${tc.label}`,
      })),
      materials,
    };

    onAddWebinar(newWebinar);

    setUploadSuccessToast(videoTitle.trim());
    setVideoTitle('');
    setVideoDescription('');
    setVideoUrl('');
    setThumbnailUrl('');

    setTimeout(() => {
      setUploadSuccessToast(null);
    }, 5000);
  };

  const handleGenerateAiTimecodes = async () => {
    if (!videoTitle.trim()) {
      alert('Укажите название видео перед генерацией таймкодов.');
      return;
    }

    setIsGeneratingTimecodes(true);
    try {
      const response = await fetch('/api/ai-timecodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: videoTitle.trim(),
          description: videoDescription.trim(),
          duration: videoDuration || '45:00',
        }),
      });

      const data = await response.json();
      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.timecodes)
        ? data.timecodes
        : [];

      if (rawList.length > 0) {
        const processedData = rawList.map((item: any) => ({
          timeStr: item.timeStr || '00:00',
          label: item.label || 'Раздел урока',
          timeInSeconds: parseTimeToSeconds(item.timeStr || '00:00'),
        }));
        setTimecodes(processedData);
      }
    } catch (err) {
      console.error('Ошибка генерации ИИ-таймкодов:', err);
    } finally {
      setIsGeneratingTimecodes(false);
    }
  };

  const handleStartEditHomework = (hw: Homework) => {
    setEditingHomeworkId(hw.id);
    setHwTitle(hw.title);
    setHwDeadline(hw.deadline || 'Завтра, 18:00');
    setHwDescription(hw.description || '');
    setHwBlock(hw.block);
    if (hw.tasks && hw.tasks.length > 0) {
      setHwTasks(
        hw.tasks.map((t) => ({
          id: t.id,
          block: t.block,
          taskType: t.taskType || (t.block === 'speaking' ? 'speaking' : t.block === 'writing' ? 'written' : 'test'),
          taskNumber: t.taskNumber,
          instruction: t.instruction || '',
          taskPrompt: t.taskPrompt,
          taskImageUrl: t.taskImageUrl,
          taskAudioUrl: t.taskAudioUrl,
          options: t.options || ['Вариант A', 'Вариант B', 'Вариант C', 'Вариант D'],
          correctOptionIndex: t.correctOptionIndex ?? 0,
        }))
      );
    } else {
      setHwTasks([
        {
          id: 'task-1',
          block: hw.block,
          taskType: hw.type || 'test',
          taskNumber: 'Задание №1',
          instruction: 'Инструкция к заданию...',
          taskPrompt: hw.description || 'Условие задания...',
          options: ['Вариант A', 'Вариант B', 'Вариант C', 'Вариант D'],
          correctOptionIndex: 0,
        },
      ]);
    }
    setAdminTab('create_hw');
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const handleCancelEditHomework = () => {
    setEditingHomeworkId(null);
    setHwTitle('');
    setHwDescription('');
    setHwTasks([
      {
        id: 'task-1',
        block: 'speaking',
        taskType: 'speaking',
        taskNumber: 'Задание №1',
        instruction: 'Прочитайте текст вслух. У вас есть 1.5 минуты на подготовку и 1.5 минуты на чтение.',
        taskPrompt: 'Text prompt for speaking task...',
        options: ['Вариант A', 'Вариант B', 'Вариант C', 'Вариант D'],
        correctOptionIndex: 0,
      },
    ]);
  };

  // POST OR EDIT HOMEWORK
  const handlePublishHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim()) return;

    const formattedTasks = hwTasks.map((t, idx) => ({
      id: t.id || `task-${idx + 1}`,
      block: t.block,
      taskType: t.taskType || 'test',
      taskNumber: t.taskNumber,
      instruction: t.instruction,
      taskPrompt: t.taskPrompt,
      taskImageUrl: t.taskImageUrl,
      taskAudioUrl: t.taskAudioUrl,
      options: t.options || ['Вариант A', 'Вариант B', 'Вариант C', 'Вариант D'],
      correctOptionIndex: t.correctOptionIndex ?? 0,
      correctAnswer: t.options ? t.options[t.correctOptionIndex ?? 0] : undefined,
    }));

    const primaryBlock = formattedTasks[0]?.block || hwBlock;
    const primaryType = formattedTasks[0]?.taskType || 'test';
    const isEditing = Boolean(editingHomeworkId);
    const targetHwId = editingHomeworkId || `hw-${Date.now()}`;

    const hwData: Homework = {
      id: targetHwId,
      title: hwTitle.trim(),
      block: primaryBlock,
      type: primaryType as any,
      deadline: hwDeadline,
      deadlineDate: new Date(Date.now() + 86400000).toISOString(),
      month: getCurrentMonthLabel(),
      maxPoints: formattedTasks.length * 5,
      description: hwDescription.trim() || `Домашнее задание от Ангелины из ${formattedTasks.length} заданий.`,
      tasks: formattedTasks,
    };

    if (isEditing && onUpdateHomework) {
      onUpdateHomework(hwData);
      setHwSuccessToast(`Изменения в ДЗ «${hwTitle.trim()}» успешно сохранены!`);
    } else if (onAddHomework) {
      onAddHomework(hwData);
      setHwSuccessToast(`ДЗ «${hwTitle.trim()}» успешно отправлено ученикам!`);
    }

    setEditingHomeworkId(null);
    setHwTitle('');
    setHwDescription('');
    setHwTasks([
      {
        id: 'task-1',
        block: 'speaking',
        taskType: 'speaking',
        taskNumber: 'Задание №1',
        instruction: 'Прочитайте текст вслух. У вас есть 1.5 минуты на подготовку и 1.5 минуты на чтение.',
        taskPrompt: 'Text prompt for speaking task...',
        options: ['Вариант A', 'Вариант B', 'Вариант C', 'Вариант D'],
        correctOptionIndex: 0,
      },
    ]);

    setTimeout(() => {
      setHwSuccessToast(null);
    }, 6000);
  };

  // Review & Grading Submission Handlers
  const getHomeworkForSubmission = (hwId: string): Homework | undefined => {
    return homeworks.find((h) => h.id === hwId);
  };

  const handleSelectSubmission = (sub: Submission) => {
    setSelectedSubmission(sub);
    setCriteria(
      sub.criteriaScores || {
        k1_taskSolution: 3,
        k2_organization: 3,
        k3_vocabulary: 3,
        k4_grammar: 3,
      }
    );
    setFeedbackText(sub.teacherFeedbackText || '');
    setTeacherVoiceUrl(sub.teacherVoiceAudioUrl || null);
  };

  const handleGenerateAiAssistantDraft = async () => {
    if (!selectedSubmission) return;
    const hw = getHomeworkForSubmission(selectedSubmission.homeworkId);
    setAiDraftLoading(true);

    try {
      const res = await fetch('/api/ai-teacher-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hwTitle: hw?.title || 'Задание',
          studentSubmission: selectedSubmission.essayText || 'Аудио-ответ Speaking',
          criteriaScores: criteria,
        }),
      });
      const data = await res.json();
      if (data.suggestedComment) {
        setFeedbackText(data.suggestedComment);
      }
    } catch (err) {
      console.error(err);
      setFeedbackText(
        'Отличная работа! Все требования ФИПИ выполнены. Логика ответа соблюдена, рекомендую обратить внимание на разнообразие вводных слов в следующем задании.'
      );
    } finally {
      setAiDraftLoading(false);
    }
  };

  const handleSaveGrading = () => {
    if (!selectedSubmission) return;
    const hw = getHomeworkForSubmission(selectedSubmission.homeworkId);
    const totalScore =
      criteria.k1_taskSolution +
      criteria.k2_organization +
      criteria.k3_vocabulary +
      criteria.k4_grammar;

    const maxScore = hw?.maxPoints || 14;
    const finalScore = Math.min(totalScore, maxScore);

    const now = new Date();
    const formattedCheckedAt = `${now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}, ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;

    onGradeSubmission(selectedSubmission.id, {
      status: 'graded',
      criteriaScores: criteria,
      totalScore: finalScore,
      maxScore,
      teacherFeedbackText: feedbackText,
      teacherVoiceAudioUrl: teacherVoiceUrl || undefined,
      teacherCheckedAt: formattedCheckedAt,
    });

    setGradeSuccessToast({
      studentName: selectedSubmission.studentName,
      scoreStr: `${finalScore} / ${maxScore} баллов`,
    });

    const remainingPending = submissions.filter(
      (s) => s.status === 'pending' && s.id !== selectedSubmission.id
    );
    if (remainingPending.length > 0) {
      handleSelectSubmission(remainingPending[0]);
    } else {
      setSelectedSubmission(null);
    }

    setTimeout(() => {
      setGradeSuccessToast(null);
    }, 6000);
  };

  const totalCalculatedScore =
    criteria.k1_taskSolution +
    criteria.k2_organization +
    criteria.k3_vocabulary +
    criteria.k4_grammar;

  return (
    <div className="space-y-4 pb-24 relative">
      {/* SUCCESS TOAST BANNER FOR GRADED HOMEWORK */}
      {gradeSuccessToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[92%] bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 rounded-2xl shadow-2xl border border-emerald-400 flex items-center justify-between space-x-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-sm text-white">🚀 ДЗ отправлено ученику!</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-emerald-100">
                  {gradeSuccessToast.scoreStr}
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Результат и разбор отправлены ученику <strong className="text-white">{gradeSuccessToast.studentName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setGradeSuccessToast(null)}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}
      {/* Admin Panel Header */}
      <div className={`p-4 rounded-2xl border bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-sky-900/40 ${
        isDarkMode ? 'border-purple-500/30 text-white' : 'border-purple-200 text-slate-900'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">👑 Админ Панель Ангелины</h2>
              <p className="text-[11px] text-purple-300">
                Загрузка роликов, проверка ДЗ и управление курсом «Делай и Точка»
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500 text-white flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>Админ Доступ</span>
          </span>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="grid grid-cols-5 gap-1 mt-4 p-1 rounded-xl bg-black/40 text-[10px] font-bold">
          <button
            onClick={() => setAdminTab('upload_video')}
            className={`py-2 px-1 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
              adminTab === 'upload_video'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="truncate">Заливка</span>
          </button>

          <button
            onClick={() => setAdminTab('review_hw')}
            className={`py-2 px-1 rounded-lg transition-all flex flex-col items-center justify-center gap-1 relative ${
              adminTab === 'review_hw'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <FileText className="w-3.5 h-3.5" />
              {activeSubmissions.filter((s) => s.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                  {activeSubmissions.filter((s) => s.status === 'pending').length}
                </span>
              )}
            </div>
            <span className="truncate">Проверка</span>
          </button>

          <button
            onClick={() => setAdminTab('archive_graded')}
            className={`py-2 px-1 rounded-lg transition-all flex flex-col items-center justify-center gap-1 relative ${
              adminTab === 'archive_graded'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {activeSubmissions.filter((s) => s.status === 'graded').length > 0 && (
                <span className="absolute -top-1 -right-2 bg-emerald-500 text-white text-[9px] px-1 h-3.5 rounded-full flex items-center justify-center font-bold">
                  {activeSubmissions.filter((s) => s.status === 'graded').length}
                </span>
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] leading-tight text-center font-extrabold tracking-tight">
              Проверенные<br />ДЗ
            </span>
          </button>

          <button
            onClick={() => setAdminTab('create_hw')}
            className={`py-2 px-1 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
              adminTab === 'create_hw'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="truncate">Новое ДЗ</span>
          </button>

          <button
            onClick={() => setAdminTab('analytics')}
            className={`py-2 px-1 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
              adminTab === 'analytics'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="truncate">Ученики</span>
          </button>

          <button
            onClick={() => setAdminTab('settings')}
            className={`py-2 px-1 rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
              adminTab === 'settings'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="truncate">Пароль</span>
          </button>
        </div>
      </div>

      {/* SUCCESS TOAST FOR VIDEO UPLOAD */}
      {uploadSuccessToast && (
        <div className="p-4 rounded-2xl bg-emerald-500 text-white shadow-xl flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-6 h-6 shrink-0 text-white" />
            <div>
              <h4 className="font-bold text-xs">Видеоурок успешно опубликован!</h4>
              <p className="text-[11px] opacity-90 line-clamp-1">«{uploadSuccessToast}» появился в Базе знаний учеников!</p>
            </div>
          </div>
          <button
            onClick={() => setUploadSuccessToast(null)}
            className="p-1 rounded-lg hover:bg-white/20 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SUCCESS TOAST FOR HOMEWORK POST */}
      {hwSuccessToast && (
        <div className="p-4 rounded-2xl bg-sky-500 text-white shadow-xl flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-6 h-6 shrink-0 text-white" />
            <div>
              <h4 className="font-bold text-xs">Новое ДЗ опубликовано!</h4>
              <p className="text-[11px] opacity-90 line-clamp-1">«{hwSuccessToast}» доступно для сдачи учениками.</p>
            </div>
          </div>
          <button
            onClick={() => setHwSuccessToast(null)}
            className="p-1 rounded-lg hover:bg-white/20 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================= TAB 1: UPLOAD VIDEO & MANAGE LESSONS ================= */}
      {adminTab === 'upload_video' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border space-y-4 ${
            isDarkMode ? 'bg-[#1e2c3a] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-slate-700">
              <Video className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-sm">Загрузить новый видеоурок / вебинар</h3>
            </div>

            <form onSubmit={handlePublishWebinar} className="space-y-3.5 text-xs">
              {/* Preset Video Loader Quick Selector */}
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1.5">
                <label className="font-bold text-purple-300 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Быстрый выбор демонстрационного видео (или вставьте свою ссылку):</span>
                </label>
                <select
                  value={presetVideoSelect}
                  onChange={(e) => handleSelectPresetVideo(e.target.value)}
                  className={`w-full p-2 rounded-lg text-xs font-medium border ${
                    isDarkMode ? 'bg-[#17212b] border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                >
                  <option value="custom">✏️ Ввести свою ссылку на MP4 / YouTube</option>
                  {sampleVideos.map((v, idx) => (
                    <option key={idx} value={idx}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-400">Название урока:</label>
                <input
                  type="text"
                  required
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Задание 38: Полный разбор графика и эссе для ФИПИ"
                  className={`w-full p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-[#17212b] border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                />
              </div>

              {/* Category & Duration */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400">Блок / Раздел:</label>
                  <select
                    value={videoBlock}
                    onChange={(e) => setVideoBlock(e.target.value as BlockCategory)}
                    className={`w-full p-2.5 rounded-xl border ${
                      isDarkMode ? 'bg-[#17212b] border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  >
                    <option value="listening">🎧 Аудирование (Listening)</option>
                    <option value="reading">📖 Чтение (Reading)</option>
                    <option value="grammar_vocabulary">📚 Грамматика и лексика</option>
                    <option value="writing">✍️ Письмо (Writing)</option>
                    <option value="speaking">🗣 Говорение (Speaking)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-400">Длительность (мм:сс):</label>
                  <input
                    type="text"
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(e.target.value)}
                    placeholder="45:00"
                    className={`w-full p-2.5 rounded-xl border ${
                      isDarkMode ? 'bg-[#17212b] border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
              </div>

              {/* Video URL */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-400">Ссылка на видео (YouTube / MP4 / VK / Rutube):</label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => handleVideoUrlInputChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... или https://rutube.ru/..."
                  className={`w-full p-2.5 rounded-xl border font-mono text-[11px] ${
                    isDarkMode ? 'bg-[#17212b] border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                />
              </div>

              {/* Thumbnail URL */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-400">Обложка урока (Image URL):</label>
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className={`w-full p-2.5 rounded-xl border font-mono text-[11px] ${
                    isDarkMode ? 'bg-[#17212b] border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-400">Описание урока:</label>
                <textarea
                  rows={3}
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Подробно разбираем требования ФИПИ, типичные ошибки и ключевые фреймы..."
                  className={`w-full p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-[#17212b] border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                />
              </div>

              {/* TIMECODES MANAGER */}
              <div className="p-3 rounded-xl bg-black/20 space-y-2 border border-slate-700/50">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-sky-400 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Таймкоды к ролику ({timecodes.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAiTimecodes}
                    disabled={isGeneratingTimecodes}
                    className="text-[10px] font-bold px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg shadow-md flex items-center space-x-1 transition-all"
                  >
                    <Sparkles className={`w-3 h-3 text-amber-300 ${isGeneratingTimecodes ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingTimecodes ? 'Думает...' : '✨ ИИ Авто-таймкоды'}</span>
                  </button>
                </div>

                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {timecodes.map((tc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-black/30 text-[11px]"
                    >
                      <span className="font-mono text-amber-300 font-bold shrink-0 mr-2">{tc.timeStr}</span>
                      <span className="truncate text-slate-300">{tc.label}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTimecode(idx)}
                        className="text-rose-400 hover:text-rose-300 p-1 ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="text"
                    value={newTcTime}
                    onChange={(e) => setNewTcTime(e.target.value)}
                    placeholder="10:00"
                    className={`w-20 p-1.5 rounded-lg border font-mono text-[11px] ${
                      isDarkMode ? 'bg-[#17212b] border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                  <input
                    type="text"
                    value={newTcLabel}
                    onChange={(e) => setNewTcLabel(e.target.value)}
                    placeholder="Описание блока (например: Ошибки в вводных словах)"
                    className={`flex-1 p-1.5 rounded-lg border text-[11px] ${
                      isDarkMode ? 'bg-[#17212b] border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddTimecode}
                    className="p-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-lg shrink-0 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Добавить</span>
                  </button>
                </div>
              </div>

              {/* MATERIALS / PDF ATTACHMENTS */}
              <div className="p-3 rounded-xl bg-black/20 space-y-2 border border-slate-700/50">
                <label className="font-bold text-emerald-400 flex items-center space-x-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Прикрепить материалы и конспекты PDF ({materials.length})</span>
                </label>

                <div className="space-y-1">
                  {materials.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-black/30 text-[11px]"
                    >
                      <span className="truncate text-slate-200">{m.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterial(m.id)}
                        className="text-rose-400 hover:text-rose-300 p-1 ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="text"
                    value={newMatName}
                    onChange={(e) => setNewMatName(e.target.value)}
                    placeholder="Название файла (например: Шпора_Устная_Часть.pdf)"
                    className={`flex-1 p-1.5 rounded-lg border text-[11px] ${
                      isDarkMode ? 'bg-[#17212b] border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddMaterial}
                    className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg shrink-0 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Файл</span>
                  </button>
                </div>
              </div>

              {/* PUBLISH BUTTON */}
              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center space-x-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Опубликовать ролик в платформе</span>
              </button>
            </form>
          </div>

          {/* LIST OF CURRENTLY PUBLISHED WEBINARS */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Загруженные видеоуроки ({activeWebinars.length})</span>
            </h3>

            <div className="space-y-2">
              {activeWebinars.map((web) => (
                <div
                  key={web.id}
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isDarkMode ? 'bg-[#17212b] border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <img
                      src={web.thumbnailUrl}
                      alt={web.title}
                      className="w-14 h-10 object-cover rounded-lg shrink-0"
                    />
                    <div className="overflow-hidden">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                          {web.block === 'speaking'
                            ? '🗣 Говорение'
                            : web.block === 'writing'
                            ? '✍️ Письмо'
                            : web.block === 'grammar_vocabulary'
                            ? '📚 Грам. и лексика'
                            : web.block === 'listening'
                            ? '🎧 Аудирование'
                            : '📖 Чтение'}
                        </span>
                        <h4 className="font-bold text-xs truncate leading-snug">{web.title}</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {web.duration} • {web.timecodes.length} таймкодов • {web.materials.length} PDF
                      </p>
                    </div>
                  </div>

                  {onDeleteWebinar && (
                    <button
                      onClick={() => handleTriggerDeleteWebinar(web.id, web.title)}
                      title="Удалить ролик"
                      className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors ml-2 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: REVIEW SUBMISSIONS ================= */}
      {adminTab === 'review_hw' && (
        <div className="space-y-4">
          {/* Submissions List Queue with Sub-Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-2 flex-wrap gap-2">
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setReviewSubTab('pending');
                    const firstPending = filteredReviewSubmissions.find((s) => s.status === 'pending');
                    if (firstPending) handleSelectSubmission(firstPending);
                    else setSelectedSubmission(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all ${
                    reviewSubTab === 'pending'
                      ? 'bg-amber-500 text-slate-900 shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Очередь на проверку ({filteredReviewSubmissions.filter((s) => s.status === 'pending').length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReviewSubTab('graded');
                    const firstGraded = filteredReviewSubmissions.find((s) => s.status === 'graded');
                    if (firstGraded) handleSelectSubmission(firstGraded);
                    else setSelectedSubmission(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all ${
                    reviewSubTab === 'graded'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Сданные / Проверенные ДЗ ({filteredReviewSubmissions.filter((s) => s.status === 'graded').length})</span>
                </button>
              </div>

              {/* Review Filter Pills: All / HW / Simulator */}
              <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
                <button
                  type="button"
                  onClick={() => {
                    setReviewFilter('all');
                    const firstMatch = activeSubmissions.find((s) => s.status === reviewSubTab);
                    if (firstMatch) handleSelectSubmission(firstMatch);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    reviewFilter === 'all'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Все ({activeSubmissions.filter((s) => s.status === reviewSubTab).length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReviewFilter('hw');
                    const firstMatch = activeSubmissions.find(
                      (s) => s.status === reviewSubTab && !s.homeworkId.startsWith('hw-sim-')
                    );
                    if (firstMatch) handleSelectSubmission(firstMatch);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    reviewFilter === 'hw'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Только ДЗ ({activeSubmissions.filter((s) => s.status === reviewSubTab && !s.homeworkId.startsWith('hw-sim-')).length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReviewFilter('simulator');
                    const firstMatch = activeSubmissions.find(
                      (s) => s.status === reviewSubTab && s.homeworkId.startsWith('hw-sim-')
                    );
                    if (firstMatch) handleSelectSubmission(firstMatch);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    reviewFilter === 'simulator'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🎙 Свободная практика ({activeSubmissions.filter((s) => s.status === reviewSubTab && s.homeworkId.startsWith('hw-sim-')).length})
                </button>
              </div>
            </div>

            {/* Submissions List */}
            {filteredReviewSubmissions.filter((s) => s.status === reviewSubTab).length === 0 ? (
              <div
                className={`p-6 text-center rounded-2xl border ${
                  isDarkMode ? 'bg-[#1e2c3a] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                <p className="font-bold text-xs">
                  {reviewSubTab === 'pending'
                    ? reviewFilter === 'simulator'
                      ? 'В очереди нет записей свободной практики тренажёра!'
                      : 'Все задания проверены! Очередь пуста.'
                    : 'Пока нет проверенных работ.'}
                </p>
              </div>
            ) : (
              <div className="flex space-x-2 overflow-x-auto no-scrollbar py-1">
                {filteredReviewSubmissions
                  .filter((s) => s.status === reviewSubTab)
                  .map((sub) => {
                    const hw = getHomeworkForSubmission(sub.homeworkId);
                    const isSelected = selectedSubmission?.id === sub.id;

                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSelectSubmission(sub)}
                        className={`p-3 rounded-xl border text-left shrink-0 w-48 transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                            : sub.status === 'pending'
                            ? isDarkMode
                              ? 'bg-amber-950/30 border-amber-500/40 text-slate-200'
                              : 'bg-amber-50 border-amber-300 text-slate-900'
                            : isDarkMode
                            ? 'bg-[#17212b] border-slate-800 text-slate-400'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="font-bold truncate">{sub.studentName}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded font-extrabold ${
                              sub.status === 'pending' ? 'bg-amber-400 text-slate-900' : 'bg-emerald-500 text-white'
                            }`}
                          >
                            {sub.status === 'pending' ? 'Ждет' : 'Проверено'}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs truncate leading-snug">
                          {sub.homeworkId.startsWith('hw-sim-')
                            ? '🎙 Тренажёр устной части'
                            : hw?.title || 'Домашнее задание'}
                        </h4>
                        <p className="text-[10px] opacity-80 mt-1">{sub.submittedAt}</p>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Selected Submission Review Interface */}
          {selectedSubmission && (
            <div
              className={`p-4 rounded-2xl border space-y-4 shadow-md ${
                isDarkMode ? 'bg-[#1e2c3a] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              {/* Student Info Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="font-bold text-sm">{selectedSubmission.studentName}</h3>
                  <p className="text-xs text-sky-400">
                    Задание: {getHomeworkForSubmission(selectedSubmission.homeworkId)?.title}
                  </p>
                </div>
                <div className="flex items-center space-x-3 shrink-0">
                  <span className="text-xs text-slate-400 font-mono">
                    Сдано: {selectedSubmission.submittedAt && selectedSubmission.submittedAt !== 'Только что' && selectedSubmission.submittedAt !== 'Ранее' ? selectedSubmission.submittedAt : getFormattedDateTime()}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleTriggerDeleteSubmission(selectedSubmission.id, selectedSubmission.studentName);
                      setSelectedSubmission(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs border border-rose-500/30 transition-colors flex items-center space-x-1"
                    title="Удалить работу ученика"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Удалить ДЗ</span>
                  </button>
                </div>
              </div>

              {/* TASK CONDITION / PROMPT DISPLAY */}
              {(() => {
                const hw = getHomeworkForSubmission(selectedSubmission.homeworkId);
                return hw ? (
                  <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-2 mb-4">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                      <BookOpen className="w-4 h-4 text-sky-400" />
                      <span>Условие задания:</span>
                    </h4>
                    
                    {/* Общее описание */}
                    {hw.description && (
                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                        {hw.description}
                      </p>
                    )}

                    {/* Специфичные данные для Speaking */}
                    {hw.type === 'speaking' && hw.speakingPrompt && (
                      <div className="space-y-2 pt-1 border-t border-slate-700/50">
                        <p className="text-xs text-slate-300 italic">{hw.speakingPrompt.textPrompt}</p>
                        {hw.speakingPrompt.imageUrl && (
                          <img 
                            src={hw.speakingPrompt.imageUrl} 
                            alt="Prompt" 
                            className="rounded-lg max-h-40 object-contain border border-slate-700 bg-black/40"
                          />
                        )}
                      </div>
                    )}

                    {/* Специфичные данные для Written (Эссе/Письмо) */}
                    {hw.type === 'written' && hw.writtenPrompt && (
                      <div className="space-y-1 pt-1 border-t border-slate-700/50">
                        <p className="text-xs text-amber-200/90 font-medium">{hw.writtenPrompt.taskTitle}</p>
                        <p className="text-xs text-slate-300">{hw.writtenPrompt.instructions}</p>
                      </div>
                    )}
                  </div>
                ) : null;
              })()}

              {/* WORK CONTENT DISPLAY */}
              {/* Speaking Audio Review */}
              {selectedSubmission.type === 'speaking' && (
                <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-2">
                  <h4 className="text-xs font-bold text-sky-400 flex items-center space-x-1.5">
                    <Mic className="w-4 h-4" />
                    <span>Запись ответа ученика</span>
                  </h4>

                  {Boolean(selectedSubmission.speakingAudioUrl && selectedSubmission.speakingAudioUrl.trim()) ? (
                    <div className="flex items-center space-x-3 bg-black/30 p-2.5 rounded-xl">
                      <audio
                        ref={studentAudioRef}
                        src={selectedSubmission.speakingAudioUrl}
                        controls
                        className="w-full h-8 accent-sky-500"
                      />

                      <div className="flex items-center space-x-1">
                        {[1.0, 1.25, 1.5].map((sp) => (
                          <button
                            key={sp}
                            onClick={() => {
                              setPlaybackSpeed(sp);
                              if (studentAudioRef.current) {
                                studentAudioRef.current.playbackRate = sp;
                              }
                            }}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              playbackSpeed === sp ? 'bg-sky-500 text-white' : 'text-slate-400'
                            }`}
                          >
                            {sp}x
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Аудиозапись не прикреплена</p>
                  )}
                </div>
              )}

              {/* Written Essay Review */}
              {selectedSubmission.type === 'written' && (
                <div className="space-y-3">
                  {selectedSubmission.essayText && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-300">Текст работы ученика:</h4>
                      <div className="p-3.5 rounded-xl bg-black/20 text-xs leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line border border-slate-700/50">
                        {selectedSubmission.essayText}
                      </div>
                    </div>
                  )}

                  {/* Photos submitted by student */}
                  {selectedSubmission.writtenImageUrls && selectedSubmission.writtenImageUrls.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-sky-400">
                        📷 Прикрепленные фото работы ({selectedSubmission.writtenImageUrls.length}):
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {selectedSubmission.writtenImageUrls.map((imgUrl, imgIdx) => (
                          <a
                            key={imgIdx}
                            href={imgUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-xl overflow-hidden border border-slate-700 aspect-square group relative"
                          >
                            <img
                              src={imgUrl}
                              alt={`Страница ${imgIdx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-[9px] text-white rounded">
                              Стр. {imgIdx + 1}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Multi-Task Answers Review */}
              {selectedSubmission.taskAnswers && Object.keys(selectedSubmission.taskAnswers).length > 0 && (
                <div className="space-y-2.5 p-3 rounded-xl bg-purple-950/30 border border-purple-500/30">
                  <h4 className="text-xs font-bold text-purple-300">
                    📋 Ответы по индивидуальным заданиям:
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(selectedSubmission.taskAnswers).map(([taskId, ans]: [string, any], aIdx) => (
                      <div key={taskId} className="p-2.5 rounded-lg bg-black/30 border border-slate-700 text-xs space-y-1">
                        <span className="font-bold text-purple-400">Задание #{aIdx + 1}:</span>
                        {ans.textAnswer && <p className="text-slate-200">{ans.textAnswer}</p>}
                        {Boolean(ans.voiceAudioUrl && ans.voiceAudioUrl.trim()) && (
                          <audio controls src={ans.voiceAudioUrl} className="w-full h-7 mt-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CRITERIA SCORING FORM (ФИПИ) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 flex items-center space-x-1">
                    <Sliders className="w-4 h-4" />
                    <span>Выставление баллов по критериям ФИПИ</span>
                  </h4>
                  <span className="text-sm font-extrabold text-amber-400 bg-amber-400/20 px-2.5 py-0.5 rounded-full">
                    Итого: {totalCalculatedScore} баллов
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-black/20 space-y-1">
                    <span className="text-[11px] text-slate-400">К1 (Решение КЗ):</span>
                    <input
                      type="number"
                      min={0}
                      max={4}
                      value={criteria.k1_taskSolution}
                      onChange={(e) =>
                        setCriteria((prev) => ({
                          ...prev,
                          k1_taskSolution: Number(e.target.value),
                        }))
                      }
                      className="w-full p-1.5 rounded bg-slate-800 text-white font-bold"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/20 space-y-1">
                    <span className="text-[11px] text-slate-400">К2 (Организация):</span>
                    <input
                      type="number"
                      min={0}
                      max={3}
                      value={criteria.k2_organization}
                      onChange={(e) =>
                        setCriteria((prev) => ({
                          ...prev,
                          k2_organization: Number(e.target.value),
                        }))
                      }
                      className="w-full p-1.5 rounded bg-slate-800 text-white font-bold"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/20 space-y-1">
                    <span className="text-[11px] text-slate-400">К3 (Лексика):</span>
                    <input
                      type="number"
                      min={0}
                      max={3}
                      value={criteria.k3_vocabulary}
                      onChange={(e) =>
                        setCriteria((prev) => ({ ...prev, k3_vocabulary: Number(e.target.value) }))
                      }
                      className="w-full p-1.5 rounded bg-slate-800 text-white font-bold"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/20 space-y-1">
                    <span className="text-[11px] text-slate-400">К4 (Грамматика):</span>
                    <input
                      type="number"
                      min={0}
                      max={3}
                      value={criteria.k4_grammar}
                      onChange={(e) =>
                        setCriteria((prev) => ({ ...prev, k4_grammar: Number(e.target.value) }))
                      }
                      className="w-full p-1.5 rounded bg-slate-800 text-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* ANGELINA VOICE & TEXT RESPONSE FORM */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    Персональный разбор Ангелины:
                  </label>

                  <button
                    onClick={handleGenerateAiAssistantDraft}
                    disabled={aiDraftLoading}
                    className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center space-x-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>
                      {aiDraftLoading ? 'Генерация...' : '🪄 ИИ-черновик комментария'}
                    </span>
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Саша, отличная работа! Отдельно похвалю за логику..."
                  className={`w-full p-3 rounded-xl text-xs border ${
                    isDarkMode
                      ? 'bg-[#17212b] border-slate-700 text-white placeholder-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />

                {/* Voice Feedback Recorder & Preview Player */}
                <div className="p-3 rounded-xl bg-black/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs">
                      <Mic className="w-4 h-4 text-rose-400" />
                      <span>
                        {teacherVoiceUrl
                          ? '✅ Голосовой разбор записан'
                          : isRecordingVoice
                          ? `🔴 Идет запись голоса... (${recordingVoiceSeconds}с)`
                          : 'Записать голосовой ответ с микрофона'}
                      </span>
                    </div>

                    <button
                      onClick={toggleTeacherVoiceRecording}
                      className={`p-2 rounded-xl text-xs font-bold transition-all ${
                        isRecordingVoice
                          ? 'bg-rose-500 text-white animate-pulse'
                          : teacherVoiceUrl
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-sky-500 text-white hover:bg-sky-600'
                      }`}
                    >
                      {isRecordingVoice ? 'Стоп' : teacherVoiceUrl ? 'Перезаписать' : 'Микрофон'}
                    </button>
                  </div>

                  {/* Audio Playback for Teacher to listen back */}
                  {Boolean(teacherVoiceUrl && teacherVoiceUrl.trim()) && (
                    <div className="pt-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <audio controls src={teacherVoiceUrl} className="w-full h-8 rounded-lg flex-1" />
                        <button
                          type="button"
                          onClick={() => setTeacherVoiceUrl(null)}
                          className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors shrink-0"
                          title="Удалить голосовой ответ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">Прослушайте или удалите свою запись перед отправкой ученику</p>
                    </div>
                  )}
                </div>
              </div>

              {/* SAVE & SEND BUTTON */}
              <div className="pt-3">
                <button
                  onClick={handleSaveGrading}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Отправить результат ученику в Telegram</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: ARCHIVE OF GRADED HOMEWORKS ("БАЗА ПРОВЕРЕННЫХ ДЗ") ================= */}
      {adminTab === 'archive_graded' && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className={`p-4 rounded-2xl border bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-slate-900/40 ${
            isDarkMode ? 'border-emerald-500/30 text-white' : 'border-emerald-200 text-slate-900'
          }`}>
            <div className="flex flex-col gap-2.5">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg flex items-center space-x-2 flex-wrap gap-2">
                  <span className="text-emerald-400">🗄️ База проверенных ДЗ</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                    Всего: {activeSubmissions.filter((s) => s.status === 'graded').length}
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Архив сданных работ учеников с выставленными оценками, баллами ФИПИ и разборами
                </p>
              </div>

              {/* Export Button moved below title to prevent edge overflow */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={handleExportGradedArchive}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2 border border-emerald-400/40"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Выгрузить отчет (TXT)</span>
                </button>
              </div>
            </div>

            {/* Filter controls row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-slate-700/50">
              {/* Filter by Student */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 mb-1 block">👤 Ученик:</label>
                <select
                  value={archiveSelectedStudent}
                  onChange={(e) => setArchiveSelectedStudent(e.target.value)}
                  className={`w-full p-2 rounded-xl text-xs font-bold border ${
                    isDarkMode ? 'bg-[#17212b] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="all">👥 Все ученики ({archiveStudentOptions.length})</option>
                  {archiveStudentOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Month */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 mb-1 block">📅 Месяц:</label>
                <select
                  value={archiveSelectedMonth}
                  onChange={(e) => setArchiveSelectedMonth(e.target.value)}
                  className={`w-full p-2 rounded-xl text-xs font-bold border ${
                    isDarkMode ? 'bg-[#17212b] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="all">🗓️ Все месяцы</option>
                  {[
                    'Январь 2026',
                    'Февраль 2026',
                    'Март 2026',
                    'Апрель 2026',
                    'Май 2026',
                    'Июнь 2026',
                    'Июль 2026',
                    'Август 2026',
                    'Сентябрь 2026',
                    'Октябрь 2026',
                    'Ноябрь 2026',
                    'Декабрь 2026',
                  ].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Block */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 mb-1 block">📚 Раздел:</label>
                <select
                  value={archiveSelectedBlock}
                  onChange={(e) => setArchiveSelectedBlock(e.target.value)}
                  className={`w-full p-2 rounded-xl text-xs font-bold border ${
                    isDarkMode ? 'bg-[#17212b] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="all">🎯 Все разделы</option>
                  <option value="listening">🎧 Аудирование (Listening)</option>
                  <option value="reading">📖 Чтение (Reading)</option>
                  <option value="grammar_vocabulary">📚 Грамматика и лексика</option>
                  <option value="writing">✍️ Письмо (Writing)</option>
                  <option value="speaking">🗣 Говорение (Speaking)</option>
                </select>
              </div>

              {/* Search input */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 mb-1 block">🔍 Поиск:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={archiveSearchQuery}
                    onChange={(e) => setArchiveSearchQuery(e.target.value)}
                    placeholder="Имя или тема..."
                    className={`w-full p-2 pl-7 rounded-xl text-xs border ${
                      isDarkMode ? 'bg-[#17212b] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* List of Graded Submissions */}
          {gradedArchiveSubmissions.length === 0 ? (
            <div className={`p-8 text-center rounded-2xl border ${
              isDarkMode ? 'bg-[#1e2c3a] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
            }`}>
              <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-slate-300">Нет проверенных ДЗ по выбранным фильтрам</h4>
              <p className="text-xs text-slate-400 mt-1">
                Попробуйте выбрать другого ученика, сбросить поиск или проверить работы во вкладке «Проверка».
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {gradedArchiveSubmissions.map((sub) => {
                const hw = homeworks.find((h) => h.id === sub.homeworkId);
                return (
                  <div
                    key={sub.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isDarkMode ? 'bg-[#1e2c3a] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    {/* Header line: Student + HW Title + Score Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-700/40">
                      <div className="flex items-start space-x-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                          {sub.studentName ? sub.studentName.charAt(0) : 'У'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <h4 className="font-extrabold text-sm text-white">{sub.studentName}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {hw?.month || getCurrentMonthLabel()}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              {hw?.block === 'speaking'
                                ? '🗣 Говорение'
                                : hw?.block === 'writing'
                                ? '✍️ Письмо'
                                : hw?.block === 'grammar_vocabulary'
                                ? '📚 Грам. и лексика'
                                : hw?.block === 'listening'
                                ? '🎧 Аудирование'
                                : '📖 Чтение'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 font-medium mt-0.5">
                            «{hw?.title || 'Домашнее задание'}»
                          </p>
                        </div>
                      </div>

                      {/* Final Score Badge & Re-check action stacked vertically */}
                      <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/30">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Оценка:</span>
                          <span className="text-sm font-black text-emerald-400">
                            {sub.totalScore ?? 0} / {sub.maxScore ?? 14} баллов
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAdminTab('review_hw');
                            setReviewSubTab('graded');
                            handleSelectSubmission(sub);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] border border-slate-700 transition-colors flex items-center space-x-1 shrink-0"
                          title="Редактировать оценку"
                        >
                          <Edit2 className="w-3 h-3 text-purple-400" />
                          <span>Перепроверить</span>
                        </button>
                      </div>
                    </div>

                    {/* Criteria breakdown if criteriaScores exist */}
                    {sub.criteriaScores && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 p-2.5 rounded-xl bg-black/20 border border-slate-800 text-center text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">К1 Решение задачи</span>
                          <span className="font-bold text-amber-300">{sub.criteriaScores.k1_taskSolution} / 3</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">К2 Организация</span>
                          <span className="font-bold text-amber-300">{sub.criteriaScores.k2_organization} / 3</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">К3 Лексика</span>
                          <span className="font-bold text-amber-300">{sub.criteriaScores.k3_vocabulary} / 3</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">К4 Грамматика</span>
                          <span className="font-bold text-amber-300">{sub.criteriaScores.k4_grammar} / 3</span>
                        </div>
                      </div>
                    )}

                    {/* Teacher Feedback Text & Audio */}
                    {sub.teacherFeedbackText && (
                      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-slate-200 mt-2 space-y-1">
                        <span className="font-bold text-purple-300 block">💬 Разбор Ангелины:</span>
                        <p className="whitespace-pre-wrap leading-relaxed">{sub.teacherFeedbackText}</p>
                      </div>
                    )}

                    {sub.teacherVoiceAudioUrl && (
                      <div className="p-2.5 rounded-xl bg-black/30 border border-slate-800 mt-2 flex items-center space-x-2">
                        <Mic className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-300 shrink-0">Голосовой разбор:</span>
                        <audio src={sub.teacherVoiceAudioUrl} controls className="w-full h-7 rounded-lg accent-purple-500" />
                      </div>
                    )}

                    {/* Footer Timestamps & Delete HW button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800 gap-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span>📤 Сдано учеником: <strong className="text-slate-300">{sub.submittedAt && sub.submittedAt !== 'Ранее' ? sub.submittedAt : getFormattedDateTime()}</strong></span>
                        <span>✅ Проверено: <strong className="text-emerald-300">{sub.teacherCheckedAt && sub.teacherCheckedAt !== 'Да' && sub.teacherCheckedAt !== 'Только что' ? sub.teacherCheckedAt : getFormattedDateTime()}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTriggerDeleteSubmission(sub.id, sub.studentName)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-[11px] border border-rose-500/30 transition-colors flex items-center space-x-1 shrink-0 self-start sm:self-auto"
                        title="Удалить эту работу из базы"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Удалить ДЗ</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {adminTab === 'create_hw' && (
        <div className={`p-4 rounded-2xl border space-y-4 ${
          isDarkMode ? 'bg-[#1e2c3a] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {/* Edit mode banner */}
          {editingHomeworkId && (
            <div className="p-3.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 flex items-center justify-between shadow-lg animate-in fade-in duration-300">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
                <span className="font-bold text-xs sm:text-sm">
                  ✏️ Редактирование ДЗ: «{hwTitle || 'Домашнее задание'}»
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelEditHomework}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-600 transition-all flex items-center space-x-1"
              >
                <span>❌ Отмена</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <PlusCircle className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-sm">
                {editingHomeworkId ? '✏️ Редактирование домашнего задания' : 'Опубликовать новое домашнее задание'}
              </h3>
            </div>
            <button
              type="button"
              onClick={handleAddTask}
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 font-bold text-xs flex items-center space-x-1 transition-all border border-purple-500/30"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Добавить задание</span>
            </button>
          </div>

          <form onSubmit={handlePublishHomework} className="space-y-4 text-xs">
            {/* HW Title & Deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="font-semibold text-slate-400">Название домашнего задания:</label>
                <input
                  type="text"
                  required
                  value={hwTitle}
                  onChange={(e) => setHwTitle(e.target.value)}
                  placeholder="Домашнее задание ЕГЭ #1"
                  className={`w-full p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-[#17212b] border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-400">Дедлайн сдачи:</label>
                <input
                  type="text"
                  value={hwDeadline}
                  onChange={(e) => setHwDeadline(e.target.value)}
                  placeholder="Завтра, 18:00"
                  className={`w-full p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-[#17212b] border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                />
              </div>
            </div>

            {/* List of Sub-tasks */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-300">
                  Задания в домашней работе ({hwTasks.length}):
                </h4>
              </div>

              {hwTasks.map((task, idx) => {
                const options = getTaskNumberOptions(task.block);
                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-2xl border space-y-3 relative ${
                      isDarkMode ? 'bg-[#17212b] border-slate-700/80' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                      <span className="font-extrabold text-xs text-purple-400">
                        Задание #{idx + 1}
                      </span>
                      {hwTasks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTask(idx)}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                        >
                          Удалить
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Task Type selector */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">Тип задания:</label>
                        <select
                          value={task.taskType || 'test'}
                          onChange={(e) => {
                            const val = e.target.value as 'test' | 'written' | 'speaking';
                            setHwTasks((prev) =>
                              prev.map((t, i) =>
                                i === idx
                                  ? {
                                      ...t,
                                      taskType: val,
                                      options: t.options || ['Вариант A', 'Вариант B', 'Вариант C', 'Вариант D'],
                                      correctOptionIndex: t.correctOptionIndex ?? 0,
                                    }
                                  : t
                              )
                            );
                          }}
                          className={`w-full p-2 rounded-xl text-xs font-bold border ${
                            isDarkMode ? 'bg-[#1e2c3a] border-slate-700 text-amber-300' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        >
                          <option value="test">📝 Тест (С выбором ответа)</option>
                          <option value="written">✍️ Письменно / Файл</option>
                          <option value="speaking">🗣 Говорение (Аудио)</option>
                        </select>
                      </div>

                      {/* Section select */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400 block">Раздел:</label>
                        <select
                          value={task.block}
                          onChange={(e) => {
                            const newBlock = e.target.value as BlockCategory;
                            const newOpts = getTaskNumberOptions(newBlock);
                            setHwTasks((prev) =>
                              prev.map((t, i) =>
                                i === idx ? { ...t, block: newBlock, taskNumber: newOpts[0] } : t
                              )
                            );
                          }}
                          className={`w-full p-2 rounded-xl text-xs border ${
                            isDarkMode ? 'bg-[#1e2c3a] border-slate-700 text-white' : 'bg-white border-slate-300'
                          }`}
                        >
                          <option value="listening">🎧 Аудирование (Listening)</option>
                          <option value="reading">📖 Чтение (Reading)</option>
                          <option value="grammar_vocabulary">📚 Грамматика и лексика</option>
                          <option value="writing">✍️ Письмо (Writing)</option>
                          <option value="speaking">🗣 Говорение (Speaking)</option>
                        </select>
                      </div>

                      {/* Task Number select */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400 block">Номер задания:</label>
                        <select
                          value={task.taskNumber}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHwTasks((prev) =>
                              prev.map((t, i) => (i === idx ? { ...t, taskNumber: val } : t))
                            );
                          }}
                          className={`w-full p-2 rounded-xl text-xs border ${
                            isDarkMode ? 'bg-[#1e2c3a] border-slate-700 text-white' : 'bg-white border-slate-300'
                          }`}
                        >
                          {options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* TEST TYPE OPTIONS EDITOR */}
                    {(task.taskType === 'test' || !task.taskType) && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-300">Варианты ответа (отметьте правильный):</span>
                          <button
                            type="button"
                            onClick={() => {
                              setHwTasks((prev) =>
                                prev.map((t, i) => {
                                  if (i === idx) {
                                    const opts = t.options || ['Вариант A', 'Вариант B'];
                                    return { ...t, options: [...opts, `Вариант ${String.fromCharCode(65 + opts.length)}`] };
                                  }
                                  return t;
                                })
                              );
                            }}
                            className="text-[11px] font-bold text-amber-400 hover:underline"
                          >
                            + Вариант
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {(task.options || ['Вариант A', 'Вариант B', 'Вариант C', 'Вариант D']).map((opt, optIdx) => {
                            const isCorrect = (task.correctOptionIndex ?? 0) === optIdx;
                            return (
                              <div key={optIdx} className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setHwTasks((prev) =>
                                      prev.map((t, i) => (i === idx ? { ...t, correctOptionIndex: optIdx } : t))
                                    );
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all shrink-0 ${
                                    isCorrect
                                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                  }`}
                                >
                                  {isCorrect ? '✅ Правильный' : 'Отметить'}
                                </button>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setHwTasks((prev) =>
                                      prev.map((t, i) => {
                                        if (i === idx) {
                                          const newOpts = [...(t.options || ['Вариант A', 'Вариант B', 'Вариант C', 'Вариант D'])];
                                          newOpts[optIdx] = val;
                                          return { ...t, options: newOpts };
                                        }
                                        return t;
                                      })
                                    );
                                  }}
                                  placeholder={`Вариант ${optIdx + 1}`}
                                  className={`flex-1 p-2 rounded-xl text-xs border ${
                                    isDarkMode ? 'bg-[#1e2c3a] border-slate-700 text-white' : 'bg-white border-slate-300'
                                  }`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Instruction input */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400 block">
                        Инструкция к заданию:
                      </label>
                      <input
                        type="text"
                        value={task.instruction}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHwTasks((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, instruction: val } : t))
                          );
                        }}
                        placeholder="Внимательно прочитайте задание..."
                        className={`w-full p-2 rounded-xl text-xs border ${
                          isDarkMode ? 'bg-[#1e2c3a] border-slate-700 text-white' : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>

                    {/* Task Prompt text area */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400 block">
                        Задание / Условие (или текст с пропусками `___`):
                      </label>
                      <textarea
                        rows={3}
                        value={task.taskPrompt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHwTasks((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, taskPrompt: val } : t))
                          );
                        }}
                        placeholder="Текст задания, вопрос или предложение с пропусками..."
                        className={`w-full p-2 rounded-xl text-xs border ${
                          isDarkMode ? 'bg-[#1e2c3a] border-slate-700 text-white' : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>

                    {/* 2 ORGANIZED ATTACHMENT ROWS */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-700/50">
                      {/* ROW 1: PHOTO ATTACHMENT */}
                      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-300 flex items-center space-x-1.5">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>🖼 Строка 1: Иллюстрация / Фотография к заданию</span>
                          </span>
                          {task.taskImageUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setHwTasks((prev) =>
                                  prev.map((t, i) => (i === idx ? { ...t, taskImageUrl: undefined } : t))
                                );
                              }}
                              className="text-rose-400 hover:text-rose-300 text-[10px] font-bold"
                            >
                              Удалить фото
                            </button>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={task.taskImageUrl || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHwTasks((prev) =>
                                prev.map((t, i) => (i === idx ? { ...t, taskImageUrl: val || undefined } : t))
                              );
                            }}
                            placeholder="Ссылка на фото или загрузите файл..."
                            className={`flex-1 p-2 rounded-xl text-xs border ${
                              isDarkMode ? 'bg-[#1e2c3a] border-slate-700 text-white' : 'bg-white border-slate-300'
                            }`}
                          />
                          <label className="cursor-pointer px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-sm shrink-0 flex items-center space-x-1">
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>Прикрепить</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const url = URL.createObjectURL(file);
                                  setHwTasks((prev) =>
                                    prev.map((t, i) => (i === idx ? { ...t, taskImageUrl: url } : t))
                                  );
                                }
                              }}
                            />
                          </label>
                        </div>
                        {task.taskImageUrl && (
                          <img
                            src={task.taskImageUrl}
                            alt="Превью"
                            className="h-24 max-w-full rounded-xl object-contain border border-slate-700 bg-black/40 mt-1"
                          />
                        )}
                      </div>

                      {/* ROW 2: AUDIO / VOICE ATTACHMENT + RECORD BUTTON */}
                      <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-sky-300 flex items-center space-x-1.5">
                            <Mic className="w-3.5 h-3.5" />
                            <span>🎙 Строка 2: Голосовое / Аудио от учителя</span>
                          </span>
                          {task.taskAudioUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setHwTasks((prev) =>
                                  prev.map((t, i) => (i === idx ? { ...t, taskAudioUrl: undefined } : t))
                                );
                              }}
                              className="text-rose-400 hover:text-rose-300 text-[10px] font-bold"
                            >
                              Удалить аудио
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={task.taskAudioUrl || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHwTasks((prev) =>
                                prev.map((t, i) => (i === idx ? { ...t, taskAudioUrl: val || undefined } : t))
                              );
                            }}
                            placeholder="Ссылка на аудио файл..."
                            className={`flex-1 min-w-[160px] p-2 rounded-xl text-xs border ${
                              isDarkMode ? 'bg-[#1e2c3a] border-slate-700 text-white' : 'bg-white border-slate-300'
                            }`}
                          />
                          <label className="cursor-pointer px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-sm shrink-0 flex items-center space-x-1">
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>Файл</span>
                            <input
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const url = URL.createObjectURL(file);
                                  setHwTasks((prev) =>
                                    prev.map((t, i) => (i === idx ? { ...t, taskAudioUrl: url } : t))
                                  );
                                }
                              }}
                            />
                          </label>

                          {/* DIRECT VOICE RECORDING BUTTON */}
                          {recordingTaskIdx === idx ? (
                            <button
                              type="button"
                              onClick={stopTeacherRecording}
                              className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl animate-pulse flex items-center space-x-1.5 shadow-lg"
                            >
                              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                              <span>Стоп ({teacherRecordingSeconds}с)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startTeacherRecording(idx)}
                              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1 shadow-sm shrink-0"
                            >
                              <Mic className="w-3.5 h-3.5" />
                              <span>🎙 Записать голосовое</span>
                            </button>
                          )}
                        </div>
                        {Boolean(task.taskAudioUrl && task.taskAudioUrl.trim()) && (
                          <div className="pt-1">
                            <audio controls src={task.taskAudioUrl} className="w-full h-8" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Action Bar */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleAddTask}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-xs rounded-xl border border-purple-500/30 flex items-center justify-center space-x-2 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Добавить еще задание в этот ДЗ</span>
              </button>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xl shadow-purple-600/25 transition-all flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{editingHomeworkId ? 'Сохранить изменения в ДЗ' : 'Опубликовать ДЗ и оповестить учеников'}</span>
              </button>
            </div>
          </form>

          {/* LIST OF PUBLISHED HOMEWORKS WITH EDIT AND DELETE BUTTONS AND MONTH FILTER */}
          <div className="pt-4 border-t border-slate-700/50 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-bold text-xs text-purple-300 flex items-center space-x-2">
                <BookOpen className="w-4 h-4" />
                <span>Опубликованные задания ({activeHomeworks.filter(h => selectedPublishedMonth === 'all' || (h.month || getCurrentMonthLabel()) === selectedPublishedMonth).length}):</span>
              </h4>

              {/* Month Selector Buttons */}
              <div className="flex items-center space-x-1 overflow-x-auto max-w-full pb-1">
                {[
                  { id: 'all', label: 'Все' },
                  { id: 'Январь 2026', label: 'Янв' },
                  { id: 'Февраль 2026', label: 'Фев' },
                  { id: 'Март 2026', label: 'Мар' },
                  { id: 'Апрель 2026', label: 'Апр' },
                  { id: 'Май 2026', label: 'Май' },
                  { id: 'Июнь 2026', label: 'Июн' },
                  { id: 'Июль 2026', label: 'Июл' },
                  { id: 'Август 2026', label: 'Авг' },
                  { id: 'Сентябрь 2026', label: 'Сен' },
                  { id: 'Октябрь 2026', label: 'Окт' },
                  { id: 'Ноябрь 2026', label: 'Ноя' },
                  { id: 'Декабрь 2026', label: 'Дек' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedPublishedMonth(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                      selectedPublishedMonth === m.id
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeHomeworks
                .filter((hw) => selectedPublishedMonth === 'all' || (hw.month || getCurrentMonthLabel()) === selectedPublishedMonth)
                .map((hw) => (
                <div
                  key={hw.id}
                  className={`p-3.5 rounded-2xl border space-y-2 flex flex-col justify-between ${
                    isDarkMode ? 'bg-[#17212b] border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {hw.block === 'speaking'
                          ? '🗣 Говорение'
                          : hw.block === 'writing'
                          ? '✍️ Письмо'
                          : hw.block === 'grammar_vocabulary'
                          ? '📚 Грам. и лексика'
                          : hw.block === 'listening'
                          ? '🎧 Аудирование'
                          : '📖 Чтение'}
                      </span>
                      <span className="text-[10px] text-slate-400">{hw.month || getCurrentMonthLabel()} | {hw.deadline}</span>
                    </div>
                    <h5 className="font-bold text-xs text-white leading-tight">{hw.title}</h5>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{hw.description}</p>
                    <p className="text-[10px] text-sky-400 font-mono">
                      {hw.tasks?.length || 1} заданий | Макс. {hw.maxPoints} баллов
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-700/50">
                    <button
                      type="button"
                      onClick={() => handleStartEditHomework(hw)}
                      className="py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-bold text-xs rounded-xl border border-purple-500/40 transition-all flex items-center justify-center space-x-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>✏️ Изменить</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerDeleteHomework(hw.id, hw.title)}
                      className="py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold text-xs rounded-xl border border-rose-500/40 transition-all flex items-center justify-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>🗑️ Удалить</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: STUDENTS & ANALYTICS ================= */}
      {adminTab === 'analytics' && (
        <div className="space-y-4">
          {/* Toast Notification when student added */}
          {addStudentToast && (
            <div className="p-4 rounded-2xl bg-emerald-500 text-white shadow-xl flex items-center justify-between animate-in slide-in-from-top duration-300">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 shrink-0 text-white" />
                <div>
                  <h4 className="font-bold text-sm">Ученик успешно добавлен!</h4>
                  <p className="text-xs opacity-90">{addStudentToast}</p>
                </div>
              </div>
            </div>
          )}

          {/* Add Student Card */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDarkMode ? 'bg-[#1e2c3a] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center space-x-2 border-b border-slate-700/50 pb-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Создать аккаунт ученика (Логин)</h3>
                <p className="text-[11px] text-slate-400">Задайте логин для ученика. Имя ученик выберет сам при первом входе.</p>
              </div>
            </div>

            <form onSubmit={handleCreateStudentSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 block">
                    Логин ученика (для входа):
                  </label>
                  <input
                    type="text"
                    required
                    value={addStudentLogin}
                    onChange={(e) => setAddStudentLogin(e.target.value)}
                    placeholder="Логин"
                    className={`w-full p-2.5 rounded-xl text-xs border ${
                      isDarkMode ? 'bg-[#17212b] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 block">
                    Имя ученика (необязательно):
                  </label>
                  <input
                    type="text"
                    value={addStudentName}
                    onChange={(e) => setAddStudentName(e.target.value)}
                    placeholder="Имя и Фамилия"
                    className={`w-full p-2.5 rounded-xl text-xs border ${
                      isDarkMode ? 'bg-[#17212b] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
              >
                <UserPlus className="w-4 h-4" />
                <span>Создать аккаунт ученика</span>
              </button>
            </form>
          </div>

          {/* Group Stats */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDarkMode ? 'bg-[#1e2c3a] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="font-bold text-sm flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-sky-400" />
              <span>Статистика учеников платформы</span>
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-xl bg-black/20">
                <span className="text-lg font-extrabold text-sky-400">{activeRegisteredStudents.length}</span>
                <p className="text-[10px] text-slate-400">Всего учеников</p>
              </div>
              <div className="p-3 rounded-xl bg-black/20">
                <span className="text-lg font-extrabold text-emerald-400">
                  {averageScorePercent !== null ? `${averageScorePercent}%` : '—'}
                </span>
                <p className="text-[10px] text-slate-400">Средний балл учеников</p>
              </div>
              <div className="p-3 rounded-xl bg-black/20">
                <span className="text-lg font-extrabold text-amber-400">{averageStreakDays} дн</span>
                <p className="text-[10px] text-slate-400">Средний стрик</p>
              </div>
            </div>
          </div>

          {/* Students List */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs text-slate-400 uppercase">
              Зарегистрированные ученики ({activeRegisteredStudents.length}):
            </h4>
            {activeRegisteredStudents.length === 0 ? (
              <p className="text-xs text-slate-400 p-3 italic">
                Ученики ещё не добавлены. Заполните форму выше, чтобы добавить ученика.
              </p>
            ) : (
              activeRegisteredStudents.map((st) => {
                const stSubmissions = activeSubmissions.filter(
                  (s) => (s.studentName === st.name || s.studentName === st.login) && s.status === 'graded'
                );
                const totalStudentPoints = stSubmissions.reduce((acc, s) => acc + (s.score || 0), 0);
                const maxStudentPoints = stSubmissions.reduce((acc, s) => acc + (s.maxScore || 100), 0);
                const stAveragePercent =
                  maxStudentPoints > 0 ? Math.round((totalStudentPoints / maxStudentPoints) * 100) : null;

                return (
                  <div
                    key={st.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                      isDarkMode ? 'bg-[#17212b] border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <h5 className="font-bold text-sm">{st.name || 'Имя не выбрано'}</h5>
                        <span className="text-[10px] text-sky-400 font-mono bg-sky-500/10 px-1.5 py-0.5 rounded">
                          логин: {st.login || st.telegramHandle}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                        <span>Добавлен: {st.addedAt}</span>
                        <span>•</span>
                        <span className="font-bold text-emerald-400">
                          Балл ДЗ: {stAveragePercent !== null ? `${stAveragePercent}% (${stSubmissions.length} пров.)` : '—'}
                        </span>
                      </div>
                    </div>

                  <div className="flex items-center space-x-2">
                    {st.isFirstLogin || !st.password ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold text-[10px]">
                        <KeyRound className="w-3 h-3 text-amber-400" />
                        <span>Ожидает 1-го входа</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Пароль установлен</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleTriggerDeleteStudent(st.id, st.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-1"
                      title="Удалить ученика (с возможностью отмены)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 5: ADMIN PIN & SECURITY SETTINGS ================= */}
      {adminTab === 'settings' && (
        <div className="space-y-4">
          {pinChangeToast && (
            <div className="p-4 rounded-2xl bg-emerald-500 text-white shadow-xl flex items-center justify-between animate-in slide-in-from-top duration-300">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 shrink-0 text-white" />
                <div>
                  <h4 className="font-bold text-sm">Новый PIN-код успешно сохранен!</h4>
                  <p className="text-xs opacity-90">Используйте ваш новый PIN («{pinChangeToast}») при следующем входе в админ-панель.</p>
                </div>
              </div>
            </div>
          )}

          <div className={`p-5 rounded-2xl border space-y-4 ${
            isDarkMode ? 'bg-[#1e2c3a] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center space-x-3 border-b border-slate-700/50 pb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Безопасность и пароль админа</h3>
                <p className="text-xs text-slate-400">Настройка PIN-кода для входа преподавателя Ангелины</p>
              </div>
            </div>

            <form onSubmit={handleSaveNewPin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Новый PIN-код (или пароль) для админки:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="Например: 2026, angelina или 5555"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-mono tracking-widest border ${
                      isDarkMode
                        ? 'bg-[#17212b] border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-400 pt-0.5">
                  Вы можете ввести любые цифры или буквы. Новый PIN-код мгновенно сохранится в браузере.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Сохранить новый PIN-код</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border transition-all ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base">Подтверждение удаления</h3>
            </div>
            
            <p className="text-sm opacity-80 mb-6 leading-relaxed">
              {deleteConfirm.title}
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className={`px-4 py-2.5 rounded-xl font-medium text-xs transition-colors ${
                  isDarkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={deleteConfirm.onConfirm}
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-all active:scale-95"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
