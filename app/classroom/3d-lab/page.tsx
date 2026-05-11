'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { AppShell } from '@/components/shell/app-shell';
import { ThreeScene } from '@/components/three-lab/three-scene';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';
import { PRESET_3D_SCENES } from '@/lib/three/preset-model-registry';

export default function Classroom3DLabPage() {
  const { isLoggedIn } = useAuthGuard();
  const [activeId, setActiveId] = useState<string>(PRESET_3D_SCENES[0]?.id ?? '');
  const [resetSignal, setResetSignal] = useState(0);

  const activePreset = useMemo(
    () => PRESET_3D_SCENES.find((item) => item.id === activeId) ?? PRESET_3D_SCENES[0],
    [activeId],
  );

  if (!isLoggedIn) return null;
  if (!activePreset) return null;

  return (
    <AppShell
      activeKey="classroom"
      title="3D实验"
      description="使用内置 3D 示例模型进行互动学习（旋转、缩放、平移与视角重置）。"
      actions={
        <Link href="/classroom" className="btn btn-outline">
          返回教案课堂
        </Link>
      }
    >
      <div className="lab-layout">
        <aside className="preset-panel">
          <h3>示例模型</h3>
          <div className="preset-list">
            {PRESET_3D_SCENES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`preset-item ${item.id === activePreset.id ? 'active' : ''}`}
                onClick={() => setActiveId(item.id)}
              >
                <div className="name">{item.name}</div>
                <p>{item.description}</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="viewer-panel">
          <div className="viewer-head">
            <div>
              <h2>{activePreset.name}</h2>
              <p>{activePreset.description}</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setResetSignal((n) => n + 1)}>
              <RotateCcw size={15} />
              重置视角
            </button>
          </div>
          <div className="viewer-host">
            <ThreeScene preset={activePreset} resetSignal={resetSignal} />
          </div>
          <div className="viewer-hint">
            操作提示：鼠标左键旋转、滚轮缩放、右键平移；移动端可双指缩放和拖拽。
          </div>
        </section>
      </div>

      <style jsx>{`
        .btn {
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .btn-outline {
          background: white;
          color: #4a5568;
          border: 2px solid #e2e8f0;
        }
        .btn-primary {
          background: linear-gradient(135deg, #2563eb 0%, #4338ca 100%);
          color: white;
        }
        .lab-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 16px;
        }
        .preset-panel,
        .viewer-panel {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }
        .preset-panel {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 76vh;
        }
        .preset-panel h3 {
          margin: 0;
          font-size: 16px;
          color: #0f172a;
        }
        .preset-list {
          display: grid;
          gap: 10px;
          overflow: auto;
          padding-right: 4px;
        }
        .preset-item {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
          text-align: left;
          padding: 12px;
          cursor: pointer;
        }
        .preset-item.active {
          border-color: #3b82f6;
          background: #eff6ff;
        }
        .preset-item .name {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .preset-item p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }
        .viewer-panel {
          padding: 16px;
          display: flex;
          flex-direction: column;
          min-height: 76vh;
        }
        .viewer-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .viewer-head h2 {
          margin: 0;
          font-size: 20px;
          color: #0f172a;
        }
        .viewer-head p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 13px;
        }
        .viewer-host {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          min-height: 64vh;
          background: #f8fafc;
        }
        :global(.three-host) {
          width: 100%;
          min-height: 64vh;
          height: 100%;
        }
        .viewer-hint {
          margin-top: 10px;
          font-size: 12px;
          color: #64748b;
        }
        @media (max-width: 1080px) {
          .lab-layout {
            grid-template-columns: 1fr;
          }
          .preset-panel,
          .viewer-panel {
            min-height: auto;
          }
          .viewer-host,
          :global(.three-host) {
            min-height: 54vh;
          }
        }
      `}</style>
    </AppShell>
  );
}
