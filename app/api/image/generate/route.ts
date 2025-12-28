import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { prompt, negative_prompt, size, model, apiKey } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API Key is required' }), { status: 400 });
    }

    const payload = {
      model: model || 'Qwen/Qwen-Image',
      prompt,
      negative_prompt,
      size: size || '1024x1024',
      n: 1 // Number of images
    };

    const response = await fetch('https://api-inference.modelscope.cn/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-ModelScope-Async-Mode': 'true' // Force async mode for stability
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ModelScope API Error: ${errorText}`);
    }

    const data = await response.json();
    
    // ModelScope Async API returns a task_id
    if (!data.task_id) {
       // Fallback if synchronous (some models might return data directly, but we requested async)
       if (data.data && data.data[0]?.url) {
         return new Response(JSON.stringify({ status: 'SUCCEED', output_images: [data.data[0].url] }), { status: 200 });
       }
       throw new Error('No task_id returned from API');
    }

    return new Response(JSON.stringify({ task_id: data.task_id }), { status: 200 });

  } catch (error: any) {
    console.error('Image Generation Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}
