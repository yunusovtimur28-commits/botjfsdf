import React, { useState } from 'react';
import { UserRole, RegisteredStudent } from '../types';
import {
  Lock,
  User,
  GraduationCap,
  Sparkles,
  KeyRound,
  CheckCircle2,
  X,
  LogOut,
  ShieldCheck,
  Send,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

export interface AuthUser {
  name: string;
  role: UserRole;
  telegramHandle: string;
  avatarUrl: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  isLoggedIn: boolean;
  onLogin: (user: AuthUser) => void;
  onLogout?: () => void;
  isDarkMode: boolean;
  registeredStudents?: RegisteredStudent[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isLoggedIn,
  onLogin,
  onLogout,
  isDarkMode,
  registeredStudents = [],
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role);
  
  // Student Login State
  const [studentName, setStudentName] = useState(currentUser.role === 'student' ? currentUser.name : '');
  const [studentTg, setStudentTg] = useState(currentUser.telegramHandle || '@');
  const [studentError, setStudentError] = useState<string | null>(null);
  
  // Admin / Teacher Login State
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  const handleTgInputChange = (val: string) => {
    setStudentError(null);
    if (!val) {
      setStudentTg('@');
      return;
    }
    const raw = val.replace(/@/g, '');
    setStudentTg(`@${raw}`);
  };

  if (!isOpen) return null;

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const pwd = pinCode.trim();
    
    // Verification Password for Angelina Admin
    if (pwd === 'qwerty12345') {
      setPinError(false);
      setPinSuccess(true);
      setTimeout(() => {
        onLogin({
          name: 'Ангелина (Преподаватель)',
          role: 'teacher',
          telegramHandle: '@angelina_ege',
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
        });
        setPinSuccess(false);
        setPinCode('');
        onClose();
      }, 600);
    } else {
      setPinError(true);
    }
  };

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);

    const cleanLogin = studentTg.trim().toLowerCase().replace('@', '');

    if (!cleanLogin) {
      setStudentError('Пожалуйста, введите ваш логин!');
      return;
    }

    // Match against registeredStudents by login or handle
    const found = registeredStudents.find(
      (s) =>
        (s.login && s.login.toLowerCase() === cleanLogin) ||
        (s.telegramHandle && s.telegramHandle.toLowerCase().replace('@', '') === cleanLogin) ||
        (s.name && s.name.toLowerCase() === cleanLogin)
    );

    if (!found) {
      setStudentError(`❌ Логин "${studentTg.trim()}" не найден! Попросите преподавателя Ангелину зарегистрировать ваш аккаунт.`);
      return;
    }
    
    onLogin({
      name: found.name || studentName.trim() || 'Ученик',
      role: 'student',
      telegramHandle: `@${found.login || cleanLogin}`,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border relative overflow-hidden transition-all ${
          isDarkMode
            ? 'bg-[#1e2c3a] border-slate-700 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Background Decorative Accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="text-center space-y-1 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-sky-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base tracking-tight pt-1">
            {isLoggedIn ? 'Ваш Аккаунт' : 'Авторизация в Платформе'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isLoggedIn
              ? 'Вы уже вошли в систему «Делай и Точка»'
              : '«Делай и Точка» • Вход для учеников и преподавателя'}
          </p>
        </div>

        {isLoggedIn ? (
          /* LOGGED IN ACCOUNT MODAL WITH STAY / LOGOUT BUTTONS */
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border flex items-center space-x-3.5 ${
              isDarkMode ? 'bg-[#17212b] border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-sky-500/50 shrink-0 shadow-md">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center space-x-1.5">
                  <h4 className="font-bold text-sm truncate">{currentUser.name}</h4>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                    currentUser.role === 'teacher'
                      ? 'bg-purple-500 text-white'
                      : 'bg-sky-500 text-white'
                  }`}>
                    {currentUser.role === 'teacher' ? 'Админ' : 'Ученик'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono truncate">{currentUser.telegramHandle}</p>
              </div>
            </div>

            <p className="text-xs text-center text-slate-400">
              Вы хотите остаться в системе или выйти из текущего аккаунта?
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 active:scale-[0.99]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Остаться в аккаунте</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onLogout) onLogout();
                  onClose();
                }}
                className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs rounded-xl border border-rose-500/30 transition-all flex items-center justify-center space-x-2 active:scale-[0.99]"
              >
                <LogOut className="w-4 h-4" />
                <span>Выйти из аккаунта</span>
              </button>
            </div>
          </div>
        ) : (
          /* GUEST LOGIN FORMS */
          <>
            {/* Role Toggle Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/10 dark:bg-black/30 mb-5">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('student');
                  setPinError(false);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                  selectedRole === 'student'
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Ученик</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('teacher');
                  setPinError(false);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                  selectedRole === 'teacher'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Админ (Ангелина)</span>
              </button>
            </div>

            {/* STUDENT LOGIN FORM */}
            {selectedRole === 'student' && (
              <form onSubmit={handleStudentLogin} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">ФИО Ученика:</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Имя и Фамилия"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border ${
                        isDarkMode
                          ? 'bg-[#17212b] border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Логин Ученика:</label>
                  <div className="relative">
                    <Send className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={studentTg}
                      onFocus={() => {
                        if (!studentTg) setStudentTg('@');
                      }}
                      onChange={(e) => handleTgInputChange(e.target.value)}
                      placeholder="Логин"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border ${
                        isDarkMode
                          ? 'bg-[#17212b] border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {studentError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start space-x-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-tight">{studentError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full mt-2 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Войти как Ученик</span>
                </button>
              </form>
            )}

            {/* TEACHER / ADMIN LOGIN FORM */}
            {selectedRole === 'teacher' && (
              <form onSubmit={handleTeacherLogin} className="space-y-3">
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 space-y-1">
                  <p className="font-bold flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Кабинет преподавателя Ангелины</span>
                  </p>
                  <p className="text-[11px] opacity-80">
                    Введите PIN-код админа для доступа к загрузке роликов, созданию ДЗ и проверке работ.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Пароль администратора:</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={pinCode}
                      onChange={(e) => {
                        setPinCode(e.target.value);
                        setPinError(false);
                      }}
                      placeholder="Пароль администратора"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border tracking-widest font-mono ${
                        pinError
                          ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                          : isDarkMode
                          ? 'bg-[#17212b] border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  {pinError && (
                    <p className="text-[10px] text-rose-400 font-medium">Неверный PIN-код доступа</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={pinSuccess}
                  className={`w-full mt-2 py-3 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 ${
                    pinSuccess
                      ? 'bg-emerald-500 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {pinSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 animate-bounce" />
                      <span>PIN принят! Входим...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Войти в Админ Панель</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* Current Auth Status info for guests */}
        {!isLoggedIn && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <div>
              <span>Статус: </span>
              <span className="font-bold text-sky-400">Не авторизован (Гость)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
