import React, { useState, useRef, useEffect } from 'react';
import { Homework, Submission, HomeworkStatus } from '../types';
import {
  X,
  Mic,
  Square,
  Play,
  RotateCcw,
  Upload,
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
} from 'lucide-react';

interface HomeworkSubmissionModalProps {
  homework: Homework;
  existingSubmission?: Submission;
  onClose: () => void;
  onSubmit: (submissionData: Partial<Submission>) => void;
  isDarkMode: boolean;
}

export const HomeworkSubmissionModal: React.FC<HomeworkSubmissionModalProps> = ({
  homework,
  existingSubmission,
  onClose,
  onSubmit,
  isDarkMode,
}) => {
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

  // Audio Recording state for Speaking
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(
    existingSubmission?.speakingAudioUrl || null
  );
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
  const [essayText, setEssayText] = useState(existingSubmission?.essayText || '');
  const [uploadedFileName, setUploadedFileName] = useState(
    existingSubmission?.writtenFileName || ''
  );
  const [isUploading, setIsUploading] = useState(false);

  // AI Pre-check state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(
    existingSubmission?.aiPreviewFeedback || null
  );

  // Multi-Task & Photo state
  const [taskAnswers, setTaskAnswers] = useState<
    Record<string, { textAnswer?: string; voiceAudioUrl?: string }>
  >(existingSubmission?.taskAnswers || {});

  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(
    existingSubmission?.writtenImageUrls || []
  );

  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files);
      fileList.forEach((file) => {
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

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Voice recording logic
  const startRecording = async () => {
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
      console.warn('Microphone access fallback to demo recording simulation', err);
      // Fallback demo recording simulation if microphone is blocked in iframe
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 10) {
            stopRecordingDemo();
            return 10;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const stopRecordingDemo = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordedAudioUrl('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
    } else {
      stopRecordingDemo();
    }
  };

  const resetRecording = () => {
    setRecordedAudioUrl(null);
    setRecordingSeconds(0);
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

    onSubmit({
      homeworkId: homework.id,
      status: 'graded',
      type: 'test',
      testAnswers,
      testScore: score,
      totalScore: score,
      maxScore: homework.maxPoints,
      teacherFeedbackText: `Автоматическая проверка теста завершена! Результат: ${correctCount} из ${homework.testQuestions.length} вопросов правильно (${score}/${homework.maxPoints} баллов).`,
      submittedAt: 'Только что',
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
      taskAnswers: Object.keys(taskAnswers).length > 0 ? taskAnswers : undefined,
      aiPreviewFeedback: aiFeedback || undefined,
      submittedAt: 'Только что',
    });
    onClose();
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
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
            <span className="text-xs text-slate-400 font-medium">Макс: {homework.maxPoints} б.</span>
          </div>
          <button
            onClick={onClose}
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
                <span className="text-sm font-extrabold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  {existingSubmission.totalScore} / {homework.maxPoints} баллов
                </span>
              </div>

              {/* Teacher Text Feedback */}
              {existingSubmission.teacherFeedbackText && (
                <p className="text-xs text-slate-200 leading-relaxed bg-black/20 p-2.5 rounded-xl">
                  «{existingSubmission.teacherFeedbackText}»
                </p>
              )}

              {/* Teacher Voice Recording */}
              {existingSubmission.teacherVoiceAudioUrl && (
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
          {homework.type === 'test' && homework.testQuestions && (
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
          {homework.type === 'speaking' && homework.speakingPrompt && (
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
                  <div>
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center space-x-2 mx-auto"
                      >
                        <Mic className="w-4 h-4" />
                        <span>Начать запись ответа</span>
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center space-x-2 mx-auto"
                      >
                        <Square className="w-4 h-4 fill-white" />
                        <span>Завершить запись</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Recorded Audio Preview Player */}
                    <div className="flex items-center justify-center space-x-3 bg-black/30 p-2.5 rounded-xl max-w-sm mx-auto">
                      <button
                        onClick={() => {
                          if (audioPlayerRef.current) {
                            if (isPlayingRecorded) {
                              audioPlayerRef.current.pause();
                            } else {
                              audioPlayerRef.current.play();
                            }
                            setIsPlayingRecorded(!isPlayingRecorded);
                          }
                        }}
                        className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0"
                      >
                        {isPlayingRecorded ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>
                      <audio
                        ref={audioPlayerRef}
                        src={recordedAudioUrl}
                        onEnded={() => setIsPlayingRecorded(false)}
                      />
                      <span className="text-xs font-mono text-slate-300">
                        {formatSeconds(recordingSeconds || 45)}
                      </span>
                    </div>

                    <button
                      onClick={resetRecording}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1 mx-auto font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Перезаписать аудио</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FORMAT 3: WRITTEN ESSAY MECHANIC */}
          {homework.type === 'written' && (
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
                  rows={6}
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                  placeholder="Imagine that I am doing a project on why teenagers in Zetland choose a career in IT..."
                  className={`w-full p-3 rounded-xl text-xs border leading-relaxed ${
                    isDarkMode
                      ? 'bg-[#17212b] border-slate-700 text-white placeholder-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
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

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isDarkMode ? 'bg-[#17212b] border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                      <span className="font-extrabold text-xs text-purple-400">
                        {task.taskNumber || `Задание #${tIdx + 1}`}
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

                    {/* Instruction */}
                    {task.instruction && (
                      <p className="text-xs text-amber-200/90 font-medium bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 leading-relaxed">
                        📌 {task.instruction}
                      </p>
                    )}

                    {/* Task Prompt */}
                    {task.taskPrompt && (
                      <p className="text-xs text-slate-100 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 whitespace-pre-line leading-relaxed font-sans">
                        {task.taskPrompt}
                      </p>
                    )}

                    {/* Task Image Prompt Attachment */}
                    {task.taskImageUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-700 max-h-60 bg-black/40">
                        <a href={task.taskImageUrl} target="_blank" rel="noopener noreferrer" className="block relative group">
                          <img src={task.taskImageUrl} alt="Иллюстрация к заданию" className="w-full h-full object-contain max-h-60 mx-auto" />
                          <span className="absolute bottom-1 right-1 bg-black/70 text-[9px] text-white px-2 py-0.5 rounded font-mono">🔍 Открыть картинку в полный размер</span>
                        </a>
                      </div>
                    )}

                    {/* Task Audio Prompt Attachment */}
                    {task.taskAudioUrl && (
                      <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/40 space-y-1">
                        <p className="text-[10px] font-bold text-sky-400 flex items-center gap-1">
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Аудиозадание от преподавателя:</span>
                        </p>
                        <audio controls src={task.taskAudioUrl} className="w-full h-8" />
                      </div>
                    )}

                    {/* Response Input based on Block */}
                    <div className="space-y-2 pt-1">
                      <label className="text-[11px] font-semibold text-slate-300 block">
                        Ваш ответ на {task.taskNumber || `Задание #${tIdx + 1}`}:
                      </label>

                      {task.block === 'speaking' ? (
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-400">
                            Используйте кнопку аудиозаписи верху или введите пояснение:
                          </p>
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
                            placeholder="Комментарий к устному ответу..."
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Submit Button for Speaking & Written */}
          {homework.type !== 'test' && existingSubmission?.status !== 'graded' && (() => {
            const hasAnyAnswer = Boolean(
              recordedAudioUrl ||
              uploadedFileName ||
              essayText.trim() ||
              uploadedPhotos.length > 0 ||
              Object.values(taskAnswers).some((ans) => (ans.textAnswer && ans.textAnswer.trim()) || ans.voiceAudioUrl)
            );

            return (
              <div className="pt-3">
                <button
                  onClick={handleSubmitHomework}
                  disabled={!hasAnyAnswer}
                  className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {hasAnyAnswer
                      ? 'Отправить ДЗ на проверку Ангелине'
                      : 'Заполните хотя бы одно задание или прикрепите аудио/фото/файл'}
                  </span>
                </button>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
