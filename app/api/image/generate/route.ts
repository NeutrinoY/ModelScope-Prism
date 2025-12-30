import { NextRequest } from 'next/server';

// export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { 
      prompt, 
      negative_prompt, 
      size, 
      model, 
      apiKey,
      steps,
      guidance,
      seed,
      loras
    } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API Key is required' }), { status: 400 });
    }

    // ModelScope v1/images/generations payload
    const payload: any = {
      model: model || 'Qwen/Qwen-Image',
      prompt: prompt,
      n: 1,
      size: size || '1024x1024'
    };

    if (negative_prompt) payload.negative_prompt = negative_prompt;

    // Add optional advanced parameters
    if (steps) payload.steps = steps;
    if (guidance) payload.guidance = guidance;
    if (seed) payload.seed = seed;
    if (loras) payload.loras = loras;

    let response;
    let responseText;
    let lastError;

    // Retry mechanism (max 3 attempts) for stability
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch('https://api-inference.modelscope.cn/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-ModelScope-Async-Mode': 'true'
          },
          body: JSON.stringify(payload)
        });

        // Break on success or non-retriable client errors (4xx)
        if (response.ok || response.status < 500) {
           break; 
        } else {
           const txt = await response.text();
           throw new Error(`Server Error ${response.status}: ${txt}`);
        }
      } catch (err: any) {
        lastError = err;
        if (attempt < 2) await new Promise(res => setTimeout(res, 1000));
      }
    }

    if (!response) {
      throw lastError || new Error('Failed to connect to ModelScope API');
    }

    responseText = await response.text();

    if (!response.ok) {
      throw new Error(`ModelScope API Error: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    
    if (!data.task_id) {
       throw new Error('No task_id returned from API');
    }

    return new Response(JSON.stringify({ task_id: data.task_id }), { status: 200 });

  } catch (error: any) {
    console.error('Image Generation Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}