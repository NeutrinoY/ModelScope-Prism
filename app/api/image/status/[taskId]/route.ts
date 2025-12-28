import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get('apiKey');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API Key is required' }), { status: 400 });
    }

    const response = await fetch(`https://api-inference.modelscope.cn/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-ModelScope-Task-Type': 'image_generation'
      }
    });

    if (!response.ok) {
      throw new Error(`Task Status Error: ${await response.text()}`);
    }

    const data = await response.json();
    
    // Normalize response
    // ModelScope returns { task_status: 'SUCCEED' | 'RUNNING' | 'FAILED', output_images: [...] }
    return new Response(JSON.stringify(data), { status: 200 });

  } catch (error: any) {
    console.error('Task Status Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
