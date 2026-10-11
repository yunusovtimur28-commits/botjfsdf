import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, Paperclip, CheckCircle2, RotateCcw, Volume2, Play, Square } from 'lucide-react';
import { Submission } from '../types';
import { uploadFileToServer } from '../lib/fileUpload';

interface TaskVoiceAudioPlayerProps {
  voiceAudioUrl?: string;
  voiceAudioBase64?: string;
  taskId: string;
  submission: Submission;
  onGradeSubmission: (submissionId: string, updatedData: Partial<Submission>) => void;
  onAutoScoreTask?: (taskId: string, score: number, comment: string) => void;
  isDarkMode?: boolean;
}

export const TaskVoiceAudioPlayer: React.FC<TaskVoiceAudioPlayerProps> = ({
  voiceAudioUrl,
  voiceAudioBase64,
  taskId,
  submission,
  onGradeSubmission,
  onAutoScoreTask,
  isDarkMode = true,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isReRecordRequested, setIsReRecordRequested] = useState(
    Boolean(submission.reRecordRequestedTaskIds?.includes(taskId))
  );
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const effectiveAudioSrc = voiceAudioBase64 || voiceAudioUrl || '';

  // If there is no URL and no base64, immediately treat as error/missing
  useEffect(() => {
    if (!effectiveAudioSrc) {
      setHasError(true);
    }
  }, [effectiveAudioSrc]);

  const handleAudioError = () => {
    setHasError(true);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      if (dur === 0 || isNaN(dur)) {
        setHasError(true);
      } else {
        setHasError(false);
      }
    }
  };

  const handleAttachAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAudio(true);
    try {
      const res = await uploadFileToServer(file);
      if (res.url) {
        const updatedTaskAnswers = {
          ...(submission.taskAnswers || {}),
          [taskId]: {
            ...(submission.taskAnswers?.[taskId] || {}),
            voiceAudioUrl: res.url,
          },
        };

        // Remove from reRecordRequested if attached
        const filteredReRecords = (submission.reRecordRequestedTaskIds || []).filter(
          (id) => id !== taskId
        );

        onGradeSubmission(submission.id, {
          taskAnswers: updatedTaskAnswers,
          reRecordRequestedTaskIds: filteredReRecords,
        });

        setHasError(false);
      }
    } catch (err) {
      console.error('Failed to attach teacher audio:', err);
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleAcceptWithoutReRecord = () => {
    if (onAutoScoreTask) {
      onAutoScoreTask(taskId, 5, 'Голосовой ответ зачтен преподавателем (без перезаписи).');
    }
  };

  const handleRequestReRecord = () => {
    const prev = submission.reRecordRequestedTaskIds || [];
    if (!prev.includes(taskId)) {
      const next = [...prev, taskId];
      onGradeSubmission(submission.id, {
        reRecordRequestedTaskIds: next,
      });
      setIsReRecordRequested(true);
    }
  };

  return (
    <div className="space-y-2 mt-1">
      {hasError ? (
        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-200 text-xs space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">
                Запись ответа недоступна (0 сек / серверная перезагрузка)
              </p>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Файл аудиозаписи был очищен при перезапуске сервера. Выберите действие, чтобы ученице не пришлось заново всё записывать:
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20">
            {/* 1. Прикрепить аудиозапись из Telegram */}
            <label className="cursor-pointer px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] rounded-lg flex items-center space-x-1.5 transition-all shadow-sm">
              <Paperclip className="w-3.5 h-3.5" />
              <span>{isUploadingAudio ? 'Загрузка...' : 'Прикрепить аудио из Telegram'}</span>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                disabled={isUploadingAudio}
                onChange={handleAttachAudioFile}
              />
            </label>

            {/* 2. Зачесть без перезаписи */}
            <button
              type="button"
              onClick={handleAcceptWithoutReRecord}
              className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 font-bold text-[11px] rounded-lg flex items-center space-x-1.5 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Зачесть без перезаписи</span>
            </button>

            {/* 3. Запросить перезапись у ученицы */}
            <button
              type="button"
              onClick={handleRequestReRecord}
              className={`px-2.5 py-1.5 font-bold text-[11px] rounded-lg flex items-center space-x-1.5 transition-all ${
                isReRecordRequested || submission.reRecordRequestedTaskIds?.includes(taskId)
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {isReRecordRequested || submission.reRecordRequestedTaskIds?.includes(taskId)
                  ? '✓ Перезапись запрошена'
                  : 'Запросить перезапись'}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-2 bg-black/40 p-2 rounded-xl border border-slate-700/60">
          <audio
            ref={audioRef}
            controls
            src={effectiveAudioSrc}
            onError={handleAudioError}
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full h-8 accent-purple-500"
          />

          {/* Speed control buttons */}
          <div className="flex items-center space-x-0.5 shrink-0">
            {[1.0, 1.25, 1.5].map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => {
                  setPlaybackSpeed(sp);
                  if (audioRef.current) {
                    audioRef.current.playbackRate = sp;
                  }
                }}
                className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-all ${
                  playbackSpeed === sp
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sp}x
              </button>
            ))}
          </div>

          {/* Replace file button if teacher wants to update */}
          <label
            className="cursor-pointer p-1.5 text-slate-400 hover:text-sky-300 rounded-lg hover:bg-sky-500/10 transition-colors shrink-0"
            title="Заменить или обновить аудиозапись"
          >
            <Paperclip className="w-3.5 h-3.5" />
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              disabled={isUploadingAudio}
              onChange={handleAttachAudioFile}
            />
          </label>
        </div>
      )}
    </div>
  );
};
