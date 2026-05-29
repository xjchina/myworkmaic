/**
 * PBL Runtime Chat API
 *
 * Handles @mention routing during PBL runtime.
 * Students @question or @judge an agent, and this endpoint generates a response.
 */

import { NextRequest } from 'next/server';
import { callLLM } from '@/lib/ai/llm';
import type { PBLAgent, PBLIssue } from '@/lib/pbl/types';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { resolveModelFromRequest } from '@/lib/server/resolve-model';
import { getAuthUserId } from '@/lib/server/auth';
import { checkCombinedCompliance } from '@/lib/server/content-compliance';

const log = createLogger('PBL Chat');

interface PBLChatRequest {
  message: string;
  agent: PBLAgent;
  currentIssue: PBLIssue | null;
  recentMessages: { agent_name: string; message: string }[];
  userRole: string;
  agentType?: 'question' | 'judge';
}

export async function POST(req: NextRequest) {
  let agentName: string | undefined;
  let resolvedAgentType: string | undefined;
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return apiError('INVALID_REQUEST', 401, '请先登录后再发起讨论');
    }

    const body = (await req.json()) as PBLChatRequest;
    const { message, agent, currentIssue, recentMessages, userRole, agentType } = body;
    agentName = agent?.name;
    resolvedAgentType = agentType;

    const moderation = await checkCombinedCompliance({
      inputs: [message],
      scene: 'pbl-chat',
      userId,
      // Input moderation should use the generic text moderation service.
      service: process.env.ALIYUN_GREEN_TEXT_SERVICE?.trim() || undefined,
    });

    if (moderation.blocked) {
      const moderationMessage =
        moderation.suggestion === 'unknown'
          ? moderation.reason || '内容审核服务暂不可用，请稍后重试。'
          : '输入内容未通过审核，请调整后重试。';

      return apiError(
        'CONTENT_SENSITIVE',
        400,
        moderationMessage,
        moderation.labels.length ? `命中标签：${moderation.labels.join(', ')}` : undefined,
      );
    }

    if (!message || !agent) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Message and agent are required');
    }

    // User-facing roundtable can require explicit OpenMAIC client config.
    const { model, thinkingConfig } = await resolveModelFromRequest(req, body, {
      allowServerFallback: req.headers.get('x-require-client-model') !== '1',
    });

    // Build context for the agent, differentiating question vs judge
    let issueContext = '';
    if (currentIssue) {
      issueContext = `\n\n## Current Issue\nTitle: ${currentIssue.title}\nDescription: ${currentIssue.description}\nPerson in Charge: ${currentIssue.person_in_charge}`;
      if (currentIssue.generated_questions) {
        if (agentType === 'judge') {
          issueContext += `\n\nQuestions to Evaluate Against:\n${currentIssue.generated_questions}`;
        } else {
          issueContext += `\n\nGenerated Questions:\n${currentIssue.generated_questions}`;
        }
      }
    }

    const recentContext =
      recentMessages.length > 0
        ? `\n\n## Recent Conversation\n${recentMessages
            .slice(-5)
            .map((m) => `${m.agent_name}: ${m.message}`)
            .join('\n')}`
        : '';

    const systemPrompt = `${agent.system_prompt}${issueContext}${recentContext}${userRole ? `\n\nThe student's role is: ${userRole}` : ''}`;

    const result = await callLLM(
      {
        model,
        system: systemPrompt,
        prompt: message,
      },
      'pbl-chat',
      undefined,
      thinkingConfig,
    );

    return apiSuccess({ message: result.text, agentName: agent.name });
  } catch (error) {
    log.error(
      `PBL chat failed [agent="${agentName ?? 'unknown'}", type=${resolvedAgentType ?? 'question'}]:`,
      error,
    );
    return apiError('INTERNAL_ERROR', 500, error instanceof Error ? error.message : String(error));
  }
}
