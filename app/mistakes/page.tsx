'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/shell/app-shell';
import { readMistakeNotebookEntries, type MistakeNotebookEntry } from '@/lib/quiz/persistence';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';

function toCsv(entries: MistakeNotebookEntry[]): string {
  const header = [
    '\u65f6\u95f4',
    '\u573a\u666fID',
    '\u9898\u76eeID',
    '\u9898\u5e72',
    '\u6211\u7684\u7b54\u6848',
    '\u6b63\u786e\u7b54\u6848',
  ];
  const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
  const rows = entries.map((item) => [
    new Date(item.updatedAt || Date.now()).toLocaleString(),
    item.sceneId,
    item.questionId,
    item.question,
    item.userAnswer || '\u672a\u4f5c\u7b54',
    item.correctAnswer || '\u672a\u63d0\u4f9b',
  ]);
  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
}

export default function MistakesPage() {
  const { isLoggedIn } = useAuthGuard();
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
    a.download = `\u9519\u9898\u672c_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!isLoggedIn) return null;

  return (
    <AppShell
      activeKey="mistakes"
      title={'\u9519\u9898\u672c'}
      description={'\u4e92\u52a8\u7ec3\u4e60\u4e2d\u7684\u9519\u9898\u4f1a\u81ea\u52a8\u8bb0\u5f55\u5728\u8fd9\u91cc\u3002'}
    >
      <div className="toolbar">
        <span className="count">{`\u5171 ${total} \u9053\u9519\u9898`}</span>
        <div className="actions">
          <button className="btn btn-outline" onClick={reload} type="button">
            <RefreshCw className="icon" />
            {'\u5237\u65b0'}
          </button>
          <button
            className="btn btn-primary"
            onClick={downloadNotebook}
            type="button"
            disabled={entries.length === 0}
          >
            <Download className="icon" />
            {'\u4e0b\u8f7d\u9519\u9898\u672c'}
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="empty">{'\u6682\u65e0\u9519\u9898\uff0c\u5b8c\u6210\u7ec3\u4e60\u540e\u4f1a\u81ea\u52a8\u51fa\u73b0\u3002'}</div>
      ) : (
        <div className="list">
          {grouped.map(([sceneId, items]) => (
            <section className="scene-card" key={sceneId}>
              <div className="scene-head">
                <h3>{`\u573a\u666f\uff1a${sceneId}`}</h3>
                <span>{`${items.length} \u9898`}</span>
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
                      <div className="label">{'\u6211\u7684\u7b54\u6848'}</div>
                      <div>{item.userAnswer || '\u672a\u4f5c\u7b54'}</div>
                    </div>
                    <div className="box right">
                      <div className="label">{'\u6b63\u786e\u7b54\u6848'}</div>
                      <div>{item.correctAnswer || '\u672a\u63d0\u4f9b'}</div>
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
