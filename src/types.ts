export type UserRole = 'student' | 'teacher';

export type BlockCategory = 'listening' | 'reading' | 'grammar_vocabulary' | 'writing' | 'speaking' | 'free_webinars';

export interface Timecode {
  timeInSeconds: number;
  timeStr?: string;
  label: string;
}

export interface MaterialFile {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'script' | 'checklist';
  size: string;
  url: string;
}

export interface Webinar {
  id: string;
  title: string;
  block: BlockCategory;
  description: string;
  videoUrl: string;
  videoUrlPart2?: string;
  thumbnailUrl: string;
  duration: string;
  durationSeconds: number;
  timecodes: Timecode[];
  materials: MaterialFile[];
  date: string;
  viewedPositionSeconds?: number;
  month?: string;
  linkedHomeworkId?: string;
}

export type HomeworkType = 'test' | 'speaking' | 'written';

export type HomeworkStatus = 'todo' | 'pending' | 'graded' | 'overdue' | 'archive';

export interface TestOption {
  id: string;
  text: string;
}

export interface TestQuestion {
  id: string;
  question: string;
  type: 'choice' | 'input' | 'match';
  options?: TestOption[];
  correctAnswer: string;
  explanation: string;
}

export interface HomeworkTask {
  id: string;
  block: BlockCategory;
  taskType?: 'test' | 'written' | 'speaking'; // Тип задания: тест, письмо, говорение
  taskNumber: string; // "Задание №1", "Задание №19", "Задание №37", etc.
  instruction?: string; // Инструкция к заданию
  taskPrompt: string; // Задание / Условие
  taskImageUrl?: string; // Фото / Схема / Иллюстрация к заданию
  taskImageUrls?: string[]; // Фотографии к заданию (до 5 шт)
  taskFileLink?: string; // Ссылка на файл (PDF, Doc)
  taskFileName?: string; // Название файла
  taskAudioUrl?: string; // Голосовое / Аудиозапись к заданию (от учителя)
  taskVideoUrl?: string; // Видео к заданию (Reels / TikTok / MP4)
  options?: string[]; // Варианты ответов для тестовых заданий
  correctOptionIndex?: number; // Индекс правильного ответа (0, 1, 2, 3...)
  correctAnswer?: string; // Текст правильного ответа
  sampleAnswer?: string;
}

export interface Homework {
  id: string;
  webinarId?: string;
  title: string;
  block: BlockCategory;
  type: HomeworkType;
  deadline: string; // ISO or readable
  deadlineDate: string;
  month?: string; // Месяц для группировки ("Май 2026", "Апрель 2026", etc.)
  createdAt?: string; // ISO дата публикации
  maxPoints: number;
  description: string;
  tasks?: HomeworkTask[];
  testQuestions?: TestQuestion[];
  speakingPrompt?: {
    taskNumber: string;
    textPrompt: string;
    imageUrl?: string;
    preparationSeconds: number; // e.g. 40
    answerSeconds: number; // e.g. 90
    requirements: string[];
  };
  writtenPrompt?: {
    taskTitle: string;
    instructions: string;
    minWords?: number;
    maxWords?: number;
    samplePdfUrl?: string;
  };
}

export interface FipiCriteriaScores {
  k1_taskSolution: number; // Max 3 or 4
  k2_organization: number; // Max 3
  k3_vocabulary: number; // Max 3
  k4_grammar: number; // Max 3
}

export interface Submission {
  id: string;
  homeworkId: string;
  studentName: string;
  submittedAt: string;
  status: HomeworkStatus;
  type: HomeworkType;
  isLate?: boolean;
  // Test data
  testAnswers?: Record<string, string>;
  testScore?: number;
  // Speaking data
  speakingAudioUrl?: string;
  speakingDurationSeconds?: number;
  // Multi-task answers
  taskAnswers?: Record<string, { textAnswer?: string; voiceAudioUrl?: string; imageUrls?: string[] }>;
  // Written data
  writtenFileUrl?: string;
  writtenFileName?: string;
  writtenImageUrls?: string[];
  essayText?: string;
  // Feedback from Angelina
  criteriaScores?: FipiCriteriaScores;
  totalScore?: number;
  maxScore?: number;
  teacherFeedbackText?: string;
  teacherVoiceAudioUrl?: string;
  teacherCheckedAt?: string;
  // AI Pre-check feedback
  aiPreviewFeedback?: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface ExamBlockScore {
  trialName: string;
  date: string;
  listening: number; // out of 20
  reading: number; // out of 20
  grammarVocabulary: number; // out of 20
  writing: number; // out of 20
  speaking: number; // out of 20
  total: number; // out of 100
}

export interface StudentProfile {
  name: string;
  telegramHandle: string;
  avatarUrl: string;
  streakDays: number;
  streakHistory: boolean[]; // last 7 days
  totalHwSubmitted: number;
  averageScorePercent: number;
  targetExamScore: number;
  badges: Badge[];
  examProgress: ExamBlockScore[];
}

export interface RegisteredStudent {
  id: string;
  name: string;
  login: string;
  telegramHandle?: string;
  password?: string;
  addedAt: string;
  isFirstLogin: boolean;
  streakDays?: number;
  lastVisitDate?: string;
  accessibleMonths?: string[];
}

export interface TGNotification {
  id: string;
  title: string;
  text: string;
  time: string;
  isRead: boolean;
  type: 'check' | 'deadline' | 'webinar' | 'streak';
}
