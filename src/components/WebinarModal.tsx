import React, { useState, useRef, useEffect } from 'react';
import { Webinar, Timecode, MaterialFile } from '../types';
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
} from 'lucide-react';

interface WebinarModalProps {
  webinar: Webinar;
  onClose: () => void;
  isDarkMode: boolean;
  onSaveProgress?: (webinarId: string, positionSeconds: number) => void;
}

export const WebinarModal: React.FC<WebinarModalProps> = ({
  webinar,
  onClose,
  isDarkMode,
  onSaveProgress,
}) => {
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
    if (videoRef.current) {
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

  const handleDownload = (material: MaterialFile) => {
    setDownloadSuccessMessage(`Файл "${material.name}" сохранен в Telegram!`);
    setTimeout(() => setDownloadSuccessMessage(null), 3000);
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

        {/* Video Player Area */}
        <div className="relative bg-black aspect-video flex items-center justify-center group overflow-hidden">
          <video
            ref={videoRef}
            src={webinar.videoUrl}
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
