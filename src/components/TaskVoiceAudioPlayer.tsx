import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, Paperclip, CheckCircle2, RotateCcw, Volume2, X, ExternalLink, Download, RefreshCw } from 'lucide-react';
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
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const effectiveAudioSrc = voiceAudioBase64 || voiceAudioUrl || '';
  const isReRecordRequested = Boolean(submission.reRecordRequestedTaskIds?.includes(taskId));

  // Reset error when src changes
  useEffect(() => {
    setHasError(false);
  }, [effectiveAudioSrc]);

  // Auto-clear reRecordRequested when effectiveAudioSrc is present!
  useEffect(() => {
    if (effectiveAudioSrc && submission.reRecordRequestedTaskIds?.includes(taskId)) {
      const next = (submission.reRecordRequestedTaskIds || []).filter((id) => id !== taskId);
      onGradeSubmission(submission.id, {
        reRecordRequestedTaskIds: next,
      });
    }
  }, [effectiveAudioSrc, submission.reRecordRequestedTaskIds, taskId, submission.id, onGradeSubmission]);

  const handleAudioError = () => {
    if (effectiveAudioSrc) {
      setHasError(true);
    }
  };

  const handleRetryAudio = () => {
    setHasError(false);
    if (audioRef.current) {
      audioRef.current.load();
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
    // Also remove from reRecordRequested if accepted
    const filteredReRecords = (submission.reRecordRequestedTaskIds || []).filter(
      (id) => id !== taskId
    );
    onGradeSubmission(submission.id, {
      reRecordRequestedTaskIds: filteredReRecords,
    });
  };

  const handleToggleRequestReRecord = () => {
    const prev = submission.reRecordRequestedTaskIds || [];
    let next: string[];
    if (prev.includes(taskId)) {
      // Cancel request
      next = prev.filter((id) => id !== taskId);
    } else {
      // Add request
      next = [...prev, taskId];
    }
    onGradeSubmission(submission.id, {
      reRecordRequestedTaskIds: next,
    });
  };

  const handleCancelReRecordRequest = () => {
    const prev = submission.reRecordRequestedTaskIds || [];
    const next = prev.filter((id) => id !== taskId);
    onGradeSubmission(submission.id, {
      reRecordRequestedTaskIds: next,
    });
  };

  return (
    <div className="space-y-2 mt-1">
      {/* 1. Main Audio Player (renders if effectiveAudioSrc exists) */}
      {effectiveAudioSrc && (
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2 bg-black/40 p-2 rounded-xl border border-emerald-500/30 shadow-sm">
            <audio
              ref={audioRef}
              controls
              src={effectiveAudioSrc}
              onError={handleAudioError}
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

            {/* Open / Download in new tab */}
            <a
              href={effectiveAudioSrc}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="p-1.5 text-slate-400 hover:text-emerald-300 rounded-lg hover:bg-emerald-500/10 transition-colors shrink-0"
              title="Открыть или скачать аудиофайл напрямую"
            >
              <Download className="w-3.5 h-3.5" />
            </a>

            {/* Replace file button if teacher wants to attach audio directly */}
            <label
              className="cursor-pointer p-1.5 text-slate-400 hover:text-sky-300 rounded-lg hover:bg-sky-500/10 transition-colors shrink-0"
              title="Заменить аудиозапись из Telegram/диктофона"
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

          {/* Action to request re-recording if needed */}
          <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
            <span className="flex items-center space-x-1 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>Голосовой ответ прикреплен</span>
            </span>
            <button
              type="button"
              onClick={handleToggleRequestReRecord}
              className="hover:text-amber-300 transition-colors text-[10px] flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Запросить перезаписать</span>
            </button>
          </div>

          {/* If audio failed to load in browser audio tag, offer retry & direct download */}
          {hasError && (
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
              <span className="text-[11px]">Файл восстанавливается или поддерживается через прямое прослушивание</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleRetryAudio}
                  className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded font-bold text-[10px] flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Обновить плеер</span>
                </button>
                <a
                  href={effectiveAudioSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded font-bold text-[10px] flex items-center space-x-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Слушать напрямую</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Banner if re-record was requested AND no audio has been provided yet */}
      {!effectiveAudioSrc && isReRecordRequested && (
        <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold text-[11px] truncate">
              Запрошена перезапись ответа у ученицы
            </span>
          </div>
          <button
            type="button"
            onClick={handleCancelReRecordRequest}
            className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold border border-emerald-500 shrink-0 flex items-center space-x-1 transition-all shadow-sm"
            title="Снять статус запроса перезаписи"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Снять запрос</span>
          </button>
        </div>
      )}

      {/* 3. Recovery Card ONLY if no audio is attached yet */}
      {!effectiveAudioSrc && (
        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-200 text-xs space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">
                Запись ответа еще не прикреплена ученицей
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                Вы можете зачесть задание без перезаписи, прикрепить аудиофайл из Telegram или запросить перезапись у ученицы:
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
            {/* Прикрепить аудиозапись из Telegram */}
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

            {/* Зачесть без перезаписи */}
            <button
              type="button"
              onClick={handleAcceptWithoutReRecord}
              className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 font-bold text-[11px] rounded-lg flex items-center space-x-1.5 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Зачесть без перезаписи</span>
            </button>

            {/* Запросить / Снять перезапись */}
            <button
              type="button"
              onClick={handleToggleRequestReRecord}
              className={`px-2.5 py-1.5 font-bold text-[11px] rounded-lg flex items-center space-x-1.5 transition-all ${
                isReRecordRequested
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                  : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {isReRecordRequested ? '✓ Запрошено (нажмите для отмены)' : 'Запросить перезапись'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
