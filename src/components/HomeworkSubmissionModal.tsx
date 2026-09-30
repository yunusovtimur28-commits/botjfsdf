import React, { useState, useRef, useEffect } from 'react';
import { Homework, Submission, HomeworkStatus } from '../types';
import {
  X,
  Mic,
  Square,
  Play,
  RotateCcw,
  Upload,
  UploadCloud,
  FileText,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Send,
  Clock,
  Award,
  Image as ImageIcon,
  Volume2,
  Trash2,
  Plus,
  Check,
  Paperclip,
} from 'lucide-react';

interface HomeworkSubmissionModalProps {
  homework: Homework;
  existingSubmission?: Submission;
  onClose: () => void;
  onSubmit: (submissionData: Partial<Submission>) => void;
  isDarkMode: boolean;
  currentUserName?: string;
}

// Умный счетчик слов по правилам ФИПИ (ЕГЭ)
const countEgeWords = (text: string): number => {
  if (!text.trim()) return 0;
  
  // 1. Убираем пробел между цифрой и знаком процента (например, "50 %" -> "50%")
  let cleanText = text.replace(/(\d+)\s+%/g, '$1%');
  
  // 2. Разбиваем текст по любым пробельным символам (пробелы, переносы строк)
  const tokens = cleanText.split(/\s+/);
  
  // 3. Оставляем только те токены, которые содержат буквы или цифры
  // Это отсеет тире "—", дефисы "-", точки ".", висящие отдельно
  const words = tokens.filter((token) => /[a-zA-Zа-яА-Я0-9]/.test(token));
  
  return words.length;
};

export const HomeworkSubmissionModal: React.FC<HomeworkSubmissionModalProps> = ({
  homework,
  existingSubmission,
  onClose,
  onSubmit,
  isDarkMode,
  currentUserName,
}) => {
  // Normalize user identifier to isolate drafts in localStorage per student
  const userPrefix = (currentUserName || 'guest').trim().toLowerCase().replace(/[^a-zа-я0-9_]/g, '_');
  const draftKey = `hw_draft_${homework.id}_${userPrefix}`;
  const tasksDraftKey = `hw_tasks_draft_${homework.id}_${userPrefix}`;
  const egeDraftKey = `hw_ege_draft_${homework.id}_${userPrefix}`;
  const egeCheckedKey = `hw_ege_checked_${homework.id}_${userPrefix}`;

  // Test state
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>(
    existingSubmission?.testAnswers || {}
  );
  const [testSubmitted, setTestSubmitted] = useState<boolean>(
    existingSubmission?.status === 'graded' && homework.type === 'test'
  );
  const [testScore, setTestScore] = useState<number | null>(
    existingSubmission?.testScore ?? null
  );

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Audio Recording state for Speaking
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(
    existingSubmission?.speakingAudioUrl || null
  );
  const [audioError, setAudioError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Audio playback state
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Teacher feedback voice player
  const [isPlayingTeacherVoice, setIsPlayingTeacherVoice] = useState(false);
  const teacherAudioRef = useRef<HTMLAudioElement | null>(null);

  // Essay / Written state
  const [essayText, setEssayText] = useState(
    () => existingSubmission?.essayText || localStorage.getItem(draftKey) || ''
  );
  const [uploadedFileName, setUploadedFileName] = useState(
    existingSubmission?.writtenFileName || ''
  );
  const [isUploading, setIsUploading] = useState(false);

  // Autosave essay draft
  useEffect(() => {
    if (existingSubmission?.status !== 'graded' && existingSubmission?.status !== 'pending') {
      localStorage.setItem(draftKey, essayText);
    }
  }, [essayText, draftKey, existingSubmission]);

  // AI Pre-check state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(
    existingSubmission?.aiPreviewFeedback || null
  );

  // Расчет лимитов слов с учетом правила ±10% ФИПИ
  const minW = homework.writtenPrompt?.minWords || 200; 
  const maxW = homework.writtenPrompt?.maxWords || 250; 

  const absoluteMin = Math.ceil(minW * 0.9); // Нижний порог (-10%)
  const absoluteMax = Math.floor(maxW * 1.1); // Верхний порог (+10%)
  
  const currentWordCount = countEgeWords(essayText);
  const isTooShort = currentWordCount > 0 && currentWordCount < absoluteMin;
  const isTooLong = currentWordCount > absoluteMax;

  // Multi-Task & Photo state
  const [taskAnswers, setTaskAnswers] = useState<
    Record<string, { textAnswer?: string; voiceAudioUrl?: string; selectedOptionIndex?: number; egeAnswers?: Record<string, string> }>
  >(() => {
    try {
      const saved = localStorage.getItem(tasksDraftKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error parsing tasks draft', e);
    }
    return existingSubmission?.taskAnswers || {};
  });

  // Gap-fill interactive task check status state
  const [checkedTasks, setCheckedTasks] = useState<Record<string, 'correct' | 'incorrect'>>(() => {
    const initialChecked: Record<string, 'correct' | 'incorrect'> = {};
    if (homework.tasks) {
      homework.tasks.forEach((t) => {
        if (t.taskType === 'gap_fill' && t.correctAnswer) {
          const existingAns = (existingSubmission?.taskAnswers?.[t.id]?.textAnswer || '');
          if (existingAns.trim()) {
            const isCorrect = existingAns.trim().toLowerCase() === t.correctAnswer.trim().toLowerCase();
            initialChecked[t.id] = isCorrect ? 'correct' : 'incorrect';
          }
        }
      });
    }
    return initialChecked;
  });

  // EGE Gap-fill (19-29) state
  // Clean up legacy un-scoped keys on mount to prevent cross-account draft leakage
  useEffect(() => {
    try {
      localStorage.removeItem(`hw_draft_${homework.id}`);
      localStorage.removeItem(`hw_tasks_draft_${homework.id}`);
      localStorage.removeItem(`hw_ege_draft_${homework.id}`);
      localStorage.removeItem(`hw_ege_checked_${homework.id}`);
    } catch {
      // ignore
    }
  }, [homework.id]);

  const [egeAnswers, setEgeAnswers] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(egeDraftKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading ege draft', e);
    }
    const fromSub: Record<string, string> = {};
    if (existingSubmission?.taskAnswers) {
      Object.values(existingSubmission.taskAnswers).forEach((ans: any) => {
        if (ans?.egeAnswers) {
          Object.assign(fromSub, ans.egeAnswers);
        }
      });
    }
    return fromSub;
  });

  const [egeChecked, setEgeChecked] = useState<Record<string, 'correct' | 'incorrect'>>(() => {
    try {
      const saved = localStorage.getItem(egeCheckedKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading egeChecked draft', e);
    }
    const initial: Record<string, 'correct' | 'incorrect'> = {};
    if (homework.tasks) {
      homework.tasks.forEach((t) => {
        if (t.taskType === 'ege_gap_fill' && t.egeItems) {
          t.egeItems.forEach((item) => {
            const existingAns = existingSubmission?.taskAnswers?.[t.id]?.egeAnswers?.[item.id] || '';
            if (existingAns.trim()) {
              const isCorrect = existingAns.trim().toLowerCase() === item.correctAnswer.trim().toLowerCase();
              initial[item.id] = isCorrect ? 'correct' : 'incorrect';
            }
          });
        }
      });
    }
    return initial;
  });

  // Autosave ege draft & checked state
  useEffect(() => {
    if (existingSubmission?.status !== 'graded' && existingSubmission?.status !== 'pending') {
      try {
        localStorage.setItem(egeDraftKey, JSON.stringify(egeAnswers));
      } catch (e) {
        console.error('Error saving ege draft', e);
      }
    }
  }, [egeAnswers, egeDraftKey, existingSubmission]);

  useEffect(() => {
    if (existingSubmission?.status !== 'graded' && existingSubmission?.status !== 'pending') {
      try {
        localStorage.setItem(egeCheckedKey, JSON.stringify(egeChecked));
      } catch (e) {
        console.error('Error saving egeChecked draft', e);
      }
    }
  }, [egeChecked, egeCheckedKey, existingSubmission]);

  // Autosave multi-task answers draft (excluding temporary Blob URLs)
  useEffect(() => {
    if (existingSubmission?.status !== 'graded' && existingSubmission?.status !== 'pending') {
      const cleanAnswers: Record<string, { textAnswer?: string; selectedOptionIndex?: number; egeAnswers?: Record<string, string> }> = {};
      Object.entries(taskAnswers).forEach(([taskId, ans]: [string, any]) => {
        if (ans) {
          cleanAnswers[taskId] = {
            textAnswer: ans.textAnswer,
            selectedOptionIndex: ans.selectedOptionIndex,
            egeAnswers: ans.egeAnswers,
          };
        }
      });
      localStorage.setItem(tasksDraftKey, JSON.stringify(cleanAnswers));
    }
  }, [taskAnswers, tasksDraftKey, existingSubmission]);

  const [recordingTaskId, setRecordingTaskId] = useState<string | null>(null);
  const [studentTaskMediaRecorder, setStudentTaskMediaRecorder] = useState<MediaRecorder | null>(null);
  const [studentRecordingSeconds, setStudentRecordingSeconds] = useState<number>(0);

  useEffect(() => {
    let interval: any;
    if (recordingTaskId !== null) {
      interval = setInterval(() => {
        setStudentRecordingSeconds((s) => s + 1);
      }, 1000);
    } else {
      setStudentRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [recordingTaskId]);

  const startTaskStudentRecording = async (taskId: string) => {
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
        setTaskAnswers((prev) => ({
          ...prev,
          [taskId]: { ...prev[taskId], voiceAudioUrl: audioUrl },
        }));
        stream.getTracks().forEach((track) => track.stop());
        setRecordingTaskId(null);
      };
      recorder.start();
      setStudentTaskMediaRecorder(recorder);
      setRecordingTaskId(taskId);
      setStudentRecordingSeconds(0);
    } catch (err) {
      alert('Не удалось получить доступ к микрофону. Пожалуйста, разрешите доступ в браузере.');
    }
  };

  const stopTaskStudentRecording = () => {
    if (studentTaskMediaRecorder && studentTaskMediaRecorder.state !== 'inactive') {
      studentTaskMediaRecorder.stop();
    }
  };

  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(
    existingSubmission?.writtenImageUrls || []
  );

  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files) as File[];
      fileList.forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setUploadedPhotos((prev) => [...prev, event.target!.result as string].slice(0, 10));
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // Clear timers and media tracks on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    };
  }, []);

  // Voice recording logic
  const startRecording = async () => {
    setAudioError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error', err);
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setAudioError('Доступ к микрофону запрещен или не поддерживается. Пожалуйста, запишите аудио на телефон и загрузите файл.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const resetRecording = () => {
    setRecordedAudioUrl(null);
    setRecordingSeconds(0);
    setAudioError(null);
  };

  // Test Submission Handler
  const handleTestSubmit = () => {
    if (!homework.testQuestions) return;
    let correctCount = 0;
    homework.testQuestions.forEach((q) => {
      const userAns = (testAnswers[q.id] || '').trim().toLowerCase();
      const correctAns = q.correctAnswer.trim().toLowerCase();
      if (userAns === correctAns) {
        correctCount += 1;
      }
    });

    const score = Math.round((correctCount / homework.testQuestions.length) * homework.maxPoints);
    setTestScore(score);
    setTestSubmitted(true);

    const now = new Date();
    const formattedSubmittedAt = `${now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}, ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;

    onSubmit({
      homeworkId: homework.id,
      status: 'graded',
      type: 'test',
      testAnswers,
      testScore: score,
      totalScore: score,
      maxScore: homework.maxPoints,
      teacherFeedbackText: `Автоматическая проверка теста завершена! Результат: ${correctCount} из ${homework.testQuestions.length} вопросов правильно (${score}/${homework.maxPoints} баллов).`,
      submittedAt: formattedSubmittedAt,
    });
  };

  // AI Essay Pre-check Trigger
  const handleAiPreCheck = async () => {
    if (!essayText) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai-essay-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: homework.title,
          essayText,
        }),
      });
      const data = await res.json();
      if (data.feedback) {
        setAiFeedback(data.feedback);
      }
    } catch (err) {
      console.error(err);
      setAiFeedback('✨ ИИ-анализ: Ваша структура хорошо сбалансирована. Работа готова к проверке Ангелиной!');
    } finally {
      setAiLoading(false);
    }
  };

  // Final Submit Homework
  const handleSubmitHomework = () => {
    const now = new Date();
    const formattedSubmittedAt = `${now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}, ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;

    const mergedTaskAnswers = { ...taskAnswers };
    if (homework.tasks) {
      homework.tasks.forEach((t) => {
        if (t.taskType === 'ege_gap_fill' && t.egeItems) {
          const summary = t.egeItems
            .map((it) => `${it.number}: ${egeAnswers[it.id] || '(пропуск)'}`)
            .join(', ');
          mergedTaskAnswers[t.id] = {
            ...mergedTaskAnswers[t.id],
            textAnswer: summary,
            egeAnswers,
          };
        }
      });
    }

    onSubmit({
      homeworkId: homework.id,
      status: 'pending',
      type: homework.type,
      speakingAudioUrl: recordedAudioUrl || undefined,
      essayText: essayText || undefined,
      writtenFileName:
        uploadedFileName ||
        (uploadedPhotos.length > 0 ? `Прикреплено_фото_${uploadedPhotos.length}.png` : undefined),
      writtenImageUrls: uploadedPhotos.length > 0 ? uploadedPhotos : undefined,
      taskAnswers: Object.keys(mergedTaskAnswers).length > 0 ? mergedTaskAnswers : undefined,
      aiPreviewFeedback: aiFeedback || undefined,
      submittedAt: formattedSubmittedAt,
    });
    localStorage.removeItem(draftKey);
    localStorage.removeItem(tasksDraftKey);
    localStorage.removeItem(egeDraftKey);
    localStorage.removeItem(egeCheckedKey);
    try {
      localStorage.removeItem(`hw_draft_${homework.id}`);
      localStorage.removeItem(`hw_tasks_draft_${homework.id}`);
      localStorage.removeItem(`hw_ege_draft_${homework.id}`);
      localStorage.removeItem(`hw_ege_checked_${homework.id}`);
    } catch {
      // ignore
    }
    onClose();
  };

  const handleAttemptClose = () => {
    const hasUnsavedMedia =
      recordedAudioUrl !== null ||
      uploadedPhotos.length > 0 ||
      Object.values(taskAnswers).some(
        (ans: any) => ans?.voiceAudioUrl || (ans?.textAnswer && ans.textAnswer.trim() !== '')
      );

    if (hasUnsavedMedia && existingSubmission?.status !== 'graded' && existingSubmission?.status !== 'pending') {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative ${
          isDarkMode ? 'bg-[#1e2c3a] text-white border border-slate-700' : 'bg-white text-slate-900'
        }`}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-3.5 px-4 border-b border-slate-200 dark:border-slate-700 bg-black/10">
          <div className="flex items-center space-x-2">
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                homework.type === 'test'
                  ? 'bg-amber-500/20 text-amber-400'
                  : homework.type === 'speaking'
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {homework.type === 'test'
                ? '⚡ Тест'
                : homework.type === 'speaking'
                ? '🗣 Speaking'
                : '✍️ Письменное ДЗ'}
            </span>
            {existingSubmission?.status === 'graded' && existingSubmission.schoolGrade !== undefined ? (
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Школьная оценка: {existingSubmission.schoolGrade}
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-medium">Макс: {homework.maxPoints} б.</span>
            )}
          </div>
          <button
            onClick={handleAttemptClose}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Title & Description */}
          <div>
            <h2 className="text-base font-bold leading-snug">{homework.title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {homework.description}
            </p>
          </div>

          {/* Existing Review from Angelina if Graded */}
          {existingSubmission?.status === 'graded' && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <Award className="w-5 h-5" />
                  <span className="font-bold text-sm">Результат проверки Ангелины</span>
                </div>
                <div className="flex items-center space-x-2">
                  {existingSubmission.schoolGrade !== undefined && (
                    <span className="text-xs font-black text-indigo-300 bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-0.5 rounded-full">
                      Школьная оценка: {existingSubmission.schoolGrade}
                    </span>
                  )}
                  {existingSubmission.totalScore !== undefined && (
                    <span className="text-sm font-extrabold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      {existingSubmission.totalScore} / {homework.maxPoints} баллов
                    </span>
                  )}
                </div>
              </div>

              {/* Teacher Text Feedback */}
              {existingSubmission.teacherFeedbackText && (
                <p className="text-xs text-slate-200 leading-relaxed bg-black/20 p-2.5 rounded-xl">
                  «{existingSubmission.teacherFeedbackText}»
                </p>
              )}

              {/* Teacher Voice Recording */}
              {Boolean(existingSubmission.teacherVoiceAudioUrl && existingSubmission.teacherVoiceAudioUrl.trim()) && (
                <div className="pt-2 flex items-center space-x-3 bg-black/30 p-2.5 rounded-xl">
                  <button
                    onClick={() => {
                      if (teacherAudioRef.current) {
                        if (isPlayingTeacherVoice) {
                          teacherAudioRef.current.pause();
                        } else {
                          teacherAudioRef.current.play();
                        }
                        setIsPlayingTeacherVoice(!isPlayingTeacherVoice);
                      }
                    }}
                    className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
                  >
                    {isPlayingTeacherVoice ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <audio
                    ref={teacherAudioRef}
                    src={existingSubmission.teacherVoiceAudioUrl}
                    onEnded={() => setIsPlayingTeacherVoice(false)}
                  />
                  <div>
                    <h5 className="text-xs font-bold text-emerald-300">
                      🎧 Голосовой разбор от Ангелины
                    </h5>
                    <p className="text-[10px] text-slate-400">Нажмите для прослушивания (0:45)</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FORMAT 1: TEST MECHANIC */}
          {homework.type === 'test' && homework.testQuestions && (!homework.tasks || homework.tasks.length === 0) && (
            <div className="space-y-4 pt-2">
              {homework.testQuestions.map((q, idx) => {
                const isCorrect =
                  testSubmitted &&
                  (testAnswers[q.id] || '').trim().toLowerCase() ===
                    q.correctAnswer.trim().toLowerCase();

                return (
                  <div
                    key={q.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      testSubmitted
                        ? isCorrect
                          ? 'bg-emerald-950/30 border-emerald-500/40'
                          : 'bg-rose-950/30 border-rose-500/40'
                        : isDarkMode
                        ? 'bg-[#17212b] border-slate-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <h4 className="font-bold text-xs mb-2.5 leading-snug">
                      {idx + 1}. {q.question}
                    </h4>

                    {/* Choice questions */}
                    {q.type === 'choice' && q.options && (
                      <div className="space-y-1.5">
                        {q.options.map((opt) => (
                          <label
                            key={opt.id}
                            className={`flex items-center space-x-2.5 p-2 rounded-lg text-xs cursor-pointer border transition-all ${
                              testAnswers[q.id] === opt.id
                                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-semibold'
                                : 'bg-black/10 border-transparent hover:bg-black/20'
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              disabled={testSubmitted}
                              checked={testAnswers[q.id] === opt.id}
                              onChange={() =>
                                setTestAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                              }
                              className="accent-sky-500"
                            />
                            <span>{opt.text}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Word Input questions */}
                    {q.type === 'input' && (
                      <input
                        type="text"
                        disabled={testSubmitted}
                        value={testAnswers[q.id] || ''}
                        onChange={(e) =>
                          setTestAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        placeholder="Введите ответ..."
                        className={`w-full p-2 rounded-lg text-xs border ${
                          isDarkMode
                            ? 'bg-[#1e2c3a] border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    )}

                    {/* Explanations after test submit */}
                    {testSubmitted && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/50 text-[11px] leading-relaxed">
                        <p className={isCorrect ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                          {isCorrect ? '✓ Правильный ответ!' : `✗ Правильно: "${q.correctAnswer}"`}
                        </p>
                        <p className="text-slate-400 mt-1">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {!testSubmitted && (
                <button
                  onClick={handleTestSubmit}
                  className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Завершить тест и узнать балл</span>
                </button>
              )}
            </div>
          )}

          {/* FORMAT 2: SPEAKING MECHANIC */}
          {homework.type === 'speaking' && homework.speakingPrompt && (!homework.tasks || homework.tasks.length === 0) && (
            <div className="space-y-4 pt-1">
              <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-sky-400">
                  <span>{homework.speakingPrompt.taskNumber}</span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Подготовка: {homework.speakingPrompt.preparationSeconds} сек</span>
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {homework.speakingPrompt.textPrompt}
                </p>

                {homework.speakingPrompt.imageUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden aspect-video max-h-40">
                    <img
                      src={homework.speakingPrompt.imageUrl}
                      alt="Prompt"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Requirements checklist */}
              <div className="text-[11px] space-y-1 text-slate-400 bg-black/20 p-2.5 rounded-xl">
                <span className="font-semibold text-slate-300">Критерии ФИПИ к ответу:</span>
                {homework.speakingPrompt.requirements.map((req, i) => (
                  <p key={i} className="flex items-center space-x-1.5">
                    <span className="text-sky-400">•</span>
                    <span>{req}</span>
                  </p>
                ))}
              </div>

              {/* In-App Voice Recorder */}
              <div className={`p-4 rounded-2xl border text-center space-y-3 ${
                isDarkMode ? 'bg-[#17212b] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <h4 className="font-bold text-xs text-slate-300">
                  {isRecording
                    ? '🔴 Идет запись вашего ответа...'
                    : recordedAudioUrl
                    ? '✅ Аудиозапись готова к отправке'
                    : '🎙 Встроенный диктофон Telegram'}
                </h4>

                {/* Live timer */}
                {isRecording && (
                  <div className="text-xl font-mono font-extrabold text-rose-500 animate-pulse">
                    {formatSeconds(recordingSeconds)}
                  </div>
                )}

                {/* Audio Waveform Simulator */}
                {isRecording && (
                  <div className="flex items-center justify-center space-x-1 py-2">
                    {[35, 65, 90, 45, 80, 100, 50, 75, 40, 95, 30].map((h, idx) => (
                      <span
                        key={idx}
                        className="w-1.5 bg-rose-500 rounded-full animate-bounce"
                        style={{
                          height: `${h / 2}px`,
                          animationDelay: `${idx * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Recorder Control Buttons */}
                {!recordedAudioUrl ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {!isRecording ? (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center space-x-2"
                        >
                          <Mic className="w-4 h-4" />
                          <span>Начать запись ответа</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center space-x-2"
                        >
                          <Square className="w-4 h-4 fill-white" />
                          <span>Завершить запись</span>
                        </button>
                      )}

                      <label className="cursor-pointer px-4 py-2.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold text-xs rounded-xl border border-sky-500/30 inline-flex items-center space-x-2 transition-all">
                        <UploadCloud className="w-4 h-4" />
                        <span>Загрузить аудиофайл</span>
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = URL.createObjectURL(file);
                              setRecordedAudioUrl(url);
                            }
                          }}
                        />
                      </label>
                    </div>
                    {audioError && (
                      <p className="text-rose-400 text-[10px] mt-1 font-medium">{audioError}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Recorded Audio Preview Player */}
                    {Boolean(recordedAudioUrl) && (
                      <div className="flex items-center justify-center space-x-2 bg-black/40 p-2.5 rounded-xl max-w-md mx-auto border border-sky-500/30">
                        <audio
                          ref={audioPlayerRef}
                          src={recordedAudioUrl || undefined}
                          controls
                          className="w-full h-8"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setRecordedAudioUrl(null);
                            setIsPlayingRecorded(false);
                          }}
                          className="p-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors shrink-0"
                          title="Удалить запись"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-center space-x-3">
                      <button
                        type="button"
                        onClick={resetRecording}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1 font-medium"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Перезаписать голосовой ответ</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FORMAT 3: WRITTEN ESSAY MECHANIC */}
          {homework.type === 'written' && (!homework.tasks || homework.tasks.length === 0) && (
            <div className="space-y-3.5 pt-1">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
                <h4 className="text-xs font-bold text-emerald-400">
                  {homework.writtenPrompt?.taskTitle || 'Письменная работа ФИПИ'}
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {homework.writtenPrompt?.instructions}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  Рекомендуемый объем: {homework.writtenPrompt?.minWords || 200}-
                  {homework.writtenPrompt?.maxWords || 250} слов.
                </p>
              </div>

              {/* Text Area for Typing / Copying Essay */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Введите или вставьте текст эссе / письма:
                </label>
                <textarea
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                  placeholder="Imagine that I am doing a project on why teenagers in Zetland choose a career in IT..."
                  className={`w-full p-3 rounded-xl text-xs border leading-relaxed min-h-[200px] resize-y ${
                    isDarkMode
                      ? 'bg-[#17212b] border-slate-700 text-white placeholder-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <div className="pt-1.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Лимит ЕГЭ: {absoluteMin} – {absoluteMax} слов (с учетом ±10%)
                    </span>
                    <span className={`text-xs font-mono font-bold ${
                      isTooShort ? 'text-rose-500' : isTooLong ? 'text-amber-500' : 'text-emerald-400'
                    }`}>
                      Слов: {currentWordCount}
                    </span>
                  </div>
                  
                  {isTooShort && (
                    <p className="text-[10px] text-rose-500 font-semibold text-right animate-pulse">
                      Работа будет оценена в 0 баллов (недобор слов!)
                    </p>
                  )}
                  {isTooLong && (
                    <p className="text-[10px] text-amber-500 font-semibold text-right animate-pulse">
                      Проверят только первые {maxW} слов!
                    </p>
                  )}
                </div>
              </div>

              {/* AI Pre-check Button */}
              {essayText.trim().length > 30 && (
                <div className="pt-1">
                  <button
                    onClick={handleAiPreCheck}
                    disabled={aiLoading}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                    <span>
                      {aiLoading ? 'ИИ анализирует эссе...' : '✨ ИИ-экспресс предпроверка эссе'}
                    </span>
                  </button>

                  {/* AI Feedback Banner */}
                  {aiFeedback && (
                    <div className="mt-2.5 p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs text-purple-200 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center space-x-1.5 font-bold text-purple-300">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Предварительный разбор ИИ-эксперта</span>
                      </div>
                      <p className="whitespace-pre-line text-[11px] leading-relaxed text-slate-200">
                        {aiFeedback}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Photo Upload Alternative */}
              <div className="pt-2 space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Прикрепите фото рукописной работы (до 10 фото):
                </label>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={photoInputRef}
                  onChange={handleAddPhotos}
                  className="hidden"
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {uploadedPhotos.map((photoUrl, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-800 aspect-square"
                    >
                      <img src={photoUrl} alt={`Фото ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-[9px] text-white rounded-md font-semibold">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}

                  {uploadedPhotos.length < 10 && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className={`p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer aspect-square ${
                        isDarkMode
                          ? 'bg-[#17212b] border-slate-700 hover:border-sky-500'
                          : 'bg-slate-50 border-slate-300 hover:border-sky-500'
                      }`}
                    >
                      <Plus className="w-6 h-6 text-sky-400 mb-1" />
                      <span className="text-[11px] font-semibold text-sky-400">Добавить фото</span>
                      <span className="text-[9px] text-slate-400">{uploadedPhotos.length}/10</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MULTI-TASK SUBMISSION VIEWER */}
          {homework.tasks && homework.tasks.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <h4 className="text-xs font-bold text-purple-300">
                  📋 В этом домашнем задании {homework.tasks.length}{' '}
                  {homework.tasks.length === 1 ? 'задание' : 'заданий'}
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Выполняйте задания по очереди. Вы можете вводить текстовые ответы, записывать голосовой ответ или прикреплять фото работы.
                </p>
              </div>

              {homework.tasks.map((task, tIdx) => {
                const currentAnswer = taskAnswers[task.id] || {};
                const taskFeedback =
                  existingSubmission?.status === 'graded'
                    ? existingSubmission.taskFeedbacks?.[task.id]
                    : undefined;

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isDarkMode ? 'bg-[#17212b] border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                      <span className="font-extrabold text-xs text-purple-400">
                        {!task.taskNumber || task.taskNumber === 'Без номера' ? `Задание #${tIdx + 1}` : task.taskNumber}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase font-semibold">
                        {task.block === 'speaking'
                          ? '🗣 Говорение'
                          : task.block === 'grammar'
                          ? '📝 Грамматика'
                          : task.block === 'writing'
                          ? '✍️ Письмо'
                          : '📚 Лексика'}
                      </span>
                    </div>

                    {/* Task Video Attachment (Auto-playing loop) */}
                    {Boolean(task.taskVideoUrl && task.taskVideoUrl.trim()) && (
                      <div className="mt-3 rounded-xl overflow-hidden bg-black flex justify-center border border-slate-700/50 relative shadow-inner">
                        <video
                          src={task.taskVideoUrl}
                          autoPlay
                          muted
                          loop
                          playsInline
                          controls
                          className="w-full max-h-[60vh] object-contain"
                        />
                      </div>
                    )}

                    {/* Instruction */}
                    {task.instruction && (
                      <p className="text-xs text-amber-200/90 font-medium bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 leading-relaxed">
                        📌 {task.instruction}
                      </p>
                    )}

                    {/* Task Prompt */}
                    {task.taskType !== 'gap_fill' && task.taskType !== 'ege_gap_fill' && task.taskPrompt && (
                      <p className="text-xs text-slate-100 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 whitespace-pre-line leading-relaxed font-sans">
                        {task.taskPrompt}
                      </p>
                    )}

                    {/* Task Images (Grid for multiple) */}
                    {Boolean(task.taskImageUrls && task.taskImageUrls.length > 0) && (
                      <div className={`grid gap-2 my-3 ${task.taskImageUrls!.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {task.taskImageUrls!.map((imgUrl, imgIdx) => (
                          <div key={imgIdx} className="rounded-xl overflow-hidden border border-slate-700 bg-black/40">
                            <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="block relative group h-full">
                              <img src={imgUrl} alt={`Иллюстрация ${imgIdx + 1}`} className="w-full h-full object-cover max-h-[40vh]" />
                              <span className="absolute bottom-2 right-2 bg-black/70 text-[10px] text-white px-2 py-1 rounded-md font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Увеличить 🔍
                              </span>
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Fallback for legacy single image */}
                    {Boolean(!task.taskImageUrls && task.taskImageUrl && task.taskImageUrl.trim()) && (
                      <div className="rounded-xl overflow-hidden border border-slate-700 bg-black/40 my-3">
                        <a href={task.taskImageUrl} target="_blank" rel="noopener noreferrer" className="block relative group">
                          <img src={task.taskImageUrl} alt="Иллюстрация к заданию" className="w-full max-h-[50vh] object-contain mx-auto" />
                        </a>
                      </div>
                    )}

                    {/* Task File Attachment */}
                    {Boolean(task.taskFileLink && task.taskFileLink.trim()) && (
                      <div className="my-3 p-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-between">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Материал к заданию</p>
                            <p className="text-xs font-semibold text-slate-200 truncate">{task.taskFileName || 'Файл.pdf'}</p>
                          </div>
                        </div>
                        <a
                          href={task.taskFileLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-md transition-all ml-2"
                        >
                          Открыть
                        </a>
                      </div>
                    )}

                    {/* Task Audio Prompt Attachment */}
                    {Boolean(task.taskAudioUrl && task.taskAudioUrl.trim()) && (
                      <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/40 space-y-1">
                        <p className="text-[10px] font-bold text-sky-400 flex items-center gap-1">
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Аудиозадание от преподавателя:</span>
                        </p>
                        <audio controls src={task.taskAudioUrl} className="w-full h-8" />
                      </div>
                    )}

                    {/* Response Input based on Type & Block */}
                    <div className="space-y-2 pt-1">
                      {task.taskType !== 'gap_fill' && task.taskType !== 'ege_gap_fill' && (
                        <label className="text-[11px] font-semibold text-slate-300 block">
                          Ваш ответ на {!task.taskNumber || task.taskNumber === 'Без номера' ? `Задание #${tIdx + 1}` : task.taskNumber}:
                        </label>
                      )}

                      {/* TEST TASK TYPE WITH OPTIONS & IMMEDIATE FEEDBACK */}
                      {task.taskType === 'test' ? (
                        <div className="space-y-2">
                          <p className="text-[10px] text-amber-300 font-bold">
                            Выберите вариант ответа (мгновенная проверка):
                          </p>
                          <div className="space-y-1.5">
                            {(task.options || ['Вариант A', 'Вариант B', 'Вариант C', 'Вариант D']).map((opt, optIdx) => {
                              const isSelected = currentAnswer.selectedOptionIndex === optIdx;
                              const targetCorrectIdx = task.correctOptionIndex ?? 0;
                              const isCorrectOpt = optIdx === targetCorrectIdx;

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => {
                                    setTaskAnswers((prev) => ({
                                      ...prev,
                                      [task.id]: {
                                        ...prev[task.id],
                                        selectedOptionIndex: optIdx,
                                        textAnswer: opt,
                                      },
                                    }));
                                  }}
                                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-between ${
                                    isSelected
                                      ? isCorrectOpt
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                                        : 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md'
                                      : 'bg-black/20 border-slate-700/60 text-slate-200 hover:bg-black/30'
                                  }`}
                                >
                                  <span>{opt}</span>
                                  {isSelected && (
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        isCorrectOpt ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                                      }`}
                                    >
                                      {isCorrectOpt ? '🎉 Правильно!' : '❌ Неправильно'}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          {currentAnswer.selectedOptionIndex !== undefined && (
                            <div
                              className={`p-2.5 rounded-xl text-xs font-semibold ${
                                currentAnswer.selectedOptionIndex === (task.correctOptionIndex ?? 0)
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {currentAnswer.selectedOptionIndex === (task.correctOptionIndex ?? 0)
                                ? 'Отлично! Вы выбрали верный ответ 🎉'
                                : `Неправильный ответ. Правильный вариант: ${
                                    task.options?.[task.correctOptionIndex ?? 0] || 'выделенный зеленым'
                                  }`}
                            </div>
                          )}
                        </div>
                      ) : task.taskType === 'gap_fill' ? (
                        <div className="flex items-stretch gap-4 p-3 border-b border-slate-700/40">
                          {/* Левая колонка (Номер) */}
                          <div className="shrink-0 w-8 h-8 flex items-center justify-center border-2 border-slate-400 font-bold text-xs rounded-sm">
                            {task.taskNumber ? (task.taskNumber.replace(/[^0-9]/g, '') || task.taskNumber) : `${tIdx + 1}`}
                          </div>

                          {/* Центральная колонка (Текст и ввод) */}
                          <div className="flex-1 space-y-2">
                            {task.taskPrompt && (
                              <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-medium">
                                {task.taskPrompt}
                              </p>
                            )}

                            <div className="space-y-2 pt-1">
                              <input
                                type="text"
                                value={currentAnswer.textAnswer || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTaskAnswers((prev) => ({
                                    ...prev,
                                    [task.id]: { ...prev[task.id], textAnswer: val },
                                  }));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const studentAns = (currentAnswer.textAnswer || '').trim().toLowerCase();
                                    const targetAns = (task.correctAnswer || '').trim().toLowerCase();
                                    const isCorrect = studentAns === targetAns;
                                    setCheckedTasks((prev) => ({
                                      ...prev,
                                      [task.id]: isCorrect ? 'correct' : 'incorrect',
                                    }));
                                  }
                                }}
                                placeholder="Введите ваш ответ..."
                                className={`w-full p-2.5 rounded-xl text-xs border font-medium transition-all ${
                                  checkedTasks[task.id] === 'correct'
                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20'
                                    : checkedTasks[task.id] === 'incorrect'
                                    ? 'bg-rose-500/10 border-rose-500 text-rose-300 ring-2 ring-rose-500/20'
                                    : isDarkMode
                                    ? 'bg-[#1e2c3a] border-slate-700 text-white focus:border-purple-500'
                                    : 'bg-white border-slate-300 text-slate-900 focus:border-purple-500'
                                }`}
                              />

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const studentAns = (currentAnswer.textAnswer || '').trim().toLowerCase();
                                    const targetAns = (task.correctAnswer || '').trim().toLowerCase();
                                    const isCorrect = studentAns === targetAns;
                                    setCheckedTasks((prev) => ({
                                      ...prev,
                                      [task.id]: isCorrect ? 'correct' : 'incorrect',
                                    }));
                                  }}
                                  className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Проверить</span>
                                </button>

                                {checkedTasks[task.id] === 'correct' && (
                                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                    <span>🎉 Верно!</span>
                                  </span>
                                )}
                                {checkedTasks[task.id] === 'incorrect' && (
                                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                                    <span>❌ Неверно, попробуйте еще раз</span>
                                  </span>
                                )}
                              </div>

                              {checkedTasks[task.id] === 'incorrect' && task.explanation && (
                                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs space-y-1">
                                  <span className="font-bold text-rose-400 block text-[11px] flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    <span>Объяснение от преподавателя:</span>
                                  </span>
                                  <p className="leading-relaxed whitespace-pre-line text-xs pl-4 text-slate-200">
                                    {task.explanation}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Правая колонка (Базовое слово) */}
                          <div className="shrink-0 flex items-center justify-end w-24">
                            {task.baseWord && (
                              <span className="font-black uppercase tracking-widest text-slate-400 text-sm">
                                {task.baseWord}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : task.taskType === 'ege_gap_fill' ? (
                        <div className="space-y-4 pt-1">
                          {/* Title / Prompt of the text */}
                          {task.taskPrompt && (
                            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                              <h4 className="font-extrabold text-sm text-indigo-300 tracking-wide uppercase">
                                {task.taskPrompt}
                              </h4>
                            </div>
                          )}

                          {/* List of EGE Paragraphs */}
                          <div className="border border-slate-700/60 rounded-2xl overflow-hidden bg-black/20">
                            {(task.egeItems && task.egeItems.length > 0 ? task.egeItems : []).map((item) => {
                              // Split text by 2 or more underscores
                              const parts = item.text.split(/_{2,}/);
                              const isItemChecked = egeChecked[item.id] !== undefined;
                              const isCorrect = egeChecked[item.id] === 'correct';
                              const isIncorrect = egeChecked[item.id] === 'incorrect';

                              return (
                                <div key={item.id} className="border-b border-slate-700/40 last:border-b-0">
                                  <div className="flex items-stretch gap-4 p-3">
                                    {/* Левая (Номер): item.number внутри квадрата border-2 border-slate-400 font-bold text-xs p-1 */}
                                    <div className="shrink-0 w-8 h-8 flex items-center justify-center border-2 border-slate-400 font-bold text-xs p-1 rounded-sm text-slate-200">
                                      {item.number}
                                    </div>

                                    {/* Центр (Текст): Единый строчный параграф с inline-полем ввода без подчеркиваний */}
                                    <div className="flex-1">
                                      <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                                        {parts[0]}
                                        {parts.length > 1 && (
                                          <input
                                            type="text"
                                            disabled={isItemChecked}
                                            value={egeAnswers[item.id] || ''}
                                            onChange={(e) => {
                                              if (isItemChecked) return;
                                              const val = e.target.value;
                                              const updated = {
                                                ...egeAnswers,
                                                [item.id]: val,
                                              };
                                              setEgeAnswers(updated);

                                              // Synchronize with taskAnswers
                                              const answersSummary = (task.egeItems || [])
                                                .map((it) => `${it.number}: ${updated[it.id] || '(пропуск)'}`)
                                                .join(', ');

                                              setTaskAnswers((prev) => ({
                                                ...prev,
                                                [task.id]: {
                                                  ...prev[task.id],
                                                  textAnswer: answersSummary,
                                                  egeAnswers: updated,
                                                },
                                              }));
                                            }}
                                            placeholder="..."
                                            className={`inline-block w-28 mx-1 px-2 py-0.5 text-center text-xs font-bold border rounded-md focus:outline-none transition-all ${
                                              isCorrect
                                                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-300 font-bold ring-2 ring-emerald-500/30 opacity-100 disabled:opacity-100 disabled:cursor-not-allowed disabled:bg-emerald-500/15 disabled:text-emerald-600 dark:disabled:text-emerald-300'
                                                : isIncorrect
                                                ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-300 font-bold ring-2 ring-rose-500/30 opacity-100 disabled:opacity-100 disabled:cursor-not-allowed disabled:bg-rose-500/15 disabled:text-rose-600 dark:disabled:text-rose-300'
                                                : isDarkMode
                                                ? 'bg-[#1e2c3a] border-slate-600 text-white focus:border-indigo-400 disabled:opacity-75 disabled:cursor-not-allowed'
                                                : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed'
                                            }`}
                                          />
                                        )}
                                        {parts.slice(1).join('')}
                                      </p>
                                    </div>

                                    {/* Правая (Базовое слово): item.baseWord с выравниванием по правому краю, uppercase font-black */}
                                    <div className="shrink-0 flex items-center justify-end w-24">
                                      <span className="font-black uppercase tracking-widest text-slate-400 text-sm font-mono text-right">
                                        {item.baseWord}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Если статус incorrect, сразу под этим абзацем выведи item.explanation красным цветом */}
                                  {isIncorrect && item.explanation && (
                                    <div className="mx-3 mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2 animate-fadeIn">
                                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                      <div className="space-y-0.5">
                                        <p className="font-bold text-rose-400">
                                          Правильный ответ: <span className="underline font-mono">{item.correctAnswer}</span>
                                        </p>
                                        <p className="text-slate-300 text-[11px] leading-relaxed">
                                          {item.explanation}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Под всем текстом кнопка "Проверить текст" */}
                          {(() => {
                            const isTextChecked =
                              Boolean(task.egeItems && task.egeItems.length > 0) &&
                              task.egeItems!.some((item) => egeChecked[item.id] !== undefined);

                            return (
                              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                                {isTextChecked ? (
                                  <button
                                    type="button"
                                    disabled={true}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-800/80 border border-slate-700/80 text-slate-400 font-bold text-xs sm:text-sm rounded-xl cursor-not-allowed flex items-center justify-center space-x-2 shadow-inner"
                                  >
                                    <Check className="w-4 h-4 text-emerald-400" />
                                    <span>Ответы зафиксированы</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!task.egeItems || task.egeItems.length === 0) return;
                                      const newChecked: Record<string, 'correct' | 'incorrect'> = {};
                                      let correctCount = 0;

                                      task.egeItems.forEach((item) => {
                                        const userAns = (egeAnswers[item.id] || '').trim().toLowerCase();
                                        const targetAns = item.correctAnswer.trim().toLowerCase();
                                        const isCorrect = userAns === targetAns;
                                        newChecked[item.id] = isCorrect ? 'correct' : 'incorrect';
                                        if (isCorrect) correctCount += 1;
                                      });

                                      setEgeChecked((prev) => ({ ...prev, ...newChecked }));

                                      const answersSummary = task.egeItems
                                        .map((it) => `${it.number}: ${egeAnswers[it.id] || '(пропуск)'}`)
                                        .join(', ');

                                      setTaskAnswers((prev) => ({
                                        ...prev,
                                        [task.id]: {
                                          ...prev[task.id],
                                          textAnswer: answersSummary,
                                          egeAnswers: { ...egeAnswers },
                                        },
                                      }));
                                    }}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 active:scale-95"
                                  >
                                    <Check className="w-4 h-4" />
                                    <span>Проверить текст</span>
                                  </button>
                                )}

                                {task.egeItems && task.egeItems.length > 0 && isTextChecked && (
                                  <div className="text-xs font-bold flex items-center gap-1.5">
                                    {task.egeItems.every((it) => egeChecked[it.id] === 'correct') ? (
                                      <span className="text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-1">
                                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Идеально! Все задания решены верно! 🎉</span>
                                      </span>
                                    ) : (
                                      <span className="text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30">
                                        Верно: {task.egeItems.filter((it) => egeChecked[it.id] === 'correct').length} из {task.egeItems.length}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      ) : task.block === 'speaking' ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={currentAnswer.textAnswer || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTaskAnswers((prev) => ({
                                ...prev,
                                [task.id]: { ...prev[task.id], textAnswer: val },
                              }));
                            }}
                            placeholder="Комментарий или пояснение к устному ответу..."
                            className={`w-full p-2.5 rounded-xl text-xs border ${
                              isDarkMode ? 'bg-[#1e2c3a] border-slate-700 text-white' : 'bg-white border-slate-300'
                            }`}
                          />
                        </div>
                      ) : (
                        <textarea
                          rows={task.block === 'writing' ? 4 : 2}
                          value={currentAnswer.textAnswer || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTaskAnswers((prev) => ({
                              ...prev,
                              [task.id]: { ...prev[task.id], textAnswer: val },
                            }));
                          }}
                          placeholder={
                            task.block === 'writing'
                              ? 'Введите текст ответа / эссе / письма...'
                              : 'Введите ваш ответ (слово, словосочетание или предложение)...'
                          }
                          className={`w-full p-2.5 rounded-xl text-xs border leading-relaxed ${
                            isDarkMode ? 'bg-[#1e2c3a] border-slate-700 text-white' : 'bg-white border-slate-300'
                          }`}
                        />
                      )}

                      {/* TASK ATTACHMENT TOOLS FOR STUDENT (VOICE RECORD & FILE UPLOAD) */}
                      <div className="pt-2 border-t border-slate-700/40 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">Прикрепить к заданию:</span>

                        {/* File upload */}
                        <label className="cursor-pointer px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold text-[10px] border border-sky-500/30 rounded-lg flex items-center space-x-1 transition-all">
                          <Paperclip className="w-3 h-3" />
                          <span>Загрузить фото/аудио</span>
                          <input
                            type="file"
                            accept="audio/*,image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = URL.createObjectURL(file);
                                if (file.type.startsWith('image/')) {
                                  setUploadedPhotos((prev) => [...prev, url]);
                                } else {
                                  setTaskAnswers((prev) => ({
                                    ...prev,
                                    [task.id]: { ...prev[task.id], voiceAudioUrl: url },
                                  }));
                                }
                              }
                            }}
                          />
                        </label>

                        {/* Record Voice Button */}
                        {recordingTaskId === task.id ? (
                          <button
                            type="button"
                            onClick={stopTaskStudentRecording}
                            className="px-2.5 py-1 bg-rose-600 text-white font-bold text-[10px] rounded-lg animate-pulse"
                          >
                            ⏹ Стоп ({studentRecordingSeconds}с)
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startTaskStudentRecording(task.id)}
                            className="px-2.5 py-1 bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] rounded-lg flex items-center space-x-1 hover:bg-emerald-600/40 transition-all"
                          >
                            <Mic className="w-3 h-3" />
                            <span>🎙 Записать голосовой ответ</span>
                          </button>
                        )}
                      </div>

                      {/* Preview recorded/uploaded voice answer */}
                      {Boolean(currentAnswer.voiceAudioUrl && currentAnswer.voiceAudioUrl.trim()) && (
                        <div className="pt-1 flex items-center space-x-2 bg-black/30 p-2 rounded-xl border border-sky-500/30">
                          <audio controls src={currentAnswer.voiceAudioUrl} className="w-full h-7" />
                          <button
                            type="button"
                            onClick={() => {
                              setTaskAnswers((prev) => ({
                                ...prev,
                                [task.id]: { ...prev[task.id], voiceAudioUrl: undefined },
                              }));
                            }}
                            className="text-rose-400 hover:text-rose-300 text-[10px] font-bold shrink-0"
                          >
                            Удалить
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Teacher Feedback for this Task */}
                    {existingSubmission?.status === 'graded' &&
                      taskFeedback &&
                      (taskFeedback.score !== undefined ||
                        (taskFeedback.comment && taskFeedback.comment.trim())) && (
                        <div className="mt-3 p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/40 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 text-purple-300">
                              <Sparkles className="w-4 h-4 text-amber-300" />
                              <span className="text-xs font-bold">Оценка преподавателя:</span>
                            </div>
                            {taskFeedback.score !== undefined && (
                              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-purple-500/25 text-purple-200 border border-purple-500/40 shadow-sm">
                                Оценка: {taskFeedback.score}
                              </span>
                            )}
                          </div>
                          {taskFeedback.comment && taskFeedback.comment.trim() && (
                            <p className="text-xs text-slate-200 bg-black/30 p-2.5 rounded-lg border border-purple-500/20 leading-relaxed whitespace-pre-line">
                              {taskFeedback.comment}
                            </p>
                          )}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Main Submit Button for Student */}
          {existingSubmission?.status !== 'graded' && (() => {
            const hasAnyAnswer = Boolean(
              Object.keys(testAnswers).length > 0 ||
              recordedAudioUrl ||
              uploadedFileName ||
              essayText.trim() ||
              uploadedPhotos.length > 0 ||
              Object.values(taskAnswers).some(
                (ans: any) =>
                  (ans?.textAnswer && ans.textAnswer.trim()) ||
                  ans?.voiceAudioUrl ||
                  ans?.selectedOptionIndex !== undefined
              )
            );

            const handleMainSubmit = () => {
              if (homework.type === 'test' && homework.testQuestions && homework.testQuestions.length > 0) {
                handleTestSubmit();
              } else {
                handleSubmitHomework();
              }
            };

            return (
              <div className="pt-3 sticky bottom-0 bg-inherit border-t border-slate-700/80 -mx-4 -mb-4 p-4 shadow-2xl z-10">
                <button
                  type="button"
                  onClick={handleMainSubmit}
                  disabled={!hasAnyAnswer}
                  className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-sky-500/30 transition-all flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {hasAnyAnswer
                      ? '🚀 Отправить ДЗ на проверку Ангелине'
                      : 'Заполните задания или прикрепите ответ для отправки'}
                  </span>
                </button>
              </div>
            );
          })()}
        </div>

        {/* Exit Confirmation Dialog */}
        {showExitConfirm && (
          <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 rounded-2xl">
            <div className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl border text-center ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-200 mb-2">Закрыть задание?</h3>
              <p className="text-xs text-slate-400 mb-6">Записанные аудио и фото будут удалены. Текст эссе сохранится в черновик.</p>
              <div className="flex items-center space-x-3">
                <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-slate-300 hover:bg-slate-700">Остаться</button>
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-rose-600 text-white hover:bg-rose-700">Выйти</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
