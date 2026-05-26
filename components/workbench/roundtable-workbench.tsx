'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Send,
  Loader2,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AvatarDisplay } from '@/components/ui/avatar-display';
import { SpeechButton } from '@/components/audio/speech-button';
import { useSettingsStore } from '@/lib/store/settings';
import { useAgentRegistry } from '@/lib/orchestration/registry/store';
import { getCurrentModelConfig } from '@/lib/utils/model-config';
import { cn } from '@/lib/utils';
import { trackUsage } from '@/lib/client/usage-tracker';
import { useSubscriptionStore } from '@/lib/store/subscription';
import type { AgentConfig } from '@/lib/orchestration/registry/types';
import type { PBLAgent } from '@/lib/pbl/types';

const STORAGE_KEY = 'roundtableDebates:v2';

type MessageRole = 'user' | 'teacher' | 'student';

interface DiscussionMessage {
  id: string;
  role: MessageRole;
  name: string;
  avatar?: string;
  content: string;
  timestamp: number;
  streaming?: boolean;
}

interface DebateSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: DiscussionMessage[];
}

const DEFAULT_TEACHER_AVATAR = '/avatars/teacher.png';
const DEFAULT_USER_AVATAR = '/avatars/user.png';

function hasConfiguredLanguageModel(): boolean {
  const { providerId, modelId, providersConfig } = useSettingsStore.getState();
  if (!providerId || !modelId) return false;

  const provider = providersConfig?.[providerId];
  if (!provider) return false;
  if (!provider.models.some((model) => model.id === modelId)) return false;

  const hasEndpoint = !!(
    provider.baseUrl?.trim() ||
    provider.defaultBaseUrl?.trim() ||
    provider.serverBaseUrl?.trim()
  );
  if (!hasEndpoint) return false;

  if (!provider.requiresApiKey) return true;
  return !!(provider.apiKey?.trim() || provider.isServerConfigured);
}

// 閳光偓閳光偓 API helper 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓

function toPblAgent(agent: AgentConfig): PBLAgent {
  return {
    name: agent.name,
    actor_role: agent.role,
    role_division: 'development',
    system_prompt: `${agent.persona}\n\n你正在“圆桌讨论”页面发言。请严格围绕学生提问进行讨论，不跑题，不空话。输出要求：观点清晰、逻辑完整、可执行。`,
    default_mode: 'agent',
    delay_time: 0,
    env: {},
    is_user_role: false,
    is_active: true,
    is_system_agent: false,
  };
}

async function askAgent(
  agent: AgentConfig,
  prompt: string,
  recentMessages: DiscussionMessage[],
): Promise<string> {
  const modelConfig = getCurrentModelConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-model': modelConfig.modelString,
    'x-api-key': modelConfig.apiKey,
  };
  if (modelConfig.baseUrl) headers['x-base-url'] = modelConfig.baseUrl;
  if (modelConfig.providerType) headers['x-provider-type'] = modelConfig.providerType;

  const response = await fetch('/api/pbl/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: prompt,
      agent: toPblAgent(agent),
      currentIssue: null,
      recentMessages: recentMessages.slice(-16).map((item) => ({
        agent_name: item.name,
        message: item.content,
      })),
      userRole: '学生',
      agentType: 'question',
    }),
  });

  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || data?.message || '讨论生成失败');
  }
  return String(data.message || '').trim();
}

// 閳光偓閳光偓 Agent selection 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓

function pickRoundtableAgents(selectedIds: string[], agentsMap: Record<string, AgentConfig>) {
  const selected = selectedIds.map((id) => agentsMap[id]).filter((a): a is AgentConfig => !!a);
  const source = selected.length > 0 ? selected : Object.values(agentsMap);
  const teacher = source.find((a) => a.role === 'teacher') || source[0];
  const students = source.filter((a) => a.id !== teacher?.id).slice(0, 3);
  return { teacher, students };
}

// 閳光偓閳光偓 Local storage helpers 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓

interface DebateStore {
  sessions: DebateSession[];
}

function safeReadStore(): DebateStore {
  if (typeof window === 'undefined') return { sessions: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: [] };
    const parsed = JSON.parse(raw) as DebateStore;
    if (!Array.isArray(parsed.sessions)) return { sessions: [] };
    return { sessions: parsed.sessions };
  } catch {
    return { sessions: [] };
  }
}

function safeWriteStore(store: DebateStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

function filterSessionsByHistory(sessions: DebateSession[], dataHistory: 'today' | 'week' | 'full'): DebateSession[] {
  if (dataHistory === 'full') return sessions;

  const now = Date.now();
  const cutoffMs = dataHistory === 'today' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const cutoff = now - cutoffMs;

  return sessions.filter((item) => {
    const updatedAt = Number(item.updatedAt || item.createdAt || 0);
    return updatedAt >= cutoff;
  });
}

function upsertSession(sessions: DebateSession[], target: DebateSession): DebateSession[] {
  const existed = sessions.some((s) => s.id === target.id);
  const next = existed
    ? sessions.map((s) => (s.id === target.id ? target : s))
    : [target, ...sessions];
  return [...next].sort((a, b) => b.updatedAt - a.updatedAt);
}

// 閳光偓閳光偓 Speech hook 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓

function useSpeech() {
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const queueRef = useRef<DiscussionMessage[]>([]);

  const speakNext = useCallback(function runSpeakNext() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const next = queueRef.current.shift();
    if (!next) {
      setSpeakingMsgId(null);
      return;
    }
    const utt = new SpeechSynthesisUtterance(next.content);
    utt.lang = 'zh-CN';
    if (next.role === 'teacher') {
      utt.rate = 0.95;
      utt.pitch = 0.9;
    } else if (next.role === 'student') {
      utt.rate = 1.1;
      utt.pitch = 1.15;
    } else {
      utt.rate = 1.0;
      utt.pitch = 1.0;
    }
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find((v) => v.lang.startsWith('zh'));
    if (zhVoice) utt.voice = zhVoice;

    setSpeakingMsgId(next.id);
    utt.onend = runSpeakNext;
    utt.onerror = () => {
      setSpeakingMsgId(null);
      queueRef.current = [];
    };
    window.speechSynthesis.speak(utt);
  }, []);

  const speak = useCallback((msg: DiscussionMessage) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    // If currently speaking this message 閳?stop all
    if (speakingMsgId === msg.id || window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      queueRef.current = [];
      setSpeakingMsgId(null);
      // If clicked the currently playing message, just stop (don't restart)
      if (speakingMsgId === msg.id) return;
    }
    queueRef.current = [msg];
    speakNext();
  }, [speakingMsgId, speakNext]);

  const speakAll = useCallback((msgs: DiscussionMessage[]) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    queueRef.current = msgs.filter((m) => m.content && !m.streaming);
    speakNext();
  }, [speakNext]);

  const enqueueSpeak = useCallback((msg: DiscussionMessage) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !msg.content || msg.streaming) return;
    queueRef.current.push(msg);
    if (!window.speechSynthesis.speaking && !speakingMsgId) {
      speakNext();
    }
  }, [speakNext, speakingMsgId]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    queueRef.current = [];
    setSpeakingMsgId(null);
  }, []);

  return { speakingMsgId, speak, speakAll, enqueueSpeak, stop };
}

// 閳光偓閳光偓 MessageBubble 閳?classroom-style bubble 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓

function MessageBubble({
  message,
  isLast,
  isRunning,
}: {
  message: DiscussionMessage;
  isLast: boolean;
  isRunning: boolean;
}) {
  const isUser = message.role === 'user';
  const isTeacher = message.role === 'teacher';

  return (
    <div className="flex items-end gap-1.5">
      <div
        className={cn(
          'inline-block px-2.5 py-1.5 rounded-xl text-[13px] leading-relaxed max-w-full text-left transition-shadow duration-300',
          isUser
            ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-tr-sm shadow-sm shadow-purple-300/30 ring-1 ring-purple-500/20'
            : isTeacher
              ? 'bg-white text-gray-700 border border-gray-100 rounded-tl-sm shadow-sm'
              : 'bg-indigo-50 text-indigo-900 border border-indigo-100/50 rounded-tl-sm',
        )}
      >
        <span className="break-words whitespace-pre-wrap">
          {message.content}
          {message.streaming && isLast && isRunning && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-50 animate-pulse ml-1 align-middle" />
          )}
        </span>
      </div>
      {/* Speak button */}
    </div>
  );
}

// 閳光偓閳光偓 Session list item 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓

function SessionItem({
  session,
  isActive,
  onClick,
  onDelete,
}: {
  session: DebateSession;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-2.5 py-0 h-[52px] rounded-lg cursor-pointer transition-all duration-200 shrink-0',
        isActive
          ? 'bg-violet-50 border border-violet-200/60'
          : 'hover:bg-gray-50 border border-transparent',
      )}
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="flex-1 min-w-0">
        <p className={cn('text-[13px] font-medium truncate', isActive ? 'text-violet-700' : 'text-gray-800')}>
          {session.title || '未命名讨论'}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {session.messages.length} 条消息 · {new Date(session.updatedAt).toLocaleDateString()}
        </p>
      </div>
      <AnimatePresence>
        {hovering && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="shrink-0 size-5 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="size-3" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// 閳光偓閳光偓 Main Component 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓

export function RoundtableWorkbench() {
  const router = useRouter();
  const selectedAgentIds = useSettingsStore((s) => s.selectedAgentIds);
  const agentsMap = useAgentRegistry((s) => s.agents);
  const subscription = useSubscriptionStore((s) => s.subscription);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
  const { teacher, students } = useMemo(
    () => pickRoundtableAgents(selectedAgentIds, agentsMap),
    [selectedAgentIds, agentsMap],
  );

  const [sessions, setSessions] = useState<DebateSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { enqueueSpeak, stop: stopSpeech } = useSpeech();

  useEffect(() => {
    void fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('roundtable:autoSpeak');
    if (saved === '0') setAutoSpeak(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('roundtable:autoSpeak', autoSpeak ? '1' : '0');
  }, [autoSpeak]);

  // Hydrate from localStorage
  useEffect(() => {
    const store = safeReadStore();
    const historyPolicy = subscription?.permissions?.dataHistory ?? 'today';
    const visibleSessions = filterSessionsByHistory(store.sessions, historyPolicy);

    if (visibleSessions.length !== store.sessions.length) {
      safeWriteStore({ sessions: visibleSessions });
    }

    setSessions(visibleSessions);
    if (visibleSessions.length > 0) {
      setActiveSessionId(visibleSessions[0].id);
    }
  }, [subscription?.permissions?.dataHistory]);

  // Auto-scroll
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeSessionId, sessions]);

  // Stop speech on session switch or unmount
  useEffect(() => {
    stopSpeech();
    return () => {
      stopSpeech();
    };
  }, [activeSessionId, stopSpeech]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  const saveSession = useCallback((session: DebateSession) => {
    setSessions((prev) => {
      const next = upsertSession(prev, session);
      safeWriteStore({ sessions: next });
      return next;
    });
    setActiveSessionId(session.id);
  }, []);

  const createNewSession = useCallback(() => {
    const session: DebateSession = {
      id: `debate_${Date.now()}`,
      title: '新讨论',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    saveSession(session);
    setInputValue('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [saveSession]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== sessionId);
      safeWriteStore({ sessions: next });
      return next;
    });
    setActiveSessionId((prev) => {
      if (prev === sessionId) return null;
      return prev;
    });
  }, []);

  const appendMessage = useCallback((session: DebateSession, message: DiscussionMessage): DebateSession => {
    const next: DebateSession = {
      ...session,
      updatedAt: Date.now(),
      messages: [...session.messages, message],
      title:
        session.messages.length === 0 && message.role === 'user'
          ? message.content.slice(0, 24)
          : session.title,
    };
    saveSession(next);
    return next;
  }, [saveSession]);

  const updateLastMessage = useCallback((session: DebateSession, content: string): DebateSession => {
    const msgs = [...session.messages];
    if (msgs.length > 0) {
      msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
    }
    const next: DebateSession = { ...session, updatedAt: Date.now(), messages: msgs };
    saveSession(next);
    return next;
  }, [saveSession]);

  // Streaming simulation: reveal text character by character
  const streamText = useCallback(async (
    session: DebateSession,
    fullText: string,
    role: MessageRole,
    name: string,
    avatar?: string,
  ): Promise<DebateSession> => {
    // Add empty message first
    const emptyMsg: DiscussionMessage = {
      id: `msg_${Date.now()}_${role}_${Math.random().toString(36).slice(2, 6)}`,
      role,
      name,
      avatar,
      content: '',
      timestamp: Date.now(),
      streaming: true,
    };
    let working = appendMessage(session, emptyMsg);

    // Reveal characters progressively
    const chunkSize = 3;
    for (let i = 0; i < fullText.length; i += chunkSize) {
      await new Promise((r) => setTimeout(r, 20));
      const revealed = fullText.slice(0, i + chunkSize);
      working = updateLastMessage(working, revealed);
    }

    // Final: full text, streaming done
    const finalMsgs = [...working.messages];
    if (finalMsgs.length > 0) {
      finalMsgs[finalMsgs.length - 1] = {
        ...finalMsgs[finalMsgs.length - 1],
        content: fullText,
        streaming: false,
      };
    }
    const finalSession: DebateSession = { ...working, updatedAt: Date.now(), messages: finalMsgs };
    saveSession(finalSession);
    return finalSession;
  }, [appendMessage, updateLastMessage, saveSession]);

  const startDebate = useCallback(async () => {
    if (!teacher || students.length === 0) return;
    const input = inputValue.trim();
    if (!input || isRunning) return;

    if (!hasConfiguredLanguageModel()) {
      setError('请先设置模型');
      router.push('/classroom?openSettings=providers&reason=model-required');
      return;
    }

    setError(null);
    setIsRunning(true);
    setInputValue('');

    let working: DebateSession =
      activeSession ||
      {
        id: `debate_${Date.now()}`,
        title: '新讨论',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
    const isNewTopic = working.messages.length === 0;

    try {
      // User message
      const userMsg: DiscussionMessage = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        name: '我',
        content: input,
        timestamp: Date.now(),
      };
      working = appendMessage(working, userMsg);
      if (isNewTopic) {
        void trackUsage({
          feature: 'roundtable',
          action: 'topic_started',
          subject: input.slice(0, 100),
          durationSeconds: 1,
        });
      }

      // Teacher reply (streaming)
      const teacherPrompt = `学生提问：${input}\n\n请你作为 AI 老师先回答，要求：\n1. 先给结论；\n2. 再解释推理；\n3. 最后给一个可执行建议。`;
      const teacherReply = await askAgent(teacher, teacherPrompt, working.messages);
      working = await streamText(working, teacherReply, 'teacher', teacher.name, teacher.avatar || DEFAULT_TEACHER_AVATAR);
      if (autoSpeak) {
        const lastMsg = working.messages[working.messages.length - 1];
        if (lastMsg) enqueueSpeak(lastMsg);
      }

      // Student replies (streaming)
      for (const student of students.slice(0, 2)) {
        const studentPrompt = `讨论主题：${input}\n老师观点：${teacherReply}\n最近讨论：\n${working.messages
          .slice(-4)
          .map((m) => `${m.name}：${m.content}`)
          .join('\n')}\n\n请你作为 AI 学生参与讨论，提出补充、质疑或反思，控制在 3 句内。`;
        const studentReply = await askAgent(student, studentPrompt, working.messages);
        working = await streamText(working, studentReply, 'student', student.name, student.avatar);
        if (autoSpeak) {
          const lastMsg = working.messages[working.messages.length - 1];
          if (lastMsg) enqueueSpeak(lastMsg);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '讨论生成失败';
      if (/api key is required/i.test(message)) {
        setError('请先设置模型');
        router.push('/classroom?openSettings=providers&reason=model-required');
        return;
      }
      setError(message);
    } finally {
      setIsRunning(false);
    }
  }, [teacher, students, inputValue, isRunning, activeSession, appendMessage, streamText, autoSpeak, enqueueSpeak, router]);

  // Keyboard: Enter to send (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      startDebate();
    }
  };

  return (
    <div className="rt-layout">
      {/* 閳光偓閳光偓 Left: session list 閳光偓閳光偓 */}
      <aside className="rt-sidebar">
        <div className="rt-side-head">
          <h3>讨论记录</h3>
          <button type="button" className="rt-new" onClick={createNewSession}>
            <Plus size={14} />
            新建
          </button>
        </div>
        <div className="rt-side-list">
          {sessions.length === 0 ? (
            <div className="rt-empty-side">暂无记录，开始新讨论</div>
          ) : (
            sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={activeSessionId === session.id}
                onClick={() => setActiveSessionId(session.id)}
                onDelete={() => deleteSession(session.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* 閳光偓閳光偓 Right: chat area 閳光偓閳光偓 */}
      <section className="rt-main">
        {/* Agent tags */}
        <div className="rt-main-head">
          <div className="rt-tags">
            {teacher ? <span className="tag teacher">老师：{teacher.name}</span> : null}
            {students.slice(0, 2).map((student) => (
              <span key={student.id} className="tag student">
                学生：{student.name}
              </span>
            ))}
          </div>
          <div className="rt-head-actions">
            <button
              type="button"
              className={cn('rt-auto-speak', autoSpeak && 'active')}
              onClick={() => setAutoSpeak((prev) => !prev)}
              title={autoSpeak ? '已开启自动播报' : '已关闭自动播报'}
            >
              自动播报：{autoSpeak ? '开' : '关'}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="rt-chat">
          {!activeSession || activeSession.messages.length === 0 ? (
            <div className="rt-empty-chat">
              <div className="rt-empty-icon">
                <MessageSquare className="size-6 text-gray-300" />
              </div>
              <p>输入问题，开始讨论</p>
            </div>
          ) : (
            activeSession.messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isTeacher = msg.role === 'teacher';
              const avatar = isUser
                ? DEFAULT_USER_AVATAR
                : msg.avatar || (isTeacher ? DEFAULT_TEACHER_AVATAR : undefined);

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx === activeSession.messages.length - 1 ? 0.05 : 0 }}
                  className={cn(
                    'flex gap-2 px-2 py-1.5 rounded-lg',
                    isUser && 'flex-row-reverse',
                  )}
                >
                  {/* Avatar */}
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100 shrink-0 mt-0.5 ring-1 ring-gray-200/50">
                    <AvatarDisplay src={avatar || ''} alt={msg.name} className="text-xs" />
                  </div>

                  {/* Content */}
                  <div className={cn('flex-1 min-w-0', isUser && 'text-right')}>
                    <span
                      className={cn(
                        'text-[9px] font-bold uppercase tracking-wider block mb-0.5',
                        isUser
                          ? 'text-purple-500'
                          : isTeacher
                            ? 'text-purple-400'
                            : 'text-indigo-400',
                      )}
                    >
                      {msg.name}
                    </span>
                    <MessageBubble
                      message={msg}
                      isLast={idx === activeSession.messages.length - 1}
                      isRunning={isRunning}
                    />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-3 mb-1 px-3 py-1.5 bg-red-50 border border-red-200/50 rounded-lg text-[12px] text-red-600"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div className="rt-composer">
          <div className="rt-input-row">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入问题，按 Enter 开始讨论..."
              rows={1}
              disabled={isRunning}
              className="rt-textarea"
            />
            <SpeechButton
              size="md"
              disabled={isRunning}
              onTranscription={(text) => {
                const cleaned = text.trim();
                if (!cleaned) return;
                setError(null);
                setInputValue((prev) => (prev ? `${prev} ${cleaned}` : cleaned));
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
            />
            <Button
              onClick={startDebate}
              disabled={isRunning || !inputValue.trim() || !teacher}
              className={cn(
                'shrink-0 h-9 rounded-lg gap-1.5 px-3',
                !isRunning && inputValue.trim() && teacher
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm'
                  : '',
              )}
            >
              {isRunning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              {isRunning ? '讨论中' : '发送'}
            </Button>
          </div>
        </div>
      </section>

      <style jsx>{`
        .rt-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 12px;
          min-height: 70vh;
        }
        .rt-sidebar,
        .rt-main {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
        }

        /* 閳光偓閳光偓 Sidebar 閳光偓閳光偓 */
        .rt-sidebar {
          display: flex;
          flex-direction: column;
          min-height: 70vh;
          overflow: hidden;
        }
        .rt-side-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 14px 10px;
          border-bottom: 1px solid #e2e8f0;
        }
        .rt-side-head h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
        }
        .rt-new {
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          color: #334155;
          border-radius: 8px;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 8px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .rt-new:hover {
          background: #eef2ff;
          border-color: #a5b4fc;
          color: #4338ca;
        }
        .rt-side-list {
          padding: 8px;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .rt-empty-side {
          color: #94a3b8;
          font-size: 13px;
          padding: 16px 8px;
          text-align: center;
        }

        /* 閳光偓閳光偓 Main chat area 閳光偓閳光偓 */
        .rt-main {
          display: flex;
          flex-direction: column;
          min-height: 70vh;
          max-height: 80vh;
        }
        .rt-main-head {
          padding: 12px 16px 8px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .rt-head-actions {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .rt-auto-speak {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .rt-auto-speak.active {
          background: #eef2ff;
          border-color: #a5b4fc;
          color: #4338ca;
        }
        .rt-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .tag {
          border-radius: 999px;
          font-size: 11px;
          padding: 3px 10px;
          font-weight: 600;
        }
        .tag.teacher {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .tag.student {
          background: #dcfce7;
          color: #166534;
        }
        .rt-chat {
          flex: 1;
          overflow-y: auto;
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: #f8fafc;
        }
        .rt-empty-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #94a3b8;
          font-size: 13px;
        }
        .rt-empty-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* 閳光偓閳光偓 Composer 閳光偓閳光偓 */
        .rt-composer {
          border-top: 1px solid #e2e8f0;
          background: #fff;
          padding: 10px 12px;
        }
        .rt-input-row {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 8px;
          align-items: end;
        }
        .rt-voice-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          justify-content: center;
          height: 36px;
          min-width: 78px;
          padding: 0 10px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .rt-voice-btn:hover {
          background: #eef2ff;
          border-color: #a5b4fc;
          color: #4338ca;
        }
        .rt-voice-btn.active {
          background: #ede9fe;
          border-color: #8b5cf6;
          color: #6d28d9;
        }
        .rt-voice-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .rt-textarea {
          width: 100%;
          resize: none;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 8px 12px;
          font-size: 13px;
          line-height: 1.5;
          outline: none;
          background: #f8fafc;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .rt-textarea:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.12);
          background: #fff;
        }

        /* 閳光偓閳光偓 Responsive 閳光偓閳光偓 */
        @media (max-width: 960px) {
          .rt-layout {
            grid-template-columns: 1fr;
          }
          .rt-sidebar {
            min-height: 200px;
            max-height: 260px;
          }
          .rt-main {
            max-height: none;
            min-height: 65vh;
          }
          .rt-input-row {
            grid-template-columns: 1fr;
          }
          .rt-voice-btn {
            width: 100%;
          }
          .rt-main-head {
            align-items: flex-start;
            flex-direction: column;
          }
          .rt-head-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
}

