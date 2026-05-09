'use client';

const items = [
  { icon: '🌔', name: '首页', desc: '双模块入口', src: '/' },
  { icon: '🌌', name: '知识宇宙-学科选择', desc: '选择学科', src: '/knowledge-select' },
  { icon: '🎰', name: '知识宇宙-AI对话', desc: '五步梳理', src: '/knowledge-chat' },
  { icon: '📎', name: 'AI互动课堂', desc: '预置教案+上传PDF', src: '/classroom' },
  { icon: '📘', name: '错题本', desc: '统一错题收集', src: '/mistakes' },
  { icon: '🌳', name: '知识树', desc: '成长可视化', src: '/knowledge-tree' },
];

export default function PreviewPage() {
  return (
    <div className="preview-page">
      <h1>📫 AI学习工具 - 页面效果预览</h1>
      <div className="preview-grid">
        {items.map((item) => (
          <div className="preview-item" key={item.src}>
            <div className="preview-label">
              <span>{item.icon}</span>
              <span className="page-name">{item.name}</span>
              <span className="page-desc">{item.desc}</span>
            </div>
            <iframe src={item.src} />
          </div>
        ))}
      </div>
      <style jsx>{`
        .preview-page {
          font-family: 'Noto Sans SC', -apple-system, sans-serif;
          background: #1a202c;
          min-height: 100vh;
          padding: 40px;
          color: white;
        }
        h1 {
          text-align: center;
          margin-bottom: 40px;
          font-size: 28px;
        }
        .preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 30px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .preview-item {
          background: #2d3748;
          border-radius: 16px;
          overflow: hidden;
        }
        .preview-item iframe {
          width: 100%;
          height: 500px;
          border: none;
          display: block;
          background: white;
        }
        .preview-label {
          padding: 16px 20px;
          background: #4a5568;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .page-name {
          font-size: 16px;
        }
        .page-desc {
          font-size: 13px;
          opacity: 0.7;
          margin-left: auto;
        }
      `}</style>
    </div>
  );
}

