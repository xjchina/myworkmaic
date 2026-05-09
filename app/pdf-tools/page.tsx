'use client';

import { useMemo, useState } from 'react';
import { AppShell } from '@/components/shell/app-shell';

function extractFileName(disposition: string | null): string {
  if (!disposition) return 'converted.pdf';
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const plainMatch = disposition.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] || 'converted.pdf';
}

export default function PdfToolsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const accept = useMemo(
    () =>
      '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    [],
  );

  const handleConvert = async () => {
    if (!file) {
      setError('请先选择 Word 文件。');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/word-to-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || '转换失败，请稍后重试。');
      }

      const blob = await response.blob();
      const fileName = extractFileName(response.headers.get('content-disposition'));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setSuccess(`转换成功，已开始下载：${fileName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '转换失败。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell activeKey="pdf-tools" title="PDF 工具箱" description="仅保留 Word 转 PDF 功能">
      <div className="tool-single-card">
        <div className="tool-icon">📄</div>
        <h3>Word 转 PDF</h3>
        <p>上传 `.doc` 或 `.docx`，一键转换并下载 PDF。</p>
      </div>

      <div className="convert-panel">
        <div className="convert-title">上传 Word 文件</div>
        <label className="upload-box">
          <input
            type="file"
            accept={accept}
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setError('');
              setSuccess('');
            }}
          />
          <span>{file ? `已选择：${file.name}` : '点击选择 Word 文件（.doc / .docx）'}</span>
        </label>

        <button className="convert-btn" type="button" onClick={handleConvert} disabled={loading}>
          {loading ? '转换中...' : '开始转换'}
        </button>

        {error ? <p className="error">{error}</p> : null}
        {success ? <p className="success">{success}</p> : null}
        <p className="hint">提示：服务端依赖 LibreOffice 命令行进行转换。</p>
      </div>

      <style jsx>{`
        .tool-single-card {
          background: #fff;
          border-radius: 18px;
          padding: 28px;
          margin-bottom: 24px;
          border: 2px solid #dbeafe;
        }
        .tool-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: #dbeafe;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin-bottom: 12px;
        }
        h3 {
          margin: 0 0 6px;
          color: #1e3a8a;
          font-size: 20px;
        }
        p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }
        .convert-panel {
          background: #fff;
          border-radius: 20px;
          padding: 28px;
        }
        .convert-title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 14px;
        }
        .upload-box {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px dashed #cbd5e1;
          border-radius: 14px;
          min-height: 140px;
          cursor: pointer;
          background: #f8fafc;
          color: #475569;
          font-size: 14px;
          margin-bottom: 14px;
          text-align: center;
          padding: 8px;
        }
        .upload-box input {
          display: none;
        }
        .convert-btn {
          width: 100%;
          border: none;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
          cursor: pointer;
        }
        .convert-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .hint {
          margin-top: 10px;
          font-size: 12px;
          color: #94a3b8;
          text-align: center;
        }
        .error {
          margin-top: 10px;
          color: #dc2626;
          font-size: 13px;
        }
        .success {
          margin-top: 10px;
          color: #059669;
          font-size: 13px;
        }
      `}</style>
    </AppShell>
  );
}

