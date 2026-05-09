'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/shell/app-shell';
import { readMistakeNotebookEntries, type MistakeNotebookEntry } from '@/lib/quiz/persistence';

function toCsv(entries: MistakeNotebookEntry[]): string {
  const header = ['时间', '场景ID', '题目ID', '题干', '我的答案', '正确答案'];
  const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
  const rows = entries.map((item) => [
    new Date(item.updatedAt || Date.now()).toLocaleString(),
    item.sceneId,
    item.questionId,
    item.question,
    item.userAnswer || '未作答',
    item.correctAnswer || '未提供',
  ]);
  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
}

export default function MistakesPage() {
  // Keep SSR and first client render identical to avoid hydration mismatch.
  const [entries, setEntries] = useState<MistakeNotebookEntry[]>([]);

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
  const grouped = useMemo(() => {
    const map = new Map<string, MistakeNotebookEntry[]>();
    for (const item of entries) {
      const list = map.get(item.sceneId) || [];
      list.push(item);
      map.set(item.sceneId, list);
    }
    return [...map.entries()];
  }, [entries]);

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

  return (
    <AppShell activeKey="mistakes" title="错题本" description="互动练习中的错题会自动记录在这里。">
      <div className="toolbar">
        <span className="count">共 {total} 道错题</span>
        <div className="actions">
          <button className="btn btn-outline" onClick={reload} type="button">
            <RefreshCw className="icon" />
            刷新
          </button>
          <button
            className="btn btn-primary"
            onClick={downloadNotebook}
            type="button"
            disabled={entries.length === 0}
          >
            <Download className="icon" />
            下载错题本
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="empty">暂无错题，完成练习后会自动出现。</div>
      ) : (
        <div className="list">
          {grouped.map(([sceneId, items]) => (
            <section className="scene-card" key={sceneId}>
              <div className="scene-head">
                <h3>场景：{sceneId}</h3>
                <span>{items.length} 题</span>
              </div>
              {items.map((item) => (
                <article className="item" key={`${item.sceneId}-${item.questionId}`}>
                  <div className="meta">
                    <span>{item.questionId}</span>
                    <span>{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '-'}</span>
                  </div>
                  <p className="question">{item.question}</p>
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
              ))}
            </section>
          ))}
        </div>
      )}

      <style jsx>{`
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          gap: 12px;
        }
        .count {
          color: #334155;
          font-weight: 600;
          font-size: 14px;
        }
        .actions {
          display: flex;
          gap: 8px;
        }
        .btn {
          border: 0;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-outline {
          background: #e2e8f0;
          color: #334155;
        }
        .btn-primary {
          color: #fff;
          background: linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%);
        }
        .icon {
          width: 14px;
          height: 14px;
        }
        .empty {
          background: #fff;
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          padding: 36px 18px;
          text-align: center;
          color: #64748b;
        }
        .list {
          display: grid;
          gap: 14px;
        }
        .scene-card {
          background: #fff;
          border-radius: 14px;
          padding: 16px;
          border: 1px solid #e2e8f0;
        }
        .scene-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .scene-head h3 {
          margin: 0;
          font-size: 15px;
          color: #0f172a;
        }
        .scene-head span {
          color: #64748b;
          font-size: 12px;
        }
        .item {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          margin-top: 10px;
          background: #f8fafc;
        }
        .meta {
          display: flex;
          justify-content: space-between;
          color: #64748b;
          font-size: 12px;
          margin-bottom: 6px;
        }
        .question {
          margin: 0 0 10px;
          color: #1e293b;
          font-size: 14px;
          line-height: 1.6;
        }
        .answer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .box {
          border-radius: 10px;
          padding: 10px;
          font-size: 13px;
        }
        .box .label {
          font-size: 12px;
          margin-bottom: 4px;
          opacity: 0.85;
        }
        .wrong {
          background: #fee2e2;
          border: 1px solid #fca5a5;
          color: #991b1b;
        }
        .right {
          background: #dcfce7;
          border: 1px solid #86efac;
          color: #14532d;
        }
        @media (max-width: 840px) {
          .toolbar {
            flex-direction: column;
            align-items: flex-start;
          }
          .answer-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AppShell>
  );
}
