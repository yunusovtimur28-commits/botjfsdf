import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { LessonsView } from './components/LessonsView';
import { HomeworkView } from './components/HomeworkView';
import { AiTutorView } from './components/AiTutorView';
import { ShopView } from './components/ShopView';
import { ProfileView } from './components/ProfileView';

import {
  initialStudentProfile,
  initialLessons,
  initialHomeworks,
  initialShopItems,
  initialAnnouncements,
} from './data/mockData';

import { Lesson, Homework, ShopItem, BotInfo, StudentProfile } from './types';
import { initTelegramApp, getTelegramUser } from './lib/telegram';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [profile, setProfile] = useState<StudentProfile>(initialStudentProfile);
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [homeworks, setHomeworks] = useState<Homework[]>(initialHomeworks);
  const [shopItems] = useState<ShopItem[]>(initialShopItems);
  const [announcements] = useState(initialAnnouncements);

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [initialAiPrompt, setInitialAiPrompt] = useState<string | undefined>(undefined);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);

  // Initialize Telegram WebApp SDK & Sync profile if opened inside Telegram
  useEffect(() => {
    initTelegramApp();

    const tgUser = getTelegramUser();
    if (tgUser) {
      setProfile((prev) => ({
        ...prev,
        name: `${tgUser.first_name} ${tgUser.last_name || ''}`.trim(),
        username: tgUser.username ? `@${tgUser.username}` : prev.username,
        avatar: tgUser.photo_url || prev.avatar,
      }));
    }

    fetchBotInfo();
  }, []);

  const fetchBotInfo = async () => {
    try {
      const res = await fetch('/api/bot-info');
      if (res.ok) {
        const data = await res.json();
        setBotInfo(data);
      }
    } catch (e) {
      console.warn('Failed to fetch bot info:', e);
    }
  };

  const handleHomeworkSubmit = (hwId: string, solutionText: string, fileName?: string) => {
    setHomeworks((prev) =>
      prev.map((hw) => {
        if (hw.id === hwId) {
          return {
            ...hw,
            status: 'submitted',
            submittedText: solutionText,
            submittedFile: fileName,
          };
        }
        return hw;
      })
    );

    // Reward student with XP and Delay Coins
    setProfile((prev) => {
      const newXp = prev.xp + 50;
      const newLevel = newXp >= prev.nextLevelXp ? prev.level + 1 : prev.level;
      const nextLevelXp = newLevel > prev.level ? prev.nextLevelXp + 1000 : prev.nextLevelXp;

      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        nextLevelXp,
        coins: prev.coins + 30,
        completedHomeworks: prev.completedHomeworks + 1,
      };
    });
  };

  const handleBuyShopItem = (item: ShopItem) => {
    setProfile((prev) => ({
      ...prev,
      coins: prev.coins - item.priceCoins,
    }));
  };

  const handleAskAiForHelp = (promptText: string) => {
    setInitialAiPrompt(promptText);
    setActiveTab('ai_tutor');
  };

  const pendingHwCount = homeworks.filter((h) => h.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Sticky Header */}
      <Header
        profile={profile}
        botInfo={botInfo}
        onOpenProfile={() => setActiveTab('profile')}
        onOpenShop={() => setActiveTab('shop')}
        onOpenBotInfo={() => setActiveTab('profile')}
      />

      {/* Main Tab Content */}
      <main className="min-h-[calc(100vh-120px)]">
        {activeTab === 'dashboard' && (
          <DashboardView
            profile={profile}
            lessons={lessons}
            homeworks={homeworks}
            announcements={announcements}
            botInfo={botInfo}
            onRefreshBot={fetchBotInfo}
            onNavigate={(tab) => setActiveTab(tab)}
            onSelectLesson={(lesson) => {
              setSelectedLesson(lesson);
              setActiveTab('lessons');
            }}
            onSelectHomework={(hw) => {
              setSelectedHomework(hw);
              setActiveTab('homework');
            }}
          />
        )}

        {activeTab === 'lessons' && (
          <LessonsView
            lessons={lessons}
            selectedLesson={selectedLesson}
            onSelectLesson={setSelectedLesson}
            onGoToHomework={(hwId) => {
              const hw = homeworks.find((h) => h.id === hwId);
              if (hw) {
                setSelectedHomework(hw);
                setActiveTab('homework');
              }
            }}
          />
        )}

        {activeTab === 'homework' && (
          <HomeworkView
            homeworks={homeworks}
            selectedHomework={selectedHomework}
            onSelectHomework={setSelectedHomework}
            onSubmitHomework={handleHomeworkSubmit}
            onAskAiForHelp={handleAskAiForHelp}
          />
        )}

        {activeTab === 'ai_tutor' && (
          <AiTutorView
            initialPrompt={initialAiPrompt}
            onClearInitialPrompt={() => setInitialAiPrompt(undefined)}
          />
        )}

        {activeTab === 'shop' && (
          <ShopView
            items={shopItems}
            profile={profile}
            onBuyItem={handleBuyShopItem}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={profile}
            botInfo={botInfo}
            onRefreshBot={fetchBotInfo}
          />
        )}
      </main>

      {/* Bottom Sticky Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        pendingHomeworkCount={pendingHwCount}
      />
    </div>
  );
}
