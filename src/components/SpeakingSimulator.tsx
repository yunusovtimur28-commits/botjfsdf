import React, { useState, useEffect, useRef } from 'react';
import {
  Timer,
  Mic,
  Square,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  AlertCircle,
  UploadCloud,
} from 'lucide-react';

interface SpeakingSimulatorProps {
  isDarkMode: boolean;
  onFinishSimulatedSpeaking: (audioUrl: string) => void;
}

export const SpeakingSimulator: React.FC<SpeakingSimulatorProps> = ({
  isDarkMode,
  onFinishSimulatedSpeaking,
}) => {
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [stage, setStage] = useState<'intro' | 'prep' | 'transition' | 'recording' | 'finished'>('intro');

  // Pre-flight check state
  const [micStatus, setMicStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Audio progress for custom player
  const [audioProgress, setAudioProgress] = useState(0);

  // Live audio waveform state (Web Audio API)
  const [volumeLevels, setVolumeLevels] = useState<number[]>(new Array(11).fill(10));
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const stopAudioAnalyser = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setVolumeLevels(new Array(11).fill(10));
  };

  const tasks = [
    {
      id: 'task-3',
      number: 'Задание 3 (Интервью ФИПИ)',
      title: 'Answer 5 questions about learning foreign languages',
      prepTime: 40,
      answerTime: 90,
      imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
      questions: [
        '1. What language courses or apps do you use to prepare for exams?',
        '2. Why is speaking practice the most challenging part for students?',
        '3. How often do you listen to English audio or watch videos?',
        '4. What advice would you give to someone starting to learn English?',
        '5. What career opportunities open up with C1 level English?',
      ],
    },
    {
      id: 'task-4',
      number: 'Задание 4 (Сравнение фото и Монолог)',
      title: 'Compare 2 pictures & express your opinion on working remotely vs in office',
      prepTime: 90,
      answerTime: 180,
      imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
      questions: [
        '1. Give a brief description of the photos and highlight differences',
        '2. Mention advantages and disadvantages of both working formats',
        '3. Express your opinion on which format you would prefer and why',
      ],
    },
  ];

  const currentTask = tasks[selectedTaskIndex];

  // Timer states
  const [countdown, setCountdown] = useState(currentTask.prepTime);
  const timerRef = useRef<any>(null);

  // Audio recording
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Sound effects beep
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // AudioContext fallback ignored
    }
  };

  // Microphone pre-flight check
  const checkMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicStatus('success');
      setAudioError(null);
    } catch (err) {
      setMicStatus('error');
      setAudioError('Микрофон недоступен. Потребуется ручная загрузка аудиофайла.');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAudioAnalyser();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Stage transitions & timers
  const startPrep = () => {
    playBeep();
    setAudioError(null);
    setStage('prep');
    setCountdown(currentTask.prepTime);
  };

  // Timer countdown handler
  useEffect(() => {
    if (stage === 'prep') {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            playBeep();
            setStage('transition');
            setCountdown(3);
            return 3;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (stage === 'transition') {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            playBeep();
            startRecordingStage();
            return 0;
          }
          playBeep();
          return prev - 1;
        });
      }, 1000);
    } else if (stage === 'recording') {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            playBeep();
            finishRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage]);

  const startRecordingStage = async () => {
    setStage('recording');
    setCountdown(currentTask.answerTime);
    setAudioError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Web Audio API & Analyser initialization
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 32;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateLiveVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          // Scale 11 bars from frequency data to responsive heights (10-100)
          const newLevels = Array.from({ length: 11 }, (_, i) => {
            const dataIdx = Math.min(Math.floor((i * bufferLength) / 11), bufferLength - 1);
            const val = dataArray[dataIdx] || 0;
            return Math.max(10, Math.min(100, Math.round(10 + (val / 255) * 90)));
          });
          setVolumeLevels(newLevels);
          animationFrameRef.current = requestAnimationFrame(updateLiveVolume);
        };
        animationFrameRef.current = requestAnimationFrame(updateLiveVolume);
      } catch (err) {
        console.warn('AudioContext not supported or restricted', err);
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopAudioAnalyser();
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
    } catch (err) {
      console.error('Microphone access error in SpeakingSimulator', err);
      setAudioError('Доступ к микрофону запрещен или не поддерживается. Пожалуйста, запишите аудио на телефон и загрузите файл.');
    }
  };

  const finishRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopAudioAnalyser();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setStage('finished');
  };

  const resetSimulator = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopAudioAnalyser();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current.stop();
    }
    setStage('intro');
    setRecordedAudioUrl(null);
    setAudioError(null);
    setIsPlayingRecorded(false);
    setAudioProgress(0);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight">⏳ Тренажёр устной части (ФИПИ)</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Точная симуляция экзамена: 40 секунд подготовки ➔ Плавный отсчет ➔ Автоматическая запись ответа
        </p>
      </div>

      {/* Task Selector Tabs */}
      <div className="flex space-x-2">
        {tasks.map((task, idx) => (
          <button
            key={task.id}
            onClick={() => {
              setSelectedTaskIndex(idx);
              resetSimulator();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
              selectedTaskIndex === idx
                ? 'bg-sky-500 text-white border-sky-500 shadow-md'
                : isDarkMode
                ? 'bg-[#17212b] border-slate-800 text-slate-300'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            {task.number}
          </button>
        ))}
      </div>

      {/* Simulator Main Card */}
      <div
        className={`p-4 rounded-2xl border space-y-4 shadow-sm ${
          isDarkMode ? 'bg-[#1e2c3a] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Task Title & Prompt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400 bg-sky-500/20 px-2.5 py-0.5 rounded-full">
              {currentTask.number}
            </span>
            <div className="flex items-center space-x-3 text-xs text-slate-400">
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Подготовка: {currentTask.prepTime}с</span>
              </span>
              <span className="flex items-center space-x-1">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ответ: {currentTask.answerTime}с</span>
              </span>
            </div>
          </div>

          <h3 className="font-bold text-sm leading-snug">{currentTask.title}</h3>
        </div>

        {/* Task Image & Questions - visible ONLY when stage !== 'intro' */}
        {stage !== 'intro' && (
          <div className="max-h-[40vh] overflow-y-auto no-scrollbar pb-2 space-y-3">
            <div className="rounded-xl overflow-hidden aspect-video max-h-48 bg-slate-900 relative">
              <img
                src={currentTask.imageUrl}
                alt="Exam Task"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-3 rounded-xl bg-black/20 space-y-1.5 text-xs text-slate-200">
              <span className="font-bold text-slate-300 block mb-1">Вопросы:</span>
              {currentTask.questions.map((q, i) => (
                <p key={i} className="leading-relaxed">
                  {q}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* SIMULATOR STAGE CONTROLS (Нижняя часть - панель управления) */}
        <div className="sticky bottom-0 bg-inherit border-t border-slate-700/50 pt-4 mt-2">
          {stage === 'intro' && (
          <div className="pt-2 text-center space-y-3">
            {/* Pre-flight Check Button & Status */}
            <div className="flex items-center justify-center space-x-2 pb-1">
              {micStatus === 'idle' && (
                <button
                  type="button"
                  onClick={checkMicrophone}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center space-x-1.5"
                >
                  <Mic className="w-3.5 h-3.5 text-sky-400" />
                  <span>Проверить микрофон</span>
                </button>
              )}
              {micStatus === 'success' && (
                <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center space-x-1.5 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Микрофон работает отлично!</span>
                </div>
              )}
              {micStatus === 'error' && (
                <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 flex items-center space-x-1.5 border border-rose-500/30">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>Микрофон недоступен</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400">
              Нажмите кнопку ниже. У вас будет <span className="text-amber-400 font-bold">{currentTask.prepTime} секунд</span> на подготовку, после чего запись ответа включится автоматически.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={startPrep}
                className="px-5 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <Timer className="w-4 h-4" />
                <span>Запустить симулятор экзамена (Начать подготовку)</span>
              </button>

              <label className="cursor-pointer px-4 py-3 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold text-xs rounded-xl border border-sky-500/30 inline-flex items-center space-x-2 transition-all">
                <UploadCloud className="w-4 h-4" />
                <span>Загрузить файл</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setRecordedAudioUrl(URL.createObjectURL(file));
                      setStage('finished');
                    }
                  }}
                />
              </label>
            </div>

            {audioError && (
              <p className="text-rose-400 text-[10px] mt-1 font-medium">{audioError}</p>
            )}
          </div>
        )}

        {stage === 'prep' && (
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-center space-y-3 animate-in fade-in">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              ⏳ ИДЕТ ПОДГОТОВКА К ОТВЕТУ
            </span>

            <div className="text-4xl font-mono font-extrabold text-amber-400">
              {formatSeconds(countdown)}
            </div>

            <p className="text-xs text-slate-300">
              Прочитайте вопросы, продумайте вступительные и связующие фразы.
            </p>

            <button
              onClick={() => {
                if (timerRef.current) clearInterval(timerRef.current);
                playBeep();
                setStage('transition');
                setCountdown(3);
              }}
              className="text-xs font-bold text-sky-400 hover:underline"
            >
              Пропустить таймер подготовки ➔
            </button>
          </div>
        )}

        {stage === 'transition' && (
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-center space-y-3 animate-in fade-in">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              ⚡ ПРИГОТОВЬТЕСЬ К ЗАПИСИ
            </span>

            <div className="text-5xl font-mono font-extrabold text-amber-400 animate-pulse my-2">
              {countdown}
            </div>

            <p className="text-xs text-slate-300 font-medium">
              Приготовьтесь... Запись начнётся через секунду!
            </p>
          </div>
        )}

        {stage === 'recording' && (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-center space-y-3 animate-in fade-in">
            <div className="flex items-center justify-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">
                🔴 АВТОМАТИЧЕСКАЯ ЗАПИСЬ ОТВЕТА
              </span>
            </div>

            <div className="text-4xl font-mono font-extrabold text-rose-500">
              {formatSeconds(countdown)}
            </div>

            {/* Audio Waveform with dynamic volume levels */}
            <div className="flex items-center justify-center space-x-1.5 py-2 h-14">
              {volumeLevels.map((h, idx) => (
                <span
                  key={idx}
                  className="w-1.5 bg-rose-500 rounded-full transition-all duration-75"
                  style={{
                    height: `${Math.max(6, Math.round(h * 0.45))}px`,
                  }}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={finishRecording}
                className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900 transition-colors inline-flex items-center space-x-2"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Завершить ответ раньше</span>
              </button>

              <label className="cursor-pointer px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold text-xs rounded-xl border border-sky-500/30 inline-flex items-center space-x-2 transition-all">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Загрузить аудиофайл</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setRecordedAudioUrl(URL.createObjectURL(file));
                      finishRecording();
                    }
                  }}
                />
              </label>
            </div>

            {audioError && (
              <p className="text-rose-400 text-[10px] mt-2 font-medium">{audioError}</p>
            )}
          </div>
        )}

        {stage === 'finished' && (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-center space-y-3 animate-in fade-in">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h4 className="font-bold text-sm text-emerald-400">
              Запись успешно сформирована!
            </h4>

            {/* Custom Audio Preview */}
            {Boolean(recordedAudioUrl) && (
              <div className="flex items-center space-x-3 bg-black/30 p-3 rounded-xl max-w-sm mx-auto">
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
                  className="w-9 h-9 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0 hover:bg-sky-400 transition-colors"
                >
                  {isPlayingRecorded ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <div className="flex-1 space-y-1 text-left">
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 transition-all duration-100"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-300 block">
                    {isPlayingRecorded ? 'Воспроизведение...' : 'Прослушать ответ'}
                  </span>
                </div>

                <audio
                  ref={audioPlayerRef}
                  src={recordedAudioUrl || undefined}
                  onTimeUpdate={(e) => {
                    const dur = e.currentTarget.duration;
                    if (dur) {
                      setAudioProgress((e.currentTarget.currentTime / dur) * 100);
                    }
                  }}
                  onEnded={() => {
                    setIsPlayingRecorded(false);
                    setAudioProgress(0);
                  }}
                />
              </div>
            )}

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={resetSimulator}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Попробовать снова</span>
              </button>

              <button
                onClick={() => {
                  if (recordedAudioUrl) {
                    onFinishSimulatedSpeaking(recordedAudioUrl);
                  }
                }}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center space-x-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Отправить Ангелине</span>
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
