'use client';

export type KnowledgeNodeStatus = 'todo' | 'doing' | 'done';
export type KnowledgeNodeSourceMode = 'dialog' | 'form' | 'manual';

export interface KnowledgeTreeNode {
  id: string;
  subject: string;
  chapter: string;
  summary: string;
  keywords: string[];
  status: KnowledgeNodeStatus;
  sourceMode: KnowledgeNodeSourceMode;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'knowledgeTreeNodes:v1';

function normalizeNode(node: KnowledgeTreeNode): KnowledgeTreeNode {
  return {
    ...node,
    subject: String(node.subject || '').trim() || '未分类',
    chapter: String(node.chapter || '').trim() || '未命名章节',
    summary: String(node.summary || '').trim(),
    keywords: Array.isArray(node.keywords)
      ? node.keywords.map((item) => String(item).trim()).filter(Boolean).slice(0, 12)
      : [],
    status: node.status || 'doing',
    sourceMode: node.sourceMode || 'manual',
    createdAt: Number(node.createdAt || Date.now()),
    updatedAt: Number(node.updatedAt || Date.now()),
  };
}

export function readKnowledgeTreeNodes(): KnowledgeTreeNode[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { nodes?: unknown[] };
    if (!parsed || !Array.isArray(parsed.nodes)) return [];
    return parsed.nodes
      .filter((item): item is KnowledgeTreeNode => !!item && typeof item === 'object')
      .map((item) => normalizeNode(item))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function writeKnowledgeTreeNodes(nodes: KnowledgeTreeNode[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes }));
  } catch {
    // ignore quota / privacy mode failures
  }
}

function makeNodeId(subject: string, chapter: string) {
  return `${subject}::${chapter}`.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function upsertKnowledgeTreeNode(input: {
  subject: string;
  chapter: string;
  summary: string;
  keywords?: string[];
  status?: KnowledgeNodeStatus;
  sourceMode?: KnowledgeNodeSourceMode;
}) {
  const now = Date.now();
  const subject = String(input.subject || '').trim() || '未分类';
  const chapter = String(input.chapter || '').trim() || '未命名章节';
  const id = makeNodeId(subject, chapter);
  const nodes = readKnowledgeTreeNodes();
  const idx = nodes.findIndex((node) => node.id === id);

  if (idx >= 0) {
    const prev = nodes[idx];
    const mergedKeywords = Array.from(
      new Set([...(prev.keywords || []), ...((input.keywords || []).map((item) => item.trim()))]),
    )
      .filter(Boolean)
      .slice(0, 12);

    nodes[idx] = normalizeNode({
      ...prev,
      summary: input.summary || prev.summary,
      keywords: mergedKeywords,
      status: input.status || prev.status,
      sourceMode: input.sourceMode || prev.sourceMode,
      updatedAt: now,
    });
  } else {
    nodes.unshift(
      normalizeNode({
        id,
        subject,
        chapter,
        summary: input.summary,
        keywords: input.keywords || [],
        status: input.status || 'doing',
        sourceMode: input.sourceMode || 'manual',
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  writeKnowledgeTreeNodes(nodes);
  return nodes;
}

export function updateKnowledgeTreeNodeStatus(id: string, status: KnowledgeNodeStatus) {
  const nodes = readKnowledgeTreeNodes();
  const next = nodes.map((node) =>
    node.id === id
      ? normalizeNode({
          ...node,
          status,
          updatedAt: Date.now(),
        })
      : node,
  );
  writeKnowledgeTreeNodes(next);
  return next;
}

export function removeKnowledgeTreeNode(id: string) {
  const next = readKnowledgeTreeNodes().filter((node) => node.id !== id);
  writeKnowledgeTreeNodes(next);
  return next;
}

export function extractKeywordsFromText(text: string): string[] {
  const normalized = String(text || '')
    .replace(/[，。；、|/]/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return [];
  return Array.from(
    new Set(
      normalized
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0 && item.length <= 24),
    ),
  ).slice(0, 8);
}

