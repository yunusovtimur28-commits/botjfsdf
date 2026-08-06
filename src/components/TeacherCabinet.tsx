import React, { useState, useRef } from 'react';
import { Submission, Homework, Webinar, FipiCriteriaScores, BlockCategory, MaterialFile, Timecode, RegisteredStudent } from '../types';
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
  isDarkMode: boolean;
}

type AdminTab = 'upload_video' | 'review_hw' | 'create_hw' | 'analytics' | 'settings';

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
  isDarkMode,
}) => {
  const [adminTab, setAdminTab] = useState<AdminTab>('upload_video');

  // SOFT DELETION & 5s UNDO TIMER STATE
  const [softDeletedStudentIds, setSoftDeletedStudentIds] = useState<string[]>([]);
  const [softDeletedWebinarIds, setSoftDeletedWebinarIds] = useState<string[]>([]);

  const [undoToast, setUndoToast] = useState<{
    id: string;
    type: 'student' | 'webinar';
    name: string;
    secondsLeft: number;
  } | null>(null);

  // Undo countdown & permanent execution effect
  React.useEffect(() => {
    if (!undoToast) return;
    if (undoToast.secondsLeft <= 0) {
      if (undoToast.type === 'student' && onDeleteStudent) {
        onDeleteStudent(undoToast.id);
      } else if (undoToast.type === 'webinar' && onDeleteWebinar) {
        onDeleteWebinar(undoToast.id);
      }
      setUndoToast(null);
      return;
    }

    const timer = setTimeout(() => {
      setUndoToast((prev) => (prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [undoToast, onDeleteStudent, onDeleteWebinar]);

  const handleTriggerDeleteStudent = (studentId: string, studentName: string) => {
    setSoftDeletedStudentIds((prev) => [...prev, studentId]);
    setUndoToast({
      id: studentId,
      type: 'student',
      name: studentName,
      secondsLeft: 5,
    });
  };

  const handleTriggerDeleteWebinar = (webinarId: string, webinarTitle: string) => {
    setSoftDeletedWebinarIds((prev) => [...prev, webinarId]);
    setUndoToast({
      id: webinarId,
      type: 'webinar',
      name: webinarTitle,
      secondsLeft: 5,
    });
  };

  const handleCancelUndo = () => {
    if (!undoToast) return;
    if (undoToast.type === 'student') {
      setSoftDeletedStudentIds((prev) => prev.filter((id) => id !== undoToast.id));
    } else if (undoToast.type === 'webinar') {
      setSoftDeletedWebinarIds((prev) => prev.filter((id) => id !== undoToast.id));
    }
    setUndoToast(null);
  };

  // Active items excluding soft-deleted
  const activeRegisteredStudents = React.useMemo(() => {
    return registeredStudents.filter((st) => !softDeletedStudentIds.includes(st.id));
  }, [registeredStudents, softDeletedStudentIds]);

  const activeWebinars = React.useMemo(() => {
    return webinars.filter((web) => !softDeletedWebinarIds.includes(web.id));
  }, [webinars, softDeletedWebinarIds]);

  const activeSubmissions = React.useMemo(() => {
    return submissions.filter((sub) => activeRegisteredStudents.some((st) => st.name === sub.studentName));
  }, [submissions, activeRegisteredStudents]);

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
          totalStreak += st.name === 'Александр Ковалев' ? 7 : 1;
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

  const startTeacherVoiceRecording = async () => {
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
      console.warn('Microphone permission fallback', err);
      setIsRecordingVoice(true);
      setRecordingVoiceSeconds(0);
      voiceTimerRef.current = setInterval(() => {
        setRecordingVoiceSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopTeacherVoiceRecording = () => {
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    setIsRecordingVoice(false);

    if (teacherMediaRecorderRef.current && teacherMediaRecorderRef.current.state !== 'inactive') {
      teacherMediaRecorderRef.current.stop();
    } else {
      setTeacherVoiceUrl('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3');
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

  // CREATE HOMEWORK FORM STATE
  const [hwTitle, setHwTitle] = useState('');
  const [hwBlock, setHwBlock] = useState<BlockCategory>('speaking');
  const [hwType, setHwType] = useState<'test' | 'speaking' | 'written'>('speaking');
  const [hwDeadline, setHwDeadline] = useState('Завтра, 18:00');
  const [hwDescription, setHwDescription] = useState('');
  const [hwSuccessToast, setHwSuccessToast] = useState<string | null>(null);

  // Multi-Task HW builder state
  const [hwTasks, setHwTasks] = useState<
    {
      id: string;
      block: BlockCategory;
      taskNumber: string;
      instruction: string;
      taskPrompt: string;
    }[]
  >([
    {
      id: 'task-1',
      block: 'speaking',
      taskNumber: 'Задание №1',
      instruction: 'Прочитайте текст вслух. У вас есть 1.5 минуты на подготовку и 1.5 минуты на чтение.',
      taskPrompt: 'Text prompt for speaking task...',
    },
  ]);

  const getTaskNumberOptions = (block: BlockCategory): string[] => {
    switch (block) {
      case 'speaking':
        return ['Задание №1', 'Задание №2', 'Задание №3', 'Задание №4'];
      case 'grammar':
        return [
          'Задание №19',
          'Задание №20',
          'Задание №21',
          'Задание №22',
          'Задание №23',
          'Задание №24',
        ];
      case 'writing':
        return ['Задание №37 (Электронное письмо)', 'Задание №38 (Эссе / проект)'];
      case 'vocabulary':
        return [
          'Задание №25 (Словообразование)',
          'Задание №26 (Словообразование)',
          'Задание №27 (Словообразование)',
          'Задание №28 (Словообразование)',
          'Задание №29 (Словообразование)',
          'Задание №30 (Выбор слов)',
          'Задание №31 (Выбор слов)',
          'Задание №32 (Выбор слов)',
          'Задание №33 (Выбор слов)',
          'Задание №34 (Выбор слов)',
          'Задание №35 (Выбор слов)',
          'Задание №36 (Выбор слов)',
        ];
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
    const finalThumbUrl =
      thumbnailUrl.trim() ||
      'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=800&q=80';

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
      date: 'Только что',
      timecodes: timecodes.map((tc) => ({
        timeInSeconds: tc.timeInSeconds,
        label: `${tc.timeStr} — ${tc.label}`,
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

  // POST HOMEWORK
  const handlePublishHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim()) return;

    const formattedTasks = hwTasks.map((t, idx) => ({
      id: t.id || `task-${idx + 1}`,
      block: t.block,
      taskNumber: t.taskNumber,
      instruction: t.instruction,
      taskPrompt: t.taskPrompt,
    }));

    const primaryBlock = formattedTasks[0]?.block || hwBlock;

    const newHw: Homework = {
      id: `hw-${Date.now()}`,
      title: hwTitle.trim(),
      block: primaryBlock,
      type: primaryBlock === 'speaking' ? 'speaking' : primaryBlock === 'writing' ? 'written' : 'test',
      deadline: hwDeadline,
      deadlineDate: new Date(Date.now() + 86400000).toISOString(),
      maxPoints: formattedTasks.length * 5,
      description: hwDescription.trim() || `Домашнее задание от Ангелины из ${formattedTasks.length} заданий.`,
      tasks: formattedTasks,
    };

    if (onAddHomework) {
      onAddHomework(newHw);
    }

    setHwSuccessToast(hwTitle.trim());
    setHwTitle('');
    setHwDescription('');
    setHwTasks([
      {
        id: 'task-1',
        block: 'speaking',
        taskNumber: 'Задание №1',
        instruction: 'Прочитайте текст вслух. У вас есть 1.5 минуты на подготовку и 1.5 минуты на чтение.',
        taskPrompt: 'Text prompt for speaking task...',
      },
    ]);

    setTimeout(() => {
      setHwSuccessToast(null);
    }, 5000);
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

    onGradeSubmission(selectedSubmission.id, {
      status: 'graded',
      criteriaScores: criteria,
      totalScore: finalScore,
      maxScore,
      teacherFeedbackText: feedbackText,
      teacherVoiceAudioUrl: teacherVoiceUrl || undefined,
      teacherCheckedAt: 'Только что',
    });

    alert('✅ Проверка сохранена и отправлена ученику в Telegram!');
  };

  const totalCalculatedScore =
    criteria.k1_taskSolution +
    criteria.k2_organization +
    criteria.k3_vocabulary +
    criteria.k4_grammar;

  return (
    <div className="space-y-4 pb-24">
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
              {submissions.filter((s) => s.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                  {submissions.filter((s) => s.status === 'pending').length}
                </span>
              )}
            </div>
            <span className="truncate">Проверка</span>
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
                    <option value="speaking">🗣 Speaking (Устная часть)</option>
                    <option value="grammar">📝 Грамматика</option>
                    <option value="writing">✍️ Письмо и Эссе</option>
                    <option value="vocabulary">📚 Лексика</option>
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
                <label className="font-semibold text-slate-400">Ссылка на видео (YouTube / MP4 / VK):</label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://commondatastorage.googleapis.com/.../video.mp4"
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
              <span>Загруженные видеоуроки ({webinars.length})</span>
            </h3>

            <div className="space-y-2">
              {webinars.map((web) => (
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
                      <h4 className="font-bold text-xs truncate leading-snug">{web.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {web.duration} • {web.timecodes.length} таймкодов • {web.materials.length} PDF
                      </p>
                    </div>
                  </div>

                  {onDeleteWebinar && (
                    <button
                      onClick={() => onDeleteWebinar(web.id)}
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
          {/* Submissions List Queue */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Очередь проверок ({submissions.filter((s) => s.status === 'pending').length} ожидают)
            </h3>

            <div className="flex space-x-2 overflow-x-auto no-scrollbar py-1">
              {submissions.map((sub) => {
                const hw = getHomeworkForSubmission(sub.homeworkId);
                const isSelected = selectedSubmission?.id === sub.id;

                return (
                  <button
                    key={sub.id}
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
                          sub.status === 'pending'
                            ? 'bg-amber-400 text-slate-900'
                            : 'bg-emerald-500 text-white'
                        }`}
                      >
                        {sub.status === 'pending' ? 'Ждет' : 'Проверено'}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs truncate leading-snug">
                      {hw?.title || 'Домашнее задание'}
                    </h4>
                    <p className="text-[10px] opacity-80 mt-1">{sub.submittedAt}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Submission Review Interface */}
          {selectedSubmission && (
            <div
              className={`p-4 rounded-2xl border space-y-4 shadow-md ${
                isDarkMode ? 'bg-[#1e2c3a] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              {/* Student Info Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="font-bold text-sm">{selectedSubmission.studentName}</h3>
                  <p className="text-xs text-sky-400">
                    Задание: {getHomeworkForSubmission(selectedSubmission.homeworkId)?.title}
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Сдано: {selectedSubmission.submittedAt}
                </span>
              </div>

              {/* WORK CONTENT DISPLAY */}
              {/* Speaking Audio Review */}
              {selectedSubmission.type === 'speaking' && (
                <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-2">
                  <h4 className="text-xs font-bold text-sky-400 flex items-center space-x-1.5">
                    <Mic className="w-4 h-4" />
                    <span>Запись ответа ученика</span>
                  </h4>

                  <div className="flex items-center space-x-3 bg-black/30 p-2.5 rounded-xl">
                    <audio
                      ref={studentAudioRef}
                      src={selectedSubmission.speakingAudioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'}
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
                    {Object.entries(selectedSubmission.taskAnswers).map(([taskId, ans], aIdx) => (
                      <div key={taskId} className="p-2.5 rounded-lg bg-black/30 border border-slate-700 text-xs space-y-1">
                        <span className="font-bold text-purple-400">Задание #{aIdx + 1}:</span>
                        {ans.textAnswer && <p className="text-slate-200">{ans.textAnswer}</p>}
                        {ans.voiceAudioUrl && <audio controls src={ans.voiceAudioUrl} className="w-full h-7 mt-1" />}
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
                  {teacherVoiceUrl && (
                    <div className="pt-1">
                      <audio controls src={teacherVoiceUrl} className="w-full h-8 rounded-lg" />
                      <p className="text-[10px] text-slate-400 mt-1">Прослушайте свою запись перед отправкой ученику</p>
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

      {/* ================= TAB 3: CREATE HOMEWORK ================= */}
      {adminTab === 'create_hw' && (
        <div className={`p-4 rounded-2xl border space-y-4 ${
          isDarkMode ? 'bg-[#1e2c3a] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <PlusCircle className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-sm">Опубликовать новое домашнее задание</h3>
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                          <option value="speaking">🗣 Говорение (Speaking)</option>
                          <option value="grammar">📝 Грамматика</option>
                          <option value="writing">✍️ Письмо и Эссе</option>
                          <option value="vocabulary">📚 Лексика</option>
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
                <span>Опубликовать ДЗ и оповестить учеников</span>
              </button>
            </div>
          </form>
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
              activeRegisteredStudents.map((st) => (
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
              ))
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

      {/* PERSISTENT 5-SECOND UNDO TOAST BANNER */}
      {undoToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-slate-900/95 text-white border border-amber-500/50 p-3.5 rounded-2xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom duration-300 backdrop-blur-md">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-extrabold text-xs">
              {undoToast.secondsLeft}s
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">
                {undoToast.type === 'student' ? 'Ученик удален' : 'Ролик удален'}: {undoToast.name}
              </p>
              <p className="text-[10px] text-slate-400">Нажмите «Отменить», чтобы вернуть</p>
            </div>
          </div>
          <button
            onClick={handleCancelUndo}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 shrink-0 ml-2"
          >
            Отменить ({undoToast.secondsLeft}с)
          </button>
        </div>
      )}
    </div>
  );
};
