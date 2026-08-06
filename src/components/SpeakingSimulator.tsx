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
  const [stage, setStage] = useState<'intro' | 'prep' | 'recording' | 'finished'>('intro');

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

  // Audio recording simulation
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
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

  // Stage transitions
  const startPrep = () => {
    playBeep();
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
            startRecordingStage();
            return 0;
          }
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

  const startRecordingStage = () => {
    setStage('recording');
    setCountdown(currentTask.answerTime);
  };

  const finishRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStage('finished');
    setRecordedAudioUrl('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
  };

  const resetSimulator = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStage('intro');
    setRecordedAudioUrl(null);
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
          Точная симуляция экзамена: 40 секунд подготовки ➔ Автоматическая запись ответа
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

        {/* Task Image */}
        <div className="rounded-xl overflow-hidden aspect-video max-h-48 bg-slate-900 relative">
          <img
            src={currentTask.imageUrl}
            alt="Exam Task"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Questions list */}
        <div className="p-3 rounded-xl bg-black/20 space-y-1.5 text-xs text-slate-200">
          <span className="font-bold text-slate-300 block mb-1">Вопросы задания:</span>
          {currentTask.questions.map((q, i) => (
            <p key={i} className="leading-relaxed">
              {q}
            </p>
          ))}
        </div>

        {/* SIMULATOR STAGE CONTROLS */}
        {stage === 'intro' && (
          <div className="pt-2 text-center space-y-3">
            <p className="text-xs text-slate-400">
              Нажмите кнопку ниже. У вас будет <span className="text-amber-400 font-bold">{currentTask.prepTime} секунд</span> на подготовку, после чего запись ответа включится автоматически.
            </p>

            <button
              onClick={startPrep}
              className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              <Timer className="w-4 h-4" />
              <span>Запустить симулятор экзамена (Начать подготовку)</span>
            </button>
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
              onClick={startRecordingStage}
              className="text-xs font-bold text-sky-400 hover:underline"
            >
              Пропустить таймер подготовки ➔
            </button>
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

            {/* Audio Waveform */}
            <div className="flex items-center justify-center space-x-1.5 py-2">
              {[40, 80, 100, 60, 90, 70, 95, 50, 85, 30].map((h, idx) => (
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

            <button
              onClick={finishRecording}
              className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900 transition-colors inline-flex items-center space-x-2"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Завершить ответ раньше</span>
            </button>
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

            {/* Audio Preview */}
            {recordedAudioUrl && (
              <div className="flex items-center justify-center space-x-3 bg-black/30 p-3 rounded-xl max-w-sm mx-auto">
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
                  className="w-9 h-9 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0"
                >
                  {isPlayingRecorded ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <audio
                  ref={audioPlayerRef}
                  src={recordedAudioUrl}
                  onEnded={() => setIsPlayingRecorded(false)}
                />
                <span className="text-xs font-mono text-slate-300">Прослушать ответ (1:15)</span>
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
  );
};
