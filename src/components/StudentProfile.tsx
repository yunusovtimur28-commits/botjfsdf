import React, { useState } from 'react';
import { StudentProfile as StudentProfileType, RegisteredStudent, Submission } from '../types';
import {
  Flame,
  Crown,
  Zap,
  Award,
  TrendingUp,
  Target,
  CheckCircle,
  Calendar,
  Sparkles,
  ChevronRight,
  BarChart3,
  Feather,
  Edit3,
  X,
  Camera,
  Upload,
  User,
  Send,
  Users,
  GraduationCap,
  Lock,
} from 'lucide-react';

export interface UpdatedProfileData {
  name: string;
  targetExamScore: number;
  avatarUrl: string;
  telegramHandle: string;
  newPassword?: string;
}

interface StudentProfileProps {
  profile: StudentProfileType;
  isDarkMode: boolean;
  onUpdateProfile?: (updated: UpdatedProfileData) => void;
  isAdmin?: boolean;
  registeredStudents?: RegisteredStudent[];
  submissions?: Submission[];
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1516934024742-b461fba47600?auto=format&fit=crop&w=300&q=80', // Лиса
  'https://images.unsplash.com/photo-1543549790-8b5f4a028cfb?auto=format&fit=crop&w=300&q=80', // Сова
  'https://images.unsplash.com/photo-1527118732049-c88155f2107c?auto=format&fit=crop&w=300&q=80', // Панда
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=300&q=80', // Пёсик
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=300&q=80', // Котик
  'https://images.unsplash.com/photo-1551972251-12070d63502a?auto=format&fit=crop&w=300&q=80', // Пингвин
];

const ALL_MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

export const StudentProfile: React.FC<StudentProfileProps> = ({
  profile,
  isDarkMode,
  onUpdateProfile,
  isAdmin = false,
  registeredStudents = [],
  submissions = [],
}) => {
  const [selectedBlock, setSelectedBlock] = useState<'total' | 'speaking' | 'writing' | 'grammar'>('total');
  const [selectedMonth, setSelectedMonth] = useState<string>('Август');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form states for editing profile
  const [editName, setEditName] = useState(profile.name);
  const [editTg, setEditTg] = useState(profile.telegramHandle);
  const [editTargetScore, setEditTargetScore] = useState(profile.targetExamScore || 90);
  const [editAvatarUrl, setEditAvatarUrl] = useState(profile.avatarUrl);
  const [editPassword, setEditPassword] = useState('');
  const [editPasswordConfirm, setEditPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // Dynamically highlight streak days ending on TODAY's actual day of week
  const realStreakHistory = React.useMemo(() => {
    const todayDayIndex = (new Date().getDay() + 6) % 7; // 0 = Mon, 1 = Tue, 2 = Wed, ..., 6 = Sun
    const history = [false, false, false, false, false, false, false];
    const streakCount = Math.max(1, profile.streakDays || 1);

    for (let i = 0; i < Math.min(streakCount, 7); i++) {
      const idx = (todayDayIndex - i + 7) % 7;
      history[idx] = true;
    }
    return history;
  }, [profile.streakDays]);

  // Exam progress calculation
  const isNewStudent = profile.totalHwSubmitted === 0;
  const CONSTANT_JOIN_MONTH = 'Август'; // Constant platform onboarding month

  // Month-filtered or All-time data generation
  const monthData = React.useMemo(() => {
    if (isAdmin) {
      // Calculate average scores across student submissions / examProgress
      const studentProgresses = registeredStudents
        .map((st) => st.examProgress)
        .filter(Boolean);

      const hasStudentData = studentProgresses.some((p) => p && p.length > 0);

      if (selectedMonth === 'all') {
        return ALL_MONTHS.map((m) => {
          if (!hasStudentData) {
            return {
              trialName: `Ср. балл (${m})`,
              date: m.slice(0, 3),
              total: 0,
              listening: 0,
              reading: 0,
              grammarVocabulary: 0,
              writing: 0,
              speaking: 0,
            };
          }
          const totals = studentProgresses.map((p) => p?.[0]?.total || 0);
          const avg = Math.round(totals.reduce((a, b) => a + b, 0) / (totals.length || 1));
          return {
            trialName: `Ср. балл (${m})`,
            date: m.slice(0, 3),
            total: avg,
            listening: 0,
            reading: 0,
            grammarVocabulary: 0,
            writing: 0,
            speaking: 0,
          };
        });
      }

      return [
        { trialName: 'Начало месяца', date: `01 ${selectedMonth.slice(0, 3)}`, total: 0, listening: 0, reading: 0, grammarVocabulary: 0, writing: 0, speaking: 0 },
        { trialName: 'Конец месяца', date: `30 ${selectedMonth.slice(0, 3)}`, total: 0, listening: 0, reading: 0, grammarVocabulary: 0, writing: 0, speaking: 0 },
      ];
    }

    if (selectedMonth === 'all') {
      // 12 Months full learning period view
      if (isNewStudent) {
        return ALL_MONTHS.map((m) => ({
          trialName: `Месяц (${m})`,
          date: m.slice(0, 3),
          total: 0,
          listening: 0,
          reading: 0,
          grammarVocabulary: 0,
          writing: 0,
          speaking: 0,
        }));
      }

      // If student has progress, spread across the 12 months
      const joinIdx = ALL_MONTHS.indexOf(CONSTANT_JOIN_MONTH);
      const latestTrial = profile.examProgress?.[profile.examProgress.length - 1];
      const maxScore = latestTrial?.total || 0;

      return ALL_MONTHS.map((m, idx) => {
        if (idx < joinIdx) {
          return {
            trialName: `(${m})`,
            date: m.slice(0, 3),
            total: 0,
            listening: 0,
            reading: 0,
            grammarVocabulary: 0,
            writing: 0,
            speaking: 0,
          };
        }
        if (idx === joinIdx) {
          const first = profile.examProgress?.[0];
          return {
            trialName: `Пробник 1 (${m})`,
            date: m.slice(0, 3),
            total: first?.total || 0,
            listening: first?.listening || 0,
            reading: first?.reading || 0,
            grammarVocabulary: first?.grammarVocabulary || 0,
            writing: first?.writing || 0,
            speaking: first?.speaking || 0,
          };
        }
        // Months after join date
        const stepsAfter = ALL_MONTHS.length - 1 - joinIdx;
        const progressFactor = (idx - joinIdx) / stepsAfter;
        const currentTotal = Math.round(maxScore * progressFactor);
        return {
          trialName: `Прогресс (${m})`,
          date: m.slice(0, 3),
          total: currentTotal,
          listening: Math.round((latestTrial?.listening || 0) * progressFactor),
          reading: Math.round((latestTrial?.reading || 0) * progressFactor),
          grammarVocabulary: Math.round((latestTrial?.grammarVocabulary || 0) * progressFactor),
          writing: Math.round((latestTrial?.writing || 0) * progressFactor),
          speaking: Math.round((latestTrial?.speaking || 0) * progressFactor),
        };
      });
    }

    // Specific month view
    if (isNewStudent) {
      return [
        { trialName: 'Начало месяца', date: `01 ${selectedMonth.slice(0, 3)}`, total: 0, listening: 0, reading: 0, grammarVocabulary: 0, writing: 0, speaking: 0 },
        { trialName: 'Конец месяца', date: `30 ${selectedMonth.slice(0, 3)}`, total: 0, listening: 0, reading: 0, grammarVocabulary: 0, writing: 0, speaking: 0 },
      ];
    }

    if (profile.examProgress && profile.examProgress.length > 0) {
      return profile.examProgress.map((p, idx) => ({
        ...p,
        date: p.date.includes(' ') ? p.date : `${idx * 10 + 1} ${selectedMonth.slice(0, 3)}`,
      }));
    }

    return [
      { trialName: 'Начало месяца', date: `01 ${selectedMonth.slice(0, 3)}`, total: 0, listening: 0, reading: 0, grammarVocabulary: 0, writing: 0, speaking: 0 },
      { trialName: 'Конец месяца', date: `30 ${selectedMonth.slice(0, 3)}`, total: 0, listening: 0, reading: 0, grammarVocabulary: 0, writing: 0, speaking: 0 },
    ];
  }, [selectedMonth, isNewStudent, profile.examProgress, isAdmin, registeredStudents]);

  const firstPoint = monthData[0];
  const lastPoint = monthData[monthData.length - 1];
  const monthGrowth = lastPoint.total - firstPoint.total;

  // SVG Curved Line Math helper
  const svgWidth = 500;
  const svgHeight = 150;
  const paddingX = 45;
  const paddingY = 25;

  const points = React.useMemo(() => {
    if (monthData.length === 1) {
      return [{ x: svgWidth / 2, y: svgHeight - paddingY - (monthData[0].total / 100) * (svgHeight - 2 * paddingY), data: monthData[0] }];
    }
    return monthData.map((d, i) => {
      const x = paddingX + (i / (monthData.length - 1)) * (svgWidth - 2 * paddingX);
      const y = svgHeight - paddingY - (Math.min(100, Math.max(0, d.total)) / 100) * (svgHeight - 2 * paddingY);
      return { x, y, data: d };
    });
  }, [monthData]);

  // Construct smooth Bezier SVG Path string
  const curvePath = React.useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 2;
      const cp1y = curr.y;
      const cp2x = curr.x + (next.x - curr.x) / 2;
      const cp2y = next.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }
    return path;
  }, [points]);

  const areaPath = React.useMemo(() => {
    if (!curvePath) return '';
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    const bottomY = svgHeight - 10;
    return `${curvePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [curvePath, points]);

  const handleStartEdit = () => {
    setEditName(profile.name);
    setEditTg(profile.telegramHandle);
    setEditTargetScore(profile.targetExamScore || 90);
    setEditAvatarUrl(profile.avatarUrl);
    setSavedSuccess(false);
    setIsEditing(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setEditAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (editPassword) {
      if (editPassword !== editPasswordConfirm) {
        setPasswordError('Введенные пароли не совпадают!');
        return;
      }
      if (editPassword.length < 3) {
        setPasswordError('Пароль должен содержать не менее 3 символов');
        return;
      }
    }

    const formattedName = editName.trim() || profile.name;
    const formattedTg = editTg.trim()
      ? editTg.trim().startsWith('@')
        ? editTg.trim()
        : `@${editTg.trim()}`
      : profile.telegramHandle;

    if (onUpdateProfile) {
      onUpdateProfile({
        name: formattedName,
        targetExamScore: Number(editTargetScore) || 90,
        avatarUrl: editAvatarUrl || profile.avatarUrl,
        telegramHandle: formattedTg,
        newPassword: editPassword ? editPassword : undefined,
      });
    }

    setEditPassword('');
    setEditPasswordConfirm('');
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setIsEditing(false);
    }, 600);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header Profile Card */}
      <div
        className={`p-4 rounded-2xl border relative overflow-hidden ${
          isDarkMode ? 'bg-[#1e2c3a] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="relative group">
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-sky-500 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 bg-amber-400 text-black p-0.5 rounded-full text-[10px] font-bold">
                <Flame className="w-3.5 h-3.5 fill-black" />
              </span>
            </div>

            <div>
              <h2 className="font-bold text-base leading-tight flex items-center gap-2">
                <span>{profile.name}</span>
              </h2>
              <div className="mt-1 flex items-center space-x-2 text-[11px] text-slate-400">
                <span>Цель: <strong className="text-amber-400">{profile.targetExamScore}+ баллов</strong></span>
                <span>•</span>
                <span>Сдано ДЗ: <strong className="text-slate-200">{profile.totalHwSubmitted}</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={handleStartEdit}
            className="px-2.5 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-semibold flex items-center space-x-1.5 border border-sky-500/20 transition-all"
            title="Редактировать профиль"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Изменить</span>
          </button>
        </div>

        {/* STREAK SECTION (Киллер-фича «Стрики» как в Duolingo) */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1.5">
              <Flame className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
              <span className="font-bold text-xs">Серия активности (Стрик):</span>
              <span className="text-xs font-extrabold text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded-full">
                {profile.streakDays % 10 === 1 && profile.streakDays % 100 !== 11
                  ? `${profile.streakDays} ДЕНЬ`
                  : profile.streakDays % 10 >= 2 && profile.streakDays % 10 <= 4 && (profile.streakDays % 100 < 10 || profile.streakDays % 100 >= 20)
                  ? `${profile.streakDays} ДНЯ`
                  : `${profile.streakDays} ДНЕЙ`} ПОДРЯД
              </span>
            </div>
          </div>

          {/* 7-Day Visual Tracker */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {realStreakHistory.map((active, idx) => (
              <div key={idx} className="space-y-1">
                <div
                  className={`py-2 rounded-xl flex items-center justify-center transition-all ${
                    active
                      ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-900 shadow-sm font-bold'
                      : isDarkMode
                      ? 'bg-slate-800 text-slate-600'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Flame className={`w-4 h-4 ${active ? 'fill-slate-900' : 'opacity-40'}`} />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{daysOfWeek[idx]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BADGES & ACHIEVEMENTS SECTION */}
      <div className="space-y-2">
        <h3 className="font-bold text-sm flex items-center space-x-1.5">
          <Crown className="w-4 h-4 text-amber-400" />
          <span>Достижения и Медали ученика</span>
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          {profile.badges.map((badge) => (
            <div
              key={badge.id}
              className={`p-3 rounded-2xl border transition-all ${
                badge.unlocked
                  ? isDarkMode
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-amber-50 border-amber-200'
                  : isDarkMode
                  ? 'bg-[#17212b] border-slate-800 opacity-60'
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-start space-x-2.5">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    badge.unlocked ? 'bg-amber-400 text-slate-900' : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {badge.iconName === 'Flame' && <Flame className="w-4 h-4 fill-slate-900" />}
                  {badge.iconName === 'Crown' && <Crown className="w-4 h-4" />}
                  {badge.iconName === 'Zap' && <Zap className="w-4 h-4" />}
                  {badge.iconName === 'Feather' && <Feather className="w-4 h-4" />}
                </div>

                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs leading-snug">{badge.title}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {badge.description}
                  </p>
                  {badge.unlocked && badge.unlockedAt && (
                    <span className="text-[9px] text-amber-500 font-semibold block pt-0.5">
                      ✓ Получено {badge.unlockedAt}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EXAM PROGRESS GRAPH & ANALYTICS */}
      <div
        className={`p-4 rounded-2xl border space-y-3.5 ${
          isDarkMode ? 'bg-[#1e2c3a] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm">Динамика баллов по пробникам</h3>
          </div>
          {isAdmin ? (
            <span className="text-xs font-bold text-sky-400 bg-sky-500/20 px-2.5 py-0.5 rounded-full border border-sky-500/30 w-fit">
              📊 Средний балл по пробникам учеников: {lastPoint.total > 0 ? `${lastPoint.total} б.` : '—'}
            </span>
          ) : selectedMonth === 'all' ? (
            monthGrowth > 0 ? (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 w-fit">
                +{monthGrowth} б. за весь период! 🚀
              </span>
            ) : (
              <span className="text-xs font-bold text-sky-400 bg-sky-500/20 px-2.5 py-0.5 rounded-full border border-sky-500/30 w-fit">
                🌱 Результаты пробника
              </span>
            )
          ) : monthGrowth > 0 ? (
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 w-fit">
              +{monthGrowth} б. за {selectedMonth}! 🚀
            </span>
          ) : isNewStudent ? (
            <span className="text-xs font-bold text-sky-400 bg-sky-500/20 px-2.5 py-0.5 rounded-full border border-sky-500/30 w-fit">
              🌱 Ожидание первого пробника
            </span>
          ) : (
            <span className="text-xs font-bold text-slate-400 bg-slate-500/20 px-2.5 py-0.5 rounded-full border border-slate-500/30 w-fit">
              {lastPoint.total} б. ({selectedMonth})
            </span>
          )}
        </div>

        {/* Period Filter Selector Pills */}
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Фильтр по месяцам:
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
              {ALL_MONTHS.map((m) => {
                const isSelected = selectedMonth === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMonth(m)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                      isSelected
                        ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20 scale-105'
                        : isDarkMode
                        ? 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Separate All-Time Button */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setSelectedMonth('all')}
              className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-2 ${
                selectedMonth === 'all'
                  ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/30'
                  : isDarkMode
                  ? 'bg-slate-800/90 text-amber-400 border-amber-500/30 hover:bg-slate-800 hover:border-amber-400/60'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span>📊</span>
              <span>Данные за весь период обучения</span>
            </button>
          </div>
        </div>

        {/* Custom SVG Smooth Curved Line Chart */}
        <div className="pt-1">
          <div className="w-full bg-black/30 rounded-2xl p-3 border border-slate-700/60 relative overflow-hidden">
            {/* SVG Canvas */}
            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-44 drop-shadow-md overflow-visible">
                <defs>
                  <linearGradient id="scoreCurveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>

                  <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>

                  <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Horizontal Guide Lines */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = svgHeight - paddingY - (val / 100) * (svgHeight - 2 * paddingY);
                  return (
                    <g key={val}>
                      <line
                        x1={paddingX - 10}
                        y1={y}
                        x2={svgWidth - paddingX + 10}
                        y2={y}
                        stroke="#334155"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                        opacity="0.4"
                      />
                      <text
                        x={paddingX - 16}
                        y={y + 3}
                        fill="#94a3b8"
                        fontSize="9"
                        textAnchor="end"
                        fontWeight="bold"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Area Fill Under Curve */}
                {areaPath && <path d={areaPath} fill="url(#scoreCurveGradient)" />}

                {/* Smooth Curved Line */}
                {curvePath && (
                  <path
                    d={curvePath}
                    fill="none"
                    stroke="url(#strokeGradient)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    filter="url(#glowEffect)"
                  />
                )}

                {/* Data Nodes on Curve */}
                {points.map((pt, idx) => {
                  const isHovered = hoveredPointIndex === idx;
                  return (
                    <g key={idx} className="cursor-pointer group" onMouseEnter={() => setHoveredPointIndex(idx)} onMouseLeave={() => setHoveredPointIndex(null)}>
                      {/* Pulse outer ring */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? "9" : "6"}
                        fill="#38bdf8"
                        fillOpacity="0.3"
                        className="transition-all duration-200"
                      />
                      {/* Core point */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? "6" : "4"}
                        fill="#ffffff"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                        className="transition-all duration-200"
                      />

                      {/* Score Label Tooltip */}
                      <g transform={`translate(${pt.x}, ${pt.y - 12})`}>
                        <rect
                          x="-22"
                          y="-16"
                          width="44"
                          height="18"
                          rx="6"
                          fill="#0f172a"
                          stroke="#38bdf8"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="-3"
                          fill="#fef08a"
                          fontSize="10"
                          fontWeight="extrabold"
                          textAnchor="middle"
                        >
                          {pt.data.total} б.
                        </text>
                      </g>

                      {/* Date Axis Label */}
                      <text
                        x={pt.x}
                        y={svgHeight - 6}
                        fill="#94a3b8"
                        fontSize="9"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {pt.data.date}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown per block (Only for student view) */}
        {!isAdmin ? (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-300">
                Разбивка по блокам ({selectedMonth}):
              </h4>
              {isNewStudent && (
                <span className="text-[10px] text-amber-400 font-medium">
                  (Пройдите первый урок/ДЗ для накопления баллов)
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
              <div className="p-2 rounded-xl bg-black/20 border border-slate-800">
                <span className="text-slate-400 block">Listening</span>
                <strong className={isNewStudent ? "text-slate-400 text-xs" : "text-sky-400 text-xs"}>
                  {isNewStudent ? '0/20' : `${lastPoint?.listening ?? 0}/20`}
                </strong>
              </div>
              <div className="p-2 rounded-xl bg-black/20 border border-slate-800">
                <span className="text-slate-400 block">Reading</span>
                <strong className={isNewStudent ? "text-slate-400 text-xs" : "text-sky-400 text-xs"}>
                  {isNewStudent ? '0/20' : `${lastPoint?.reading ?? 0}/20`}
                </strong>
              </div>
              <div className="p-2 rounded-xl bg-black/20 border border-slate-800">
                <span className="text-slate-400 block">Use of Eng</span>
                <strong className={isNewStudent ? "text-slate-400 text-xs" : "text-amber-400 text-xs"}>
                  {isNewStudent ? '0/20' : `${lastPoint?.grammarVocabulary ?? 0}/20`}
                </strong>
              </div>
              <div className="p-2 rounded-xl bg-black/20 border border-slate-800">
                <span className="text-slate-400 block">Writing</span>
                <strong className={isNewStudent ? "text-slate-400 text-xs" : "text-emerald-400 text-xs"}>
                  {isNewStudent ? '0/20' : `${lastPoint?.writing ?? 0}/20`}
                </strong>
              </div>
              <div className="p-2 rounded-xl bg-black/20 border border-slate-800">
                <span className="text-slate-400 block">Speaking</span>
                <strong className={isNewStudent ? "text-slate-400 text-xs" : "text-emerald-400 text-xs"}>
                  {isNewStudent ? '0/20' : `${lastPoint?.speaking ?? 0}/20`}
                </strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-2 space-y-2">
            <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Users className="w-4 h-4" />
              <span>Баллы и результаты учеников ({registeredStudents.length}):</span>
            </h4>
            <div className="space-y-2">
              {registeredStudents.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Ученики еще не зарегистрированы.</p>
              ) : (
                registeredStudents.map((st) => {
                  const stSubs = submissions.filter((s) => s.studentName === st.name && s.status === 'graded');
                  let avgScoreDisplay = '—';
                  if (stSubs.length > 0) {
                    const totalPct = stSubs.reduce((acc, sub) => {
                      const max = sub.maxScore || 10;
                      const score = sub.totalScore !== undefined ? sub.totalScore : (sub.testScore || 0);
                      return acc + Math.min(100, (score / max) * 100);
                    }, 0);
                    const avg = Math.round(totalPct / stSubs.length);
                    avgScoreDisplay = `${avg}%`;
                  }

                  return (
                    <div
                      key={st.id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                        isDarkMode ? 'bg-[#17212b] border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm">{st.name}</span>
                          <span className="text-[10px] text-sky-400 font-mono bg-sky-500/10 px-1.5 py-0.5 rounded">
                            {st.telegramHandle}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">Проверено работ: {stSubs.length}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-extrabold ${stSubs.length > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {avgScoreDisplay}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {stSubs.length > 0 ? 'Средний балл' : 'Нет проверенных ДЗ'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div
            className={`w-full max-w-md rounded-2xl p-5 shadow-2xl border space-y-4 relative max-h-[90vh] overflow-y-auto ${
              isDarkMode ? 'bg-[#1e2c3a] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm sm:text-base">Редактирование профиля</h3>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar Section */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 block">
                  Ваша фотография / Аватарка
                </label>
                <div className="flex items-center space-x-3">
                  <img
                    src={editAvatarUrl}
                    alt="Preview"
                    className="w-14 h-14 rounded-full object-cover border-2 border-sky-500 shrink-0 shadow-md"
                  />
                  <div className="flex-1 space-y-1.5">
                    <label className="cursor-pointer inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-all shadow-sm">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Загрузить фото с устройства</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-400">Выберите готовый аватар ниже или загрузите свой</p>
                  </div>
                </div>

                {/* Preset Avatars Grid */}
                <div className="grid grid-cols-6 gap-2 pt-1">
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditAvatarUrl(url)}
                      className={`relative rounded-full overflow-hidden border-2 transition-all aspect-square ${
                        editAvatarUrl === url
                          ? 'border-sky-400 scale-105 shadow-md shadow-sky-500/30'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Avatar ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=animal-${idx}`;
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 block">
                  Ваше имя и фамилия
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Иван Иванов"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border outline-none transition-colors focus:ring-2 focus:ring-sky-500 ${
                      isDarkMode
                        ? 'bg-[#17212b] border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Target Exam Score */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400 block">
                    Цель по ЕГЭ (баллах)
                  </label>
                  <span className="text-xs font-extrabold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                    {editTargetScore} баллов
                  </span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="100"
                  step="1"
                  value={editTargetScore}
                  onChange={(e) => setEditTargetScore(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <button type="button" onClick={() => setEditTargetScore(80)} className="hover:text-amber-400">80 б.</button>
                  <button type="button" onClick={() => setEditTargetScore(85)} className="hover:text-amber-400">85 б.</button>
                  <button type="button" onClick={() => setEditTargetScore(90)} className="hover:text-amber-400">90 б.</button>
                  <button type="button" onClick={() => setEditTargetScore(95)} className="hover:text-amber-400">95 б.</button>
                  <button type="button" onClick={() => setEditTargetScore(100)} className="hover:text-amber-400">100 б. 👑</button>
                </div>
              </div>

              {/* Change Password Section */}
              <div className="pt-2 border-t border-slate-700/50 space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Смена пароля (оставьте пустым, если не хотите менять):
                </label>
                {passwordError && (
                  <p className="text-xs text-rose-400 font-semibold">{passwordError}</p>
                )}
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Новый пароль"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border outline-none transition-colors ${
                        isDarkMode
                          ? 'bg-[#17212b] border-slate-700 text-white placeholder-slate-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="password"
                      value={editPasswordConfirm}
                      onChange={(e) => setEditPasswordConfirm(e.target.value)}
                      placeholder="Повторите новый пароль"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border outline-none transition-colors ${
                        isDarkMode
                          ? 'bg-[#17212b] border-slate-700 text-white placeholder-slate-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savedSuccess}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-2 ${
                    savedSuccess
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-sky-500/25 active:scale-[0.99]'
                  }`}
                >
                  {savedSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Профиль обновлен!</span>
                    </>
                  ) : (
                    <span>Сохранить изменения</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
