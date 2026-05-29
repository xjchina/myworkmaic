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
    webkitAudioContext?: typeof AudioContext;
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
  const [audioLevel, setAudioLevel] = useState(0);
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInputDeviceId, setSelectedInputDeviceId] = useState('');
  const selectedInputDeviceIdRef = useRef('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nativeWarmupStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioLevelFrameRef = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Web Speech API not typed
  const speechRecognitionRef = useRef<any>(null);
  const nativeFinalTranscriptRef = useRef('');
  const nativeInterimTranscriptRef = useRef('');
  const nativeManualStopRef = useRef(false);
  const nativeStartedAtRef = useRef(0);
  const nativeRetryCountRef = useRef(0);
  // Synchronous lock to prevent rapid re-entry (React state updates are async)
  const busyRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopAudioLevelMeter = useCallback(() => {
    if (audioLevelFrameRef.current !== null) {
      cancelAnimationFrame(audioLevelFrameRef.current);
      audioLevelFrameRef.current = null;
    }
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    setAudioLevel(0);
  }, []);

  const stopNativeWarmupStream = useCallback(() => {
    nativeWarmupStreamRef.current?.getTracks().forEach((track) => track.stop());
    nativeWarmupStreamRef.current = null;
  }, []);

  const resetRecordingState = useCallback(() => {
    busyRef.current = false;
    stopAudioLevelMeter();
    stopNativeWarmupStream();
    setIsRecording(false);
    setRecordingTime(0);
    clearTimer();
  }, [clearTimer, stopAudioLevelMeter, stopNativeWarmupStream]);

  const refreshInputDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((device) => device.kind === 'audioinput');
    setInputDevices(audioInputs);
    if (!selectedInputDeviceId && audioInputs[0]?.deviceId) {
      setSelectedInputDeviceId(audioInputs[0].deviceId);
      selectedInputDeviceIdRef.current = audioInputs[0].deviceId;
    }
    return audioInputs;
  }, [selectedInputDeviceId]);

  const getAudioConstraints = useCallback((): MediaStreamConstraints => ({
    audio: {
      ...(selectedInputDeviceIdRef.current
        ? { deviceId: { exact: selectedInputDeviceIdRef.current } }
        : {}),
      echoCancellation: true,
      noiseSuppression: false,
      autoGainControl: true,
    },
  }), []);

  const selectInputDevice = useCallback((deviceId: string) => {
    selectedInputDeviceIdRef.current = deviceId;
    setSelectedInputDeviceId(deviceId);
  }, []);

  const startAudioLevelMeter = useCallback((stream: MediaStream) => {
    stopAudioLevelMeter();
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return;
      const audioContext = new AudioContextCtor();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      audioContextRef.current = audioContext;

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) {
          const normalized = (value - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / data.length);
        setAudioLevel(Math.min(1, rms * 8));
        audioLevelFrameRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch (error) {
      log.warn('Unable to start microphone level meter:', error);
    }
  }, [stopAudioLevelMeter]);

  const warmupMicrophoneForNativeRecognition = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;

    stopNativeWarmupStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getAudioConstraints());
      nativeWarmupStreamRef.current = stream;
      startAudioLevelMeter(stream);
      void refreshInputDevices();
    } catch (error) {
      // Keep the old browser-native path available so permission errors still surface there.
      log.warn('Microphone warmup failed before native recognition:', error);
    }
  }, [getAudioConstraints, refreshInputDevices, startAudioLevelMeter, stopNativeWarmupStream]);

  const isSupportedMimeType = (mimeType: string) =>
    typeof MediaRecorder !== 'undefined' &&
    typeof MediaRecorder.isTypeSupported === 'function' &&
    MediaRecorder.isTypeSupported(mimeType);

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

      const browserLanguages =
        ASR_PROVIDERS['browser-native' as keyof typeof ASR_PROVIDERS]?.supportedLanguages || [];
      const resolvedLanguage = browserLanguages.includes(requestedLanguage)
        ? requestedLanguage
        : 'zh-CN';

      await warmupMicrophoneForNativeRecognition();

      const startRecognition = () => {
        const recognition = new SpeechRecognition();

        recognition.lang = resolvedLanguage;
        // Continuous mode gives Chinese short input a longer listening window.
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsRecording(true);
          if (!timerRef.current) {
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
              setRecordingTime((prev) => prev + 1);
            }, 1000);
          }
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

          const finalTranscript = nativeFinalTranscriptRef.current.trim();
          if (finalTranscript) {
            onTranscription?.(finalTranscript);
            nativeFinalTranscriptRef.current = '';
            nativeInterimTranscriptRef.current = '';
            nativeManualStopRef.current = true;
            recognition.stop();
          }
        };

        recognition.onerror = (event: { error: string }) => {
          if (event.error === 'no-speech') {
            log.warn('Speech recognition ended without detected speech');
          } else {
            log.error('Speech recognition error:', event.error);
          }
          let errorMessage = '\u8bed\u97f3\u8bc6\u522b\u5931\u8d25';

          switch (event.error) {
            case 'aborted':
              if (nativeManualStopRef.current) return;
              nativeFinalTranscriptRef.current = '';
              nativeInterimTranscriptRef.current = '';
              return;
            case 'no-speech': {
              const elapsed = Date.now() - nativeStartedAtRef.current;
              if (
                !nativeManualStopRef.current &&
                nativeRetryCountRef.current < 2 &&
                elapsed < 15000
              ) {
                nativeRetryCountRef.current += 1;
                speechRecognitionRef.current = null;
                window.setTimeout(() => {
                  if (!nativeManualStopRef.current && !speechRecognitionRef.current) {
                    startRecognition();
                  }
                }, 250);
                return;
              }
              errorMessage = '\u6ca1\u6709\u8bc6\u522b\u5230\u58f0\u97f3\uff0c\u8bf7\u9760\u8fd1\u9ea6\u514b\u98ce\u540e\u518d\u8bd5';
              break;
            }
            case 'audio-capture':
              errorMessage = '\u65e0\u6cd5\u8bbf\u95ee\u9ea6\u514b\u98ce\uff0c\u8bf7\u68c0\u67e5\u8f93\u5165\u8bbe\u5907';
              break;
            case 'not-allowed':
              errorMessage = '\u9ea6\u514b\u98ce\u6743\u9650\u88ab\u62d2\u7edd\uff0c\u8bf7\u5728\u6d4f\u89c8\u5668\u5730\u5740\u680f\u5141\u8bb8\u9ea6\u514b\u98ce';
              break;
            case 'network':
              errorMessage = '\u8bed\u97f3\u8bc6\u522b\u7f51\u7edc\u9519\u8bef';
              break;
            case 'language-not-supported':
              errorMessage = '\u5f53\u524d\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u8be5\u8bed\u97f3\u8bed\u8a00\uff0c\u8bf7\u5c1d\u8bd5 Chrome';
              break;
            default:
              errorMessage = `\u8bed\u97f3\u8bc6\u522b\u9519\u8bef: ${event.error}`;
          }

          onError?.(errorMessage);
          nativeFinalTranscriptRef.current = '';
          nativeInterimTranscriptRef.current = '';
          speechRecognitionRef.current = null;
          resetRecordingState();
        };

        recognition.onend = () => {
          if (!speechRecognitionRef.current && nativeRetryCountRef.current > 0) return;
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
      };

      nativeFinalTranscriptRef.current = '';
      nativeInterimTranscriptRef.current = '';
      nativeManualStopRef.current = false;
      nativeStartedAtRef.current = Date.now();
      nativeRetryCountRef.current = 0;
      startRecognition();
      return true;
    },
    [onError, onTranscription, resetRecordingState, warmupMicrophoneForNativeRecognition],
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
      const stream = await navigator.mediaDevices.getUserMedia(getAudioConstraints());
      startAudioLevelMeter(stream);
      void refreshInputDevices();
      const mimeType = isSupportedMimeType('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : isSupportedMimeType('audio/webm')
          ? 'audio/webm'
          : '';
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
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
  }, [
    getAudioConstraints,
    onError,
    preferBrowserNative,
    refreshInputDevices,
    resetRecordingState,
    startAudioLevelMeter,
    startBrowserNativeRecognition,
    transcribeAudio,
  ]);

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
    audioLevel,
    inputDevices,
    selectedInputDeviceId,
    setSelectedInputDeviceId: selectInputDevice,
    refreshInputDevices,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
