const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.MS_API_KEY || process.env.MODELSCOPE_ACCESS_TOKEN || '';
const CHAT_MODEL = process.env.SMOKE_CHAT_MODEL || 'Qwen/Qwen3.5-397B-A17B';
const IMAGE_MODEL = process.env.SMOKE_IMAGE_MODEL || 'Qwen/Qwen-Image';
const POLL_TIMES = Number(process.env.SMOKE_IMAGE_POLL_TIMES || 2);
const POLL_INTERVAL_MS = Number(process.env.SMOKE_IMAGE_POLL_INTERVAL_MS || 3000);
const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 45000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function requestJson(path, init) {
  const { signal, clear } = withTimeoutSignal(REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...init, signal });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, text, json };
  } finally {
    clear();
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runChatSmoke() {
  const result = await requestJson('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [{ role: 'user', content: 'Say "ok" only.' }],
      enableThinking: false,
    }),
  });

  assert(result.ok, `chat failed with status ${result.status}`);
  assert(result.text.includes('"c"') || result.text.includes('"r"'), 'chat stream response format invalid');
  return { status: result.status };
}

async function runImageSmoke() {
  const generate = await requestJson('/api/image/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: 'A minimal black and white icon of a prism, flat design.',
      size: '1024x1024',
    }),
  });

  assert(generate.ok, `image generate failed with status ${generate.status}`);
  const taskId = generate.json?.task_id;
  assert(typeof taskId === 'string' && taskId.length > 0, 'image generate missing task_id');

  let lastStatus = '';
  for (let i = 0; i < POLL_TIMES; i++) {
    if (i > 0) {
      await sleep(POLL_INTERVAL_MS);
    }
    const poll = await requestJson(`/api/image/status/${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });
    assert(poll.ok, `image status failed with status ${poll.status}`);
    lastStatus = String(poll.json?.task_status || '');
    if (lastStatus === 'SUCCEED' || lastStatus === 'FAILED') {
      break;
    }
  }

  assert(lastStatus.length > 0, 'image status missing task_status');
  return { taskId, taskStatus: lastStatus };
}

async function main() {
  if (!API_KEY) {
    console.error('[smoke] missing API key: set MS_API_KEY or MODELSCOPE_ACCESS_TOKEN');
    process.exit(1);
  }

  console.log(`[smoke] base=${BASE_URL}`);
  const summary = {
    startedAt: new Date().toISOString(),
    chat: null,
    image: null,
  };

  try {
    summary.chat = await runChatSmoke();
    console.log('[smoke] chat: pass');
  } catch (err) {
    console.error('[smoke] chat: fail');
    console.error(String(err));
    process.exit(1);
  }

  try {
    summary.image = await runImageSmoke();
    console.log(`[smoke] image: pass (status=${summary.image.taskStatus})`);
  } catch (err) {
    console.error('[smoke] image: fail');
    console.error(String(err));
    process.exit(1);
  }

  console.log('[smoke] all checks passed');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error('[smoke] unexpected failure');
  console.error(err);
  process.exit(1);
});
