'use client';

import { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';
import { useUpgradeGuard } from '@/lib/hooks/use-upgrade-guard';
import { trackUsage } from '@/lib/client/usage-tracker';
import { extractKeywordsFromText, upsertKnowledgeTreeNode } from '@/lib/knowledge/tree-persistence';
import { getCurrentModelConfig } from '@/lib/utils/model-config';

// ─── Types ──────────────────────────────────────────────────
type StepField =
  | 'step1' | 'step2Mistake' | 'step2Focus'
  | 'step3' | 'step4Type' | 'step4Condition'
  | 'step4Goal' | 'step4Steps' | 'step5';

type Mode = 'dialog' | 'form';

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

function parseErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

function extractDialogStepFromText(text: string): number | null {
  if (!text) return null;
  const tagged = text.match(/\[STEP\s*:\s*([1-5])\]/i);
  if (!tagged) return null;
  return Number(tagged[1]);
}

function looksLikeDialogSummary(content: string): boolean {
  return content.length > 160 && /(总结|复盘|方法|易错|知识点)/.test(content);
}

const STEP_FIELDS: { key: StepField; label: string; placeholder: string; step: number }[] = [
  { key: 'step1',            label: '核心概念',     placeholder: '例：函数、定义域、值域', step: 1 },
  { key: 'step2Mistake',     label: '易错点',       placeholder: '例：忘记考虑定义域',     step: 2 },
  { key: 'step2Focus',       label: '重点',         placeholder: '例：数形结合思想',       step: 2 },
  { key: 'step3',            label: '公式/定理',    placeholder: '例：二次函数顶点公式 x = -b/(2a)', step: 3 },
  { key: 'step4Type',        label: '题目类型',     placeholder: '例：二次函数最值问题',   step: 4 },
  { key: 'step4Condition',   label: '已知条件',     placeholder: '例：开口向上，顶点(1,-3)', step: 4 },
  { key: 'step4Goal',        label: '求解目标',     placeholder: '例：求函数解析式',       step: 4 },
  { key: 'step4Steps',       label: '关键步骤',     placeholder: '例：设顶点式→代入点→求解', step: 4 },
  { key: 'step5',            label: '方法总结',     placeholder: '例：代入消元→解方程→检验', step: 5 },
];

const SUBJECT_ICONS: Record<string, string> = {
  '数学': '📐', '物理': '⚡', '化学': '🧪',
  '英语': '📖', '地理': '🌍', '生物': '🧬', '政治': '🏛️', '历史': '📜',
};

function LoadingDots() {
  const [d, setD] = useState(0);
  useEffect(() => { const t = setInterval(() => setD((x) => (x + 1) % 4), 400); return () => clearInterval(t); }, []);
  return <span>{'.'.repeat(d)}</span>;
}

// ─── Start Screen ──────────────────────────────────────────
function StartScreen({
  subjectIcon, chapter, setChapter, onStart,
}: {
  subjectIcon: string;
  chapter: string; setChapter: (v: string) => void;
  onStart: (mode: Mode) => void;
}) {
  const [selectedMode, setSelectedMode] = useState<Mode>('dialog');

  return (
    <div className="start-screen">
      <aside className="start-guide">
        <div className="guide-badge">{'\u5b66\u4e60\u65b9\u6cd5\u63a8\u8350'}</div>
        <h3 className="guide-title">{'\u767d\u7eb8\u56de\u5fc6\u6cd5'}</h3>
        <p className="guide-desc">
          {'\u4e0d\u770b\u8d44\u6599\uff0c\u5148\u5199\u4e0b\u4eca\u5929\u7684\u6838\u5fc3\u5185\u5bb9\uff0c\u518d\u5bf9\u7167\u8bb2\u4e49\u8865\u5168\u9057\u6f0f\u3002'}
          <br />
          {'\u901a\u8fc7\u201c\u5148\u56de\u5fc6\u540e\u6821\u5bf9\u201d\uff0c\u66f4\u5bb9\u6613\u53d1\u73b0\u77e5\u8bc6\u76f2\u70b9\uff0c\u63d0\u5347\u8bb0\u5fc6\u7a33\u5b9a\u6027\u3002'}
        </p>
        <div className="guide-steps">
          {[
            '\u7b2c1\u6b65\uff1a\u4e0d\u7ffb\u4e66\uff0c\u51ed\u8bb0\u5fc6\u5217\u51fa\u77e5\u8bc6\u70b9',
            '\u7b2c2\u6b65\uff1a\u5bf9\u7167\u8bb2\u4e49\uff0c\u8865\u5168\u7f3a\u6f0f\u4e0e\u9519\u8bef',
            '\u7b2c3\u6b65\uff1a\u6807\u8bb0\u91cd\u70b9\u548c\u6613\u9519\u70b9',
            '\u7b2c4\u6b65\uff1a24\u5c0f\u65f6\u518d\u590d\u76d8\u4e00\u6b21',
          ].map((item, idx) => (
            <div key={item} className="guide-step">
              <span className="guide-step-num">{idx + 1}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="guide-fill">
          <div className="guide-tip-card">
            <div className="guide-tip-title">{'\u4eca\u65e5\u6267\u884c\u6e05\u5355'}</div>
            <ul className="guide-tip-list">
              <li>{'\u5148\u56de\u5fc6\uff0c\u518d\u770b\u8bb2\u4e49\u6821\u5bf9'}</li>
              <li>{'\u6bcf\u4e00\u6b65\u81f3\u5c11\u5199\u51fa 2 \u6761\u5173\u952e\u70b9'}</li>
              <li>{'\u5b8c\u6210\u540e\u7acb\u5373\u8fdb\u5165 AI \u5bf9\u8bdd\u68c0\u9a8c'}</li>
            </ul>
          </div>
          <div className="guide-tip-card light">
            <div className="guide-tip-title">{'\u5e38\u89c1\u9519\u8bef\u63d0\u9192'}</div>
            <ul className="guide-tip-list">
              <li>{'\u53ea\u5199\u7ed3\u8bba\uff0c\u6ca1\u5199\u601d\u8def'}</li>
              <li>{'\u6df7\u6dc6\u516c\u5f0f\u9002\u7528\u6761\u4ef6'}</li>
              <li>{'\u6ca1\u6709\u590d\u76d8\u201c\u4e3a\u4ec0\u4e48\u9519\u201d'}</li>
            </ul>
          </div>
        </div>
        <div className="guide-bottom">
          <div className="guide-bottom-title">{'\u767d\u7eb8\u56de\u5fc6\u76ee\u6807'}</div>
          <div className="guide-bottom-desc">
            {'\u4e0d\u662f\u80cc\u7b54\u6848\uff0c\u800c\u662f\u8bad\u7ec3\u4f60\u7684\u77e5\u8bc6\u63d0\u53d6\u80fd\u529b\u3002'}
          </div>
        </div>
      </aside>
      <div className="start-card">
        <div className="start-icon">{subjectIcon}</div>
        <h2>📄 白纸回忆法</h2>
        <p className="start-desc">
          拿出一张白纸，把今天学的内容凭记忆写下来。
          <br />这个过程中，你会发现自己记住了什么、忘记了什么。
        </p>

        <div className="start-steps-preview">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="preview-step">
              <span className="step-num">{n}</span>
              {['核心概念', '易错点+重点', '公式/定理', '典型例题', '方法总结'][n - 1]}
            </div>
          ))}
        </div>

        {/* Mode selector */}
        <div className="mode-selector">
          <button
            className={`mode-btn ${selectedMode === 'dialog' ? 'mode-active' : ''}`}
            onClick={() => setSelectedMode('dialog')}
            type="button"
          >
            <span className="mode-icon">💬</span>
            <span className="mode-name">对话模式</span>
            <span className="mode-desc">AI逐条引导，适合新手</span>
          </button>
          <button
            className={`mode-btn ${selectedMode === 'form' ? 'mode-active' : ''}`}
            onClick={() => setSelectedMode('form')}
            type="button"
          >
            <span className="mode-icon">📝</span>
            <span className="mode-name">快速模式</span>
            <span className="mode-desc">表单一次性填写，或拍照上传</span>
          </button>
        </div>

        <div className="chapter-input-group">
          <label className="chapter-label">📘 今天学的章节</label>
          <input
            className="chapter-input"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            placeholder="例：二次函数、勾股定理、一元二次方程..."
            onKeyDown={(e) => e.key === 'Enter' && chapter.trim() && onStart(selectedMode)}
          />
        </div>

        <button
          className="btn-start-recall"
          onClick={() => onStart(selectedMode)}
          disabled={!chapter.trim()}
        >
          开始{selectedMode === 'dialog' ? '对话' : '回忆'} →
        </button>
      </div>
      <style jsx>{`
        .start-screen {
          display: grid;
          grid-template-columns: minmax(420px, 48%) minmax(620px, 52%);
          gap: 26px;
          align-items: stretch;
          width: 100%;
          height: calc(100dvh - 200px);
          max-height: calc(100dvh - 200px);
          overflow: hidden;
          padding: 0;
        }
        .start-guide {
          position: sticky;
          top: 16px;
          align-self: stretch;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
          border: 1px solid #dbeafe;
          border-radius: 18px;
          padding: 18px 18px;
          min-height: 0;
          height: 100%;
          overflow: hidden;
          box-sizing: border-box;
        }
        .guide-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .guide-title { margin: 0 0 8px; font-size: 24px; color: #0f172a; }
        .guide-desc { margin: 0 0 12px; font-size: 13px; color: #475569; line-height: 1.65; }
        .guide-steps { display: flex; flex-direction: column; gap: 8px; }
        .guide-step {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13px;
          color: #1e293b;
          line-height: 1.55;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 8px 10px;
        }
        .guide-step-num {
          width: 24px;
          height: 24px;
          border-radius: 8px;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .guide-fill {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 4px;
        }
        .guide-tip-card {
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 10px 10px;
        }
        .guide-tip-card.light {
          background: #f9fafb;
        }
        .guide-tip-title {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 6px;
        }
        .guide-tip-list {
          margin: 0;
          padding-left: 18px;
          color: #334155;
          font-size: 12px;
          line-height: 1.55;
        }
        .guide-bottom {
          margin-top: auto;
          border-radius: 14px;
          border: 1px solid #bfdbfe;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          padding: 10px 12px;
        }
        .guide-bottom-title {
          font-size: 14px;
          font-weight: 700;
          color: #1e3a8a;
          margin-bottom: 2px;
        }
        .guide-bottom-desc {
          font-size: 12px;
          color: #1e40af;
          line-height: 1.5;
        }
        .start-card { width: 100%; max-width: none; justify-self: end; background: #fff; border-radius: 24px; padding: 18px 18px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.06); height: 100%; overflow: hidden; box-sizing: border-box; }
        .start-icon { font-size: 50px; margin-bottom: 6px; line-height: 1; }
        h2 { font-size: 22px; color: #0f172a; margin: 0 0 4px; }
        .start-desc { color: #64748b; font-size: 12px; line-height: 1.45; margin: 0 0 10px; }
        .start-steps-preview { text-align: left; background: #f8fafc; border-radius: 12px; padding: 8px 10px; margin-bottom: 10px; }
        .preview-step { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; color: #334155; }
        .step-num { width: 24px; height: 24px; border-radius: 6px; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #475569; flex-shrink: 0; }

        .mode-selector { display: flex; gap: 8px; margin-bottom: 10px; }
        .mode-btn { flex: 1; padding: 8px 8px; border-radius: 12px; border: 2px solid #e2e8f0; background: #fff; cursor: pointer; text-align: center; transition: all 0.2s; font-family: inherit; }
        .mode-btn:hover { border-color: #93c5fd; }
        .mode-active { border-color: #667eea; background: #eff6ff; }
        .mode-icon { display: block; font-size: 20px; margin-bottom: 2px; line-height: 1; }
        .mode-name { display: block; font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 1px; }
        .mode-desc { display: block; font-size: 10px; color: #94a3b8; }

        .chapter-input-group { margin-bottom: 10px; text-align: left; }
        .chapter-label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
        .chapter-input { width: 100%; padding: 10px 12px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 14px; outline: none; transition: border-color 0.2s; font-family: inherit; box-sizing: border-box; }
        .chapter-input:focus { border-color: #667eea; }
        .btn-start-recall { width: 100%; padding: 10px; border: none; border-radius: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
        .btn-start-recall:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-start-recall:hover:not(:disabled) { opacity: 0.92; }
        @media (max-width: 1280px) {
          .start-screen { grid-template-columns: minmax(340px, 44%) minmax(520px, 56%); }
          .guide-fill { grid-template-columns: 1fr; }
        }
        @media (max-width: 1100px) {
          .start-screen { grid-template-columns: 1fr; height: auto; max-height: none; overflow: visible; }
          .start-guide { position: static; min-height: auto; height: auto; overflow: visible; }
          .start-card { max-width: 100%; height: auto; overflow: visible; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Fragment to render analysis result sections
// ═══════════════════════════════════════════════════════════
function AnalysisResult({ content, onRedo }: { content: string; onRedo: () => void }) {
  const sections = content.split(/\n(?=[📚🔑⚠️📝🔗✅💪])/);
  const getClass = (s: string) => {
    const c = s.trim()[0];
    if (c === '📚') return 'section-brain';
    if (c === '🔑') return 'section-formula';
    if (c === '⚠️') return 'section-warning';
    if (c === '📝') return 'section-method';
    if (c === '🔗') return 'section-link';
    if (c === '✅') return 'section-preview';
    if (c === '💪') return 'section-encourage';
    return '';
  };
  const getEmoji = (s: string) => {
    const c = s.trim()[0];
    if (c === '📚') return '📚';
    if (c === '🔑') return '🔑';
    if (c === '⚠️') return '⚠️';
    if (c === '📝') return '📝';
    if (c === '🔗') return '🔗';
    if (c === '✅') return '✅';
    if (c === '💪') return '💪';
    return '';
  };
  const clean = (s: string) => {
    const t = s.replace(/^🔗/, '').replace(/^📚/, '').replace(/^🔑/, '').replace(/^⚠️/, '').replace(/^📝/, '').replace(/^✅/, '').replace(/^💪/, '').trim();
    return t;
  };

  const renderHtml = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\|(.+?)\|/g, (m) => m) // tables stay as-is
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="result-area">
      <div className="result-header">
        <h3>📊 分析结果</h3>
        <button className="btn-redo" onClick={onRedo} type="button">🔄 重新来</button>
      </div>
      <div className="result-content">
        {sections.map((sec, i) => {
          if (!sec.trim()) return null;
          const cls = getClass(sec);
          const title = cls.slice(8); // brain, formula, etc.
          const cleaned = clean(sec);
          return (
            <div key={i} className={`result-section ${cls}`}>
              <div className="section-title">
                {getEmoji(sec)} {title}
              </div>
              <div className="section-body" dangerouslySetInnerHTML={{ __html: renderHtml(cleaned) }} />
            </div>
          );
        })}
        {/* If no sections detected, show raw content */}
        {sections.length <= 1 && (
          <div className="result-section" dangerouslySetInnerHTML={{ __html: renderHtml(content) }} />
        )}
      </div>
      <style jsx>{`
        .result-area { margin-bottom: 40px; }
        .result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .result-header h3 { margin: 0; font-size: 20px; color: #0f172a; }
        .btn-redo { padding: 8px 18px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; color: #475569; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .btn-redo:hover { background: #f8fafc; }
        .result-content { display: flex; flex-direction: column; gap: 16px; }
        .result-section { background: #fff; border-radius: 16px; padding: 20px 24px; border: 1px solid #e2e8f0; font-size: 14px; line-height: 1.8; color: #1e293b; overflow-x: auto; }
        .section-title { font-size: 16px; font-weight: 700; margin-bottom: 10px; color: #0f172a; }
        .section-body :global(strong) { color: #0f172a; }
        .section-brain { border-left: 4px solid #f59e0b; background: linear-gradient(135deg, #fffbeb 0%, #fff 100%); }
        .section-formula { border-left: 4px solid #3b82f6; background: linear-gradient(135deg, #eff6ff 0%, #fff 100%); }
        .section-warning { border-left: 4px solid #ef4444; background: linear-gradient(135deg, #fef2f2 0%, #fff 100%); }
        .section-method { border-left: 4px solid #22c55e; background: linear-gradient(135deg, #f0fdf4 0%, #fff 100%); }
        .section-link { border-left: 4px solid #8b5cf6; background: linear-gradient(135deg, #f5f3ff 0%, #fff 100%); }
        .section-preview { border-left: 4px solid #06b6d4; background: linear-gradient(135deg, #ecfeff 0%, #fff 100%); }
        .section-encourage { border-left: 4px solid #f97316; background: linear-gradient(135deg, #fff7ed 0%, #fff 100%); }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════
export default function Page() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>加载中...</div>}>
      <RecallPageContent />
    </Suspense>
  );
}

function RecallPageContent() {
  const { isLoggedIn } = useAuthGuard();
  const { checkAndUpgrade, UpgradeModal } = useUpgradeGuard();
  const searchParams = useSearchParams();
  const subject = searchParams.get('subject') || '数学';
  const subjectIcon = SUBJECT_ICONS[subject] || '📚';

  // ─── State ──────────────────────────────────
  const [chapter, setChapter] = useState('');
  const [mode, setMode] = useState<Mode | null>(null);
  const [started, setStarted] = useState(false);

  // Form mode state
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [activeStep, setActiveStep] = useState(0);
  const [formLoading, setFormLoading] = useState(false);
  const [formResult, setFormResult] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Dialog mode state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [dialogStep, setDialogStep] = useState(0);
  const [dialogInput, setDialogInput] = useState('');
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogDone, setDialogDone] = useState(false);
  const [dialogResult, setDialogResult] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const dialogInputRef = useRef<HTMLTextAreaElement>(null);

  // Photo upload state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreview, setOcrPreview] = useState<Record<string, string> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getModelHeaders = useCallback(() => {
    const modelConfig = getCurrentModelConfig();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-model': modelConfig.modelString || '',
      'x-api-key': modelConfig.apiKey || '',
    };
    if (modelConfig.baseUrl) headers['x-base-url'] = modelConfig.baseUrl;
    if (modelConfig.providerType) headers['x-provider-type'] = modelConfig.providerType;
    return headers;
  }, []);

  const saveToKnowledgeTree = useCallback(
    (payload: { summary: string; sourceMode: 'dialog' | 'form'; keywordSeed?: string[] }) => {
      const mergedKeywords = Array.from(new Set((payload.keywordSeed || []).filter(Boolean)));
      upsertKnowledgeTreeNode({
        subject,
        chapter: chapter.trim() || '未命名章节',
        summary: payload.summary,
        keywords: mergedKeywords,
        sourceMode: payload.sourceMode,
        status: 'doing',
      });
    },
    [chapter, subject],
  );

  // ─── Scroll chat to bottom ──────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Start handler ──────────────────────────
  const handleStart = useCallback(async (selectedMode: Mode) => {
    if (!chapter.trim()) return;
    if (!(await checkAndUpgrade('knowledge'))) return;

    await trackUsage({
      feature: 'knowledge',
      action: 'knowledge_start',
      subject: subject || '通用',
    });

    setMode(selectedMode);
    setStarted(true);

    if (selectedMode === 'dialog') {
      setDialogStep(0);
      setDialogDone(false);
      setDialogResult(null);
      setDialogLoading(true);
      // AI generates the first question based on subject
      fetch('/api/knowledge/recall', {
        method: 'POST',
        headers: getModelHeaders(),
        body: JSON.stringify({ chapter, subject, dialogueHistory: [], currentStep: 1 }),
      })
        .then((r) => r.json())
        .then((data) => {
          const firstContent = data.content || '让我们开始吧！今天学了什么？';
          setMessages([{ role: 'assistant', content: firstContent }]);
          const detectedStep = typeof data.step === 'number' ? data.step : extractDialogStepFromText(firstContent);
          if (detectedStep) {
            setDialogStep(Math.min(Math.max(detectedStep - 1, 0), 4));
          }
        })
        .catch(() => {
          setMessages([{ role: 'assistant', content: '📝 第1步：今天学的核心概念是什么？写2-3个关键词。' }]);
          setDialogStep(0);
        })
        .finally(() => setDialogLoading(false));
    } else {
      setActiveStep(1);
      setFormResult(null);
      setFormError(null);
      setFormData({});
      setOcrPreview(null);
    }
  }, [chapter, checkAndUpgrade, getModelHeaders, subject]);

  // ─── Dialog: send message ───────────────────
  const handleDialogSend = useCallback(async () => {
    const text = dialogInput.trim();
    if (!text || dialogLoading) return;
    setDialogInput('');

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setDialogLoading(true);

    try {
      const dialogueHistory = [
        ...updated.map((m) => ({ role: m.role, content: m.content })),
      ];

      const res = await fetch('/api/knowledge/recall', {
        method: 'POST',
        headers: getModelHeaders(),
        body: JSON.stringify({
          chapter,
          subject,
          dialogueHistory,
          currentStep: Math.min(dialogStep + 1, 5),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const aiContent = data.content || '';
      const hasSummary = typeof data.isFinal === 'boolean' ? data.isFinal : looksLikeDialogSummary(aiContent);

      if (hasSummary) {
        // AI produced the final summary
        setDialogDone(true);
        setDialogResult(aiContent);
        const userKeywords = extractKeywordsFromText(
          updated
            .filter((item) => item.role === 'user')
            .map((item) => item.content)
            .join(','),
        );
        saveToKnowledgeTree({
          summary: aiContent,
          sourceMode: 'dialog',
          keywordSeed: userKeywords,
        });
        setMessages((prev) => [...prev, { role: 'assistant', content: '✅ 分析完成！请查看下方的总结报告 👇' }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: aiContent }]);
        const detectedStep = typeof data.step === 'number' ? data.step : extractDialogStepFromText(aiContent);
        if (detectedStep) {
          setDialogStep(Math.min(Math.max(detectedStep - 1, 0), 4));
        }
      }
    } catch (e: unknown) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ 出错了：${parseErrorMessage(e, '请求失败')}，请重试` }]);
    } finally {
      setDialogLoading(false);
    }
  }, [dialogInput, dialogLoading, messages, chapter, subject, dialogStep, saveToKnowledgeTree, getModelHeaders]);

  // ─── Form: submit ────────────────────────────
  const handleFormSubmit = useCallback(async () => {
    setFormLoading(true);
    setFormError(null);
    setFormResult(null);
    try {
      const res = await fetch('/api/knowledge/recall', {
        method: 'POST',
        headers: getModelHeaders(),
        body: JSON.stringify({ chapter: chapter.trim(), steps: formData, subject }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFormResult(data.content);
      const keywordSeed = extractKeywordsFromText(
        [formData.step1, formData.step2Focus, formData.step3, formData.step5].filter(Boolean).join(','),
      );
      saveToKnowledgeTree({
        summary: data.content,
        sourceMode: 'form',
        keywordSeed,
      });
    } catch (e: unknown) {
      setFormError(parseErrorMessage(e, '请求失败'));
    } finally {
      setFormLoading(false);
    }
  }, [chapter, formData, saveToKnowledgeTree, subject, getModelHeaders]);

  // ─── OCR: upload photo ───────────────────────
  const handlePhotoUpload = useCallback(async (file: File) => {
    setOcrLoading(true);
    setOcrPreview(null);
    try {
      // Read file as base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data:image/...;base64, prefix
          const comma = result.indexOf(',');
          resolve(comma >= 0 ? result.substring(comma + 1) : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/knowledge/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setOcrPreview(data.data);
        setFormData((prev) => ({ ...prev, ...data.data }));
      } else if (data.hint) {
        alert('📷 ' + data.hint);
      } else {
        throw new Error(data.error || 'OCR识别失败');
      }
    } catch (e: unknown) {
      alert('OCR识别出错：' + parseErrorMessage(e, '未知错误'));
    } finally {
      setOcrLoading(false);
    }
  }, []);

  // ─── Result section shared ──────────────────
  const handleRedo = useCallback(() => {
    setStarted(false);
    setMode(null);
    setFormResult(null);
    setDialogResult(null);
    setFormData({});
    setMessages([]);
    setDialogStep(0);
    setDialogDone(false);
  }, []);

  if (!isLoggedIn) return null;

  // ─── Start screen ──────────────────────────────
  if (!started) {
    return (
      <AppShell activeKey="knowledge" title="🌌 知识宇宙" description={`${subjectIcon} ${subject} · 白纸回忆法`}
        actions={<Link href="/knowledge-select" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: "#fff", border: "1px solid #e2e8f0", color: "#334155", fontSize: 13, fontWeight: 600, textDecoration: "none", cursor: "pointer", transition: "all 0.15s" }}>← 返回</Link>}
      >
        <StartScreen subjectIcon={subjectIcon} chapter={chapter} setChapter={setChapter} onStart={handleStart} />
        <UpgradeModal />
      </AppShell>
    );
  }

  // ─── Dialog Mode UI ────────────────────────────
  if (mode === 'dialog') {
    return (
      <AppShell activeKey="knowledge" title="🌌 知识宇宙" description={`${subjectIcon} ${subject} · ${chapter}`}
        actions={<Link href="/knowledge-select" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: "#fff", border: "1px solid #e2e8f0", color: "#334155", fontSize: 13, fontWeight: 600, textDecoration: "none", cursor: "pointer", transition: "all 0.15s" }}>← 返回</Link>}
      >
        <div className="dialog-layout">
          {/* Left sidebar — step progress */}
          <aside className="dialog-sidebar">
            <h4 className="sidebar-title">回忆进度</h4>
            {[
              { step: 1, title: '核心概念' },
              { step: 2, title: '易错点&重点' },
              { step: 3, title: '公式定理' },
              { step: 4, title: '典型例题' },
              { step: 5, title: '方法总结' },
            ].map((s, i) => (
              <div key={s.step} className={`sidebar-step ${i < dialogStep ? 'step-done' : ''} ${i === dialogStep && !dialogDone ? 'step-current' : ''}`}>
                <div className="sidebar-step-badge">{i < dialogStep ? '✓' : i === dialogStep && !dialogDone ? '●' : s.step}</div>
                <div>
                  <div className="sidebar-step-title">{s.title}</div>
                  <div className="sidebar-step-status">
                    {i < dialogStep ? '已完成' : i === dialogStep && !dialogDone ? '进行中' : '待开始'}
                  </div>
                </div>
              </div>
            ))}
            {dialogDone && <div className="sidebar-done-badge">✅ 全部完成</div>}
          </aside>

          {/* Right — chat */}
          <div className="dialog-chat">
            <div className="chat-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`chat-msg ${msg.role}`}>
                  {msg.role === 'assistant' && <div className="msg-avatar">🤖</div>}
                  <div className="msg-bubble">{msg.content}</div>
                  {msg.role === 'user' && <div className="msg-avatar user-avatar">👤</div>}
                </div>
              ))}
              {dialogLoading && (
                <div className="chat-msg assistant">
                  <div className="msg-avatar">🤖</div>
                  <div className="msg-bubble thinking">
                    AI 正在思考<LoadingDots />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {!dialogDone && (
              <div className="chat-input-area">
                <textarea
                  ref={dialogInputRef}
                  className="chat-input"
                  value={dialogInput}
                  onChange={(e) => setDialogInput(e.target.value)}
                  placeholder="把你的答案写在这里..."
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleDialogSend();
                    }
                  }}
                />
                <button className="chat-send-btn" onClick={handleDialogSend} disabled={!dialogInput.trim() || dialogLoading} type="button">
                  ➤
                </button>
              </div>
            )}

            {/* Result after dialog done */}
            {dialogDone && dialogResult && (
              <div style={{ marginTop: 20 }}>
                <AnalysisResult content={dialogResult} onRedo={handleRedo} />
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .dialog-layout { display: flex; gap: 20px; align-items: flex-start; }
          .dialog-sidebar { width: 170px; flex-shrink: 0; background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; padding: 16px; position: sticky; top: 16px; }
          .sidebar-title { margin: 0 0 12px; font-size: 13px; font-weight: 700; color: #0f172a; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
          .sidebar-step { display: flex; align-items: center; gap: 8px; padding: 8px 6px; border-radius: 8px; margin-bottom: 4px; }
          .sidebar-step.step-done { opacity: 0.6; }
          .sidebar-step.step-current { background: #eff6ff; }
          .sidebar-step-badge { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; background: #e2e8f0; color: #475569; flex-shrink: 0; }
          .sidebar-step.step-done .sidebar-step-badge { background: #22c55e; color: #fff; }
          .sidebar-step.step-current .sidebar-step-badge { background: #3b82f6; color: #fff; }
          .sidebar-step-title { font-size: 12px; font-weight: 600; color: #334155; }
          .sidebar-step-status { font-size: 10px; color: #94a3b8; }
          .sidebar-done-badge { text-align: center; padding: 8px; font-size: 12px; font-weight: 600; color: #16a34a; margin-top: 8px; }

          .dialog-chat { flex: 1; min-width: 0; background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; }
          .chat-messages { flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 14px; max-height: 520px; overflow-y: auto; }
          .chat-msg { display: flex; gap: 10px; max-width: 88%; }
          .chat-msg.user { align-self: flex-end; flex-direction: row-reverse; }
          .msg-avatar { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: #e2e8f0; font-size: 16px; flex-shrink: 0; }
          .user-avatar { background: #667eea20; }
          .msg-bubble { padding: 12px 16px; border-radius: 14px; font-size: 14px; line-height: 1.7; color: #1e293b; background: #f1f5f9; white-space: pre-wrap; }
          .chat-msg.user .msg-bubble { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }
          .msg-bubble.thinking { color: #64748b; font-style: italic; }

          .chat-input-area { display: flex; gap: 8px; padding: 14px 16px; border-top: 1px solid #e2e8f0; align-items: flex-end; }
          .chat-input { flex: 1; padding: 12px 14px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 14px; font-family: inherit; outline: none; resize: none; transition: border-color 0.2s; }
          .chat-input:focus { border-color: #667eea; }
          .chat-send-btn { width: 44px; height: 44px; border-radius: 12px; border: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; font-size: 18px; cursor: pointer; flex-shrink: 0; transition: opacity 0.2s; }
          .chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

          @media (max-width: 840px) { .dialog-sidebar { display: none; } }
        `}</style>
        <UpgradeModal />
      </AppShell>
    );
  }

  // ─── Form / Photo Mode UI ────────────────────────
  const completedCount = STEP_FIELDS.filter((f) => formData[f.key]?.trim()).length;
  const allFilled = completedCount >= STEP_FIELDS.length;

  return (
    <AppShell activeKey="knowledge" title="🌌 知识宇宙" description={`${subjectIcon} ${subject} · ${chapter}`}
      actions={<Link href="/knowledge-select" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: "#fff", border: "1px solid #e2e8f0", color: "#334155", fontSize: 13, fontWeight: 600, textDecoration: "none", cursor: "pointer", transition: "all 0.15s" }}>← 返回</Link>}
    >
      {/* Photo upload bar */}
      <div className="photo-bar">
        <div className="photo-bar-left">
          <span className="photo-icon">📷</span>
          <span>在纸上写完五步后，拍照上传自动识别：</span>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
        <button className="photo-btn" onClick={() => fileInputRef.current?.click()} disabled={ocrLoading} type="button">
          {ocrLoading ? '识别中...' : '📸 拍照上传'}
        </button>
      </div>

      {ocrLoading && (
        <div className="ocr-loading">
          <div className="loading-spinner" />
          <p>AI 正在识别手写内容<LoadingDots /></p>
        </div>
      )}

      {ocrPreview && (
        <div className="ocr-preview">
          <span className="ocr-preview-icon">✅</span> 已从照片中识别出 {Object.values(ocrPreview).filter(Boolean).length} 项内容，请核对修改后提交。
        </div>
      )}

      {/* Header */}
      <div className="recall-header">
        <div className="recall-header-left">
          <div className="recall-subject-badge">{subjectIcon} {subject}</div>
          <h2 className="recall-chapter">📘 {chapter}</h2>
        </div>
        <div className="recall-progress">
          <span className="progress-text">{completedCount}/{STEP_FIELDS.length} 已填写</span>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${(completedCount / STEP_FIELDS.length) * 100}%` }} /></div>
        </div>
      </div>

      <p className="recall-tip">💡 请在脑海中回忆今天的课堂内容，把关键词写下来。写完后点击「提交分析」让 AI 帮你总结。</p>

      {/* Step cards */}
      <div className="steps-grid">
        {[1, 2, 3, 4, 5].map((sn) => {
          const metas = STEP_FIELDS.filter((f) => f.step === sn);
          const done = metas.every((f) => formData[f.key]?.trim());
          const open = activeStep === sn;
          return (
            <div key={sn} className={`step-card ${done ? 'step-done' : ''} ${open ? 'step-open' : ''}`}>
              <button className="step-card-header" onClick={() => setActiveStep(open ? 0 : sn)} type="button">
                <div className={`step-badge ${done ? 'badge-done' : ''}`}>{done ? '✓' : sn}</div>
                <div className="step-card-title">
                  <span>第{sn}步</span>
                  <span className="step-card-subtitle">{['写下核心概念', '易错点 & 重点', '公式或定理', '典型例题复盘', '方法总结'][sn - 1]}</span>
                </div>
                <span className="step-arrow">{open ? '▼' : '▶'}</span>
              </button>
              {open && (
                <div className="step-card-body">
                  <div className="step-tip">
                    {sn === 1 && '💡 如果记不起来，翻看课本第几页，看完后合上再写。'}
                    {sn === 2 && '💡 想想老师上课时重复说了什么、在黑板上重点圈了什么。'}
                    {sn === 3 && '💡 写出名称和关键结构即可。'}
                    {sn === 4 && '💡 回忆关键解题步骤，2-3个关键词就够了。'}
                    {sn === 5 && '💡 用一句话或2-3个关键词总结核心方法。'}
                  </div>
                  {metas.map((meta) => (
                    <div key={meta.key} className="step-field">
                      <label className="step-field-label">{meta.label}</label>
                      <textarea
                        className="step-textarea"
                        value={formData[meta.key] || ''}
                        onChange={(e) => setFormData((p) => ({ ...p, [meta.key]: e.target.value }))}
                        placeholder={meta.placeholder}
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      {!formResult && !formLoading && (
        <div className="submit-area">
          <button className="btn-submit" onClick={handleFormSubmit} disabled={!allFilled} type="button">
            📤 提交分析 {!allFilled && `（还需 ${STEP_FIELDS.length - completedCount} 项）`}
          </button>
        </div>
      )}

      {formLoading && (
        <div className="loading-area">
          <div className="loading-spinner" />
          <p className="loading-text">AI 正在分析你的回忆<LoadingDots /></p>
          <p className="loading-hint">正在生成知识点脑图、方法模板、易错清单...</p>
        </div>
      )}

      {formError && (
        <div className="error-area">
          <p>❌ {formError}</p>
          <button className="btn-retry" onClick={handleFormSubmit} type="button">重试</button>
        </div>
      )}

      {formResult && <AnalysisResult content={formResult} onRedo={handleRedo} />}

      <style jsx>{`
        .photo-bar { display: flex; justify-content: space-between; align-items: center; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 14px; padding: 12px 18px; margin-bottom: 16px; gap: 12px; flex-wrap: wrap; }
        .photo-bar-left { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #0369a1; }
        .photo-icon { font-size: 20px; }
        .photo-btn { padding: 8px 18px; border-radius: 10px; border: none; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .photo-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .ocr-loading { text-align: center; padding: 24px; }
        .loading-spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #0ea5e9; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 10px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ocr-loading p { color: #475569; font-size: 14px; }

        .ocr-preview { background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 10px 16px; font-size: 13px; color: #166534; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .ocr-preview-icon { font-size: 16px; }

        .recall-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 16px; flex-wrap: wrap; }
        .recall-header-left { display: flex; align-items: center; gap: 12px; }
        .recall-subject-badge { padding: 6px 14px; border-radius: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; font-size: 13px; font-weight: 600; }
        .recall-chapter { margin: 0; font-size: 18px; color: #0f172a; }
        .recall-progress { display: flex; align-items: center; gap: 10px; }
        .progress-text { font-size: 12px; color: #64748b; white-space: nowrap; }
        .progress-bar { width: 100px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 3px; transition: width 0.5s ease; }

        .recall-tip { font-size: 13px; color: #64748b; margin: 0 0 18px; padding: 12px 16px; background: #f0f9ff; border-radius: 12px; border: 1px solid #bae6fd; }

        .steps-grid { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
        .step-card { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; transition: all 0.2s; }
        .step-card.step-done { border-color: #86efac; background: #f0fdf4; }
        .step-card.step-open { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .step-card-header { display: flex; align-items: center; gap: 12px; width: 100%; padding: 16px 18px; border: none; background: transparent; cursor: pointer; font-family: inherit; text-align: left; }
        .step-card-header:hover { background: rgba(0,0,0,0.02); }
        .step-badge { width: 32px; height: 32px; border-radius: 10px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #475569; flex-shrink: 0; transition: all 0.2s; }
        .step-badge.badge-done { background: #22c55e; color: #fff; }
        .step-card-title { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .step-card-title span:first-child { font-size: 14px; font-weight: 600; color: #0f172a; }
        .step-card-subtitle { font-size: 12px; color: #94a3b8; }
        .step-arrow { font-size: 10px; color: #94a3b8; }
        .step-card-body { padding: 0 18px 18px; display: flex; flex-direction: column; gap: 10px; }
        .step-tip { font-size: 12px; color: #0369a1; padding: 10px 14px; background: #f0f9ff; border-radius: 10px; border: 1px solid #bae6fd; }
        .step-field { display: flex; flex-direction: column; gap: 6px; }
        .step-field-label { font-size: 13px; font-weight: 600; color: #334155; }
        .step-textarea { width: 100%; padding: 12px 14px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 14px; font-family: inherit; outline: none; resize: vertical; transition: border-color 0.2s; box-sizing: border-box; line-height: 1.6; }
        .step-textarea:focus { border-color: #667eea; }

        .submit-area { text-align: center; margin-bottom: 40px; }
        .btn-submit { padding: 14px 48px; border: none; border-radius: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
        .btn-submit:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-submit:hover:not(:disabled) { opacity: 0.92; }

        .loading-area { text-align: center; padding: 48px 0; }
        .loading-text { color: #334155; font-weight: 600; font-size: 15px; margin: 0 0 6px; }
        .loading-hint { color: #94a3b8; font-size: 13px; margin: 0; }

        .error-area { text-align: center; padding: 24px; background: #fef2f2; border-radius: 14px; border: 1px solid #fca5a5; margin-bottom: 20px; }
        .error-area p { color: #991b1b; margin: 0 0 12px; }
        .btn-retry { padding: 8px 24px; border: none; border-radius: 10px; background: #dc2626; color: #fff; font-size: 14px; cursor: pointer; font-family: inherit; }
      `}</style>
      <UpgradeModal />
    </AppShell>
  );
}
