import { useState, useRef, useCallback } from 'react';
import { ASR_PROVIDERS } from '@/lib/audio/constants';
import { createLogger } from '@/lib/logger';

const log = createLogger('AudioRecorder');

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Web Speech API not typed in lib.dom
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Web Speech API not typed in lib.dom
    webkitSpeechRecognition: any;
  }
}

export interface UseAudioRecorderOptions {
  onTranscription?: (text: string) => void;
  onError?: (error: string) => void;
  /**
   * Prefer browser-native speech recognition first.
   * Useful for quick voice input scenarios that should work without ASR API keys.
   */
  preferBrowserNative?: boolean;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const { onTranscription, onError, preferBrowserNative = false } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Web Speech API not typed
  const speechRecognitionRef = useRef<any>(null);
  const nativeFinalTranscriptRef = useRef('');
  const nativeInterimTranscriptRef = useRef('');
  const nativeManualStopRef = useRef(false);
  // Synchronous lock to prevent rapid re-entry (React state updates are async)
  const busyRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetRecordingState = useCallback(() => {
    busyRef.current = false;
    setIsRecording(false);
    setRecordingTime(0);
    clearTimer();
  }, [clearTimer]);

  // Send audio to server for transcription
  const transcribeAudio = useCallback(
    async (audioBlob: Blob) => {
      setIsProcessing(true);

      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        if (typeof window !== 'undefined') {
          const { useSettingsStore } = await import('@/lib/store/settings');
          const { asrProviderId, asrLanguage, asrProvidersConfig } = useSettingsStore.getState();

          formData.append('providerId', asrProviderId);
          formData.append(
            'modelId',
            asrProvidersConfig?.[asrProviderId]?.modelId ||
              ASR_PROVIDERS[asrProviderId as keyof typeof ASR_PROVIDERS]?.defaultModelId ||
              '',
          );
          formData.append('language', asrLanguage);

          const providerConfig = asrProvidersConfig?.[asrProviderId];
          if (providerConfig?.apiKey?.trim()) {
            formData.append('apiKey', providerConfig.apiKey);
          }
          const effectiveBaseUrl =
            providerConfig?.baseUrl?.trim() || providerConfig?.customDefaultBaseUrl || '';
          if (effectiveBaseUrl) {
            formData.append('baseUrl', effectiveBaseUrl);
          }
        }

        const response = await fetch('/api/transcription', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Transcription failed');
        }

        const result = await response.json();
        onTranscription?.(result.text);
      } catch (error) {
        log.error('Transcription error:', error);
        onError?.(error instanceof Error ? error.message : '语音识别失败，请重试');
      } finally {
        setIsProcessing(false);
        setRecordingTime(0);
      }
    },
    [onTranscription, onError],
  );

  const startBrowserNativeRecognition = useCallback(
    async (requestedLanguage: string): Promise<boolean> => {
      if (typeof window === 'undefined') return false;

      if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        return false;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      const browserLanguages =
        ASR_PROVIDERS['browser-native' as keyof typeof ASR_PROVIDERS]?.supportedLanguages || [];
      const resolvedLanguage = browserLanguages.includes(requestedLanguage)
        ? requestedLanguage
        : 'zh-CN';

      recognition.lang = resolvedLanguage;
      recognition.continuous = true;
      recognition.interimResults = true;

      nativeFinalTranscriptRef.current = '';
      nativeInterimTranscriptRef.current = '';
      nativeManualStopRef.current = false;

      recognition.onstart = () => {
        setIsRecording(true);
        setRecordingTime(0);
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      };

      recognition.onresult = (event: {
        resultIndex?: number;
        results: ArrayLike<{
          0?: { transcript: string };
          isFinal?: boolean;
        }>;
      }) => {
        const startIndex = event.resultIndex ?? 0;
        let interim = '';
        for (let i = startIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = result?.[0]?.transcript?.trim() || '';
          if (!transcript) continue;
          if (result?.isFinal) {
            nativeFinalTranscriptRef.current = nativeFinalTranscriptRef.current
              ? `${nativeFinalTranscriptRef.current} ${transcript}`
              : transcript;
          } else {
            interim = interim ? `${interim} ${transcript}` : transcript;
          }
        }
        nativeInterimTranscriptRef.current = interim;
      };

      recognition.onerror = (event: { error: string }) => {
        log.error('Speech recognition error:', event.error);
        let errorMessage = '语音识别失败';

        switch (event.error) {
          case 'aborted':
            if (nativeManualStopRef.current) return;
            nativeFinalTranscriptRef.current = '';
            nativeInterimTranscriptRef.current = '';
            return;
          case 'no-speech':
            errorMessage = '未检测到语音输入';
            break;
          case 'audio-capture':
            errorMessage = '无法访问麦克风';
            break;
          case 'not-allowed':
            errorMessage = '麦克风权限被拒绝';
            break;
          case 'network':
            errorMessage = '语音识别网络错误';
            break;
          case 'language-not-supported':
            errorMessage = '当前浏览器不支持该语音语言，请尝试 Chrome';
            break;
          default:
            errorMessage = `语音识别错误: ${event.error}`;
        }

        onError?.(errorMessage);
        nativeFinalTranscriptRef.current = '';
        nativeInterimTranscriptRef.current = '';
        speechRecognitionRef.current = null;
        resetRecordingState();
      };

      recognition.onend = () => {
        const transcript = (
          nativeFinalTranscriptRef.current || nativeInterimTranscriptRef.current
        ).trim();
        if (transcript) {
          onTranscription?.(transcript);
        }
        nativeFinalTranscriptRef.current = '';
        nativeInterimTranscriptRef.current = '';
        nativeManualStopRef.current = false;
        speechRecognitionRef.current = null;
        resetRecordingState();
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
      return true;
    },
    [onError, onTranscription, resetRecordingState],
  );

  // Start recording
  const startRecording = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      let asrProviderId = 'browser-native';
      let asrLanguage = 'zh-CN';

      if (typeof window !== 'undefined') {
        const { useSettingsStore } = await import('@/lib/store/settings');
        const state = useSettingsStore.getState();
        asrProviderId = state.asrProviderId;
        asrLanguage = state.asrLanguage || 'zh-CN';
      }

      if (preferBrowserNative || asrProviderId === 'browser-native') {
        const started = await startBrowserNativeRecognition(asrLanguage);
        if (started) return;
        if (preferBrowserNative) {
          onError?.('当前浏览器不支持语音识别功能，请尝试 Chrome');
        }
      }

      // Fallback: MediaRecorder + server ASR
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        resetRecordingState();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      log.error('Failed to start recording:', error);
      resetRecordingState();
      onError?.('无法访问麦克风，请检查浏览器权限设置');
    }
  }, [onError, preferBrowserNative, resetRecordingState, startBrowserNativeRecognition, transcribeAudio]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (speechRecognitionRef.current) {
      nativeManualStopRef.current = true;
      speechRecognitionRef.current.stop();
      return;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearTimer();
    }
  }, [clearTimer, isRecording]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.onresult = null;
      speechRecognitionRef.current.onerror = null;
      speechRecognitionRef.current.onend = null;
      nativeFinalTranscriptRef.current = '';
      nativeInterimTranscriptRef.current = '';
      nativeManualStopRef.current = false;
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
      resetRecordingState();
      return;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();

      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }

      audioChunksRef.current = [];
      resetRecordingState();
    }
  }, [isRecording, resetRecordingState]);

  return {
    isRecording,
    isProcessing,
    recordingTime,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
