import { nanoid } from 'nanoid';
import type { QuizOption, QuizQuestion } from '@/lib/types/stage';

type RawQuestionBlock = {
  no: number;
  body: string;
};

const QUESTION_START_RE =
  /(?:^|[\n\u3002\uFF1B;:\uFF1A\uFF1F?!\.\uFF0E])\s*(?:\u7b2c\s*(\d{1,3})\s*\u9898|(\d{1,3})\s*[\.\uFF0E\u3001])\s*/g;
const OPTION_SEP = '[.．、:：)）]';
const OPTION_RE =
  new RegExp('(?:^|\\s)([A-Ha-h])\\s*' + OPTION_SEP + '\\s*([\\s\\S]*?)(?=(?:\\s+[A-Ha-h]\\s*' + OPTION_SEP + '\\s*)|$)', 'g');
const ANSWER_MARK_RE = /(?:\u3010\s*\u7b54\u6848\s*\u3011|\u7b54\u6848\s*[:\uFF1A])/;
const ANALYSIS_MARK_RE = /(?:\u3010\s*\u89e3\u6790\s*\u3011|\u89e3\u6790\s*[:\uFF1A])/;
const SHORT_ANSWER_FALLBACK_RE = /\u6545\u9009\s*[:\uFF1A]?\s*([A-Ha-h]{1,8})/;
const PRIVATE_USE_GLYPH_RE = /[\uF000-\uF8FF]/g;

// ─── MinerU (Markdown + LaTeX) preprocessing ─────────────────────────────────

/**
 * Preprocess MinerU output: Markdown with LaTeX formulas.
 * MinerU outputs $...$ for inline math and $$...$$ for display math.
 * The quiz parser needs clean text with LaTeX preserved for rendering.
 */
function preprocessMinerUText(text: string): string {
  let out = text;

  // Strip Markdown image syntax: ![xxx](path) → (image removed)
  // These are inline image references that MinerU embeds
  out = out.replace(/!\[[^\]]*\]\([^)]+\)/g, '');

  // Clean up Markdown headers that MinerU may add
  out = out.replace(/^#{1,6}\s+/gm, '');

  // Normalize line breaks around $$...$$ display math blocks (complete blocks only)
  // Avoid adding newlines inside the block which would break KaTeX parsing
  out = out.replace(/([^\n])\s*(\$\$[\s\S]*?\$\$)\s*([^\n])/g, '$1\n\n$2\n\n$3');
  // Handle $$ at start of line with no preceding char
  out = out.replace(/^(\$\$[\s\S]*?\$\$)\s*([^\n])/gm, '$1\n\n$2');

  // Remove excessive blank lines
  out = out.replace(/\n{3,}/g, '\n\n');

  return out.trim();
}

// ─── unpdf (PUA-mojibake) preprocessing ───────────────────────────────────────

function normalizeMojibake(text: string): string {
  let out = text;
  // Keep replacements strict to avoid accidental broad matches.
  out = out.replaceAll('鈮�', '>=');
  out = out.replaceAll('鈮?', '<=');
  out = out.replaceAll('鈭�', '∈');
  out = out.replaceAll('锛屻€�', '，');
  out = out.replaceAll('鈥�', '-');
  out = out.replaceAll('锛�', '。');
  return out;
}

function restoreMathText(text: string): string {
  let fixed = normalizeMojibake(text);
  const COMPARE = '(?:[<>]=?|[≥≤])';

  // Decode common malformed glyphs emitted by PDF extractors.
  fixed = fixed
    .replace(/\uF0F4\uF0E4+/g, '|}')
    .replace(/\uF0F4/g, '|')
    .replace(/\uF0F6/g, ')')
    .replace(/[\uF0E4\uF0EE]/g, '')
    .replace(PRIVATE_USE_GLYPH_RE, ' ');

  // Recover set-builder notation in common corrupted forms.
  fixed = fixed.replace(
    /\b([A-Z])\s*=\s*x\s*,\s*y\s*y\s*=\s*([^\n，；。]+?)\s*\|\s*}/g,
    (_m, setName: string, expr: string) => `${setName} = {(x, y) | y = ${String(expr).trim()}}`,
  );
  fixed = fixed.replace(
    /\b([A-Z])\s*=\s*([a-z])\s+([a-z])\s*=\s*([^\n，；。]+?)\s*}/g,
    (_m, setName: string, variable: string, condVar: string, expr: string) =>
      `${setName} = {${variable} | ${condVar} = ${String(expr).trim()}}`,
  );
  fixed = fixed.replace(
    /\b([A-Z])\s*=\s*([a-z])\s+\2\s*=\s*\|\s*([^\n，；。]+?)(?=\s*[，；。]|\s+[A-Z]\s*=|$)/g,
    (_m, setName: string, variable: string, expr: string) =>
      `${setName} = {${variable} | ${variable} = ${String(expr).trim()}}`,
  );
  fixed = fixed.replace(
    new RegExp(
      String.raw`\b([A-Z])\s*=\s*([a-z])\s+\2\s*=\s*([^\n，；。]+?)\s*}`,
      'g',
    ),
    (_m, setName: string, variable: string, expr: string) =>
      `${setName} = {${variable} | ${variable} = ${String(expr).trim()}}`,
  );
  fixed = fixed.replace(
    new RegExp(
      String.raw`\b([A-Z])\s*=\s*([a-z])\s+\2\s*\|\s*(${COMPARE}\s*[^\n，；。]+?)(?=\s*[，；。]|\s+[A-Z]\s*=|$)`,
      'g',
    ),
    (_m, setName: string, variable: string, expr: string) =>
      `${setName} = {${variable} | ${variable} ${String(expr).trim()}}`,
  );
  fixed = fixed.replace(
    new RegExp(
      String.raw`\b([A-Z])\s*=\s*([a-z])\s+\2\s*(${COMPARE}\s*[^\n，；。]+?)\s*}`,
      'g',
    ),
    (_m, setName: string, variable: string, expr: string) =>
      `${setName} = {${variable} | ${variable} ${String(expr).trim()}}`,
  );
  fixed = fixed.replace(
    /\b([A-Z])\s*=\s*([a-z])\s*=\s*([^\n，；。]+?)\s*(?:}|(?=\s*[，；。]|$))/g,
    (_m, setName: string, variable: string, expr: string) =>
      `${setName} = {${variable} = ${String(expr).trim()}}`,
  );

  // Recover superscript lost during extraction: x2 -> x^2.
  // Keep "x 4 < x < 5" untouched.
  fixed = fixed.replace(/\b([a-zA-Z])([2-9])(?=\s*[+\-*/=，；。)\]\}>\s]|$)/g, '$1^$2');

  // Remove orphan pipes and extra braces.
  fixed = fixed.replace(/\|\s*}/g, '}');
  fixed = fixed.replace(/\|\s*([，；。])/g, '$1');
  fixed = fixed.replace(/\|\s*([<>]=?)/g, ' $1');
  fixed = fixed.replace(/\s+\|\s+([<>]=?)/g, ' $1');
  fixed = fixed.replace(/(^|[，；。])\s*}+\s*/g, '$1 ');
  fixed = fixed.replace(/}}/g, '}');
  fixed = fixed.replace(/^\s*[}|]+\s*/g, '');

  // Balance braces.
  const openCount = (fixed.match(/{/g) || []).length;
  const closeCount = (fixed.match(/}/g) || []).length;
  if (openCount > closeCount) {
    fixed += '}'.repeat(openCount - closeCount);
  }

  return fixed;
}

function restoreDescriptionSetNotation(text: string): string {
  // x ∈ N x > 5 -> {x | x ∈ N, x > 5}
  return text
    .replace(
    /\b([a-zA-Z])\s*∈\s*([A-Za-z]+)\s+([a-zA-Z])\s*([<>]=?|=)\s*(-?\d+(?:\.\d+)?)/g,
    (_m, v1: string, universe: string, v2: string, op: string, num: string) => {
      if (v1 !== v2) return `${v1} ∈ ${universe} ${v2} ${op} ${num}`;
      return `{${v1} | ${v1} ∈ ${universe}, ${v1} ${op} ${num}}`;
    },
    )
    .replace(
      /\b([a-zA-Z])\s+(-?\d+(?:\.\d+)?)\s*<\s*\1\s*<\s*(-?\d+(?:\.\d+)?)\s*}/g,
      (_m, v: string, left: string, right: string) => `{${v} | ${left} < ${v} < ${right}}`,
    );
}

// ─── Shared cleanup ────────────────────────────────────────────────────────────

/**
 * Lightweight cleanup for MinerU text — preserves LaTeX intact.
 * Only normalizes whitespace and zero-width chars.
 */
function cleanupMinerUText(text: string): string {
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s*([，。；])\s*/g, '$1 ')
    .trim();
}

function cleanupGeneralText(text: string): string {
  return restoreDescriptionSetNotation(restoreMathText(text))
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*([，。；])\s*/g, '$1 ')
    .trim();
}

function cleanupAnalysisText(text: string): string {
  let out = cleanupGeneralText(text);

  // Q = y y = x^2 + 1| >= 1 = y y| >= 1
  // -> Q = {y | y = x^2 + 1} = {y | y >= 1}
  out = out.replace(
    /\b([A-Z])\s*=\s*([a-z])\s+\2\s*=\s*([^，。；]+?)\|\s*([<>]=?|[≥≤])\s*([^=，。；]+?)\s*=\s*\2\s+\2\s*\|\s*\4\s*([^，。；]+?)(?=[，。；]|$)/g,
    (_m, setName: string, v: string, expr: string, op: string, lhsVal: string, rhsVal: string) =>
      `${setName} = {${v} | ${v} = ${String(expr).trim()}} = {${v} | ${v} ${op} ${String(rhsVal || lhsVal).trim()}}`,
  );

  // Q = y y = ...  -> Q = {y | y = ...}
  out = out.replace(
    /\b([A-Z])\s*=\s*([a-z])\s+\2\s*=\s*([^，。；]+?)(?=[，。；]|$)/g,
    (_m, setName: string, v: string, expr: string) =>
      `${setName} = {${v} | ${v} = ${String(expr).trim()}}`,
  );

  // G = x x >= 1  -> G = {x | x >= 1}
  out = out.replace(
    /\b([A-Z])\s*=\s*([a-z])\s+\2\s*([<>]=?|[≥≤])\s*([^，。；]+?)(?=[，。；]|$)/g,
    (_m, setName: string, v: string, op: string, rhs: string) =>
      `${setName} = {${v} | ${v} ${op} ${String(rhs).trim()}}`,
  );

  // {y = x^2 + 1 是单元素集} -> {y = x^2 + 1} 是单元素集
  out = out.replace(
    /\{\s*([a-z])\s*=\s*([^{}]+?)\s*是单元素集\s*\}/g,
    (_m, v: string, expr: string) => `{${v} = ${String(expr).trim()}} 是单元素集`,
  );

  // {y | y = x^2 + 1 >= 1 = {y | y >= 1} -> {y | y >= 1}
  out = out.replace(
    /\{\s*([a-z])\s*\|\s*\1\s*=\s*[^{}]*?[<>]=?\s*[^=，；。{}]*\s*=\s*\{\s*\1\s*\|\s*\1\s*([<>]=?\s*[^{}]+?)\s*\}\s*}?/g,
    (_m, v: string, cond: string) => `{${v} | ${v} ${String(cond).trim()}}`,
  );

  // A = x x - 1 = 0}  -> A = {x | x - 1 = 0}
  out = out.replace(
    /\b([A-Z])\s*=\s*([a-z])\s+\2\s*([+\-*/]?\s*[^，。；{}]+?=\s*[^，。；{}]+?)\s*}/g,
    (_m, setName: string, v: string, cond: string) =>
      `${setName} = {${v} | ${v} ${String(cond).trim()}}`,
  );

  out = out.replace(/\s*【技巧总结】[\s\S]*$/, '');
  out = out.replace(/\s*\.\s*∴/g, '。 ∴');
  out = out.replace(/故选[:：]?\s*([A-H]+)\.*/g, '故选：$1。');
  out = out.replace(/\s+\./g, '.');
  out = out.replace(/\s{2,}/g, ' ').trim();
  return out;
}

/**
 * Lightweight analysis cleanup for MinerU text — preserves LaTeX intact.
 */
function cleanupMinerUAnalysisText(text: string): string {
  let out = cleanupMinerUText(text);
  out = out.replace(/\s*【技巧总结】[\s\S]*$/, '');
  out = out.replace(/故选[:：]?\s*([A-H]+)\.*/g, '故选：$1。');
  out = out.replace(/\s{2,}/g, ' ').trim();
  return out;
}

// ─── Normalization entry points ───────────────────────────────────────────────

/**
 * Normalize text from MinerU output (Markdown + LaTeX).
 * LaTeX formulas ($...$ and $$...$$) are preserved as-is.
 */
function normalizeMinerUText(text: string): string {
  const preprocessed = preprocessMinerUText(text);
  return cleanupMinerUText(preprocessed);
}

/**
 * Normalize text from unpdf output (PUA-mojibake).
 * Applies PUA patching and set-notation recovery heuristics.
 */
function normalizeUnpdfText(text: string): string {
  return cleanupGeneralText(text)
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Question block splitting ─────────────────────────────────────────────────

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

// ─── Option parsing ──────────────────────────────────────────────────────────

function parseOptions(
  questionBody: string,
  isMinerU: boolean,
): { stem: string; options?: QuizOption[] } {
  const matches = [...questionBody.matchAll(OPTION_RE)];
  if (matches.length < 2) return { stem: questionBody.trim(), options: undefined };

  const stemEnd = matches[0].index ?? 0;
  const stem = questionBody.slice(0, stemEnd).trim();

  const optionMap = new Map<string, QuizOption>();
  for (const match of matches) {
    const value = match[1].toUpperCase();
    const rawLabel = match[2].trim();
    // MinerU: preserve LaTeX in option labels; unpdf: apply PUA cleanup
    const label = isMinerU ? cleanupMinerUText(rawLabel) : cleanupGeneralText(rawLabel);
    if (!label || optionMap.has(value)) continue;
    optionMap.set(value, { value, label });
  }

  return { stem, options: [...optionMap.values()] };
}

// ─── Stem cleanup ────────────────────────────────────────────────────────────

function cleanupStem(stem: string, isMinerU: boolean): string {
  const base = isMinerU ? cleanupMinerUText(stem) : cleanupGeneralText(stem);
  return base
    .replace(/^\uFF08?\u591A\u9009\u9898\uFF09?/g, '')
    .replace(/^\(?\u591A\u9009\u9898\)?/g, '')
    .replace(/^\(?\u5355\u9009\u9898\)?/g, '')
    .replace(/^\(?\u5224\u65AD\u9898\)?/g, '')
    .replace(/\(\s*\)\s*\d+\s*[\.\uFF0E\u3001]?\s*$/g, '( )')
    .replace(/\(\s*\)\s*$/g, '( )')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─── Question block parsing ───────────────────────────────────────────────────

function parseQuestionBlock(block: RawQuestionBlock, isMinerU: boolean): QuizQuestion {
  const { questionBody, answerRaw, analysis } = splitBodyAnswerAnalysis(block.body);
  const { stem, options } = parseOptions(questionBody, isMinerU);
  const question = cleanupStem(stem, isMinerU) || `第${block.no}题`;
  const answer = parseAnswerLetters(answerRaw);

  const cleanupAnalysis = isMinerU ? cleanupMinerUAnalysisText : cleanupAnalysisText;

  if (!options || options.length < 2) {
    return {
      id: `q_${nanoid(8)}`,
      type: 'short_answer',
      question,
      analysis: analysis ? cleanupAnalysis(analysis) : undefined,
      hasAnswer: false,
      points: 1,
    };
  }

  const isMultipleByHint = /\u591A\u9009\u9898/.test(block.body);
  const isMultipleByAnswer = answer.length > 1;
  return {
    id: `q_${nanoid(8)}`,
    type: isMultipleByHint || isMultipleByAnswer ? 'multiple' : 'single',
    question,
    options,
    answer: answer.length > 0 ? answer : undefined,
    analysis: analysis ? cleanupAnalysis(analysis) : undefined,
    hasAnswer: answer.length > 0,
    points: 1,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse quiz questions from PDF-extracted text.
 *
 * @param text - Raw text extracted from PDF
 * @param parser - Which parser produced this text: 'mineru' or 'mineru-cloud'
 *   uses LaTeX-preserved preprocessing; anything else (including 'unpdf')
 *   uses PUA-mojibake patching.
 */
export function parseQuizFromPdfText(text: string, parser?: string): QuizQuestion[] {
  const isMinerU = parser === 'mineru' || parser === 'mineru-cloud';
  const normalized = isMinerU ? normalizeMinerUText(text) : normalizeUnpdfText(text);
  if (!normalized) return [];
  return splitQuestionBlocks(normalized).map((block) => parseQuestionBlock(block, isMinerU));
}
