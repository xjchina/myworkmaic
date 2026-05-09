'use client';

import { useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { QuizView } from '@/components/scene-renderers/quiz-view';
import { useSettingsStore } from '@/lib/store/settings';
import type { QuizQuestion } from '@/lib/types/stage';

type ParsedQuestionBlock = {
  no: number;
  stem: string;
  options: Array<{ value: string; label: string }>;
};

function parseQuizFromPdfText(text: string): QuizQuestion[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const answers = new Map<number, string>();
  const answerLineRe =
    /^(?:第\s*(\d+)\s*题|(\d{1,3}))[\.、．\)\s]*(?:答案[:：]?)?\s*([A-Ha-h]{1,6}|.+)$/;
  let inAnswerSection = false;

  const questionLines: string[] = [];
  for (const line of lines) {
    if (/^(参考)?答案(与解析)?[:：]?$/.test(line)) {
      inAnswerSection = true;
      continue;
    }

    if (inAnswerSection) {
      const m = line.match(answerLineRe);
      if (m) {
        const qNo = Number(m[1] || m[2]);
        const value = (m[3] || '').trim();
        if (qNo > 0 && value) answers.set(qNo, value);
      }
    } else {
      questionLines.push(line);
    }
  }

  const questionStartRe = /^(?:第\s*(\d+)\s*题|(\d{1,3}))[\.、．\)\s]+(.+)$/;
  const optionRe = /^([A-Ha-h])[\.、．\)\s]+(.+)$/;
  const blocks: ParsedQuestionBlock[] = [];
  let current: ParsedQuestionBlock | null = null;

  for (const line of questionLines) {
    const start = line.match(questionStartRe);
    if (start) {
      if (current) blocks.push(current);
      const no = Number(start[1] || start[2]);
      const rest = (start[3] || '').trim();
      current = { no, stem: rest, options: [] };
      continue;
    }

    if (!current) continue;

    const opt = line.match(optionRe);
    if (opt) {
      current.options.push({ value: opt[1].toUpperCase(), label: opt[2].trim() });
    } else if (current.options.length === 0) {
      current.stem = `${current.stem} ${line}`.trim();
    }
  }

  if (current) blocks.push(current);

  return blocks.map((block) => {
    const rawAnswer = answers.get(block.no)?.replace(/\s+/g, '').toUpperCase();
    const optionAnswers = rawAnswer ? [...rawAnswer].filter((ch) => /[A-H]/.test(ch)) : [];
    const hasOptions = block.options.length > 0;
    const isMultiple = optionAnswers.length > 1;

    return {
      id: `q_${nanoid(8)}`,
      type: hasOptions ? (isMultiple ? 'multiple' : 'single') : 'short_answer',
      question: block.stem || `第 ${block.no} 题`,
      options: hasOptions ? block.options : undefined,
      answer: hasOptions && optionAnswers.length > 0 ? optionAnswers : undefined,
      analysis: undefined,
      hasAnswer: hasOptions ? optionAnswers.length > 0 : false,
      points: 1,
    } satisfies QuizQuestion;
  });
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function QuizWorkbench() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [sceneId, setSceneId] = useState<string>('quiz-workbench-initial');
  const [summary, setSummary] = useState<string | null>(null);
  const [dragover, setDragover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentStep = questions?.length ? 4 : isGenerating ? 3 : pdfFile ? 2 : 1;

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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerateQuiz = async () => {
    if (!pdfFile) {
      setError('请先上传 PDF 文件。');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const settings = useSettingsStore.getState();

      const formData = new FormData();
      formData.append('pdf', pdfFile);
      if (settings.pdfProviderId) formData.append('providerId', settings.pdfProviderId);

      const providerConfig = settings.pdfProvidersConfig?.[settings.pdfProviderId];
      if (providerConfig?.apiKey?.trim()) formData.append('apiKey', providerConfig.apiKey);
      if (providerConfig?.baseUrl?.trim()) formData.append('baseUrl', providerConfig.baseUrl);

      const parseResponse = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      const parseResult = await parseResponse.json();
      if (!parseResponse.ok || !parseResult?.success || !parseResult?.data) {
        throw new Error(parseResult?.error || 'PDF 解析失败');
      }

      const parsedText = String(parseResult.data.text || '').trim();
      const extractedQuestions = parseQuizFromPdfText(parsedText);
      if (extractedQuestions.length === 0) {
        throw new Error(
          'PDF 中未检测到可识别题目，不会自动补题。请确认 PDF 中有标准题号格式（如“第1题”或“1.”）。',
        );
      }

      setQuestions(extractedQuestions);
      setSceneId(`quiz-workbench-${nanoid(8)}`);

      const pageCount = parseResult.data.metadata?.pageCount;
      const chars = parsedText.length;
      const withAnswer = extractedQuestions.filter((q) => q.hasAnswer).length;
      setSummary(
        `PDF 共 ${pageCount ?? 0} 页，解析文本约 ${chars} 字，严格提取题目 ${extractedQuestions.length} 题（含答案 ${withAnswer} 题）。`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="exercise-workbench">
      <section className="flow-section">
        <h3 className="flow-title">
          <span>🚀</span>
          <span>使用流程</span>
        </h3>
        <div className="flow-steps">
          {[
            { id: 1, icon: '📤', label: '上传 PDF' },
            { id: 2, icon: '📄', label: '解析文件' },
            { id: 3, icon: '🧠', label: '识别题目' },
            { id: 4, icon: '📝', label: '开始练习' },
          ].map((step) => {
            const state = currentStep === step.id ? 'active' : currentStep > step.id ? 'done' : '';
            return (
              <div key={step.id} className={`flow-step ${state}`}>
                <div className="flow-step-icon">{step.icon}</div>
                <div className="flow-step-label">{step.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {!pdfFile && (
        <section
          className={`upload-section ${dragover ? 'dragover' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragover(true);
          }}
          onDragLeave={() => setDragover(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragover(false);
            const file = e.dataTransfer.files?.[0] ?? null;
            if (file?.type === 'application/pdf') onFileSelected(file);
          }}
        >
          <div className="upload-icon">📚</div>
          <div className="upload-title">上传练习 PDF</div>
          <div className="upload-desc">支持拖拽上传或点击选择文件</div>
          <div className="upload-hint">⚠️ 严格按 PDF 原题生成，不会随机补题</div>
          <button
            type="button"
            className="btn-upload"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            选择 PDF 文件
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
          />
        </section>
      )}

      {pdfFile && !questions && (
        <section className="parse-section show">
          <div className="parse-header">
            <div className="parse-info">
              <div className="file-preview">📕</div>
              <div className="file-details">
                <h3>{pdfFile.name}</h3>
                <p>{formatFileSize(pdfFile.size)}</p>
              </div>
            </div>
            <div className="parse-actions">
              <button type="button" className="btn btn-outline" onClick={handleReset}>
                重新上传
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerateQuiz}
                disabled={isGenerating}
              >
                {isGenerating ? '正在解析中...' : 'AI 解析题目'}
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
              <h3>互动练习</h3>
              <p>{summary ?? `共 ${questions.length} 题，开始作答`}</p>
            </div>
            <button type="button" className="btn btn-outline" onClick={handleReset}>
              重新上传
            </button>
          </div>
          <div className="quiz-host">
            <QuizView questions={questions} sceneId={sceneId} />
          </div>
        </section>
      )}

      <style jsx>{`
        .exercise-workbench {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .flow-section,
        .parse-section,
        .practice-section {
          background: white;
          border-radius: 20px;
          padding: 32px;
        }
        .flow-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a365d;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
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
          font-size: 28px;
        }
        .flow-step.active .flow-step-icon {
          border-color: #ec4899;
          background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
        }
        .flow-step.done .flow-step-icon {
          border-color: #10b981;
          background: #d1fae5;
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
        .upload-icon {
          font-size: 72px;
          margin-bottom: 20px;
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
          gap: 8px;
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
          font-size: 28px;
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
          .parse-actions .btn {
            flex: 1;
          }
          .practice-header .btn {
            width: 100%;
          }
          .quiz-host {
            min-height: 520px;
            height: auto;
          }
        }
      `}</style>
    </div>
  );
}

