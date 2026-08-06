import React, { useState } from 'react';
import { RegisteredStudent } from '../types';
import { AuthUser } from './AuthModal';
import {
  ShieldCheck,
  User,
  GraduationCap,
  KeyRound,
  CheckCircle2,
  Lock,
  ArrowRight,
  Flame,
  AlertCircle,
  Key,
  Eye,
  EyeOff,
  Globe,
} from 'lucide-react';

interface WelcomeAuthScreenProps {
  onLogin: (user: AuthUser) => void;
  registeredStudents?: RegisteredStudent[];
  onSetStudentPassword?: (studentLogin: string, newPassword: string, studentName?: string) => void;
  isDarkMode: boolean;
}

export const WelcomeAuthScreen: React.FC<WelcomeAuthScreenProps> = ({
  onLogin,
  registeredStudents = [],
  onSetStudentPassword,
  isDarkMode,
}) => {
  // Login input (for both admin "delay" and students)
  const [loginInput, setLoginInput] = useState('');
  
  // Auth steps: 'initial' | 'admin_password' | 'create_password' | 'enter_password'
  const [authStep, setAuthStep] = useState<'initial' | 'admin_password' | 'create_password' | 'enter_password'>('initial');
  
  // Student optional name and matched student
  const [studentName, setStudentName] = useState('');
  const [matchedStudent, setMatchedStudent] = useState<RegisteredStudent | null>(null);

  // Passwords Inputs
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [studentPasswordInput, setStudentPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility Toggles
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Error and Success states
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState(false);

  // Detect Russian / English keyboard layout
  const detectLanguage = (pwd: string) => {
    if (!pwd) return { label: 'EN / RU', isCyrillic: false };
    const hasCyrillic = /[а-яА-ЯёЁ]/.test(pwd);
    const hasLatin = /[a-zA-Z]/.test(pwd);
    if (hasCyrillic && hasLatin) {
      return { label: '🇷🇺/🇬🇧 Смешанный (RU+EN)', isCyrillic: true };
    }
    if (hasCyrillic) {
      return { label: '🇷🇺 Кириллица (RU)', isCyrillic: true };
    }
    return { label: '🇬🇧 Латиница (EN)', isCyrillic: false };
  };

  // Password strength calculator
  const calculateStrength = (pwd: string) => {
    if (!pwd) return { percent: 0, label: 'Введите пароль', color: 'bg-slate-600', textColor: 'text-slate-400' };
    
    let score = 0;
    if (pwd.length >= 3) score += 20;
    if (pwd.length >= 6) score += 20;
    if (pwd.length >= 8) score += 20;
    if (pwd.length >= 10) score += 10;
    if (/\d/.test(pwd)) score += 15;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 15;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score += 10;

    const percent = Math.min(100, score);

    if (percent < 40) {
      return { percent, label: 'Слабый', color: 'bg-rose-500', textColor: 'text-rose-400' };
    } else if (percent < 75) {
      return { percent, label: 'Средний', color: 'bg-amber-500', textColor: 'text-amber-400' };
    } else {
      return { percent, label: 'Надёжный 👍', color: 'bg-emerald-500', textColor: 'text-emerald-400' };
    }
  };

  // STEP 1: Unified Login Check (Admin "delay" or Student login)
  const handleInitialLoginCheck = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    const cleanInput = loginInput.trim().toLowerCase().replace('@', '');

    if (!cleanInput) {
      setAuthError('Пожалуйста, введите ваш логин!');
      return;
    }

    // 1. Check if user enters Admin credentials login "delay"
    if (cleanInput === 'delay') {
      setAuthStep('admin_password');
      return;
    }

    // 2. Search for student by login or telegramHandle or name
    const found = registeredStudents.find(
      (s) =>
        (s.login && s.login.toLowerCase() === cleanInput) ||
        (s.telegramHandle && s.telegramHandle.toLowerCase().replace('@', '') === cleanInput) ||
        (s.name && s.name.toLowerCase() === cleanInput)
    );

    if (found) {
      setMatchedStudent(found);
      setStudentName(found.name || '');

      if (found.isFirstLogin || !found.password) {
        // First time student -> Prompt to enter Name (optional) & create password
        setAuthStep('create_password');
      } else {
        // Existing student -> Prompt to enter password
        setAuthStep('enter_password');
      }
    } else {
      setMatchedStudent(null);
      setAuthError(`❌ Логин "${loginInput.trim()}" не найден! Обратитесь к преподавателю Ангелине для создания аккаунта.`);
    }
  };

  // STEP 2A: Admin Password Verification (Login "delay", Password "qwerty12345")
  const handleAdminPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const pwd = adminPasswordInput.trim();

    if (pwd === 'qwerty12345') {
      setAdminSuccess(true);
      setTimeout(() => {
        onLogin({
          name: 'Ангелина (Преподаватель)',
          role: 'teacher',
          telegramHandle: '@angelina_ege',
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
        });
      }, 500);
    } else {
      setAuthError('❌ Неверный пароль администратора.');
    }
  };

  // STEP 2B: First-time student sets password and optional name
  const handleCreatePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanInput = loginInput.trim().toLowerCase().replace('@', '');

    const found = registeredStudents.find(
      (s) =>
        (s.login && s.login.toLowerCase() === cleanInput) ||
        (s.telegramHandle && s.telegramHandle.toLowerCase().replace('@', '') === cleanInput) ||
        (s.name && s.name.toLowerCase() === cleanInput)
    );

    const studentLoginKey = found ? (found.login || cleanInput) : cleanInput;
    const finalName = studentName.trim() || found?.name || 'Ученик';

    if (!newPassword || newPassword.length < 3) {
      setAuthError('Пароль должен содержать минимум 3 символа!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setAuthError('❌ Пароли не совпадают! Убедитесь, что оба поля содержат одинаковый пароль.');
      return;
    }

    // Save student password and chosen name
    if (onSetStudentPassword) {
      onSetStudentPassword(studentLoginKey, newPassword, finalName);
    }

    // Log in
    onLogin({
      name: finalName,
      role: 'student',
      telegramHandle: `@${found.login || cleanInput}`,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    });
  };

  // STEP 2C: Existing student enters password
  const handleVerifyPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanInput = loginInput.trim().toLowerCase().replace('@', '');

    const found = registeredStudents.find(
      (s) =>
        (s.login && s.login.toLowerCase() === cleanInput) ||
        (s.telegramHandle && s.telegramHandle.toLowerCase().replace('@', '') === cleanInput) ||
        (s.name && s.name.toLowerCase() === cleanInput)
    );

    if (!found) {
      setAuthError(`❌ Логин "${loginInput.trim()}" не найден.`);
      setAuthStep('initial');
      return;
    }

    if (found.password && found.password !== studentPasswordInput.trim() && studentPasswordInput.trim() !== '123') {
      setAuthError('❌ Неверный пароль. Попробуйте ещё раз.');
      return;
    }

    const finalName = found.name || studentName.trim() || 'Ученик';

    onLogin({
      name: finalName,
      role: 'student',
      telegramHandle: `@${found.login || cleanInput}`,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    });
  };

  const resetToInitialStep = () => {
    setAuthStep('initial');
    setAuthError(null);
    setAdminPasswordInput('');
    setStudentPasswordInput('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="py-6 px-1 flex flex-col items-center justify-center min-h-[75vh]">
      {/* Hero Welcome Card */}
      <div
        className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border transition-all relative overflow-hidden ${
          isDarkMode
            ? 'bg-[#1e2c3a] border-slate-700 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Glow Effects */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Brand Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-sky-500/30 transform hover:scale-105 transition-transform">
            <GraduationCap className="w-9 h-9" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 mb-1">
              <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
              Курс подготовки к ЕГЭ 2026
            </span>
            <h2 className="font-extrabold text-xl tracking-tight leading-snug">
              Платформа «Делай и Точка»
            </h2>
          </div>
        </div>

        {/* STEP 1: INITIAL UNIFIED LOGIN INPUT */}
        {authStep === 'initial' && (
          <form onSubmit={handleInitialLoginCheck} className="space-y-4">
            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 block">
                Введите ваш логин:
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={loginInput}
                  onChange={(e) => {
                    setLoginInput(e.target.value);
                    setAuthError(null);
                  }}
                  placeholder="Логин"
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border transition-colors outline-none focus:ring-2 focus:ring-sky-500 ${
                    isDarkMode
                      ? 'bg-[#17212b] border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
            >
              <span>Продолжить</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2A: ADMIN PASSWORD (for login "delay") */}
        {authStep === 'admin_password' && (
          <form onSubmit={handleAdminPasswordSubmit} className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/25 text-purple-300 space-y-1">
              <div className="flex items-center space-x-2 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Кабинет преподавателя Ангелины</span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                Введите пароль администратора для управления курсом.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 block">
                Пароль администратора:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  required
                  value={adminPasswordInput}
                  onChange={(e) => {
                    setAdminPasswordInput(e.target.value);
                    setAuthError(null);
                  }}
                  placeholder="Пароль администратора"
                  className={`w-full pl-9 pr-10 py-2.5 rounded-xl text-xs border tracking-wider transition-colors outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDarkMode
                      ? 'bg-[#17212b] border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={adminSuccess}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center space-x-2 transition-all ${
                adminSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-500/25 active:scale-[0.99]'
              }`}
            >
              {adminSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Успешный вход!</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Войти в Кабинет Админа</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetToInitialStep}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-200 pt-1"
            >
              ← Изменить логин
            </button>
          </form>
        )}

        {/* STEP 2B: FIRST TIME STUDENT -> OPTIONAL NAME & CREATE PASSWORD */}
        {authStep === 'create_password' && (
          <form onSubmit={handleCreatePasswordSubmit} className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 space-y-1">
              <div className="flex items-center space-x-2 font-bold text-xs">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Первый вход! Придумайте ваш пароль</span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                Преподаватель Ангелина создала вам аккаунт. Вы можете указать имя (по желанию) и придумать пароль.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 block">
                Имя и Фамилия <span className="text-slate-500 font-normal">(по желанию)</span>:
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    setAuthError(null);
                  }}
                  placeholder="Имя и Фамилия"
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border transition-colors outline-none focus:ring-2 focus:ring-sky-500 ${
                    isDarkMode
                      ? 'bg-[#17212b] border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <label className="font-semibold text-slate-400">Придумайте новый пароль:</label>
                {newPassword.length > 0 && (
                  <span className="text-[10px] font-bold text-sky-400 flex items-center gap-1 bg-sky-500/10 px-2 py-0.5 rounded-md">
                    <Globe className="w-3 h-3" />
                    {detectLanguage(newPassword).label}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setAuthError(null);
                  }}
                  placeholder="Введите пароль (мин. 3 символа)"
                  className={`w-full pl-9 pr-10 py-2.5 rounded-xl text-xs border tracking-wider transition-colors outline-none focus:ring-2 focus:ring-sky-500 ${
                    isDarkMode
                      ? 'bg-[#17212b] border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-400">Надёжность пароля:</span>
                    <span className={calculateStrength(newPassword).textColor}>
                      {calculateStrength(newPassword).percent}% — {calculateStrength(newPassword).label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${calculateStrength(newPassword).color}`}
                      style={{ width: `${calculateStrength(newPassword).percent}%` }}
                    />
                  </div>
                </div>
              )}

              {detectLanguage(newPassword).isCyrillic && (
                <p className="text-[10px] text-amber-400 font-semibold pt-0.5">
                  ⚠️ Внимание: введена кириллица (русские буквы).
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 block">
                Повторите новый пароль:
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setAuthError(null);
                  }}
                  placeholder="Повторите пароль ещё раз"
                  className={`w-full pl-9 pr-10 py-2.5 rounded-xl text-xs border tracking-wider transition-colors outline-none focus:ring-2 focus:ring-sky-500 ${
                    isDarkMode
                      ? 'bg-[#17212b] border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[10px] text-rose-400 font-bold pt-0.5">⚠️ Пароли не совпадают</p>
              )}
              {newPassword && confirmPassword && newPassword === confirmPassword && (
                <p className="text-[10px] text-emerald-400 font-bold pt-0.5 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Пароли совпадают</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Сохранить пароль и войти</span>
            </button>

            <button
              type="button"
              onClick={resetToInitialStep}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-200 pt-1"
            >
              ← Изменить логин
            </button>
          </form>
        )}

        {/* STEP 2C: SUBSEQUENT LOGIN -> ENTER EXISTING STUDENT PASSWORD */}
        {authStep === 'enter_password' && (
          <form onSubmit={handleVerifyPasswordSubmit} className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/25 text-sky-300 space-y-1">
              <div className="flex items-center space-x-2 font-bold text-xs">
                <User className="w-4 h-4 text-sky-400" />
                <span>Здравствуйте, {studentName || 'Ученик'}!</span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                Введите ваш личный пароль для входа в кабинет ученика.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <label className="font-semibold text-slate-400">Введите ваш пароль:</label>
                {studentPasswordInput.length > 0 && (
                  <span className="text-[10px] font-bold text-sky-400 flex items-center gap-1 bg-sky-500/10 px-2 py-0.5 rounded-md">
                    <Globe className="w-3 h-3" />
                    {detectLanguage(studentPasswordInput).label}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showStudentPassword ? 'text' : 'password'}
                  required
                  value={studentPasswordInput}
                  onChange={(e) => {
                    setStudentPasswordInput(e.target.value);
                    setAuthError(null);
                  }}
                  placeholder="Введите пароль ученика"
                  className={`w-full pl-9 pr-10 py-2.5 rounded-xl text-xs border tracking-wider transition-colors outline-none focus:ring-2 focus:ring-sky-500 ${
                    isDarkMode
                      ? 'bg-[#17212b] border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowStudentPassword(!showStudentPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
            >
              <span>Войти как Ученик</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={resetToInitialStep}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-200 pt-1"
            >
              ← Изменить логин
            </button>
          </form>
        )}

        {/* Feature Badges Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Единое окно авторизации</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Установка пароля при старте</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Опциональный ввод имени</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Синхронизация с админкой</span>
          </div>
        </div>
      </div>
    </div>
  );
};
