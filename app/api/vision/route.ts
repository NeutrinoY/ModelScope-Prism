import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messages, model, apiKey } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API Key is required' }), { status: 400 });
    }

    // Direct fetch for better field control
    const res = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'Qwen/Qwen3.5-397B-A17B',
        messages,
        stream: true,
        max_tokens: 4096,
        // Include thinking params just in case future VLM models support it
        enable_thinking: true,
        chat_template_kwargs: {
          enable_thinking: true,
          thinking: true
        }
      })
    });

    if (!res.ok) {
       const errorText = await res.text();
       return new Response(JSON.stringify({ error: `ModelScope API Error: ${res.statusText}`, details: errorText }), { status: res.status });
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

                const reasoning = delta.reasoning_content;
                const content = delta.content;

                // Send structured JSON stream back to frontend
                if (reasoning || content) {
                  const payload = JSON.stringify({ r: reasoning || '', c: content || '' });
                  controller.enqueue(encoder.encode(payload + '\n'));
                }

              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Vision API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}