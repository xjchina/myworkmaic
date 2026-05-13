import type { QuestionResult } from '@/lib/quiz/grading';
import type { QuizQuestion } from '@/lib/types/stage';

/**
 * Quiz state persistence in localStorage, keyed per scene.
 *
 * Three keys coexist with distinct lifecycles:
 *
 *   quizDraft:<sceneId>    — in-progress answers (debounced via useDraftCache),
 *                            cleared at submit time.
 *   quizAnswers:<sceneId>  — answers written once at submit, cleared on retry.
 *   quizResults:<sceneId>  — graded results written once at reviewing, cleared on retry.
 *
 * Both quiz-view (to rehydrate its own state) and the classroom-complete page
 * (to compute aggregate scores) read through this module so the storage
 * schema is a single source of truth.
 */

export const DRAFT_KEY_PREFIX = 'quizDraft:';
export const ANSWERS_KEY_PREFIX = 'quizAnswers:';
export const RESULTS_KEY_PREFIX = 'quizResults:';
export const QUESTIONS_KEY_PREFIX = 'quizQuestions:';
export const UPDATED_AT_KEY_PREFIX = 'quizUpdatedAt:';
export const NOTEBOOK_KEY = 'mistakeNotebook:v1';
export const QUIZ_SESSION_LIST_KEY = 'quizSessions:v1';
export const SCENE_TITLES_KEY = 'sceneTitles:v1';
export const SCENE_SUBJECTS_KEY = 'sceneSubjects:v1';

/** Build the draft cache key for a scene. Use this everywhere that needs the
 *  in-progress quiz answers (e.g. `useDraftCache`) so the prefix stays in
 *  sync with the readers/clearers below. */
export const draftKey = (sceneId: string): string => DRAFT_KEY_PREFIX + sceneId;

export type QuizAnswers = Record<string, string | string[]>;
export type QuizQuestionSnapshot = Pick<QuizQuestion, 'id' | 'question' | 'answer' | 'options' | 'type'>;

export interface MistakeNotebookEntry {
  sceneId: string;
  sceneTitle?: string;
  subject?: string;
  questionId: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  status: 'correct' | 'incorrect';
  updatedAt: number;
  options?: { label: string; value: string }[];
  type?: 'single' | 'multiple' | 'short_answer';
}

export interface QuizSessionRecord {
  id: string;
  sceneId: string;
  sourceName: string;
  summary: string;
  questionCount: number;
  questions: QuizQuestion[];
  createdAt: number;
  updatedAt: number;
}

/**
 * The notebook store now acts as a **deny-list** (removed keys) rather than
 * a full data replica.  This avoids the stale-data problem where
 * writeMistakeNotebookEntriesForScene() would re-insert deleted entries on
 * every re-grade.
 *
 *   removedKeys  – Set of "sceneId::questionId" strings the user explicitly deleted.
 */
interface MistakeNotebookStore {
  removedKeys: string[];
}

export type SubmittedState =
  | { kind: 'reviewing'; answers: QuizAnswers; results: QuestionResult[] }
  | { kind: 'answering'; answers: QuizAnswers }
  | null;

function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore quota / disabled storage
  }
}

function safeRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function normalizeAnswer(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value.join(', ') : value;
}

function readNotebookStore(): MistakeNotebookStore {
  const raw = safeGet(NOTEBOOK_KEY);
  if (!raw) return { removedKeys: [] };
  try {
    const parsed = JSON.parse(raw) as MistakeNotebookStore;
    if (!Array.isArray(parsed.removedKeys)) return { removedKeys: [] };
    return {
      // Keep only valid "sceneId::questionId" strings
      removedKeys: parsed.removedKeys.filter(
        (k) => typeof k === 'string' && k.includes('::'),
      ),
    };
  } catch {
    return { removedKeys: [] };
  }
}

function writeNotebookStore(store: MistakeNotebookStore): void {
  safeSet(NOTEBOOK_KEY, JSON.stringify(store));
}

// ─── Scene title helpers ──────────────────────────────────────

/** Save a scene's display name (PDF filename) so the mistakes page can show it. */
export function saveSceneTitle(sceneId: string, title: string): void {
  const raw = safeGet(SCENE_TITLES_KEY);
  let map: Record<string, string> = {};
  if (raw) {
    try { map = JSON.parse(raw); } catch { /* ignore */ }
  }
  // Only update if changed or missing to avoid unnecessary writes
  if (map[sceneId] !== title) {
    map[sceneId] = title;
    safeSet(SCENE_TITLES_KEY, JSON.stringify(map));
  }
}

/** Read a scene's display name from the stored mapping. */
export function getSceneTitle(sceneId: string): string | null {
  const raw = safeGet(SCENE_TITLES_KEY);
  if (!raw) return null;
  try {
    const map = JSON.parse(raw) as Record<string, string>;
    return map[sceneId] || null;
  } catch {
    return null;
  }
}

/** Read the full scene title mapping. */
export function getSceneTitleMap(): Record<string, string> {
  const raw = safeGet(SCENE_TITLES_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

// ─── Subject helpers ──────────────────────────────────────────

/** Save or change the subject for a scene (e.g. "数学", "英语"). */
export function saveSceneSubject(sceneId: string, subject: string): void {
  const raw = safeGet(SCENE_SUBJECTS_KEY);
  let map: Record<string, string> = {};
  if (raw) {
    try { map = JSON.parse(raw); } catch { /* ignore */ }
  }
  if (subject) {
    map[sceneId] = subject;
  } else {
    delete map[sceneId]; // empty string = clear
  }
  safeSet(SCENE_SUBJECTS_KEY, JSON.stringify(map));
}

/** Read a scene's subject. */
export function getSceneSubject(sceneId: string): string | null {
  const raw = safeGet(SCENE_SUBJECTS_KEY);
  if (!raw) return null;
  try {
    const map = JSON.parse(raw) as Record<string, string>;
    return map[sceneId] || null;
  } catch {
    return null;
  }
}

/** Read the full subject mapping. */
export function getSceneSubjectMap(): Record<string, string> {
  const raw = safeGet(SCENE_SUBJECTS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

/** Read quiz-view's post-submit state: answers + optional graded results. */
export function readSubmittedState(sceneId: string): SubmittedState {
  const rawA = safeGet(ANSWERS_KEY_PREFIX + sceneId);
  if (!rawA) return null;
  try {
    const answers = JSON.parse(rawA) as QuizAnswers;
    const rawR = safeGet(RESULTS_KEY_PREFIX + sceneId);
    if (rawR) {
      const results = JSON.parse(rawR) as QuestionResult[];
      if (Array.isArray(results) && results.length > 0) {
        return { kind: 'reviewing', answers, results };
      }
    }
    return { kind: 'answering', answers };
  } catch {
    return null;
  }
}

/**
 * Convenience reader for the classroom-complete page: returns the submitted
 * answers if present, else falls back to the in-progress draft so a partial
 * attempt still contributes to the aggregate instead of showing 0/N.
 */
export function readAnswersForSummary(sceneId: string): QuizAnswers {
  const rawA = safeGet(ANSWERS_KEY_PREFIX + sceneId);
  if (rawA) {
    try {
      return JSON.parse(rawA) as QuizAnswers;
    } catch {
      /* fall through */
    }
  }
  const rawD = safeGet(DRAFT_KEY_PREFIX + sceneId);
  if (rawD) {
    try {
      return JSON.parse(rawD) as QuizAnswers;
    } catch {
      /* fall through */
    }
  }
  return {};
}

/** Called by quiz-view at submit time. */
export function writeSubmittedAnswers(sceneId: string, answers: QuizAnswers): void {
  safeSet(ANSWERS_KEY_PREFIX + sceneId, JSON.stringify(answers));
  safeSet(UPDATED_AT_KEY_PREFIX + sceneId, String(Date.now()));
}

/** Called by quiz-view when grading transitions to reviewing. */
export function writeSubmittedResults(sceneId: string, results: QuestionResult[]): void {
  safeSet(RESULTS_KEY_PREFIX + sceneId, JSON.stringify(results));
  safeSet(UPDATED_AT_KEY_PREFIX + sceneId, String(Date.now()));
}

export function writeQuizQuestions(sceneId: string, questions: QuizQuestion[]): void {
  const snapshot: QuizQuestionSnapshot[] = questions.map((q) => ({
    id: q.id,
    question: q.question,
    answer: q.answer,
    options: q.options,
    type: q.type,
  }));
  safeSet(QUESTIONS_KEY_PREFIX + sceneId, JSON.stringify(snapshot));
}

export function readQuizQuestions(sceneId: string): QuizQuestionSnapshot[] {
  const raw = safeGet(QUESTIONS_KEY_PREFIX + sceneId);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as QuizQuestionSnapshot[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function readMistakeNotebookEntries(): MistakeNotebookEntry[] {
  if (typeof window === 'undefined') return [];
  const entries: MistakeNotebookEntry[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(RESULTS_KEY_PREFIX)) continue;
    const sceneId = key.slice(RESULTS_KEY_PREFIX.length);

    const rawResults = safeGet(RESULTS_KEY_PREFIX + sceneId);
    const rawAnswers = safeGet(ANSWERS_KEY_PREFIX + sceneId);
    if (!rawResults || !rawAnswers) continue;

    let results: QuestionResult[] = [];
    let answers: QuizAnswers = {};
    try {
      results = JSON.parse(rawResults) as QuestionResult[];
      answers = JSON.parse(rawAnswers) as QuizAnswers;
    } catch {
      continue;
    }

    const questions = readQuizQuestions(sceneId);
    const questionMap = new Map(questions.map((q) => [q.id, q]));
    const updatedAt = Number(safeGet(UPDATED_AT_KEY_PREFIX + sceneId) || 0);
    const sceneTitle = getSceneTitle(sceneId);
    const sceneSubject = getSceneSubject(sceneId);

    for (const result of results) {
      if (result.status !== 'incorrect') continue;
      const q = questionMap.get(result.questionId);
      const userAnswer = normalizeAnswer(answers[result.questionId]);
      const correctAnswer = normalizeAnswer(q?.answer);

      entries.push({
        sceneId,
        sceneTitle: sceneTitle || undefined,
        subject: sceneSubject || undefined,
        questionId: result.questionId,
        question: q?.question || result.questionId,
        userAnswer,
        correctAnswer,
        status: result.status,
        updatedAt,
        options: q?.options,
        type: q?.type,
      });
    }
  }

  // Exclude entries the user has explicitly removed via the delete UI.
  // The notebook store is a deny-list of "sceneId::questionId" keys.
  const { removedKeys } = readNotebookStore();
  const deletedSet = new Set(removedKeys);

  return entries
    .filter((e) => !deletedSet.has(`${e.sceneId}::${e.questionId}`))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function writeMistakeNotebookEntriesForScene(
  _sceneId: string,
  _answers: QuizAnswers,
  _results: QuestionResult[],
): void {
  // The notebook store is now a deny-list only; we no longer write full
  // entry data here.  The read path builds entries live from quizResults.
}

/** Called by quiz-view on retry: wipes submitted answers + results but keeps draft lifecycle. */
export function clearSubmitted(sceneId: string): void {
  safeRemove(ANSWERS_KEY_PREFIX + sceneId);
  safeRemove(RESULTS_KEY_PREFIX + sceneId);
  safeRemove(UPDATED_AT_KEY_PREFIX + sceneId);
  const store = readNotebookStore();
  const retained = store.removedKeys.filter((k) => !k.startsWith(sceneId + "::"));
  writeNotebookStore({ removedKeys: retained });
}

/** Called by the stage-delete flow: wipes all three keys for a single scene. */
export function clearAllForScene(sceneId: string): void {
  safeRemove(DRAFT_KEY_PREFIX + sceneId);
  safeRemove(ANSWERS_KEY_PREFIX + sceneId);
  safeRemove(RESULTS_KEY_PREFIX + sceneId);
  safeRemove(QUESTIONS_KEY_PREFIX + sceneId);
  safeRemove(UPDATED_AT_KEY_PREFIX + sceneId);
  const store = readNotebookStore();
  const retained = store.removedKeys.filter((k) => !k.startsWith(sceneId + "::"));
  writeNotebookStore({ removedKeys: retained });
}

/** Remove a single mistake entry by adding its key to the deny-list. */
export function removeMistakeEntry(sceneId: string, questionId: string): void {
  const store = readNotebookStore();
  const key = sceneId + "::" + questionId;
  if (!store.removedKeys.includes(key)) {
    writeNotebookStore({ removedKeys: [...store.removedKeys, key] });
  }
}

/** Remove all mistake entries for a given scene by adding keys to deny-list. */
export function removeMistakeEntriesByScene(sceneId: string): void {
  const store = readNotebookStore();
  const prefix = sceneId + "::";
  let next = store.removedKeys.filter((k) => !k.startsWith(prefix));
  const allEntries = readMistakeNotebookEntries();
  for (const e of allEntries) {
    if (e.sceneId === sceneId) {
      const k = e.sceneId + "::" + e.questionId;
      if (!next.includes(k)) next.push(k);
    }
  }
  writeNotebookStore({ removedKeys: next });
}

/** Remove multiple mistake entries at once by adding keys to deny-list. */
export function removeMistakeEntries(entries: { sceneId: string; questionId: string }[]): void {
  const store = readNotebookStore();
  const existing = new Set(store.removedKeys);
  const added: string[] = [];
  for (const e of entries) {
    const k = e.sceneId + "::" + e.questionId;
    if (!existing.has(k)) { added.push(k); existing.add(k); }
  }
  if (added.length > 0) {
    writeNotebookStore({ removedKeys: [...store.removedKeys, ...added] });
  }
}

/** Clear the entire mistake notebook (resets deny-list so everything shows again). */
export function clearAllMistakeEntries(): void {
  writeNotebookStore({ removedKeys: [] });
}

function isQuizQuestionLike(value: unknown): value is QuizQuestion {
  if (!value || typeof value !== 'object') return false;
  const q = value as QuizQuestion;
  return typeof q.id === 'string' && typeof q.question === 'string' && typeof q.type === 'string';
}

function isQuizSessionRecordLike(value: unknown): value is QuizSessionRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as QuizSessionRecord;
  return (
    typeof record.id === 'string' &&
    typeof record.sceneId === 'string' &&
    typeof record.sourceName === 'string' &&
    typeof record.summary === 'string' &&
    typeof record.questionCount === 'number' &&
    Array.isArray(record.questions) &&
    record.questions.every(isQuizQuestionLike) &&
    typeof record.createdAt === 'number' &&
    typeof record.updatedAt === 'number'
  );
}

export function readQuizSessions(): QuizSessionRecord[] {
  const raw = safeGet(QUIZ_SESSION_LIST_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isQuizSessionRecordLike)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveQuizSession(
  input: Omit<QuizSessionRecord, 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
  },
): QuizSessionRecord[] {
  const now = Date.now();
  const list = readQuizSessions();
  const existing = list.find((item) => item.id === input.id);

  const nextItem: QuizSessionRecord = {
    id: input.id,
    sceneId: input.sceneId,
    sourceName: input.sourceName,
    summary: input.summary,
    questionCount: input.questionCount,
    questions: input.questions,
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };

  const retained = list.filter((item) => item.id !== input.id);
  const next = [nextItem, ...retained].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30);
  safeSet(QUIZ_SESSION_LIST_KEY, JSON.stringify(next));
  return next;
}

export function removeQuizSession(id: string): QuizSessionRecord[] {
  const list = readQuizSessions();
  const next = list.filter((item) => item.id !== id);
  safeSet(QUIZ_SESSION_LIST_KEY, JSON.stringify(next));
  return next;
}
