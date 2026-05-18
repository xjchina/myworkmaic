'use client';

import { useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { Sparkles } from 'lucide-react';
import { QuizView } from '@/components/scene-renderers/quiz-view';
import { useSettingsStore } from '@/lib/store/settings';
import type { QuizQuestion } from '@/lib/types/stage';
import { parseQuizFromPdfText } from '@/lib/quiz/pdf-quiz-parser';
import {
  readQuizSessions,
  removeQuizSession,
  saveQuizSession,
  type QuizSessionRecord,
} from '@/lib/quiz/persistence';
import { DEMO_QUIZ_PRESETS, type DemoQuizPreset } from '@/lib/data/demo-quiz-subjects';
import { trackUsage } from '@/lib/client/usage-tracker';
import { useUpgradeGuard } from '@/lib/hooks/use-upgrade-guard';

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString();
}

export function QuizWorkbench() {
  const { checkAndUpgrade, UpgradeModal } = useUpgradeGuard();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [sceneId, setSceneId] = useState<string>('quiz-workbench-initial');
  const [sceneTitle, setSceneTitle] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [savedSessions, setSavedSessions] = useState<QuizSessionRecord[]>([]);
  const [dragover, setDragover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentStep = questions?.length ? 4 : isGenerating ? 3 : pdfFile ? 2 : 1;

  useEffect(() => {
    setSavedSessions(readQuizSessions());
  }, []);

  const onFileSelected = (file: File | null) => {
    if (!file) return;
    setPdfFile(file);
    setQuestions(null);
    setSummary(null);
    setError(null);
  };

  const handleReset = () => {
    setPdfFile(null);
    setQuestions(null);
    setSummary(null);
    setError(null);
    setIsGenerating(false);
    setActiveSessionId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenSavedSession = (session: QuizSessionRecord) => {
    setPdfFile(null);
    setError(null);
    setIsGenerating(false);
    setQuestions(session.questions);
    setSceneId(session.sceneId);
    setSceneTitle(session.sourceName);
    setSummary(session.summary);
    setActiveSessionId(session.id);

    const next = saveQuizSession({
      id: session.id,
      sceneId: session.sceneId,
      sourceName: session.sourceName,
      summary: session.summary,
      questionCount: session.questionCount,
      questions: session.questions,
      createdAt: session.createdAt,
      updatedAt: Date.now(),
    });
    setSavedSessions(next);
  };

  const handleDeleteSession = (id: string) => {
    const next = removeQuizSession(id);
    setSavedSessions(next);
    if (activeSessionId === id) {
      setQuestions(null);
      setSummary(null);
      setActiveSessionId(null);
      setSceneId('quiz-workbench-initial');
    }
  };

  const handleBackToExerciseHome = () => {
    setPdfFile(null);
    setQuestions(null);
    setError(null);
    setIsGenerating(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerateQuiz = async () => {
    if (!(await checkAndUpgrade('exercise'))) {
      return;
    }

    if (!pdfFile) {
      setError('\u8bf7\u5148\u4e0a\u4f20 PDF \u6587\u4ef6\u3002');
      return;
    }

    setError(null);
    setIsGenerating(true);
    try {
      const settings = useSettingsStore.getState();
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('usageFeature', 'exercise');
      formData.append('usageKey', `exercise-${Date.now()}-${nanoid(6)}`);
      if (settings.pdfProviderId) formData.append('providerId', settings.pdfProviderId);

      const providerConfig = settings.pdfProvidersConfig?.[settings.pdfProviderId];
      if (providerConfig?.apiKey?.trim()) formData.append('apiKey', providerConfig.apiKey);
      if (providerConfig?.baseUrl?.trim()) formData.append('baseUrl', providerConfig.baseUrl);

      const parseResponse = await fetch('/api/parse-pdf', { method: 'POST', body: formData });
      const parseResult = await parseResponse.json();
      if (!parseResponse.ok || !parseResult?.success || !parseResult?.data) {
        throw new Error(parseResult?.error || 'PDF \u89e3\u6790\u5931\u8d25');
      }

      const parsedText = String(parseResult.data.text || '').trim();
      const extractedQuestions = parseQuizFromPdfText(parsedText);
      if (extractedQuestions.length === 0) {
        throw new Error(
          'PDF \u4e2d\u672a\u8bc6\u522b\u5230\u6709\u6548\u9898\u76ee\u3002\u7cfb\u7edf\u4e0d\u4f1a\u81ea\u52a8\u8865\u9898\uff0c\u8bf7\u786e\u8ba4\u8bb2\u4e49\u4e2d\u5305\u542b\u6807\u51c6\u9898\u53f7\uff08\u5982\u201c\u7b2c1\u9898\u201d\u6216\u201c1.\u201d\uff09\u3002',
        );
      }

      const nextSceneId = `quiz-workbench-${nanoid(8)}`;
      const nextSessionId = `quiz-session-${nanoid(8)}`;
      setQuestions(extractedQuestions);
      setSceneId(nextSceneId);
      setSceneTitle(pdfFile.name);
      setActiveSessionId(nextSessionId);

      const pageCount = parseResult.data.metadata?.pageCount;
      const chars = parsedText.length;
      const withAnswer = extractedQuestions.filter((q) => q.hasAnswer).length;
      const summaryText =
        `PDF \u5171 ${pageCount ?? 0} \u9875\uff0c\u89e3\u6790\u6587\u672c\u7ea6 ${chars} \u5b57\uff0c\u63d0\u53d6\u9898\u76ee ${extractedQuestions.length} \u9898\uff08\u542b\u7b54\u6848 ${withAnswer} \u9898\uff09\u3002`;
      setSummary(summaryText);

      const nextSessions = saveQuizSession({
        id: nextSessionId,
        sceneId: nextSceneId,
        sourceName: pdfFile.name,
        summary: summaryText,
        questionCount: extractedQuestions.length,
        questions: extractedQuestions,
      });
      setSavedSessions(nextSessions);
      await trackUsage({
        feature: 'exercise',
        action: 'quiz_generated',
        subject: pdfFile.name,
        durationSeconds: extractedQuestions.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '\u751f\u6210\u5931\u8d25');
    } finally {
      setIsGenerating(false);
    }
  };

  const startDemoPreset = async (preset: DemoQuizPreset) => {
    if (!(await checkAndUpgrade('exercise'))) return;
    const nextSceneId = `quiz-demo-${preset.id}-${nanoid(8)}`;
    const nextSessionId = `quiz-session-demo-${preset.id}-${nanoid(8)}`;

    setQuestions(preset.questions);
    setSceneId(nextSceneId);
    setSceneTitle(preset.sourceName);
    setActiveSessionId(nextSessionId);
    setSummary(preset.summary);

    setSavedSessions(
      saveQuizSession({
        id: nextSessionId,
        sceneId: nextSceneId,
        sourceName: preset.sourceName,
        summary: preset.summary,
        questionCount: preset.questions.length,
        questions: preset.questions,
      }),
    );

    void trackUsage({
      feature: 'exercise',
      action: 'quiz_generated',
      subject: preset.subject,
      durationSeconds: preset.questions.length,
    });
  };

  return (
    <div className="exercise-workbench">
      <section className="flow-section">
        <h3 className="flow-title">{'\u4f7f\u7528\u6d41\u7a0b'}</h3>
        <div className="flow-steps">
          {[
            { id: 1, label: '\u4e0a\u4f20 PDF' },
            { id: 2, label: '\u89e3\u6790\u6587\u4ef6' },
            { id: 3, label: '\u8bc6\u522b\u9898\u76ee' },
            { id: 4, label: '\u5f00\u59cb\u7ec3\u4e60' },
          ].map((step) => {
            const state = currentStep === step.id ? 'active' : currentStep > step.id ? 'done' : '';
            return (
              <div key={step.id} className={`flow-step ${state}`}>
                <div className="flow-step-icon">{step.id}</div>
                <div className="flow-step-label">{step.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 鈹€鈹€ Two-column layout for initial state 鈹€鈹€ */}
      {!pdfFile && !questions ? (
        <div className="main-layout">
          {/* Left sidebar 鈥?history */}
          <aside className="history-sidebar">
            <section className="history-section">
              <div className="history-head">
                <h3>历史练习</h3>
                <span>{savedSessions.length} 项</span>
              </div>
              <div className="history-list">
                {savedSessions.length === 0 ? (
                  <div className="history-empty">暂无历史练习</div>
                ) : (
                  savedSessions.map((session) => (
                    <article key={session.id} className={`history-item ${activeSessionId === session.id ? 'active' : ''}`}>
                      <div className="history-main">
                        <h4>{session.sourceName}</h4>
                        <p>{session.summary}</p>
                        <div className="history-meta">
                          <span>{session.questionCount} 题</span>
                          <span>{formatTime(session.updatedAt)}</span>
                        </div>
                      </div>
                      <div className="history-actions">
                        <button type="button" className="btn btn-primary" onClick={() => handleOpenSavedSession(session)}>继续</button>
                        <button type="button" className="btn btn-outline" onClick={() => handleDeleteSession(session.id)}>删除</button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </aside>

          {/* Right content */}
          <div className="main-content">
            <section className="demo-quiz-section">
              <div className="demo-quiz-badge"><Sparkles className="size-3.5" />内置示例</div>
              <div className="demo-quiz-grid">
                {DEMO_QUIZ_PRESETS.map((preset) => {
                  const totalPoints = preset.questions.reduce((sum, q) => sum + (q.points ?? 1), 0);
                  const singleCount = preset.questions.filter((q) => q.type === 'single').length;
                  const multipleCount = preset.questions.filter((q) => q.type === 'multiple').length;
                  const shortCount = preset.questions.filter((q) => q.type === 'short_answer').length;
                  return (
                    <article key={preset.id} className="demo-quiz-card">
                      <div className="demo-quiz-title">{preset.title}</div>
                      <div className="demo-quiz-desc">{preset.summary}</div>
                      <div className="demo-quiz-meta">
                        <span className="meta-single">单选 ×{singleCount}</span>
                        <span className="meta-multiple">多选 ×{multipleCount}</span>
                        <span className="meta-short">简答 ×{shortCount}</span>
                        <span className="meta-total">共 {totalPoints} 分</span>
                      </div>
                      <button
                        type="button"
                        className="btn-demo-quiz"
                        onClick={() => {
                          void startDemoPreset(preset);
                        }}
                      >
                        开始练习
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
            <section className={`upload-section ${dragover ? 'dragover' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
              onDragLeave={() => setDragover(false)}
              onDrop={(e) => { e.preventDefault(); setDragover(false); const f = e.dataTransfer.files?.[0] ?? null; if (f?.type === 'application/pdf') onFileSelected(f); }}
            >
              <div className="upload-title">上传练习 PDF</div>
              <div className="upload-desc">支持拖拽上传或点击选择文件</div>
              <div className="upload-hint">严格按照 PDF 原题生成，不会随机补题</div>
              <button type="button" className="btn-upload" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>选择 PDF 文件</button>
              <input ref={fileInputRef} type="file" accept=".pdf" onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)} />
            </section>
          </div>
        </div>
      ) : (
        <>
{pdfFile && !questions && (
        <section className="parse-section show">
          <div className="parse-header">
            <div className="parse-info">
              <div className="file-preview">PDF</div>
              <div className="file-details">
                <h3>{pdfFile.name}</h3>
                <p>{formatFileSize(pdfFile.size)}</p>
              </div>
            </div>
            <div className="parse-actions">
              <button type="button" className="btn btn-outline" onClick={handleReset}>
                {'\u91cd\u65b0\u4e0a\u4f20'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerateQuiz}
                disabled={isGenerating}
              >
                {isGenerating
                  ? '\u6b63\u5728\u89e3\u6790\u4e2d...'
                  : '\u5f00\u59cb\u89e3\u6790\u9898\u76ee'}
              </button>
            </div>
          </div>
          {summary && <p className="summary">{summary}</p>}
          {error && <p className="error">{error}</p>}
        </section>
      )}

      {questions && questions.length > 0 && (
        <section className="practice-section show">
          <div className="practice-header">
            <div className="practice-title-wrap">
              <h3>{'\u4e92\u52a8\u7ec3\u4e60'}</h3>
              <p>{summary ?? `\u5171 ${questions.length} \u9898\uff0c\u5f00\u59cb\u4f5c\u7b54`}</p>
            </div>
            <div className="practice-actions">
              <button type="button" className="btn btn-outline" onClick={handleBackToExerciseHome}>
                {'\u8fd4\u56de\u7ec3\u4e60\u9996\u9875'}
              </button>
              <button type="button" className="btn btn-outline" onClick={handleReset}>
                {'\u91cd\u65b0\u4e0a\u4f20'}
              </button>
            </div>
          </div>
          <div className="quiz-host">
            <QuizView key={sceneId} questions={questions} sceneId={sceneId} sceneTitle={sceneTitle ?? undefined} />
          </div>
        </section>
      )}

        </>
      )}

      <style jsx>{`
        .exercise-workbench {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .main-layout {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }
        .history-sidebar {
          width: 340px;
          min-width: 340px;
          flex-shrink: 0;
          position: sticky;
          top: 16px;
          max-height: calc(100vh - 200px);
          overflow-y: auto;
        }
        .main-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .flow-section,
        .history-section,
        .parse-section,
        .practice-section,
        .demo-quiz-section {
          background: white;
          border-radius: 20px;
          padding: 32px;
        }
        .demo-quiz-section {
          background: linear-gradient(135deg, #eef2ff 0%, #faf5ff 50%, #fdf2f8 100%);
          border: 1.5px solid #c7d2fe;
        }
        .demo-quiz-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .demo-quiz-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 14px;
        }
        .demo-quiz-card {
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .demo-quiz-title {
          font-size: 20px;
          font-weight: 700;
          color: #1a365d;
          margin-bottom: 6px;
        }
        .demo-quiz-card .demo-quiz-title {
          font-size: 16px;
          margin-bottom: 0;
        }
        .demo-quiz-desc {
          font-size: 14px;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 12px;
        }
        .demo-quiz-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 18px;
        }
        .demo-quiz-meta span {
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }
        .meta-single {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .meta-multiple {
          background: #dcfce7;
          color: #166534;
        }
        .meta-short {
          background: #fef3c7;
          color: #92400e;
        }
        .meta-total {
          background: #fce7f3;
          color: #9d174d;
        }
        .btn-demo-quiz {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
          color: white;
          padding: 10px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          width: fit-content;
        }
        .btn-demo-quiz:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.3);
        }
        .flow-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a365d;
          margin-bottom: 24px;
        }
        .flow-steps {
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          gap: 12px;
        }
        .flow-steps::before {
          content: '';
          position: absolute;
          top: 30px;
          left: 60px;
          right: 60px;
          height: 3px;
          background: #e2e8f0;
          z-index: 0;
        }
        .history-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          gap: 12px;
          flex-wrap: wrap;
        }
        .history-head h3 {
          margin: 0;
          font-size: 18px;
          color: #1a365d;
        }
        .history-head span {
          color: #64748b;
          font-size: 13px;
        }
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .history-empty {
          text-align: center;
          color: #94a3b8;
          font-size: 13px;
          padding: 24px 0;
        }
        .history-item {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          background: #f8fafc;
        }
        .history-item.active {
          border-color: #ec4899;
          background: #fdf2f8;
        }
        .history-main {
          min-width: 0;
          flex: 1;
        }
        .history-main h4 {
          margin: 0;
          color: #0f172a;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .history-main p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .history-meta {
          margin-top: 8px;
          display: flex;
          gap: 12px;
          color: #64748b;
          font-size: 12px;
        }
        .history-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
        .history-actions .btn {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 7px;
        }
        .history-actions .btn-primary {
          background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%);
          color: white;
          border: none;
        }
        .history-actions .btn-outline {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }
        .flow-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 1;
        }
        .flow-step-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: white;
          border: 3px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 700;
          color: #64748b;
        }
        .flow-step.active .flow-step-icon {
          border-color: #ec4899;
          background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
          color: #be185d;
        }
        .flow-step.done .flow-step-icon {
          border-color: #10b981;
          background: #d1fae5;
          color: #047857;
        }
        .flow-step-label {
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
        }
        .flow-step.active .flow-step-label {
          color: #ec4899;
        }
        .flow-step.done .flow-step-label {
          color: #10b981;
        }
        .upload-section {
          background: white;
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          border: 2px dashed #e2e8f0;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .upload-section:hover {
          border-color: #ec4899;
          background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
        }
        .upload-section.dragover {
          border-color: #ec4899;
          background: #fce7f3;
        }
        .upload-title {
          font-size: 20px;
          font-weight: 600;
          color: #1a365d;
          margin-bottom: 8px;
        }
        .upload-desc {
          color: #718096;
          margin-bottom: 16px;
        }
        .upload-hint {
          display: inline-flex;
          align-items: center;
          background: #fef3c7;
          color: #92400e;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 13px;
          margin-bottom: 20px;
        }
        .btn-upload,
        .btn {
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
        }
        .btn-upload {
          background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%);
          color: white;
          padding: 14px 32px;
          font-size: 15px;
        }
        .btn-upload:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(236, 72, 153, 0.3);
        }
        input[type='file'] {
          display: none;
        }
        .parse-header,
        .practice-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .parse-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .file-preview {
          width: 56px;
          height: 56px;
          background: #fee2e2;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 700;
          color: #991b1b;
        }
        .file-details h3 {
          font-size: 16px;
          color: #1a365d;
          margin: 0;
        }
        .file-details p {
          margin: 4px 0 0;
          font-size: 13px;
          color: #718096;
        }
        .parse-actions {
          display: flex;
          gap: 12px;
        }
        .practice-actions {
          display: flex;
          gap: 12px;
        }
        .btn {
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
        }
        .btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .btn-outline {
          background: white;
          color: #4a5568;
          border: 2px solid #e2e8f0;
        }
        .btn-outline:hover {
          border-color: #ec4899;
          color: #ec4899;
        }
        .btn-primary {
          background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%);
          color: white;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
        }
        .summary {
          margin: 18px 0 0;
          color: #047857;
          font-size: 14px;
        }
        .error {
          margin: 14px 0 0;
          color: #dc2626;
          font-size: 14px;
        }
        .practice-title-wrap h3 {
          margin: 0;
          color: #1a365d;
          font-size: 20px;
          font-weight: 700;
        }
        .practice-title-wrap p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 14px;
        }
        .quiz-host {
          margin-top: 20px;
          border-radius: 14px;
          border: 1px solid #f1f5f9;
          background: #fff;
          min-height: 560px;
          height: 72vh;
          overflow: hidden;
        }
        @media (max-width: 960px) {
          .main-layout {
            flex-direction: column;
          }
          .history-sidebar {
            width: 100%;
            position: static;
            max-height: none;
          }
          .flow-steps {
            flex-wrap: wrap;
            justify-content: center;
          }
          .flow-steps::before {
            display: none;
          }
          .parse-actions {
            width: 100%;
          }
          .history-item {
            flex-direction: column;
            align-items: flex-start;
          }
          .history-actions {
            width: 100%;
          }
          .history-actions .btn {
            flex: 1;
          }
          .parse-actions .btn {
            flex: 1;
          }
          .practice-header .btn {
            width: 100%;
          }
          .practice-actions {
            width: 100%;
            flex-direction: column;
          }
          .quiz-host {
            min-height: 520px;
            height: auto;
          }
        }
      `}</style>
      <UpgradeModal />
    </div>
  );
}

