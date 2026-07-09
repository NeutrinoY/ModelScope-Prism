#!/usr/bin/env node
/**
 * Prism smoke — a minimal upstream connectivity check.
 *
 * Usage:
 *   node scripts/smoke.mjs [model-id]
 *
 * Sends one streaming chat completion with no optional parameters and
 * prints the outcome. Requires MS_API_KEY (env or .env.local).
 */

import { readFileSync } from 'node:fs';
import { probeChatCompletion, resolveApiKey } from './probe/http.mjs';

function loadDotEnvLocal() {
  try {
    const text = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    for (const line of text.split('\n')) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    }
  } catch {
    // optional
  }
}

async function main() {
  loadDotEnvLocal();
  const model = process.argv[2] || 'deepseek-ai/DeepSeek-V4-Flash';
  const apiKey = resolveApiKey();

  console.log(`Smoke test: ${model}`);
  const outcome = await probeChatCompletion({
    apiKey,
    payload: {
      model,
      stream: true,
      messages: [{ role: 'user', content: 'Reply with the single word: pong' }],
    },
    timeoutMs: 30_000,
  });

  if (outcome.ok) {
    console.log(`OK in ${outcome.durationMs}ms`);
    console.log(`content: ${outcome.content.slice(0, 120)}`);
    if (outcome.reasoning) {
      console.log(`reasoning observed (${outcome.reasoning.length} chars)`);
    }
  } else {
    console.error(`FAILED [${outcome.error?.kind}] ${outcome.error?.message ?? ''}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Smoke failed:', error);
  process.exit(1);
});
