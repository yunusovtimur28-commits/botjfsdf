import React, { useState, useRef, useEffect } from 'react';
import { Webinar, Timecode, MaterialFile, Homework } from '../types';
import {
  X,
  Play,
  Pause,
  Clock,
  Download,
  FileText,
  CheckCircle,
  Sparkles,
  BookOpen,
  ChevronRight,
} from 'lucide-react';

interface WebinarModalProps {
  webinar: Webinar;
  onClose: () => void;
  isDarkMode: boolean;
  onSaveProgress?: (webinarId: string, positionSeconds: number) => void;
  linkedHomework?: Homework;
  onNavigateToHomework?: () => void;
}

function getVideoEmbedInfo(url: string) {
  if (!url) return { isEmbed: false, embedUrl: '', type: 'direct' as const };
  const cleanUrl = url.trim();

  // 1. YouTube
  const ytMatch = cleanUrl.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return {
      isEmbed: true,
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&enablejsapi=1`,
      type: 'youtube' as const,
      ytId: ytMatch[1],
    };
  }

  // 2. Rutube
  const rutubeMatch = cleanUrl.match(/rutube\.ru\/(?:video|play\/embed)\/([a-zA-Z0-9]+)/i);
  if (rutubeMatch && rutubeMatch[1]) {
    return {
      isEmbed: true,
      embedUrl: `https://rutube.ru/play/embed/${rutubeMatch[1]}?autoStart=true`,
      type: 'rutube' as const,
    };
  }

  // 3. VK Video
  const vkMatch = cleanUrl.match(/vk\.com\/video_ext\.php|vk\.com\/video-?(\d+)_(\d+)|vkvideo\.ru\/video-?(\d+)_(\d+)/i);
  if (vkMatch) {
    if (cleanUrl.includes('video_ext.php')) {
      return { isEmbed: true, embedUrl: cleanUrl, type: 'vk' as const };
    }
    const oid = vkMatch[1] || vkMatch[3];
    const id = vkMatch[2] || vkMatch[4];
    if (oid && id) {
      return {
        isEmbed: true,
        embedUrl: `https://vk.com/video_ext.php?oid=-${oid}&id=${id}&autoplay=1`,
        type: 'vk' as const,
      };
    }
  }

  // 4. Vimeo
  const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      isEmbed: true,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
      type: 'vimeo' as const,
    };
  }

  return { isEmbed: false, embedUrl: cleanUrl, type: 'direct' as const };
}

// Вспомогательная функция для безопасной конвертации огромных Base64 в Blob в обход лимитов fetch
const base64ToBlob = (dataURI: string): Blob => {
  const splitIndex = dataURI.indexOf(',');
  const meta = dataURI.slice(0, splitIndex);
  const base64Data = dataURI.slice(splitIndex + 1);
  const mime = meta.split(':')[1].split(';')[0] || 'application/octet-stream';

  const byteCharacters = atob(base64Data);
  const byteArrays = [];

  // Конвертируем чанками по 512 байт, чтобы не переполнять память
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mime });
};

export const WebinarModal: React.FC<WebinarModalProps> = ({
  webinar,
  onClose,
  isDarkMode,
  onSaveProgress,
  linkedHomework,
  onNavigateToHomework,
}) => {
  const [activePart, setActivePart] = useState<1 | 2>(1);
  const currentUrl = activePart === 1 ? webinar.videoUrl : (webinar.videoUrlPart2 || webinar.videoUrl);
  const embedInfo = getVideoEmbedInfo(currentUrl);
  const [iframeUrl, setIframeUrl] = useState<string>(embedInfo.embedUrl);

  useEffect(() => {
    setIframeUrl(getVideoEmbedInfo(currentUrl).embedUrl);
  }, [currentUrl]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState<number>(webinar.viewedPositionSeconds || 0);
  const [duration, setDuration] = useState<number>(webinar.durationSeconds || 0);
  const [activeTab, setActiveTab] = useState<'timecodes' | 'materials'>('timecodes');
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  // Set initial video time if saved
  useEffect(() => {
    if (videoRef.current && webinar.viewedPositionSeconds) {
      videoRef.current.currentTime = webinar.viewedPositionSeconds;
    }
  }, [webinar]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleSeekTimecode = (timeInSeconds: number) => {
    if (embedInfo.isEmbed) {
      if (embedInfo.type === 'youtube' && embedInfo.ytId) {
        setIframeUrl(`https://www.youtube.com/embed/${embedInfo.ytId}?autoplay=1&start=${timeInSeconds}&rel=0`);
      }
      setCurrentTime(timeInSeconds);
    } else if (videoRef.current) {
      videoRef.current.currentTime = timeInSeconds;
      setCurrentTime(timeInSeconds);
      if (!isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);
      if (onSaveProgress) {
        onSaveProgress(webinar.id, Math.floor(cur));
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleDownload = async (material: MaterialFile) => {
    setDownloadSuccessMessage(`Скачиваем "${material.name}"...`);
    setTimeout(() => setDownloadSuccessMessage(null), 3000);

    try {
      if (material.url.startsWith('data:')) {
        // Используем наш безопасный конвертер вместо fetch
        const blob = base64ToBlob(material.url);
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = material.name || 'Материал_урока';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else if (material.url.startsWith('blob:') || material.url.startsWith('/uploads/')) {
        const link = document.createElement('a');
        link.href = material.url;
        link.download = material.name || 'Материал_урока';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(material.url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Ошибка при скачивании файла:', error);
      alert('Не удалось скачать файл. Возможно, он поврежден.');
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isDarkMode ? 'bg-[#1e2c3a] text-white border border-slate-700' : 'bg-white text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-3.5 px-4 border-b border-slate-200 dark:border-slate-700 bg-black/10">
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-sky-500/20 text-sky-400">
              {webinar.block === 'speaking'
                ? 'Speaking'
                : webinar.block === 'grammar'
                ? 'Грамматика'
                : webinar.block === 'writing'
                ? 'Письмо'
                : 'Лексика'}
            </span>
            <span className="text-xs text-slate-400 font-medium">{webinar.duration}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {webinar.videoUrlPart2 && (
          <div className="flex bg-black/10 dark:bg-black/20">
            <button
              onClick={() => setActivePart(1)}
              className={`flex-1 py-2.5 text-xs font-bold transition-all ${
                activePart === 1 ? 'bg-sky-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Часть 1
            </button>
            <button
              onClick={() => setActivePart(2)}
              className={`flex-1 py-2.5 text-xs font-bold transition-all ${
                activePart === 2 ? 'bg-sky-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Часть 2
            </button>
          </div>
        )}

        {/* Video Player Area */}
        <div className="relative bg-black aspect-video flex items-center justify-center group overflow-hidden">
          {embedInfo.isEmbed ? (
            <iframe
              src={iframeUrl}
              title={webinar.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                src={currentUrl}
                poster={webinar.thumbnailUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-contain"
              />

              {/* Overlay Controls */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between">
                <div className="flex justify-between items-center text-xs text-white/90">
                  <span className="font-semibold drop-shadow">{webinar.title}</span>
                  <span className="bg-black/60 px-2 py-0.5 rounded font-mono">
                    {formatSeconds(currentTime)} / {formatSeconds(duration)}
                  </span>
                </div>

                {/* Center Big Play Button */}
                <button
                  onClick={togglePlay}
                  className="self-center w-14 h-14 rounded-full bg-sky-500/90 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                >
                  {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                </button>

                {/* Bottom Controls Bar */}
                <div className="space-y-1.5">
                  {/* Progress Slider */}
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (videoRef.current) {
                        videoRef.current.currentTime = val;
                        setCurrentTime(val);
                      }
                    }}
                    className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button onClick={togglePlay} className="text-white hover:text-sky-400">
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <span className="text-[11px] text-white/80 font-mono">
                        {formatSeconds(currentTime)}
                      </span>
                    </div>

                    {/* Speed Controls */}
                    <div className="flex items-center space-x-1 bg-black/60 p-1 rounded-lg">
                      <span className="text-[10px] text-slate-400 mr-1 hidden sm:inline">Скорость:</span>
                      {[1.0, 1.25, 1.5, 2.0].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSpeedChange(s)}
                          className={`text-[11px] px-1.5 py-0.5 rounded font-bold transition-colors ${
                            playbackSpeed === s ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Content Details & Tabs */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <div>
            <h2 className="text-base font-bold leading-snug">{webinar.title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {webinar.description}
            </p>
          </div>

          {/* Download Notification Toast */}
          {downloadSuccessMessage && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-2.5 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{downloadSuccessMessage}</span>
            </div>
          )}

          {linkedHomework && onNavigateToHomework && (
            <div className={`p-3 rounded-2xl border flex items-center justify-between ${
              isDarkMode ? 'bg-purple-950/30 border-purple-800/40' : 'bg-purple-50 border-purple-200'
            }`}>
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-purple-400">Домашнее задание к уроку</p>
                  <p className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">{linkedHomework.title}</p>
                </div>
              </div>
              <button
                onClick={onNavigateToHomework}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center space-x-1 shadow-md shadow-purple-600/20 transition-all ml-2"
              >
                <span>Перейти к ДЗ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('timecodes')}
              className={`pb-2.5 px-4 font-bold text-xs border-b-2 transition-all flex items-center space-x-1.5 ${
                activeTab === 'timecodes'
                  ? 'border-sky-500 text-sky-500'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Таймкоды урока ({webinar.timecodes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('materials')}
              className={`pb-2.5 px-4 font-bold text-xs border-b-2 transition-all flex items-center space-x-1.5 ${
                activeTab === 'materials'
                  ? 'border-sky-500 text-sky-500'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Материалы ({webinar.materials.length})</span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'timecodes' ? (
            <div className="space-y-2">
              {webinar.timecodes.map((tc, idx) => {
                const isActive = Math.abs(currentTime - tc.timeInSeconds) < 30;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSeekTimecode(tc.timeInSeconds)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between text-xs ${
                      isActive
                        ? isDarkMode
                          ? 'bg-sky-950/50 border-sky-500/50 text-sky-300 font-semibold'
                          : 'bg-sky-50 border-sky-300 text-sky-700 font-semibold'
                        : isDarkMode
                        ? 'bg-[#17212b] border-slate-800 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{tc.label}</span>
                    <Play className="w-3.5 h-3.5 text-sky-500 opacity-80 shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2.5">
              {webinar.materials.map((mat) => (
                <div
                  key={mat.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isDarkMode ? 'bg-[#17212b] border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-medium text-xs text-slate-200 dark:text-slate-200">
                        {mat.name}
                      </h4>
                      <p className="text-[10px] text-slate-500">{mat.size} • PDF В Telegram</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(mat)}
                    className="p-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Скачать</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
