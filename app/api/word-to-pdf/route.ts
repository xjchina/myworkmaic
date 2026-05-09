import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { apiError } from '@/lib/server/api-response';

export const runtime = 'nodejs';

type CommandResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

function runCommand(command: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function fileExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function resolveSofficeCandidates(): Promise<string[]> {
  const envPath = process.env.LIBREOFFICE_PATH?.trim();
  const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
  const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
  const candidates =
    process.platform === 'win32'
      ? [
          envPath,
          `${programFiles}\\LibreOffice\\program\\soffice.com`,
          'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
          `${programFilesX86}\\LibreOffice\\program\\soffice.com`,
          'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
          'soffice.com',
          'soffice.exe',
          'soffice',
        ]
      : [envPath, 'soffice', 'libreoffice'];

  const result: string[] = [];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const hasSeparator = candidate.includes('/') || candidate.includes('\\');
    if (!hasSeparator) {
      result.push(candidate);
      continue;
    }
    if (await fileExists(candidate)) {
      result.push(candidate);
    }
  }
  return [...new Set(result)];
}

function buildPowerShellWordToPdfScript(inputPath: string, outputPath: string): string {
  const safeInput = inputPath.replace(/'/g, "''");
  const safeOutput = outputPath.replace(/'/g, "''");
  return `
$ErrorActionPreference = 'Stop'
$inputPath = '${safeInput}'
$outputPath = '${safeOutput}'
$word = $null
$doc = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Open($inputPath)
  $doc.SaveAs([ref]$outputPath, [ref]17)
} finally {
  if ($doc -ne $null) {
    try { $doc.Close() } catch {}
  }
  if ($word -ne $null) {
    try { $word.Quit() } catch {}
  }
}
`;
}

async function convertWordComToPdf(inputPath: string, outputPath: string): Promise<void> {
  const script = buildPowerShellWordToPdfScript(inputPath, outputPath);
  const result = await runCommand('powershell', [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    script,
  ]);
  if (result.code !== 0) {
    throw new Error(result.stderr || result.stdout || `PowerShell 退出码 ${result.code ?? 'unknown'}`);
  }
}

async function convertWordToPdf(inputPath: string, outputDir: string): Promise<void> {
  const outputPdfName = getOutputFileName(path.basename(inputPath));
  const outputPath = path.join(outputDir, outputPdfName);
  const candidates = await resolveSofficeCandidates();

  let libreOfficeError = '';
  const args = ['--headless', '--convert-to', 'pdf', '--outdir', outputDir, inputPath];

  if (candidates.length > 0) {
    for (const cmd of candidates) {
      try {
        const result = await runCommand(cmd, args);
        if (result.code === 0 && (await fileExists(outputPath))) return;
        libreOfficeError = result.stderr || result.stdout || `命令退出码 ${result.code ?? 'unknown'}`;
      } catch (error) {
        libreOfficeError = error instanceof Error ? error.message : String(error);
      }
    }
  }

  let wordComError = '';
  if (process.platform === 'win32') {
    try {
      await convertWordComToPdf(inputPath, outputPath);
      if (await fileExists(outputPath)) return;
      wordComError = 'Word COM 已执行但未生成输出 PDF。';
    } catch (error) {
      wordComError = error instanceof Error ? error.message : String(error);
    }
  }

  const checked = candidates.length > 0 ? candidates.join(', ') : '无';
  throw new Error(
    `Word 转 PDF 失败。LibreOffice候选: ${checked}。LibreOffice错误: ${libreOfficeError || '未安装或不可用'}。` +
      `${process.platform === 'win32' ? ` Word导出错误: ${wordComError || '本机未安装 Word 或 COM 不可用'}。` : ''}` +
      ` 你可以安装 LibreOffice 并配置 LIBREOFFICE_PATH。`,
  );
}

function getOutputFileName(sourceName: string): string {
  const ext = path.extname(sourceName).toLowerCase();
  if (ext !== '.doc' && ext !== '.docx') {
    return 'document.pdf';
  }
  const base = path.basename(sourceName, ext);
  return `${base}.pdf`;
}

export async function POST(request: Request) {
  let tempDir = '';
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return apiError('INVALID_REQUEST', 400, '请求格式错误：请使用 multipart/form-data 上传文件。');
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return apiError('MISSING_REQUIRED_FIELD', 400, '未检测到上传文件。');
    }

    const ext = path.extname(file.name).toLowerCase();
    if (ext !== '.doc' && ext !== '.docx') {
      return apiError('INVALID_REQUEST', 400, '仅支持 .doc 或 .docx 文件。');
    }

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openmaic-word-'));
    const safeName = file.name.replace(/[^\w.\-\u4e00-\u9fa5]/g, '_');
    const inputPath = path.join(tempDir, safeName);
    const outputPdfName = getOutputFileName(safeName);
    const outputPath = path.join(tempDir, outputPdfName);

    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(inputPath, Buffer.from(arrayBuffer));

    await convertWordToPdf(inputPath, tempDir);

    if (!(await fileExists(outputPath))) {
      return apiError('INTERNAL_ERROR', 500, '转换完成但未找到输出 PDF 文件。');
    }

    const pdfBuffer = await fs.readFile(outputPath);
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(outputPdfName)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Word 转 PDF 失败',
    );
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
