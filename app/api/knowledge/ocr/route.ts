import { NextRequest } from 'next/server';
import { checkCombinedCompliance } from '@/lib/server/content-compliance';

const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_ANTHROPIC_API = 'https://api.deepseek.com/v1/messages';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const apiKeyFromHeader = request.headers.get('x-api-key')?.trim();
    const apiKey = apiKeyFromHeader || process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) {
      return Response.json(
        {
          error: '后端未配置 DeepSeek API Key，请联系管理员配置后重试',
        },
        { status: 500 },
      );
    }

    const rawText = await request.text();
    if (!rawText || rawText.length < 50) {
      return Response.json({ error: '请求体为空或过小', length: rawText?.length || 0 }, { status: 400 });
    }

    let body: { image?: string; mimeType?: string };
    try {
      body = JSON.parse(rawText);
    } catch (e) {
      return Response.json({ error: 'JSON解析失败', detail: String(e) }, { status: 400 });
    }

    const { image, mimeType } = body;

    if (!image || typeof image !== 'string') {
      return Response.json({ error: '未收到图片数据' }, { status: 400 });
    }

    if (image.length > 14 * 1024 * 1024) {
      return Response.json({ error: '图片过大，请压缩后上传（最大10MB）' }, { status: 400 });
    }

    const mime = mimeType || 'image/jpeg';
    const dataUrl = `data:${mime};base64,${image}`;

    const OCR_PROMPT = `你是一个手写数学笔记OCR识别助手。请识别图片中的手写内容，并按以下结构提取：

第1步（核心概念）：提取学生写的核心概念关键词
第2步（易错点和重点）：提取易错点和重点
第3步（公式定理）：提取公式或定理名称及结构
第4步（典型例题）：提取题目类型、已知条件、求解目标、关键步骤
第5步（方法总结）：提取核心方法

请按以下JSON格式回复，只返回JSON，不要有其他文字：
{
  "step1": "识别的核心概念",
  "step2Mistake": "识别的易错点",
  "step2Focus": "识别的重点",
  "step3": "识别的公式定理",
  "step4Type": "识别的题目类型",
  "step4Condition": "识别的已知条件",
  "step4Goal": "识别的求解目标",
  "step4Steps": "识别的关键步骤",
  "step5": "识别的方法总结"
}

如果某一步内容在图片中找不到，对应的值设为空字符串。`;

    // Try OpenAI format with deepseek-v4-flash (supports vision)
    const openAiPayload = {
      model: 'deepseek-v4-flash',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: OCR_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      stream: false,
      max_tokens: 2048,
      temperature: 0.1,
    };

    let response = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(openAiPayload),
    });

    // If OpenAI format fails, try Anthropic format
    if (!response.ok) {
      const anthropicPayload = {
        model: 'deepseek-v4-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mime,
                  data: image,
                },
              },
              { type: 'text', text: OCR_PROMPT },
            ],
          },
        ],
        max_tokens: 2048,
        stream: false,
      };

      response = await fetch(DEEPSEEK_ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(anthropicPayload),
      });
    }

    if (!response.ok) {
      await response.text();
      return Response.json({
        error: '图片识别服务暂不可用',
        detail: `DeepSeek Vision暂不支持，请先使用手动填写模式。`,
        hint: '尝试步骤：选择"快速模式" → 手动填写5步内容 → 提交分析',
      }, { status: 200 }); // Return 200 with hint so the UI can show a friendly message
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.content?.[0]?.text || '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const moderation = await checkCombinedCompliance({
          inputs: [JSON.stringify(parsed), content],
          scene: 'knowledge-ocr',
          service: process.env.ALIYUN_GREEN_TEXT_SERVICE?.trim() || undefined,
        });
        if (moderation.blocked) {
          return Response.json(
            {
              success: false,
              error: '输入内容未通过审核，请调整后重试。',
              detail: moderation.labels.length ? `命中标签：${moderation.labels.join(', ')}` : undefined,
            },
            { status: 400 },
          );
        }
        return Response.json({ success: true, data: parsed });
      }
      return Response.json({ success: false, error: '无法解析OCR结果', raw: content });
    } catch {
      return Response.json({ success: false, error: 'OCR识别结果格式异常', raw: content });
    }
  } catch (err) {
    console.error('OCR error:', err);
    return Response.json({ error: 'OCR处理失败', detail: String(err) }, { status: 500 });
  }
}
