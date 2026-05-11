import { nanoid } from 'nanoid';
import type { QuizOption, QuizQuestion } from '@/lib/types/stage';

type RawQuestionBlock = {
  no: number;
  body: string;
};

const QUESTION_START_RE =
  /(?:^|[\n\u3002\uFF1B;:\uFF1A\uFF1F?!\.\uFF0E])\s*(?:\u7b2c\s*(\d{1,3})\s*\u9898|(\d{1,3})\s*[\.\uFF0E\u3001])\s*/g;
const OPTION_RE =
  /(?:^|\s)([A-Ha-h])\s*[\.\uFF0E\u3001]\s*([\s\S]*?)(?=(?:\s+[A-Ha-h]\s*[\.\uFF0E\u3001]\s*)|$)/g;
const ANSWER_MARK_RE = /(?:\u3010\s*\u7b54\u6848\s*\u3011|\u7b54\u6848\s*[:\uFF1A])/;
const ANALYSIS_MARK_RE = /(?:\u3010\s*\u89e3\u6790\s*\u3011|\u89e3\u6790\s*[:\uFF1A])/;
const SHORT_ANSWER_FALLBACK_RE = /\u6545\u9009\s*[:\uFF1A]?\s*([A-Ha-h]{1,8})/;

function normalizeText(text: string): string {
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitQuestionBlocks(text: string): RawQuestionBlock[] {
  const matches = [...text.matchAll(QUESTION_START_RE)];
  if (matches.length === 0) return [];

  const blocks: RawQuestionBlock[] = [];
  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];
    const no = Number(current[1] ?? current[2] ?? 0);
    if (!Number.isFinite(no) || no <= 0) continue;
    const start = (current.index ?? 0) + current[0].length;
    const end = next?.index ?? text.length;
    const body = text.slice(start, end).trim();
    if (!body) continue;
    blocks.push({ no, body });
  }
  return blocks;
}

function parseAnswerLetters(raw: string | null): string[] {
  if (!raw) return [];
  return raw.toUpperCase().match(/[A-H]/g) ?? [];
}

function splitBodyAnswerAnalysis(rawBody: string): {
  questionBody: string;
  answerRaw: string | null;
  analysis?: string;
} {
  const answerMatch = rawBody.match(ANSWER_MARK_RE);
  const analysisMatch = rawBody.match(ANALYSIS_MARK_RE);

  if (!answerMatch) {
    const fallback = rawBody.match(SHORT_ANSWER_FALLBACK_RE);
    return { questionBody: rawBody, answerRaw: fallback?.[1] ?? null, analysis: undefined };
  }

  const answerIdx = answerMatch.index ?? 0;
  const answerStart = answerIdx + answerMatch[0].length;
  if (!analysisMatch || (analysisMatch.index ?? 0) < answerStart) {
    return {
      questionBody: rawBody.slice(0, answerIdx).trim(),
      answerRaw: rawBody.slice(answerStart).trim(),
      analysis: undefined,
    };
  }

  const analysisIdx = analysisMatch.index ?? rawBody.length;
  const analysisStart = analysisIdx + analysisMatch[0].length;
  return {
    questionBody: rawBody.slice(0, answerIdx).trim(),
    answerRaw: rawBody.slice(answerStart, analysisIdx).trim(),
    analysis: rawBody.slice(analysisStart).trim() || undefined,
  };
}

function parseOptions(questionBody: string): { stem: string; options?: QuizOption[] } {
  const matches = [...questionBody.matchAll(OPTION_RE)];
  if (matches.length < 2) return { stem: questionBody.trim(), options: undefined };

  const stemEnd = matches[0].index ?? 0;
  const stem = questionBody.slice(0, stemEnd).trim();

  const optionMap = new Map<string, QuizOption>();
  for (const match of matches) {
    const value = match[1].toUpperCase();
    const label = match[2].trim();
    if (!label || optionMap.has(value)) continue;
    optionMap.set(value, { value, label });
  }

  return { stem, options: [...optionMap.values()] };
}

function cleanupStem(stem: string): string {
  return stem
    .replace(/^\uFF08?\u591a\u9009\u9898\uFF09?/g, '')
    .replace(/^\(?\u591a\u9009\u9898\)?/g, '')
    .replace(/^\(?\u5355\u9009\u9898\)?/g, '')
    .replace(/^\(?\u5224\u65ad\u9898\)?/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseQuestionBlock(block: RawQuestionBlock): QuizQuestion {
  const { questionBody, answerRaw, analysis } = splitBodyAnswerAnalysis(block.body);
  const { stem, options } = parseOptions(questionBody);
  const question = cleanupStem(stem) || `\u7b2c${block.no}\u9898`;
  const answer = parseAnswerLetters(answerRaw);

  if (!options || options.length < 2) {
    return {
      id: `q_${nanoid(8)}`,
      type: 'short_answer',
      question,
      analysis,
      hasAnswer: false,
      points: 1,
    };
  }

  const isMultipleByHint = /\u591a\u9009\u9898/.test(block.body);
  const isMultipleByAnswer = answer.length > 1;
  return {
    id: `q_${nanoid(8)}`,
    type: isMultipleByHint || isMultipleByAnswer ? 'multiple' : 'single',
    question,
    options,
    answer: answer.length > 0 ? answer : undefined,
    analysis,
    hasAnswer: answer.length > 0,
    points: 1,
  };
}

export function parseQuizFromPdfText(text: string): QuizQuestion[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return splitQuestionBlocks(normalized).map((block) => parseQuestionBlock(block));
}
