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

    const responseText = await response.text();
    
    if (!response.ok) {
      throw new Error(`Task Status Error: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    
    return new Response(JSON.stringify({ 
      task_status: data.task_status, 
      output_images: data.output_images || [],
      raw: data 
    }), { status: 200 });

  } catch (error: any) {
    console.error('Task Status Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}