import { NextRequest } from 'next/server';
import { getModelStrategy } from '@/lib/models';

// export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messages, model, apiKey, enableThinking } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API Key is required' }), { status: 400 });
    }

    const currentModel = model || 'deepseek-ai/DeepSeek-V3.2';
    const strategy = getModelStrategy(currentModel);

    const payload: any = {
      model: currentModel,
      messages,
      stream: true,
    };

    // Precision injection based on specific model capabilities.
    // This prevents strict models like MiniMax from rejecting requests with unknown parameters.
    if (strategy === 'root_boolean') {
      payload.enable_thinking = enableThinking;
    } else if (strategy === 'kwargs_dict') {
      payload.chat_template_kwargs = { 
        thinking: enableThinking,
        enable_thinking: enableThinking // Fallback for older engines within kwargs
      };
    } else if (strategy === 'native_always_on') {
      // The model natively outputs reasoning content and is STRICT.
      // Do NOT inject any thinking parameters to avoid 400 Bad Request.
    }

    const res = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
       const errorText = await res.text();
       return new Response(JSON.stringify({ error: `ModelScope API Error`, details: errorText }), { status: res.status });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = '';

        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
              if (!trimmedLine.startsWith('data: ')) continue;

              const jsonStr = trimmedLine.replace('data: ', '');
              try {
                const chunk = JSON.parse(jsonStr);
                const delta = chunk.choices?.[0]?.delta;
                if (!delta) continue;

                // Stream simplified protocol: { r: reasoning, c: content }
                if (delta.reasoning_content) {
                  controller.enqueue(encoder.encode(JSON.stringify({ r: delta.reasoning_content }) + '\n'));
                }
                if (delta.content) {
                  controller.enqueue(encoder.encode(JSON.stringify({ c: delta.content }) + '\n'));
                }
              } catch (e) { }
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}