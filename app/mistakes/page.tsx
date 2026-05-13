'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Download, RefreshCw, Trash2, Check, AlertTriangle, Plus, X } from 'lucide-react';
import { AppShell } from '@/components/shell/app-shell';
import {
  readMistakeNotebookEntries,
  removeMistakeEntry,
  removeMistakeEntriesByScene,
  removeMistakeEntries,
  clearAllMistakeEntries,
  saveSceneSubject,
  getSceneSubjectMap,
  type MistakeNotebookEntry,
} from '@/lib/quiz/persistence';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';

const COMMON_SUBJECTS = ['数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];

function toCsv(entries: MistakeNotebookEntry[]): string {
  const header = [
    '时间', '场景', '科目', '题目ID', '题干', '我的答案', '正确答案',
  ];
  const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
  const rows = entries.map((item) => [
    new Date(item.updatedAt || Date.now()).toLocaleString(),
    item.sceneTitle || item.sceneId,
    item.subject || '',
    item.questionId,
    item.question,
    item.userAnswer || '未作答',
    item.correctAnswer || '未提供',
  ]);
  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
}

export default function MistakesPage() {
  const { isLoggedIn } = useAuthGuard();
  const [entries, setEntries] = useState<MistakeNotebookEntry[]>([]);
  const [filterSubject, setFilterSubject] = useState<string | null>(null); // null = all
  const [editingSubject, setEditingSubject] = useState<string | null>(null); // sceneId being edited
  const [subjectInput, setSubjectInput] = useState('');
  const subjectInputRef = useRef<HTMLInputElement>(null);

  // Selection state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{
    type: 'single' | 'scene' | 'selected' | 'all' | null;
    label: string;
    onConfirm: () => void;
  } | null>(null);
  // Fade-out animation keys
  const [removingKeys, setRemovingKeys] = useState<Set<string>>(new Set());

  const reload = useCallback(() => {
    setEntries(readMistakeNotebookEntries());
  }, []);

  useEffect(() => {
    const initTimer = window.setTimeout(() => reload(), 0);
    const onFocus = () => reload();
    const onStorage = () => reload();
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearTimeout(initTimer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [reload]);

  const total = entries.length;

  // ─── Subject catalog ────────────────────────────────────────────

  const subjectCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      const s = e.subject || '未分类';
      counts.set(s, (counts.get(s) || 0) + 1);
    }
    return [...counts.entries()].sort(([a], [b]) => {
      if (a === '未分类') return 1;
      if (b === '未分类') return -1;
      return a.localeCompare(b, 'zh');
    });
  }, [entries]);

  // Group entries into a map: sceneId -> { title, subject, items[] }
  const sceneMap = useMemo(() => {
    const map = new Map<string, { title: string; subject: string; items: MistakeNotebookEntry[] }>();
    for (const item of entries) {
      let group = map.get(item.sceneId);
      if (!group) {
        group = { title: item.sceneTitle || item.sceneId, subject: item.subject || '', items: [] };
        map.set(item.sceneId, group);
      }
      group.items.push(item);
    }
    return map;
  }, [entries]);

  // Filtered scene IDs in display order
  const filteredSceneIds = useMemo(() => {
    const ids = [...sceneMap.keys()];
    // If a subject filter is active, only include scenes matching that subject
    if (filterSubject) {
      return ids.filter((id) => {
        const g = sceneMap.get(id)!;
        const entrySubject = g.subject || '未分类';
        return entrySubject === filterSubject;
      });
    }
    return ids;
  }, [sceneMap, filterSubject]);

  // ─── Subject editing ──────────────────────────────────────────

  const openSubjectEditor = (sceneId: string, currentSubject: string) => {
    setEditingSubject(sceneId);
    setSubjectInput(currentSubject);
    setTimeout(() => subjectInputRef.current?.focus(), 50);
  };

  const closeSubjectEditor = () => {
    setEditingSubject(null);
    setSubjectInput('');
  };

  const confirmSubject = (sceneId: string) => {
    const val = subjectInput.trim();
    saveSceneSubject(sceneId, val);
    closeSubjectEditor();
    reload();
  };

  const handleSubjectKeyDown = (e: React.KeyboardEvent, sceneId: string) => {
    if (e.key === 'Enter') confirmSubject(sceneId);
    if (e.key === 'Escape') closeSubjectEditor();
  };

  // ─── Selection helpers ──────────────────────────────────────

  const entryKey = useCallback((item: MistakeNotebookEntry) => `${item.sceneId}::${item.questionId}`, []);

  const toggleSelectItem = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectAllInScene = (sceneId: string, items: MistakeNotebookEntry[]) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      const allSelected = items.every((item) => prev.has(entryKey(item)));
      if (allSelected) {
        items.forEach((item) => next.delete(entryKey(item)));
      } else {
        items.forEach((item) => next.add(entryKey(item)));
      }
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedKeys(new Set());
  };

  // ─── Remove actions ─────────────────────────────────────────

  const doRemoveSingle = useCallback(
    (sceneId: string, questionId: string) => {
      const key = `${sceneId}::${questionId}`;
      setConfirmAction({
        type: 'single',
        label: '确定移除这道错题吗？',
        onConfirm: () => {
          setRemovingKeys((prev) => new Set(prev).add(key));
          setTimeout(() => {
            removeMistakeEntry(sceneId, questionId);
            setRemovingKeys((prev) => { const n = new Set(prev); n.delete(key); return n; });
            setSelectedKeys((prev) => { const n = new Set(prev); n.delete(key); return n; });
            reload();
          }, 280);
          setConfirmAction(null);
        },
      });
    },
    [reload],
  );

  const doRemoveScene = useCallback(
    (sceneId: string) => {
      setConfirmAction({
        type: 'scene',
        label: '确定移除该场景下所有错题吗？',
        onConfirm: () => {
          removeMistakeEntriesByScene(sceneId);
          setSelectedKeys((prev) => {
            const n = new Set(prev);
            for (const k of n) { if (k.startsWith(`${sceneId}::`)) n.delete(k); }
            return n;
          });
          reload();
          setConfirmAction(null);
        },
      });
    },
    [reload],
  );

  const doRemoveSelected = () => {
    const count = selectedKeys.size;
    setConfirmAction({
      type: 'selected',
      label: `确定移除选中的 ${count} 道错题吗？`,
      onConfirm: () => {
        const toRemove = [...selectedKeys].map((k) => {
          const [sceneId, questionId] = k.split('::');
          return { sceneId, questionId };
        });
        removeMistakeEntries(toRemove);
        setSelectedKeys(new Set());
        setSelectMode(false);
        reload();
        setConfirmAction(null);
      },
    });
  };

  const doClearAll = () => {
    setConfirmAction({
      type: 'all',
      label: `确定清空全部 ${total} 道错题吗？此操作不可恢复。`,
      onConfirm: () => {
        clearAllMistakeEntries();
        setEntries([]);
        setSelectedKeys(new Set());
        setSelectMode(false);
        setConfirmAction(null);
      },
    });
  };

  const downloadNotebook = () => {
    if (entries.length === 0) return;
    const csv = toCsv(entries);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `错题本_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!isLoggedIn) return null;

  return (
    <AppShell
      activeKey="mistakes"
      title="错题本"
      description="互动练习中的错题会自动记录在这里。"
    >
      <div className="layout">
        {/* ─── Left sidebar — Subject Catalog ─────────────── */}
        <aside className="sidebar">
          <h4 className="sidebar-title">科目目录</h4>
          <nav className="subject-list">
            <button
              className={`subject-item ${filterSubject === null ? 'subject-active' : ''}`}
              onClick={() => setFilterSubject(null)}
              type="button"
            >
              <span className="subject-name">全部</span>
              <span className="subject-count">{total}</span>
            </button>
            {subjectCounts.map(([subject, count]) => (
              <button
                key={subject}
                className={`subject-item ${filterSubject === subject ? 'subject-active' : ''}`}
                onClick={() => setFilterSubject(subject)}
                type="button"
              >
                <span className="subject-name">{subject}</span>
                <span className="subject-count">{count}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* ─── Right content — Mistakes ───────────────────── */}
        <div className="main-content">
          {/* Toolbar */}
          <div className="toolbar">
            <span className="count">
              {filterSubject
                ? `${filterSubject}（${filteredSceneIds.length} 个场景, 共 ${filteredSceneIds.reduce((s, id) => s + sceneMap.get(id)!.items.length, 0)} 题）`
                : `共 ${total} 道错题`}
            </span>
            <div className="actions">
              {!selectMode ? (
                <>
                  <button className="btn btn-outline btn-select" onClick={() => setSelectMode(true)} type="button" disabled={entries.length === 0}>
                    选择移除
                  </button>
                  <button className="btn btn-outline" onClick={reload} type="button">
                    <RefreshCw className="icon" />
                    刷新
                  </button>
                  <button className="btn btn-primary" onClick={downloadNotebook} type="button" disabled={entries.length === 0}>
                    <Download className="icon" />
                    下载错题本
                  </button>
                </>
              ) : (
                <>
                  <span className="sel-info">已选 <strong>{selectedKeys.size}</strong> / {total}</span>
                  <button className="btn btn-danger" onClick={doRemoveSelected} type="button" disabled={selectedKeys.size === 0}>
                    <Trash2 className="icon" />
                    移除选中 ({selectedKeys.size})
                  </button>
                  <button className="btn btn-ghost" onClick={exitSelectMode} type="button">取消</button>
                </>
              )}
            </div>
          </div>

          {/* Mobile subject pills */}
          <div className="mobile-pills">
            <button
              className={`pill ${filterSubject === null ? 'pill-active' : ''}`}
              onClick={() => setFilterSubject(null)}
              type="button"
            >全部 ({total})</button>
            {subjectCounts.map(([subject, count]) => (
              <button
                key={subject}
                className={`pill ${filterSubject === subject ? 'pill-active' : ''}`}
                onClick={() => setFilterSubject(subject)}
                type="button"
              >{subject} ({count})</button>
            ))}
          </div>

          {/* Clear all */}
          {!selectMode && filteredSceneIds.length > 0 && (
            <div className="clear-all-row">
              <button className="link-danger" onClick={doClearAll} type="button">
                <AlertTriangle className="size-3.5" />
                清空全部错题
              </button>
            </div>
          )}

          {/* Empty state */}
          {entries.length === 0 ? (
            <div className="empty">暂无错题，完成练习后会自动出现。</div>
          ) : filteredSceneIds.length === 0 ? (
            <div className="empty">该分类下暂无错题。</div>
          ) : (
            <div className="list">
              {filteredSceneIds.map((sceneId) => {
                const group = sceneMap.get(sceneId)!;
                const items = group.items;
                const sceneSelectedCount = items.filter((item) => selectedKeys.has(entryKey(item))).length;
                const allSceneSelected = items.length > 0 && sceneSelectedCount === items.length;
                const isEditing = editingSubject === sceneId;

                return (
                  <section className={`scene-card ${removingKeys.has(sceneId + '::') ? 'removing' : ''}`} key={sceneId}>
                    <div className="scene-head">
                      <div className="scene-head-left">
                        {selectMode && (
                          <button
                            className={`checkbox ${allSceneSelected ? 'checked' : ''}`}
                            onClick={() => selectAllInScene(sceneId, items)}
                            title={allSceneSelected ? '取消全选此场景' : '全选此场景'}
                            type="button"
                          >
                            {allSceneSelected && <Check className="size-3.5" />}
                          </button>
                        )}
                        <h3 className="scene-title">{group.title}</h3>
                        {/* Subject tag — click to edit */}
                        {!selectMode && (
                          <div className="subject-tag-wrap">
                            {isEditing ? (
                              <div className="subject-editor">
                                <input
                                  ref={subjectInputRef}
                                  className="subject-input"
                                  value={subjectInput}
                                  onChange={(e) => setSubjectInput(e.target.value)}
                                  onKeyDown={(e) => handleSubjectKeyDown(e, sceneId)}
                                  placeholder="输入科目"
                                  list={`subj-datalist-${sceneId.replace(/[^a-zA-Z0-9]/g, '')}`}
                                />
                                <datalist id={`subj-datalist-${sceneId.replace(/[^a-zA-Z0-9]/g, '')}`}>
                                  {COMMON_SUBJECTS.map((s) => (
                                    <option key={s} value={s} />
                                  ))}
                                </datalist>
                                <button className="subj-btn subj-confirm" onClick={() => confirmSubject(sceneId)} type="button" title="确认">
                                  <Check className="size-3" />
                                </button>
                                <button className="subj-btn subj-cancel" onClick={closeSubjectEditor} type="button" title="取消">
                                  <X className="size-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                className={`subject-tag ${group.subject ? '' : 'subject-untagged'}`}
                                onClick={() => openSubjectEditor(sceneId, group.subject)}
                                type="button"
                                title="点击设置科目"
                              >
                                {group.subject || '+ 科目'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="scene-head-right">
                        <span>{`${items.length} 题`}</span>
                        {!selectMode && (
                          <button className="btn-icon-danger" onClick={() => doRemoveScene(sceneId)} title="移除此场景全部错题" type="button">
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Items */}
                    {items.map((item) => {
                      const key = entryKey(item);
                      const isSelected = selectedKeys.has(key);
                      const isRemoving = removingKeys.has(key);

                      return (
                        <article
                          className={`item ${isSelected ? 'item-selected' : ''} ${isRemoving ? 'item-removing' : ''}`}
                          key={key}
                        >
                          <div className="item-top">
                            <div className="meta">
                              <span>{item.questionId}</span>
                              <span>{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '-'}</span>
                            </div>
                            <div className="item-actions">
                              {selectMode && (
                                <button
                                  className={`checkbox ${isSelected ? 'checked' : ''}`}
                                  onClick={() => toggleSelectItem(key)}
                                  type="button"
                                >
                                  {isSelected && <Check className="size-3.5" />}
                                </button>
                              )}
                              {!selectMode && (
                                <button
                                  className="btn-icon-danger"
                                  onClick={() => doRemoveSingle(item.sceneId, item.questionId)}
                                  title="移除这道错题"
                                  type="button"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="question">{item.question}</p>

                          {/* Options */}
                          {item.options && item.options.length > 0 && (
                            <div className="options-section">
                              {item.options.map((opt) => {
                                const userVals = item.userAnswer
                                  ?.split(/\s*[,，]\s*/)
                                  .map((s) => s.trim())
                                  .filter(Boolean) || [];
                                const correctVals = item.correctAnswer
                                  ?.split(/\s*[,，]\s*/)
                                  .map((s) => s.trim())
                                  .filter(Boolean) || [];
                                const isUserAnswer = userVals.includes(opt.value);
                                const isCorrectAnswer = correctVals.includes(opt.value);
                                const optClass = isCorrectAnswer
                                  ? 'option-correct'
                                  : isUserAnswer && item.status === 'incorrect'
                                    ? 'option-wrong'
                                    : '';
                                return (
                                  <div key={opt.value} className={`option ${optClass}`}>
                                    <span className="option-value">{opt.value}.</span>
                                    <span className="option-label">{opt.label}</span>
                                    {isCorrectAnswer && <span className="opt-badge correct-badge">✓</span>}
                                    {isUserAnswer && !isCorrectAnswer && <span className="opt-badge wrong-badge">✗</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="answer-grid">
                            <div className="box wrong">
                              <div className="label">我的答案</div>
                              <div>{item.userAnswer || '未作答'}</div>
                            </div>
                            <div className="box right">
                              <div className="label">正确答案</div>
                              <div>{item.correctAnswer || '未提供'}</div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="dialog-overlay" onClick={() => setConfirmAction(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-icon-wrap">
              <AlertTriangle className="dialog-icon" />
            </div>
            <h3 className="dialog-title">确认操作</h3>
            <p className="dialog-desc">{confirmAction.label}</p>
            <div className="dialog-actions">
              <button className="btn btn-cancel" onClick={() => setConfirmAction(null)} type="button">
                取消
              </button>
              <button className="btn btn-confirm-danger" onClick={confirmAction.onConfirm} type="button">
                <Trash2 className="icon" />
                确认移除
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* ─── Layout ─────────────────────────────────────── */
        .layout {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        /* ─── Sidebar ─────────────────────────────────────── */
        .sidebar {
          width: 170px;
          flex-shrink: 0;
          background: #fff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 14px;
          position: sticky;
          top: 16px;
        }
        .sidebar-title {
          margin: 0 0 10px;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          padding-bottom: 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        .subject-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .subject-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 7px 10px;
          border-radius: 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 13px;
          font-family: inherit;
          transition: all 0.15s ease;
          width: 100%;
          text-align: left;
          color: #334155;
        }
        .subject-item:hover {
          background: #f8fafc;
        }
        .subject-active {
          background: #eff6ff;
          color: #1d4ed8;
          font-weight: 600;
        }
        .subject-name {
          flex: 1;
        }
        .subject-count {
          font-size: 11px;
          background: #f1f5f9;
          padding: 1px 7px;
          border-radius: 8px;
          color: #64748b;
        }
        .subject-active .subject-count {
          background: #dbeafe;
          color: #1d4ed8;
        }

        /* ─── Main content ───────────────────────────────── */
        .main-content {
          flex: 1;
          min-width: 0;
        }

        /* ─── Mobile pills ───────────────────────────────── */
        .mobile-pills {
          display: none;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .pill {
          padding: 5px 12px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 12px;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .pill-active {
          background: #1d4ed8;
          color: #fff;
          border-color: #1d4ed8;
        }

        /* ─── Toolbar ──────────────────────────────────────── */
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          gap: 12px;
          flex-wrap: wrap;
        }
        .count {
          color: #334155;
          font-weight: 600;
          font-size: 14px;
        }
        .actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .btn {
          border: 0;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 14px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          font-family: inherit;
        }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-outline { background: #e2e8f0; color: #334155; }
        .btn-outline:hover:not(:disabled) { background: #cbd5e1; }
        .btn-primary { color: #fff; background: linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%); }
        .btn-primary:hover:not(:disabled) { box-shadow: 0 2px 8px rgba(29,78,216,0.25); }
        .btn-danger { color: #fff; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); }
        .btn-danger:hover:not(:disabled) { box-shadow: 0 2px 8px rgba(220,38,38,0.25); }
        .btn-ghost { background: #f1f5f9; color: #64748b; }
        .btn-ghost:hover { background: #e2e8f0; }
        .btn-cancel { background: #f1f5f9; color: #64748b; }
        .btn-cancel:hover { background: #e2e8f0; }
        .btn-confirm-danger { color: #fff; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); }
        .btn-confirm-danger:hover { box-shadow: 0 4px 12px rgba(220,38,38,0.3); }
        .btn-select { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #92400e; border: 1px solid #fcd34d; }
        .btn-select:hover:not(:disabled) { background: linear-gradient(135deg, #fde68a, #fcd34d); }
        .icon { width: 14px; height: 14px; }

        .sel-info { font-size: 13px; color: #4f46e5; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
        .clear-all-row { text-align: right; margin-bottom: 10px; }
        .link-danger { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; font-weight: 600; color: #dc2626; background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: background 0.15s; font-family: inherit; }
        .link-danger:hover { background: #fef2f2; }

        /* Empty */
        .empty { background: #fff; border: 1px dashed #cbd5e1; border-radius: 14px; padding: 36px 18px; text-align: center; color: #64748b; }

        /* ─── Scene cards ─────────────────────────────────── */
        .list { display: grid; gap: 14px; }
        .scene-card { background: #fff; border-radius: 14px; padding: 16px; border: 1px solid #e2e8f0; transition: opacity 0.28s ease, transform 0.28s ease; }
        .scene-card.removing { opacity: 0; transform: translateY(-8px); pointer-events: none; }
        .scene-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 8px; }
        .scene-head-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
        .scene-head-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .scene-title { margin: 0; font-size: 15px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* ─── Subject tag ──────────────────────────────────── */
        .subject-tag-wrap { flex-shrink: 0; }
        .subject-tag {
          display: inline-flex;
          align-items: center;
          padding: 2px 9px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .subject-tag:hover { background: #dbeafe; }
        .subject-untagged { background: #f8fafc; color: #94a3b8; border: 1px dashed #cbd5e1; }
        .subject-untagged:hover { background: #f1f5f9; color: #64748b; }

        .subject-editor {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .subject-input {
          width: 100px;
          padding: 3px 8px;
          border-radius: 8px;
          border: 1px solid #93c5fd;
          font-size: 12px;
          outline: none;
          font-family: inherit;
          background: #fff;
        }
        .subj-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 5px;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: all 0.15s;
        }
        .subj-confirm { background: #dbeafe; color: #1d4ed8; }
        .subj-confirm:hover { background: #bfdbfe; }
        .subj-cancel { background: #f1f5f9; color: #64748b; }
        .subj-cancel:hover { background: #e2e8f0; }

        .scene-head span { color: #64748b; font-size: 12px; }

        /* Checkbox */
        .checkbox { width: 20px; height: 20px; border-radius: 6px; border: 2px solid #cbd5e1; background: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s ease; flex-shrink: 0; color: transparent; padding: 0; }
        .checkbox:hover { border-color: #93c5fd; }
        .checkbox.checked { background: #3b82f6; border-color: #3b82f6; color: #fff; }

        /* Item */
        .item { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-top: 10px; background: #f8fafc; transition: all 0.2s ease; }
        .item-selected { border-color: #93c5fd; background: #eff6ff; box-shadow: 0 0 0 1px #bfdbfe; }
        .item-removing { opacity: 0; transform: translateX(16px); pointer-events: none; max-height: 0; overflow: hidden; padding: 0; margin: 0; border: none; }
        .item-top { display: flex; justify-content: space-between; align-items: center; }
        .meta { display: flex; gap: 12px; color: #64748b; font-size: 12px; }
        .item-actions { display: flex; align-items: center; gap: 6px; }
        .question { margin: 6px 0 10px; color: #1e293b; font-size: 14px; line-height: 1.6; }

        /* Options */
        .options-section { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
        .option { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; font-size: 13px; line-height: 1.5; transition: all 0.15s ease; }
        .option-correct { background: #f0fdf4; border-color: #86efac; }
        .option-wrong { background: #fef2f2; border-color: #fca5a5; }
        .option-value { font-weight: 700; color: #475569; flex-shrink: 0; min-width: 18px; }
        .option-label { color: #334155; flex: 1; }
        .opt-badge { font-size: 12px; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 700; }
        .correct-badge { background: #22c55e; color: #fff; }
        .wrong-badge { background: #ef4444; color: #fff; }

        .answer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .box { border-radius: 10px; padding: 10px; font-size: 13px; }
        .box .label { font-size: 12px; margin-bottom: 4px; opacity: 0.85; }
        .wrong { background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; }
        .right { background: #dcfce7; border: 1px solid #86efac; color: #14532d; }

        .btn-icon-danger { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 7px; border: none; background: #fef2f2; color: #dc2626; cursor: pointer; transition: all 0.15s ease; padding: 0; }
        .btn-icon-danger:hover { background: #fee2e2; transform: scale(1.08); }

        /* ─── Confirm Dialog ──────────────────────── */
        .dialog-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(15,23,42,0.45); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; }
        .dialog { background: #fff; border-radius: 18px; padding: 28px 24px; width: 360px; max-width: calc(100vw - 32px); box-shadow: 0 20px 50px rgba(0,0,0,0.18), 0 0 1px rgba(0,0,0,0.1); text-align: center; }
        .dialog-icon-wrap { width: 52px; height: 52px; border-radius: 16px; background: linear-gradient(135deg, #fef3c7, #fecaca); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .dialog-icon { width: 26px; height: 26px; color: #dc2626; }
        .dialog-title { margin: 0 0 6px; font-size: 17px; font-weight: 800; color: #0f172a; }
        .dialog-desc { margin: 0 0 22px; font-size: 14px; color: #64748b; line-height: 1.55; }
        .dialog-actions { display: flex; gap: 10px; justify-content: center; }
        .dialog-actions .btn { min-width: 110px; justify-content: center; }

        /* ─── Responsive ──────────────────────────── */
        @media (max-width: 840px) {
          .sidebar { display: none; }
          .mobile-pills { display: flex; }
          .toolbar { flex-direction: column; align-items: flex-start; }
          .answer-grid { grid-template-columns: 1fr; }
          .actions { width: 100%; }
          .actions .btn { flex: 1; justify-content: center; }
        }
      `}</style>
    </AppShell>
  );
}
