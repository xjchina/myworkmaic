'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/lib/store/settings';
import { useAgentRegistry } from '@/lib/orchestration/registry/store';
import { getCurrentModelConfig } from '@/lib/utils/model-config';
import type { AgentConfig } from '@/lib/orchestration/registry/types';
import type { PBLAgent } from '@/lib/pbl/types';

const STORAGE_KEY = 'roundtableDebates:v1';

type MessageRole = 'user' | 'teacher' | 'student';

interface DiscussionMessage {
  id: string;
  role: MessageRole;
  name: string;
  content: string;
  timestamp: number;
}

interface DebateSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  rounds: number;
  messages: DiscussionMessage[];
}

interface DebateStore {
  sessions: DebateSession[];
}

function toPblAgent(agent: AgentConfig): PBLAgent {
  return {
    name: agent.name,
    actor_role: agent.role,
    role_division: 'development',
    system_prompt: `${agent.persona}\n\n你正在“独立圆桌讨论”页面发言。请严格围绕学生提问进行讨论，不跑题，不空话。输出要求：观点清晰、逻辑完整、可执行。`,
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

function pickRoundtableAgents(selectedIds: string[], agentsMap: Record<string, AgentConfig>) {
  const selected = selectedIds.map((id) => agentsMap[id]).filter((a): a is AgentConfig => !!a);
  const source = selected.length > 0 ? selected : Object.values(agentsMap);
  const teacher = source.find((a) => a.role === 'teacher') || source[0];
  const students = source.filter((a) => a.id !== teacher?.id).slice(0, 3);
  return { teacher, students };
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

function upsertSession(sessions: DebateSession[], target: DebateSession): DebateSession[] {
  const existed = sessions.some((s) => s.id === target.id);
  const next = existed
    ? sessions.map((s) => (s.id === target.id ? target : s))
    : [target, ...sessions];
  return [...next].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function RoundtableWorkbench() {
  const selectedAgentIds = useSettingsStore((s) => s.selectedAgentIds);
  const agentsMap = useAgentRegistry((s) => s.agents);
  const { teacher, students } = useMemo(
    () => pickRoundtableAgents(selectedAgentIds, agentsMap),
    [selectedAgentIds, agentsMap],
  );

  const [sessions, setSessions] = useState<DebateSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const store = safeReadStore();
    setSessions(store.sessions);
    if (store.sessions.length > 0) {
      setActiveSessionId(store.sessions[0].id);
    }
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeSessionId, sessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  const saveSession = (session: DebateSession) => {
    setSessions((prev) => {
      const next = upsertSession(prev, session);
      safeWriteStore({ sessions: next });
      return next;
    });
    setActiveSessionId(session.id);
  };

  const createNewSession = () => {
    const session: DebateSession = {
      id: `debate_${Date.now()}`,
      title: '新辩论',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      rounds: 1,
      messages: [],
    };
    saveSession(session);
  };

  const appendMessage = (session: DebateSession, message: DiscussionMessage): DebateSession => {
    const next: DebateSession = {
      ...session,
      updatedAt: Date.now(),
      messages: [...session.messages, message],
      title:
        session.messages.length === 0 && message.role === 'user'
          ? message.content.slice(0, 20)
          : session.title,
    };
    saveSession(next);
    return next;
  };

  const startDebate = async () => {
    if (!teacher || students.length === 0) return;
    const input = question.trim();
    if (!input || isRunning) return;

    setError(null);
    setIsRunning(true);
    setQuestion('');

    let working: DebateSession =
      activeSession ||
      {
        id: `debate_${Date.now()}`,
        title: '新辩论',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        rounds: 1,
        messages: [],
      };

    try {
      const userMessage: DiscussionMessage = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        name: '我（学生）',
        content: input,
        timestamp: Date.now(),
      };
      working = appendMessage(working, userMessage);

      let rolling = [...working.messages];
      const round = 1;

      const teacherPrompt = `学生提问：${input}\n\n请你作为AI老师先回答，要求：\n1. 先给结论；\n2. 再解释推理；\n3. 最后给一个可执行建议。`;
      const teacherReply = await askAgent(teacher, teacherPrompt, rolling);
      const teacherMessage: DiscussionMessage = {
        id: `msg_${Date.now()}_teacher_${round}`,
        role: 'teacher',
        name: `${teacher.name}（第${round}轮）`,
        content: teacherReply,
        timestamp: Date.now(),
      };
      working = appendMessage(working, teacherMessage);
      rolling = [...working.messages];

      for (const student of students.slice(0, 2)) {
        const studentPrompt = `讨论主题：${input}\n老师观点：${teacherReply}\n最近讨论：\n${rolling
          .slice(-4)
          .map((m) => `${m.name}：${m.content}`)
          .join('\n')}\n\n请你作为AI学生参与讨论，提出补充/质疑/反思，控制在3句话。`;

        const studentReply = await askAgent(student, studentPrompt, rolling);
        const studentMessage: DiscussionMessage = {
          id: `msg_${Date.now()}_${student.id}_${round}`,
          role: 'student',
          name: `${student.name}（第${round}轮）`,
          content: studentReply,
          timestamp: Date.now(),
        };
        working = appendMessage(working, studentMessage);
        rolling = [...working.messages];
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '讨论生成失败');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="rt-layout">
      <aside className="rt-sidebar">
        <div className="rt-side-head">
          <h3>辩论记录</h3>
          <button type="button" className="rt-new" onClick={createNewSession}>
            <Plus size={14} />
            新建
          </button>
        </div>
        <div className="rt-side-list">
          {sessions.length === 0 ? (
            <div className="rt-empty-side">暂无记录</div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                className={`rt-side-item ${activeSessionId === session.id ? 'active' : ''}`}
                onClick={() => setActiveSessionId(session.id)}
              >
                <div className="title">{session.title || '未命名辩论'}</div>
                <div className="meta">{new Date(session.updatedAt).toLocaleString()}</div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="rt-main">
        <div className="rt-main-head">
          <div>
            <h2>连续讨论</h2>
            <p>保留 AI 老师 + AI 学生形式，当前页独立完成讨论。</p>
          </div>
          <div className="rt-tags">
            {teacher ? <span className="tag teacher">老师：{teacher.name}</span> : null}
            {students.slice(0, 2).map((student) => (
              <span key={student.id} className="tag student">
                学生：{student.name}
              </span>
            ))}
          </div>
        </div>

        <div ref={scrollRef} className="rt-chat">
          {!activeSession || activeSession.messages.length === 0 ? (
            <div className="rt-empty-chat">输入问题后，系统会开始讨论并保存到左侧历史。</div>
          ) : (
            activeSession.messages.map((msg) => (
              <article
                key={msg.id}
                className={`bubble ${msg.role === 'user' ? 'user' : msg.role === 'teacher' ? 'teacher' : 'student'}`}
              >
                <header>
                  <span className="name">{msg.name}</span>
                  <span className="time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </header>
                <p>{msg.content}</p>
              </article>
            ))
          )}
        </div>

        <div className="rt-composer">
          <div className="rt-input-row">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="输入学生问题，点击开始讨论；可在同一会话持续追问..."
              rows={2}
              disabled={isRunning}
            />
            <Button onClick={startDebate} disabled={isRunning || !question.trim() || !teacher}>
              {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {isRunning ? '讨论中...' : '开始讨论'}
            </Button>
          </div>
          {error ? <p className="rt-error">{error}</p> : null}
        </div>
      </section>

      <style jsx>{`
        .rt-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 16px;
          min-height: 72vh;
        }
        .rt-sidebar,
        .rt-main {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
        }
        .rt-sidebar {
          display: flex;
          flex-direction: column;
          min-height: 72vh;
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
        }
        .rt-side-list {
          padding: 10px;
          overflow: auto;
          display: grid;
          gap: 8px;
        }
        .rt-empty-side {
          color: #64748b;
          font-size: 13px;
          padding: 12px;
        }
        .rt-side-item {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #fff;
          padding: 10px;
          text-align: left;
          cursor: pointer;
        }
        .rt-side-item.active {
          border-color: #6366f1;
          background: #eef2ff;
        }
        .rt-side-item .title {
          font-size: 13px;
          color: #0f172a;
          font-weight: 600;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .rt-side-item .meta {
          font-size: 11px;
          color: #64748b;
        }
        .rt-main {
          display: flex;
          flex-direction: column;
          min-height: 72vh;
          max-height: 80vh;
        }
        .rt-main-head {
          padding: 16px 16px 10px;
          border-bottom: 1px solid #e2e8f0;
        }
        .rt-main-head h2 {
          margin: 0;
          color: #0f172a;
          font-size: 18px;
        }
        .rt-main-head p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 13px;
        }
        .rt-tags {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tag {
          border-radius: 999px;
          font-size: 12px;
          padding: 4px 10px;
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
          overflow: auto;
          padding: 14px 16px;
          display: grid;
          gap: 10px;
          background: #f8fafc;
        }
        .rt-empty-chat {
          color: #64748b;
          font-size: 14px;
          display: grid;
          place-items: center;
          min-height: 260px;
        }
        .bubble {
          border-radius: 12px;
          padding: 10px 12px;
          border: 1px solid transparent;
        }
        .bubble header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .bubble .name {
          font-size: 12px;
          font-weight: 700;
        }
        .bubble .time {
          font-size: 11px;
          opacity: 0.7;
        }
        .bubble p {
          margin: 0;
          white-space: pre-wrap;
          line-height: 1.7;
          font-size: 14px;
        }
        .bubble.user {
          background: #0f172a;
          color: #fff;
        }
        .bubble.teacher {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #1e3a8a;
        }
        .bubble.student {
          background: #ecfdf5;
          border-color: #bbf7d0;
          color: #14532d;
        }
        .rt-composer {
          border-top: 1px solid #e2e8f0;
          background: #fff;
          padding: 10px 12px 12px;
          position: sticky;
          bottom: 0;
        }
        .rt-input-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: end;
        }
        .rt-input-row textarea {
          width: 100%;
          resize: none;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 10px 12px;
          line-height: 1.6;
          outline: none;
        }
        .rt-input-row textarea:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.12);
        }
        .rt-error {
          margin: 8px 2px 0;
          color: #dc2626;
          font-size: 13px;
        }
        @media (max-width: 960px) {
          .rt-layout {
            grid-template-columns: 1fr;
          }
          .rt-sidebar {
            min-height: 220px;
          }
          .rt-main {
            max-height: none;
            min-height: 70vh;
          }
        }
      `}</style>
    </div>
  );
}
