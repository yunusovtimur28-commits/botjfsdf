export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

export interface StudentProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  coins: number;
  streakDays: number;
  courseName: string;
  groupName: string;
  completedHomeworks: number;
  totalHomeworks: number;
  attendanceRate: number;
}

export interface Lesson {
  id: string;
  title: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
  tutorName: string;
  tutorAvatar: string;
  status: 'upcoming' | 'live' | 'completed';
  description: string;
  zoomUrl?: string;
  videoRecordUrl?: string;
  materialsCount: number;
  homeworkId?: string;
}

export interface Homework {
  id: string;
  lessonId: string;
  title: string;
  subject: string;
  deadline: string;
  status: 'pending' | 'submitted' | 'approved' | 'revision';
  score?: number;
  maxScore: number;
  description: string;
  taskDetails: string;
  submittedText?: string;
  submittedFile?: string;
  tutorFeedback?: string;
}

export interface ShopItem {
  id: string;
  title: string;
  category: 'merch' | 'boost' | 'stickers' | 'consultation';
  priceCoins: number;
  image: string;
  description: string;
  badge?: string;
  stock: number;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  isCode?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'info' | 'urgent' | 'contest';
  linkText?: string;
}

export interface BotInfo {
  online: boolean;
  username: string;
  appUrl: string;
  lastError: string | null;
  commandsCount: number;
  telegramLink: string;
  botDirectLink: string;
}
