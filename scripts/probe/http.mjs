import https from 'node:https';
import { parseStreamResult } from './parsers.mjs';

export const MODELSCOPE_HOST = 'api-inference.modelscope.cn';
export const CHAT_COMPLETIONS_PATH = '/v1/chat/completions';

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function makeModelScopeRequest({
  apiKey,
  modelId,
  messages,
  prompt,
  payloadName,
  payload,
  timeoutMs,
}) {
  return new Promise((resolve) => {
    const requestBody = JSON.stringify({
      model: modelId,
      messages: messages || [{ role: 'user', content: prompt }],
      stream: true,
      ...payload,
    });

    const startedAt = Date.now();
    const req = https.request(
      {
        hostname: MODELSCOPE_HOST,
        port: 443,
        path: CHAT_COMPLETIONS_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(requestBody),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          const statusCode = res.statusCode || 0;
          const parsed = parseStreamResult(statusCode, body);
          resolve({
            payloadName,
            stream: true,
            durationMs: Date.now() - startedAt,
            ...parsed,
          });
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('REQUEST_TIMEOUT'));
    });

    req.on('error', (error) => {
      const isTimeout = error.message === 'REQUEST_TIMEOUT';
      resolve({
        payloadName,
        stream: true,
        durationMs: Date.now() - startedAt,
        statusCode: 0,
        mode: 'stream',
        accepted: false,
        validContent: false,
        hasReasoning: false,
        contentLength: 0,
        reasoningLength: 0,
        rawLength: 0,
        parseError: error.message,
        errorCategory: isTimeout ? 'timeout' : 'network',
      });
    });

    req.write(requestBody);
    req.end();
  });
}
