import { NextRequest } from 'next/server';
import { parsePDF } from '@/lib/pdf/pdf-providers';
import { resolvePDFApiKey, resolvePDFBaseUrl } from '@/lib/server/provider-config';
import type { PDFProviderId } from '@/lib/pdf/types';
import type { ParsedPdfContent } from '@/lib/types/pdf';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { validateUrlForSSRF } from '@/lib/server/ssrf-guard';
import { getAuthUserId } from '@/lib/server/auth';
import { consumeUsageWithTransaction } from '@/lib/server/subscription';
import { checkCombinedCompliance } from '@/lib/server/content-compliance';
const log = createLogger('Parse PDF');

const EMBEDDED_MINERU_TOKEN =
  'eyJ0eXBlIjoiSldUIiwiYWxnIjoiSFM1MTIifQ.eyJqdGkiOiI0ODgwMDM4NSIsInJvbCI6IlJPTEVfUkVHSVNURVIiLCJpc3MiOiJPcGVuWExhYiIsImlhdCI6MTc3OTQzMzE2NywiY2xpZW50SWQiOiJsa3pkeDU3bnZ5MjJqa3BxOXgydyIsInBob25lIjoiMTM1NTI4NjAzODIiLCJvcGVuSWQiOm51bGwsInV1aWQiOiJmNTBiMmI1Ni1hZWU0LTRlYTgtYmQ4OS04ZjUxNzhiMDE1ZDUiLCJlbWFpbCI6IiIsImV4cCI6MTc4NzIwOTE2N30.WkD1Mo4bB_EApexV6-5FV8u-LAaYvorCU-cqSqd6a0X0uGM7fWKqT2hbZvHZYa3L2qf7_via6Ypu9rHGSvXNeA';
const EMBEDDED_MINERU_BASE_URL = 'https://mineru.net/api/v4';

export async function POST(req: NextRequest) {
  let pdfFileName: string | undefined;
  let resolvedProviderId: string | undefined;
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return apiError('INVALID_REQUEST', 401, '请先登录后再使用 PDF 解析');
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      log.error('Invalid Content-Type for PDF upload:', contentType);
      return apiError(
        'INVALID_REQUEST',
        400,
        `Invalid Content-Type: expected multipart/form-data, got "${contentType}"`,
      );
    }

    const formData = await req.formData();
    const pdfFile = formData.get('pdf') as File | null;
    const providerId = formData.get('providerId') as PDFProviderId | null;
    const apiKey = formData.get('apiKey') as string | null;
    const baseUrl = formData.get('baseUrl') as string | null;
    const usageFeature = formData.get('usageFeature') as string | null;
    const usageKey = formData.get('usageKey') as string | null;

    if (!pdfFile) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'No PDF file provided');
    }

    if (usageFeature === 'exercise') {
      const consumeResult = await consumeUsageWithTransaction(userId, 'exercise', {
        dedupeKey: usageKey?.trim() || undefined,
        subject: pdfFile.name,
      });
      if (!consumeResult.canUse) {
        return apiError(
          'INVALID_REQUEST',
          429,
          consumeResult.upgradeTip ?? '今日互动练习额度已用完，请升级会员后继续使用',
        );
      }
    }

    // Force MinerU Cloud as default parser for both exercise and embedded OpenMAIC flows.
    // If caller explicitly passes mineru/mineru-cloud, keep it; otherwise upgrade from unpdf/missing.
    const effectiveProviderId =
      providerId && providerId !== 'unpdf' ? providerId : ('mineru-cloud' as PDFProviderId);
    pdfFileName = pdfFile?.name;
    resolvedProviderId = effectiveProviderId;

    const clientBaseUrl = baseUrl || undefined;
    if (clientBaseUrl && process.env.NODE_ENV === 'production') {
      const ssrfError = await validateUrlForSSRF(clientBaseUrl);
      if (ssrfError) {
        return apiError('INVALID_URL', 403, ssrfError);
      }
    }

    const config = {
      providerId: effectiveProviderId,
      apiKey: clientBaseUrl
        ? apiKey || ''
        : resolvePDFApiKey(
            effectiveProviderId,
            apiKey || (effectiveProviderId === 'mineru-cloud' ? EMBEDDED_MINERU_TOKEN : undefined),
          ),
      baseUrl: clientBaseUrl
        ? clientBaseUrl
        : resolvePDFBaseUrl(
            effectiveProviderId,
            baseUrl || (effectiveProviderId === 'mineru-cloud' ? EMBEDDED_MINERU_BASE_URL : undefined),
          ),
    };

    // Convert PDF to buffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF using the provider system
    const result = await parsePDF(config, buffer);
    const moderation = await checkCombinedCompliance({
      inputs: [result.text],
      scene: 'parse-pdf',
      userId,
      service: process.env.ALIYUN_GREEN_TEXT_SERVICE?.trim() || undefined,
    });
    if (moderation.blocked) {
      // Exercise PDFs frequently include formulas / symbols that can trigger false positives.
      // For interactive exercise uploads, keep the flow available and only log a warning.
      if (usageFeature === 'exercise') {
        log.warn(
          `PDF moderation warning bypassed for exercise [user=${userId}, labels=${moderation.labels.join(',') || 'none'}]`,
        );
      } else {
        return apiError(
          'CONTENT_SENSITIVE',
          400,
          '上传内容未通过审核，请更换资料后重试。',
          moderation.labels.length ? `命中标签：${moderation.labels.join(', ')}` : undefined,
        );
      }
    }

    // Add file metadata
    const resultWithMetadata: ParsedPdfContent = {
      ...result,
      metadata: {
        ...result.metadata,
        pageCount: result.metadata?.pageCount ?? 0, // Ensure pageCount is always a number
        fileName: pdfFile.name,
        fileSize: pdfFile.size,
      },
    };

    return apiSuccess({ data: resultWithMetadata });
  } catch (error) {
    log.error(
      `PDF parsing failed [provider=${resolvedProviderId ?? 'unknown'}, file="${pdfFileName ?? 'unknown'}"]:`,
      error,
    );
    return apiError('PARSE_FAILED', 500, error instanceof Error ? error.message : 'Unknown error');
  }
}
