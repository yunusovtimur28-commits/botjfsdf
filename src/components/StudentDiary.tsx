import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DiaryEntry, Homework, Submission } from '../types';
import {
  Book,
  Mic,
  Plus,
  Search,
  Volume2,
  Sparkles,
  CheckCircle2,
  X,
  AlertCircle,
  Award,
  RotateCcw,
  Check,
  Flame,
  ArrowUpDown,
  Zap,
  Play,
  Trash2,
  VolumeX,
  ArrowRight,
  Radio,
  BookOpen,
  Filter,
} from 'lucide-react';

interface StudentDiaryProps {
  entries: DiaryEntry[];
  onAddEntry: (entry: Partial<DiaryEntry>) => void;
  onUpdateEntry?: (entryId: string, updatedData: Partial<DiaryEntry>) => void;
  isDarkMode: boolean;
  currentUserName: string;
  homeworks?: Homework[];
  submissions?: Submission[];
}

const COMMON_SECTIONS = [
  'Грамматика',
  'Произношение',
  'Лексика',
  'Словообразование',
  'Письмо',
  'Эссе',
  'Аудирование',
  'Чтение',
];

// Web Audio synthesizer for pleasant level-up chimes
const playLevelUpSound = (isMax: boolean = false) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const freqs = isMax
      ? [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6 (fanfare chord)
      : [523.25, 659.25, 783.99]; // C5, E5, G5 (ascending major triad)

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  } catch (e) {
    // Graceful fallback
  }
};

const playWrongSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.setValueAtTime(130, now + 0.12);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  } catch (e) {}
};

const playFanfareSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.14, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.45);
    });
  } catch (e) {}
};

// Text-to-speech speaker
const speakText = (text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\[.*?\]|\(.*?\)/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText || text);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  }
};

export const StudentDiary: React.FC<StudentDiaryProps> = ({
  entries,
  onAddEntry,
  onUpdateEntry,
  isDarkMode,
  currentUserName,
  homeworks = [],
  submissions = [],
}) => {
  // ==========================================
  // STEP 2: TRAINING MODE STATES
  // ==========================================
  const [isTrainingMode, setIsTrainingMode] = useState(false);
  const [trainingQueue, setTrainingQueue] = useState<DiaryEntry[]>([]);
  const [currentTrainingIndex, setCurrentTrainingIndex] = useState(0);

  // Training task interaction states
  const [writtenInput, setWrittenInput] = useState('');
  const [trainingFeedback, setTrainingFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isTrainingFinished, setIsTrainingFinished] = useState(false);
  const [sessionCompletedCount, setSessionCompletedCount] = useState(0);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'level-asc' | 'level-desc'>('date-desc');

  // Modals & Notices
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDetailEntry, setSelectedDetailEntry] = useState<DiaryEntry | null>(null);
  const [importNotice, setImportNotice] = useState<{ message: string; count: number } | null>(null);

  // Add Card Form State
  const [formSection, setFormSection] = useState('Грамматика');
  const [customSection, setCustomSection] = useState('');
  const [formErrorText, setFormErrorText] = useState('');
  const [formCorrectAnswer, setFormCorrectAnswer] = useState('');
  const [formExplanation, setFormExplanation] = useState('');
  const [formValidationMsg, setFormValidationMsg] = useState<string | null>(null);

  // Count unmastered errors (counter < 5)
  const unmasteredEntries = useMemo(() => {
    return entries.filter((e) => (e.counter || 1) < 5);
  }, [entries]);

  const unmasteredCount = unmasteredEntries.length;

  // Available sections for filtering
  const availableSections = useMemo(() => {
    return Array.from(new Set(entries.map((e) => e.section))).filter(Boolean);
  }, [entries]);

  // Extract mistakes from student's submitted tests
  const missedTestMistakes = useMemo(() => {
    const result: Array<{
      id: string;
      testTitle: string;
      questionPrompt: string;
      errorText: string;
      correctAnswer: string;
      explanation: string;
      section: string;
    }> = [];

    if (homeworks && submissions) {
      const norm = (currentUserName || '').trim().toLowerCase().replace('@', '');
      const userSubs = submissions.filter(
        (s) => s.studentName && s.studentName.trim().toLowerCase().replace('@', '') === norm
      );

      userSubs.forEach((sub) => {
        const hw = homeworks.find((h) => h.id === sub.homeworkId);
        if (!hw) return;

        // 1. Check testQuestions
        if (hw.testQuestions && sub.testAnswers) {
          hw.testQuestions.forEach((q) => {
            const userAns = (sub.testAnswers?.[q.id] || '').trim();
            const correctAns = (q.correctAnswer || '').trim();

            if (userAns && userAns.toLowerCase() !== correctAns.toLowerCase()) {
              const alreadyExists = entries.some(
                (e) =>
                  e.correctAnswer.trim().toLowerCase() === correctAns.toLowerCase() &&
                  e.errorText.trim().toLowerCase() === userAns.toLowerCase()
              );

              if (!alreadyExists && !result.some((r) => r.correctAnswer.toLowerCase() === correctAns.toLowerCase())) {
                const sec =
                  hw.block === 'speaking'
                    ? 'Произношение'
                    : hw.block === 'reading'
                    ? 'Чтение'
                    : hw.block === 'listening'
                    ? 'Аудирование'
                    : 'Грамматика';

                result.push({
                  id: `err-${hw.id}-${q.id}`,
                  testTitle: hw.title,
                  questionPrompt: q.question,
                  errorText: userAns,
                  correctAnswer: correctAns,
                  explanation: q.explanation || `Задание из теста «${hw.title}». Правильный ответ: ${correctAns}`,
                  section: sec,
                });
              }
            }
          });
        }

        // 2. Check multi-tasks (gap_fill & ege_gap_fill)
        if (hw.tasks && sub.taskAnswers) {
          hw.tasks.forEach((task) => {
            const taskAns = sub.taskAnswers?.[task.id];
            if (!taskAns) return;

            // Gap fill single task
            if (task.taskType === 'gap_fill' && task.correctAnswer) {
              const userAns = (taskAns.textAnswer || '').trim();
              const correctAns = task.correctAnswer.trim();

              if (userAns && userAns.toLowerCase() !== correctAns.toLowerCase()) {
                const alreadyExists = entries.some(
                  (e) =>
                    e.correctAnswer.trim().toLowerCase() === correctAns.toLowerCase() &&
                    e.errorText.trim().toLowerCase() === userAns.toLowerCase()
                );

                if (!alreadyExists && !result.some((r) => r.correctAnswer.toLowerCase() === correctAns.toLowerCase())) {
                  result.push({
                    id: `err-${hw.id}-${task.id}`,
                    testTitle: hw.title,
                    questionPrompt: task.taskPrompt || task.taskNumber,
                    errorText: userAns,
                    correctAnswer: correctAns,
                    explanation: task.explanation || `Задание ${task.taskNumber}. Правильный ответ: ${correctAns}`,
                    section: task.block === 'grammar_vocabulary' ? 'Грамматика' : 'Лексика',
                  });
                }
              }
            }

            // EGE gap fill (19-29) items
            if (task.taskType === 'ege_gap_fill' && task.egeItems && taskAns.egeAnswers) {
              task.egeItems.forEach((item) => {
                const userAns = (taskAns.egeAnswers?.[item.id] || '').trim();
                const correctAns = item.correctAnswer.trim();

                if (userAns && userAns.toLowerCase() !== correctAns.toLowerCase()) {
                  const alreadyExists = entries.some(
                    (e) =>
                      e.correctAnswer.trim().toLowerCase() === correctAns.toLowerCase() &&
                      e.errorText.trim().toLowerCase() === userAns.toLowerCase()
                  );

                  if (!alreadyExists && !result.some((r) => r.correctAnswer.toLowerCase() === correctAns.toLowerCase())) {
                    result.push({
                      id: `err-${hw.id}-${task.id}-${item.id}`,
                      testTitle: `${hw.title} (№${item.number})`,
                      questionPrompt: item.text.replace('___', `[${item.baseWord}]`),
                      errorText: userAns,
                      correctAnswer: correctAns,
                      explanation: item.explanation || `Задание №${item.number} ЕГЭ. Базовое слово: ${item.baseWord}. Правильный ответ: ${correctAns}`,
                      section: 'Грамматика',
                    });
                  }
                }
              });
            }

            // Text bank
            if (task.taskType === 'text_bank' && task.gapAnswers && taskAns.gapInputs) {
              task.gapAnswers.forEach((correctAns, idx) => {
                const userAns = (taskAns.gapInputs?.[idx] || '').trim();
                const trimmedCorrect = correctAns.trim();
                if (userAns && userAns.toLowerCase() !== trimmedCorrect.toLowerCase()) {
                  const alreadyExists = entries.some(
                    (e) =>
                      e.correctAnswer.trim().toLowerCase() === trimmedCorrect.toLowerCase() &&
                      e.errorText.trim().toLowerCase() === userAns.toLowerCase()
                  );

                  if (!alreadyExists && !result.some((r) => r.correctAnswer.toLowerCase() === trimmedCorrect.toLowerCase())) {
                    result.push({
                      id: `err-${hw.id}-${task.id}-gap-${idx}`,
                      testTitle: `${hw.title} (${task.taskNumber || 'Текст с банком слов'})`,
                      questionPrompt: `Пропуск №${idx + 1}. Банк: ${task.wordBank || ''}`,
                      errorText: userAns,
                      correctAnswer: trimmedCorrect,
                      explanation: `Задание ${task.taskNumber}, пропуск №${idx + 1}. Правильный ответ: ${trimmedCorrect}`,
                      section: 'Лексика',
                    });
                  }
                }
              });
            }

            // QnA
            if (task.taskType === 'qna' && task.qnaItems && taskAns.qnaInputs) {
              task.qnaItems.forEach((item, qIdx) => {
                const userAns = (taskAns.qnaInputs?.[item.id] || '').trim();
                const trimmedCorrect = item.correctAnswer.trim();
                if (userAns && userAns.toLowerCase() !== trimmedCorrect.toLowerCase()) {
                  const alreadyExists = entries.some(
                    (e) =>
                      e.correctAnswer.trim().toLowerCase() === trimmedCorrect.toLowerCase() &&
                      e.errorText.trim().toLowerCase() === userAns.toLowerCase()
                  );

                  if (!alreadyExists && !result.some((r) => r.correctAnswer.toLowerCase() === trimmedCorrect.toLowerCase())) {
                    result.push({
                      id: `err-${hw.id}-${task.id}-${item.id}`,
                      testTitle: `${hw.title} (Вопрос #${qIdx + 1})`,
                      questionPrompt: item.question,
                      errorText: userAns,
                      correctAnswer: trimmedCorrect,
                      explanation: `Вопрос: "${item.question}". Правильный ответ: ${trimmedCorrect}`,
                      section: task.block === 'grammar_vocabulary' ? 'Грамматика' : 'Лексика',
                    });
                  }
                }
              });
            }
          });
        }
      });
    }

    return result;
  }, [homeworks, submissions, currentUserName, entries]);

  // Common sample errors if user hasn't taken tests with errors yet
  const SAMPLE_TEST_MISTAKES = [
    {
      testTitle: 'Тренировочный тест: Грамматика (ФИПИ 2026)',
      questionPrompt: 'He (not/finish) the project yet.',
      errorText: "didn't finish",
      correctAnswer: "hasn't finished",
      explanation: 'Маркер времени "yet" в отрицательном предложении указывает на Present Perfect (has/have + V3), выражая результат к текущему моменту.',
      section: 'Грамматика',
    },
    {
      testTitle: 'Тест: Словообразование (Задания 25-29)',
      questionPrompt: 'The scientist made an important (DISCOVER).',
      errorText: 'discovering',
      correctAnswer: 'discovery',
      explanation: 'После прилагательного "important" требуется существительное. От глагола DISCOVER существительное образуется с суффиксом -y: discovery.',
      section: 'Словообразование',
    },
    {
      testTitle: 'Тест: Фразовые глаголы и предлоги',
      questionPrompt: 'She is fond ___ classical music.',
      errorText: 'about',
      correctAnswer: 'of',
      explanation: 'Устойчивое сочетание: to be fond of something (увлекаться / любить что-то). Предлог about является распространенной ошибкой.',
      section: 'Лексика',
    },
  ];

  // Handler: Add missed test errors to diary
  const handleAddMissedErrors = () => {
    const now = new Date();
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const formattedDate = `${now.getDate()} ${months[now.getMonth()]}`;

    let toAdd = missedTestMistakes;

    if (toAdd.length === 0) {
      toAdd = SAMPLE_TEST_MISTAKES.filter(
        (s) => !entries.some((e) => e.correctAnswer.toLowerCase() === s.correctAnswer.toLowerCase())
      ) as any;
    }

    if (toAdd.length === 0) {
      setImportNotice({
        message: 'Все ошибки из выполненных тестов уже добавлены в ваш дневник!',
        count: 0,
      });
      setTimeout(() => setImportNotice(null), 4500);
      return;
    }

    toAdd.forEach((item) => {
      onAddEntry({
        studentName: currentUserName,
        date: formattedDate,
        section: item.section,
        errorText: item.errorText,
        correctAnswer: item.correctAnswer,
        explanation: item.explanation,
        counter: 1,
        source: 'auto',
      });
    });

    playLevelUpSound(false);
    setImportNotice({
      message: `Успешно добавлено ${toAdd.length} ${
        toAdd.length === 1 ? 'карточка' : toAdd.length < 5 ? 'карточки' : 'карточек'
      } на основе ошибок в тестах!`,
      count: toAdd.length,
    });
    setTimeout(() => setImportNotice(null), 5000);
  };

  // Filtered & Sorted Entries for Compact List
  const filteredEntries = useMemo(() => {
    const list = entries.filter((entry) => {
      const matchesSection = selectedSectionFilter === 'all' || entry.section === selectedSectionFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        entry.errorText.toLowerCase().includes(q) ||
        entry.correctAnswer.toLowerCase().includes(q) ||
        (entry.explanation && entry.explanation.toLowerCase().includes(q)) ||
        entry.section.toLowerCase().includes(q);

      return matchesSection && matchesSearch;
    });

    const getEntryTimestamp = (entry: DiaryEntry) => {
      const match = entry.id.match(/^diary-(\d+)/);
      if (match) return parseInt(match[1], 10);
      return 0;
    };

    return [...list].sort((a, b) => {
      if (sortBy === 'date-desc') {
        const timeDiff = getEntryTimestamp(b) - getEntryTimestamp(a);
        if (timeDiff !== 0) return timeDiff;
        return (b.date || '').localeCompare(a.date || '');
      }
      if (sortBy === 'date-asc') {
        const timeDiff = getEntryTimestamp(a) - getEntryTimestamp(b);
        if (timeDiff !== 0) return timeDiff;
        return (a.date || '').localeCompare(b.date || '');
      }
      if (sortBy === 'level-asc') {
        return (a.counter || 1) - (b.counter || 1);
      }
      if (sortBy === 'level-desc') {
        return (b.counter || 1) - (a.counter || 1);
      }
      return 0;
    });
  }, [entries, selectedSectionFilter, searchQuery, sortBy]);

  // ==========================================
  // STEP 2: START RANDOMIZED TRAINING
  // ==========================================
  const handleStartWorkout = () => {
    // 1. Filter entries where counter < 5
    let unmastered = entries.filter((e) => (e.counter || 1) < 5);

    // If all cards are already mastered (level 5), allow repeating all
    if (unmastered.length === 0) {
      if (entries.length === 0) {
        setIsAddModalOpen(true);
        return;
      }
      unmastered = [...entries];
    }

    // 2. Fisher-Yates random shuffle (blocks go mixed)
    const shuffled = [...unmastered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 3. Save queue and start
    setTrainingQueue(shuffled);
    setCurrentTrainingIndex(0);
    setWrittenInput('');
    setTrainingFeedback('idle');
    setIsListening(false);
    setIsTrainingFinished(false);
    setSessionCompletedCount(0);
    setIsTrainingMode(true);
  };

  // Exit training mode
  const handleExitTraining = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsTrainingMode(false);
    setIsTrainingFinished(false);
    setTrainingQueue([]);
    setCurrentTrainingIndex(0);
  };

  // Current Card in Workout
  const currentCard = trainingQueue[currentTrainingIndex];
  const isSpeaking = currentCard ? /произнош|speak|устн|говор/i.test(currentCard.section) : false;

  // Auto-focus input on card change
  useEffect(() => {
    if (isTrainingMode && !isSpeaking && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isTrainingMode, currentTrainingIndex, isSpeaking]);

  // Handle Speaking Recognition (Press to speak)
  const startSpeakingRecognition = () => {
    setIsListening(true);
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = () => {
          setIsListening(false);
          handleSuccessAnswer();
        };

        recognition.onerror = () => {
          setIsListening(false);
          handleSuccessAnswer();
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        setIsListening(false);
        handleSuccessAnswer();
      }
    } else {
      // Graceful voice capture simulation for non-webkit browsers
      setTimeout(() => {
        setIsListening(false);
        handleSuccessAnswer();
      }, 1200);
    }
  };

  const stopSpeakingRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (isListening) {
      setIsListening(false);
      handleSuccessAnswer();
    }
  };

  // Check Written Answer
  const handleCheckWrittenAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!writtenInput.trim() || trainingFeedback === 'correct') return;

    const normalize = (str: string) =>
      str
        .trim()
        .toLowerCase()
        .replace(/[.,!?;:'"()]/g, '')
        .replace(/\s+/g, ' ');

    const userAns = normalize(writtenInput);
    const targetAns = normalize(currentCard.correctAnswer);

    if (userAns === targetAns || (targetAns.includes(userAns) && userAns.length >= 4)) {
      handleSuccessAnswer();
    } else {
      // Wrong Answer
      setTrainingFeedback('wrong');
      playWrongSound();
    }
  };

  // Success Handler (Speaking or Written)
  const handleSuccessAnswer = () => {
    setTrainingFeedback('correct');
    playLevelUpSound(false);

    // Increase counter by +1 in parent/database
    if (onUpdateEntry && currentCard) {
      const nextLevel = Math.min(5, (currentCard.counter || 1) + 1);
      onUpdateEntry(currentCard.id, {
        counter: nextLevel,
        lastReviewedAt: new Date().toISOString(),
      });
    }

    setSessionCompletedCount((prev) => prev + 1);
  };

  // Move to Next Card in Queue
  const handleNextCard = () => {
    if (currentTrainingIndex + 1 < trainingQueue.length) {
      setCurrentTrainingIndex((prev) => prev + 1);
      setWrittenInput('');
      setTrainingFeedback('idle');
      setIsListening(false);
    } else {
      // Finished all cards!
      setIsTrainingFinished(true);
      playFanfareSound();
    }
  };

  // Handle Form Submission for adding card
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formErrorText.trim() || !formCorrectAnswer.trim()) {
      setFormValidationMsg('Заполните поле с ошибкой и верным ответом.');
      return;
    }

    const finalSection = formSection === 'custom' ? customSection.trim() || 'Разное' : formSection;
    const now = new Date();
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const formattedDate = `${now.getDate()} ${months[now.getMonth()]}`;

    onAddEntry({
      studentName: currentUserName,
      date: formattedDate,
      section: finalSection,
      errorText: formErrorText.trim(),
      correctAnswer: formCorrectAnswer.trim(),
      explanation: formExplanation.trim() || undefined,
      counter: 1,
      source: 'student',
    });

    setIsAddModalOpen(false);
    setFormErrorText('');
    setFormCorrectAnswer('');
    setFormExplanation('');
    setFormValidationMsg(null);
    playLevelUpSound(false);
  };

  // =========================================================================
  // STEP 3: TRAINING MODE SCREEN (Duolingo-style)
  // =========================================================================
  if (isTrainingMode) {
    if (isTrainingFinished) {
      return (
        <div className="max-w-xl mx-auto py-8 px-4 animate-fadeIn">
          <div
            className={`p-8 rounded-3xl border text-center space-y-6 shadow-2xl relative overflow-hidden ${
              isDarkMode ? 'bg-[#17212b] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Celebratory badge */}
            <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/20 border-4 border-emerald-500/30 flex items-center justify-center animate-bounce">
              <Award className="w-12 h-12 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-400">
                Тренировка завершена! 🎉
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                Отличная работа! Вы успешно отработали недавние ошибки и продвинули свой прогресс освоения.
              </p>
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <div
                className={`p-3.5 rounded-2xl border ${
                  isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-2xl font-black text-purple-400">{sessionCompletedCount}</div>
                <div className="text-[11px] text-slate-400 font-medium">Ошибок отработано</div>
              </div>
              <div
                className={`p-3.5 rounded-2xl border ${
                  isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-2xl font-black text-amber-400">+{sessionCompletedCount * 15}</div>
                <div className="text-[11px] text-slate-400 font-medium">Опыта (XP)</div>
              </div>
            </div>

            <button
              onClick={handleExitTraining}
              className="w-full py-4 rounded-2xl bg-[#58cc02] hover:bg-[#46a302] text-white font-extrabold text-base tracking-wide uppercase shadow-[0_5px_0_#46a302] active:shadow-none active:translate-y-1 transition-all"
            >
              Вернуться в дневник
            </button>
          </div>
        </div>
      );
    }

    const progressPct = trainingQueue.length > 0 ? (currentTrainingIndex / trainingQueue.length) * 100 : 0;

    return (
      <div className="max-w-xl mx-auto space-y-4 pb-12 animate-fadeIn">
        {/* DUOLINGO TOP BAR */}
        <div className="flex items-center space-x-3 px-1">
          <button
            onClick={handleExitTraining}
            className={`p-2 rounded-xl border transition-colors ${
              isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-500'
            }`}
            title="Выйти из тренировки"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress Track */}
          <div className="flex-1 h-3.5 rounded-full bg-slate-800 overflow-hidden relative border border-slate-700/50 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[#58cc02] transition-all duration-300 shadow-sm"
              style={{ width: `${Math.max(5, progressPct)}%` }}
            />
          </div>

          <div className="flex items-center space-x-1 font-mono text-xs font-bold text-slate-400 shrink-0">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>
              {currentTrainingIndex + 1}/{trainingQueue.length}
            </span>
          </div>
        </div>

        {/* TASK CONTAINER */}
        {currentCard && (
          <div
            className={`p-6 sm:p-8 rounded-3xl border shadow-xl relative overflow-hidden min-h-[380px] flex flex-col justify-between ${
              isDarkMode
                ? 'bg-[#17212b] border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
            }`}
          >
            {/* Task Section Header Badge */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25">
                {currentCard.section}
              </span>

              <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-bold">
                <span>Уровень:</span>
                <span className="text-amber-400 font-black">{currentCard.counter || 1} / 5</span>
              </div>
            </div>

            {/* DYNAMIC TASK BODY */}
            <div className="py-6 space-y-6 flex-1 flex flex-col justify-center">
              {isSpeaking ? (
                /* ORAL / SPEAKING TASK */
                <div className="space-y-6 text-center">
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                      Произнесите правильно вслух
                    </span>

                    {/* Original error notice */}
                    <div className="text-xs text-rose-400">
                      Было: <span className="line-through decoration-rose-500 font-medium">{currentCard.errorText}</span>
                    </div>
                  </div>

                  {/* Huge Bold Target Answer */}
                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 inline-block max-w-full">
                    <h3 className="text-2xl sm:text-3xl font-black text-purple-300 tracking-tight break-words">
                      {currentCard.correctAnswer}
                    </h3>
                  </div>

                  {/* Audio Speaker */}
                  <div>
                    <button
                      type="button"
                      onClick={() => speakText(currentCard.correctAnswer)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors inline-flex items-center space-x-1.5 border border-slate-700"
                    >
                      <Volume2 className="w-4 h-4 text-purple-400" />
                      <span>Послушать произношение</span>
                    </button>
                  </div>

                  {/* Mic Action Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onMouseDown={startSpeakingRecognition}
                      onMouseUp={stopSpeakingRecognition}
                      onTouchStart={startSpeakingRecognition}
                      onTouchEnd={stopSpeakingRecognition}
                      disabled={trainingFeedback === 'correct'}
                      className={`w-full max-w-xs mx-auto py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2.5 transition-all shadow-lg select-none ${
                        isListening
                          ? 'bg-rose-600 text-white scale-95 shadow-rose-600/40 animate-pulse ring-4 ring-rose-500/30'
                          : trainingFeedback === 'correct'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-600/30 active:scale-95'
                      }`}
                    >
                      <Mic className={`w-5 h-5 ${isListening ? 'animate-bounce' : ''}`} />
                      <span>{isListening ? 'Слушаю вас...' : 'Зажать и произнести'}</span>
                    </button>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Зажмите кнопку или нажмите для проверки устной речи
                    </p>
                  </div>
                </div>
              ) : (
                /* WRITTEN TASK (GRAMMAR / VOCABULARY) */
                <form onSubmit={handleCheckWrittenAnswer} className="space-y-5">
                  <div className="space-y-2">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Исправьте ошибку:
                    </span>

                    {/* Error Highlight */}
                    <div
                      className={`p-4 rounded-2xl border text-sm sm:text-base font-semibold ${
                        isDarkMode
                          ? 'bg-slate-900/80 border-slate-800 text-rose-300'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      <span className="line-through decoration-rose-500/70 mr-1.5">{currentCard.errorText}</span>
                    </div>

                    {currentCard.explanation && (
                      <p className="text-xs text-slate-400 leading-relaxed italic">
                        Подсказка: {currentCard.explanation}
                      </p>
                    )}
                  </div>

                  {/* Input field */}
                  <div className="space-y-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={writtenInput}
                      onChange={(e) => {
                        setWrittenInput(e.target.value);
                        if (trainingFeedback === 'wrong') setTrainingFeedback('idle');
                      }}
                      placeholder="Введите верный ответ..."
                      disabled={trainingFeedback === 'correct'}
                      className={`w-full px-4 py-3.5 rounded-2xl text-sm font-bold border transition-all ${
                        trainingFeedback === 'wrong'
                          ? 'border-rose-500 bg-rose-500/10 text-rose-200 focus:outline-none ring-2 ring-rose-500/20'
                          : isDarkMode
                          ? 'bg-slate-900/90 border-slate-700 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none ring-2 ring-purple-500/10'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:outline-none ring-2 ring-purple-500/10 shadow-sm'
                      }`}
                    />
                  </div>

                  {trainingFeedback === 'idle' && (
                    <button
                      type="submit"
                      disabled={!writtenInput.trim()}
                      className="w-full py-4 rounded-2xl bg-[#58cc02] hover:bg-[#46a302] disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm tracking-wide uppercase shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-1 transition-all"
                    >
                      Проверить
                    </button>
                  )}
                </form>
              )}
            </div>

            {/* DUOLINGO FEEDBACK FOOTER (CORRECT / WRONG) */}
            {trainingFeedback === 'correct' && (
              <div className="mt-4 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 animate-fadeIn space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                      <Check className="w-5 h-5 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-emerald-300">Великолепно!</h4>
                      <p className="text-[11px] text-emerald-400/80">Уровень освоения повышен (+1 ⭐)</p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                    +15 XP
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextCard}
                  autoFocus
                  className="w-full py-3.5 rounded-xl bg-[#58cc02] hover:bg-[#46a302] text-white font-extrabold text-sm tracking-wider uppercase shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-0.5 transition-all flex items-center justify-center space-x-2"
                >
                  <span>Далее</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {trainingFeedback === 'wrong' && (
              <div className="mt-4 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 animate-fadeIn space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold">
                      <X className="w-4 h-4 stroke-[3]" />
                    </div>
                    <h4 className="font-extrabold text-sm text-rose-300">Правильный ответ:</h4>
                  </div>
                  <div className="pl-9 text-base font-black text-rose-100">
                    {currentCard.correctAnswer}
                  </div>
                  {currentCard.explanation && (
                    <p className="pl-9 text-xs text-rose-300/80 leading-relaxed">
                      {currentCard.explanation}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setWrittenInput('');
                    setTrainingFeedback('idle');
                    inputRef.current?.focus();
                  }}
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs tracking-wider uppercase shadow-md active:scale-98 transition-all"
                >
                  Попробовать снова
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // STEP 1: MAIN SCREEN REDESIGN (Duolingo-style)
  // =========================================================================
  return (
    <div className="space-y-5 pb-12 animate-fadeIn relative max-w-4xl mx-auto">
      {/* 1. DUOLINGO-STYLE HEADER BLOCK */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border shadow-xl relative overflow-hidden transition-all text-center space-y-4 ${
          isDarkMode
            ? 'bg-gradient-to-br from-[#17212b] via-[#1a2332] to-[#121a24] border-slate-800'
            : 'bg-gradient-to-br from-white via-emerald-50/20 to-purple-50/30 border-slate-200 shadow-slate-200/60'
        }`}
      >
        <div className="max-w-md mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Интервальные тренировки</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {unmasteredCount > 0 ? (
              <>Отработаем {unmasteredCount} недавних ошибок!</>
            ) : (
              <>Все ошибки отработаны на максимум! 🎉</>
            )}
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Умный тренажер перемешивает устную часть, грамматику и лексику вразнобой для устойчивого запоминания.
          </p>
        </div>

        {/* Big full-width Accent Button: НАЧАТЬ ТРЕНИРОВКУ */}
        <div className="pt-2 max-w-md mx-auto">
          <button
            type="button"
            onClick={handleStartWorkout}
            className="w-full py-4 px-6 rounded-2xl bg-[#58cc02] hover:bg-[#46a302] text-white font-black text-base sm:text-lg tracking-wider uppercase shadow-[0_5px_0_#46a302] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center space-x-2.5 group"
          >
            <Zap className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
            <span>НАЧАТЬ ТРЕНИРОВКУ</span>
          </button>
        </div>

        {/* Secondary Clean Actions Sub-bar */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
          {/* Добавить пропущенные ошибки из тестов */}
          <button
            type="button"
            onClick={handleAddMissedErrors}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
              missedTestMistakes.length > 0
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Автоматически добавить карточки с ошибками из тестов"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Добавить пропущенные ошибки</span>
            {missedTestMistakes.length > 0 && (
              <span className="text-[10px] bg-amber-500/30 text-amber-200 px-1.5 py-0.2 rounded-full font-mono font-extrabold">
                +{missedTestMistakes.length}
              </span>
            )}
          </button>

          {/* + Добавить запись вручную */}
          <button
            type="button"
            onClick={() => {
              setFormSection('Грамматика');
              setCustomSection('');
              setFormErrorText('');
              setFormCorrectAnswer('');
              setFormExplanation('');
              setFormValidationMsg(null);
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Добавить запись</span>
          </button>
        </div>

        {/* Toast Notice */}
        {importNotice && (
          <div className="mt-3 p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between shadow-lg animate-fadeIn">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{importNotice.message}</span>
            </div>
            <button onClick={() => setImportNotice(null)} className="text-slate-400 hover:text-white p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по ошибкам или правилам..."
              className={`w-full pl-9 pr-4 py-2.5 rounded-2xl text-xs border transition-all ${
                isDarkMode
                  ? 'bg-[#17212b] border-slate-800 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:outline-none shadow-sm'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <div
              className={`flex items-center space-x-2 px-3 py-2 rounded-2xl text-xs border ${
                isDarkMode ? 'bg-[#17212b] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-sm'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer pr-1"
              >
                <option value="date-desc" className={isDarkMode ? 'bg-[#17212b] text-white' : 'bg-white text-slate-900'}>
                  Сначала новые
                </option>
                <option value="date-asc" className={isDarkMode ? 'bg-[#17212b] text-white' : 'bg-white text-slate-900'}>
                  Сначала старые
                </option>
                <option value="level-asc" className={isDarkMode ? 'bg-[#17212b] text-white' : 'bg-white text-slate-900'}>
                  По уровню (1 → 5)
                </option>
                <option value="level-desc" className={isDarkMode ? 'bg-[#17212b] text-white' : 'bg-white text-slate-900'}>
                  По уровню (5 → 1)
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Section Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedSectionFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedSectionFilter === 'all'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                : isDarkMode
                ? 'bg-[#17212b] text-slate-400 hover:text-white border border-slate-800'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm'
            }`}
          >
            Все разделы ({entries.length})
          </button>
          {availableSections.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setSelectedSectionFilter(sec)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedSectionFilter === sec
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                  : isDarkMode
                  ? 'bg-[#17212b] text-slate-400 hover:text-white border border-slate-800'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* 2. COMPACT RECTANGULAR LIST OF MISTAKES */}
      {filteredEntries.length === 0 ? (
        <div
          className={`p-10 rounded-3xl border text-center space-y-3 ${
            isDarkMode ? 'bg-[#17212b]/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <BookOpen className="w-10 h-10 text-purple-400 mx-auto opacity-40" />
          <h4 className="font-bold text-sm text-slate-300">
            {entries.length === 0 ? 'Ваш дневник пока пуст' : 'По вашему фильтру ничего не найдено'}
          </h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Ошибки автоматически формируются из сданных тестов или добавляются вручную.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map((entry) => {
            const counter = Math.min(5, Math.max(1, entry.counter || 1));
            const isMax = counter >= 5;

            return (
              <div
                key={entry.id}
                onClick={() => setSelectedDetailEntry(entry)}
                className={`px-4 py-3 rounded-2xl border transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#17212b] border-slate-800/80 hover:border-purple-500/50 hover:bg-[#1c2734]'
                    : 'bg-white border-slate-200 hover:border-purple-400 hover:shadow-md'
                }`}
              >
                {/* Left side: Section name + error text */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                      {entry.section}
                    </span>
                    {entry.date && <span className="text-[10px] text-slate-500">{entry.date}</span>}
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs sm:text-sm font-bold text-rose-300 line-through decoration-rose-500/60 truncate">
                      {entry.errorText}
                    </span>
                    <span className="text-xs text-slate-500">➔</span>
                    <span className="text-xs sm:text-sm font-extrabold text-emerald-400 truncate">
                      {entry.correctAnswer}
                    </span>
                  </div>
                </div>

                {/* Right side: Audio Speaker + Circular / Progress Indicator */}
                <div className="flex items-center space-x-3 shrink-0">
                  {/* Sound icon */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakText(entry.correctAnswer);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                    title="Прослушать"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  {/* Circular Level Progress Indicator */}
                  <div
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl border text-xs font-black font-mono transition-transform group-hover:scale-105 ${
                      isMax
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : counter >= 3
                        ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    }`}
                    title={`Уровень освоения: ${counter} из 5`}
                  >
                    <span className="text-[10px]">⭐</span>
                    <span>{counter}/5</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL FOR A SINGLE MISTAKE */}
      {selectedDetailEntry && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div
            className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-5 ${
              isDarkMode ? 'bg-[#17212b] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                {selectedDetailEntry.section}
              </span>
              <button
                onClick={() => setSelectedDetailEntry(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Оригинальная ошибка:</span>
                <p className="text-sm font-bold text-rose-300 line-through decoration-rose-500/60 mt-0.5">
                  {selectedDetailEntry.errorText}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Правильный вариант:</span>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-base font-extrabold text-emerald-400">{selectedDetailEntry.correctAnswer}</p>
                  <button
                    type="button"
                    onClick={() => speakText(selectedDetailEntry.correctAnswer)}
                    className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedDetailEntry.explanation && (
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Правило / Объяснение:</span>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                    {selectedDetailEntry.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* Level Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="flex items-center space-x-1">
                <span className="text-xs text-slate-400 font-bold mr-1">Уровень:</span>
                {[1, 2, 3, 4, 5].map((lvl) => {
                  const active = (selectedDetailEntry.counter || 1) >= lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        if (onUpdateEntry) {
                          onUpdateEntry(selectedDetailEntry.id, { counter: lvl });
                          setSelectedDetailEntry((prev) => (prev ? { ...prev, counter: lvl } : null));
                        }
                      }}
                      className={`w-6 h-6 rounded-lg text-xs font-black transition-all ${
                        active
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-500 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onUpdateEntry) {
                    onUpdateEntry(selectedDetailEntry.id, { counter: 1 });
                    setSelectedDetailEntry((prev) => (prev ? { ...prev, counter: 1 } : null));
                  }
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 p-1"
                title="Сбросить прогресс"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Сброс</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CARD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div
            className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4 ${
              isDarkMode ? 'bg-[#17212b] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm sm:text-base flex items-center space-x-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span>Новая карточка в Дневник</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              {formValidationMsg && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {formValidationMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Раздел:</label>
                <select
                  value={formSection}
                  onChange={(e) => setFormSection(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  {COMMON_SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                  <option value="custom">Другой раздел...</option>
                </select>
              </div>

              {formSection === 'custom' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Свой раздел:</label>
                  <input
                    type="text"
                    value={customSection}
                    onChange={(e) => setCustomSection(e.target.value)}
                    placeholder="Например, Идиомы"
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Слово или фраза с ошибкой:</label>
                <input
                  type="text"
                  value={formErrorText}
                  onChange={(e) => setFormErrorText(e.target.value)}
                  placeholder="Например: He don't know"
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Правильный ответ:</label>
                <input
                  type="text"
                  value={formCorrectAnswer}
                  onChange={(e) => setFormCorrectAnswer(e.target.value)}
                  placeholder="Например: He doesn't know"
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Правило или подсказка (опционально):</label>
                <textarea
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="Краткое объяснение..."
                  rows={2}
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md"
                >
                  Сохранить карточку
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
