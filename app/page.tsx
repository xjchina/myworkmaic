'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { Bot, FileText, MessageSquare, Sparkles, Upload } from 'lucide-react';
import { QuizView } from '@/components/scene-renderers/quiz-view';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/lib/store/settings';
import { listStages, type StageListItem } from '@/lib/utils/stage-storage';
import type { QuizQuestion } from '@/lib/types/stage';

const MENU_ITEMS = [
  { key: 'openmaic', label: 'OpenMAIC 主页', icon: Bot },
  { key: 'quiz', label: '随堂测验', icon: FileText },
  { key: 'roundtable', label: '圆桌会议', icon: MessageSquare },
] as const;

type MenuKey = (typeof MENU_ITEMS)[number]['key'];

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
  const answerLineRe = /^(?:第\s*(\d+)\s*题|(\d{1,3}))[\.、．\)\s]*(?:答案[:：]?)?\s*([A-Ha-h]{1,6}|.+)$/;
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

  return blocks.map((b) => {
    const rawAnswer = answers.get(b.no)?.replace(/\s+/g, '').toUpperCase();
    const optionAnswers = rawAnswer ? [...rawAnswer].filter((ch) => /[A-H]/.test(ch)) : [];
    const hasOptions = b.options.length > 0;
    const isMultiple = optionAnswers.length > 1;

    return {
      id: `q_${nanoid(8)}`,
      type: hasOptions ? (isMultiple ? 'multiple' : 'single') : 'short_answer',
      question: b.stem || `第 ${b.no} 题`,
      options: hasOptions ? b.options : undefined,
      answer: hasOptions && optionAnswers.length > 0 ? optionAnswers : undefined,
      analysis: undefined,
      hasAnswer: hasOptions ? optionAnswers.length > 0 : false,
      points: 1,
    } satisfies QuizQuestion;
  });
}

function QuizMenuPanel() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [sceneId, setSceneId] = useState<string>('quiz-menu-initial');
  const [summary, setSummary] = useState<string | null>(null);

  const handleGenerateQuiz = async () => {
    if (!pdfFile) {
      setError('请先上传 PDF 文件。');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const settings = useSettingsStore.getState();

      const parseFormData = new FormData();
      parseFormData.append('pdf', pdfFile);
      if (settings.pdfProviderId) parseFormData.append('providerId', settings.pdfProviderId);

      const pdfProviderConfig = settings.pdfProvidersConfig?.[settings.pdfProviderId];
      if (pdfProviderConfig?.apiKey?.trim()) parseFormData.append('apiKey', pdfProviderConfig.apiKey);
      if (pdfProviderConfig?.baseUrl?.trim())
        parseFormData.append('baseUrl', pdfProviderConfig.baseUrl);

      const parseResp = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: parseFormData,
      });

      const parseJson = await parseResp.json();
      if (!parseResp.ok || !parseJson?.success || !parseJson?.data) {
        throw new Error(parseJson?.error || 'PDF 解析失败');
      }

      const parsedText = String(parseJson.data.text || '').trim();
      const extractedQuestions = parseQuizFromPdfText(parsedText);
      if (extractedQuestions.length === 0) {
        throw new Error('PDF 中未检测到可识别题目，不会自动补题。请确认 PDF 中有标准题号格式（如“第1题”或“1.”）。');
      }

      setQuestions(extractedQuestions);
      setSceneId(`quiz-menu-${nanoid(8)}`);

      const pageCount = parseJson.data.metadata?.pageCount;
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
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">上传 PDF 生成随堂测验</h2>
          <p className="text-sm text-muted-foreground mt-1">
            上传讲义或教材 PDF，系统将自动解析内容并生成题目与答案。
          </p>
        </div>

        <label className="space-y-1.5 text-sm block">
          <span className="font-medium">PDF 文件</span>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <Button onClick={handleGenerateQuiz} disabled={!pdfFile || isGenerating} className="gap-2">
          <Upload className="size-4" />
          {isGenerating ? '正在生成测验...' : '生成测验'}
        </Button>

        {summary && <p className="text-sm text-emerald-600 dark:text-emerald-400">{summary}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {questions && questions.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-2 h-[70vh] min-h-[560px]">
          <QuizView questions={questions} sceneId={sceneId} />
        </div>
      )}
    </div>
  );
}

function RoundtableMenuPanel() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<StageListItem[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [question, setQuestion] = useState('');

  useEffect(() => {
    const loadClassrooms = async () => {
      const list = await listStages();
      setClassrooms(list);
      if (list.length > 0) {
        setSelectedClassroomId((prev) => prev || list[0].id);
      }
    };

    loadClassrooms().catch(() => setClassrooms([]));
  }, []);

  const canStart = useMemo(
    () => !!selectedClassroomId && question.trim().length > 0,
    [selectedClassroomId, question],
  );

  const startDiscussion = () => {
    if (!canStart) return;

    const payload = {
      stageId: selectedClassroomId,
      question: question.trim(),
      createdAt: Date.now(),
    };
    sessionStorage.setItem('pendingRoundtableQuestion', JSON.stringify(payload));
    router.push(`/classroom/${selectedClassroomId}?autodiscuss=1`);
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">圆桌会议入口</h2>
        <p className="text-sm text-muted-foreground mt-1">
          在这里发起 AI 老师与 AI 学生讨论。输入学生问题后会进入课堂并自动开始讨论。
        </p>
      </div>

      <label className="space-y-1.5 text-sm block">
        <span className="font-medium">选择互动课堂</span>
        <select
          value={selectedClassroomId}
          onChange={(e) => setSelectedClassroomId(e.target.value)}
          className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {classrooms.length === 0 && <option value="">暂无课堂</option>}
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5 text-sm block">
        <span className="font-medium">学生提问</span>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例如：老师，我不理解这个公式为什么这样推导？"
          rows={4}
          className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </label>

      <Button onClick={startDiscussion} disabled={!canStart} className="gap-2">
        <Sparkles className="size-4" />
        开始讨论
      </Button>
    </div>
  );
}

function OpenMAICMenuPanel() {
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 text-center space-y-4">
      <h2 className="text-xl font-semibold">OpenMAIC 互动课堂生成</h2>
      <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
        进入原始 OpenMAIC 主页，上传资料并生成互动课堂内容。
      </p>
      <Button onClick={() => router.push('/openmaic')} size="lg" className="gap-2">
        <Bot className="size-4" />
        进入 OpenMAIC 主页
      </Button>
    </div>
  );
}

export default function MenuHomePage() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>('openmaic');

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">OpenMAIC 教学工作台</h1>
          <p className="text-muted-foreground">三个菜单：课堂生成、随堂测验、圆桌会议。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveMenu(item.key)}
                className={`rounded-xl border px-4 py-3 text-left transition-all ${
                  isActive
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border/60 bg-card hover:border-primary/40 hover:bg-card/90'
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <Icon className="size-4" />
                  {item.label}
                </div>
              </button>
            );
          })}
        </div>

        <div>
          {activeMenu === 'openmaic' && <OpenMAICMenuPanel />}
          {activeMenu === 'quiz' && <QuizMenuPanel />}
          {activeMenu === 'roundtable' && <RoundtableMenuPanel />}
        </div>
      </div>
    </div>
  );
}
