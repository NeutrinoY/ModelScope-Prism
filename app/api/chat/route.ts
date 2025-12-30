import { NextRequest } from 'next/server';

// export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messages, model, apiKey, enableThinking } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API Key is required' }), { status: 400 });
    }

    // Dynamic kwargs for GLM-4.7/MiMo support
    const chatTemplateKwargs: any = { enable_thinking: enableThinking };
    if (enableThinking) {
      chatTemplateKwargs.clear_thinking = false;
    }

    const res = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'Qwen/Qwen2.5-Coder-32B-Instruct',
        messages,
        stream: true,
        enable_thinking: enableThinking, // DeepSeek
        chat_template_kwargs: chatTemplateKwargs // vLLM/SGLang
      })
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