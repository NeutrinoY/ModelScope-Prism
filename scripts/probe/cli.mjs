#!/usr/bin/env node
/**
 * Prism probe — offline model capability diagnostics.
 *
 * Usage:
 *   node scripts/probe/cli.mjs <model-id> [more-model-ids…] [--no-image] [--no-output]
 *     [--delay-ms 1500] [--rate-limit-delay-ms 10000] [--json out.json]
 *
 * Requires MS_API_KEY in the environment (or .env.local).
 * This tool is for maintaining built-in profiles; it never runs in the
 * deployed app and its retry-many-formats behavior must never leak there.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { buildProbeCases } from './cases.mjs';
import { probeChatCompletion, resolveApiKey } from './http.mjs';
import { buildReport } from './report.mjs';

function loadDotEnvLocal() {
  try {
    const text = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
    for (const line of text.split('\n')) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    }
  } catch {
    // .env.local is optional
  }
}

function parseArgs(argv) {
  const models = [];
  const options = {
    includeImage: true,
    includeOutputLimit: true,
    jsonPath: null,
    delayMs: 1500,
    rateLimitDelayMs: 10_000,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--no-image') options.includeImage = false;
    else if (arg === '--no-output') options.includeOutputLimit = false;
    else if (arg === '--delay-ms') options.delayMs = parseDelay(argv[++i], options.delayMs);
    else if (arg === '--rate-limit-delay-ms') {
      options.rateLimitDelayMs = parseDelay(argv[++i], options.rateLimitDelayMs);
    } else if (arg === '--json') options.jsonPath = argv[++i];
    else if (!arg.startsWith('--')) models.push(arg);
  }
  return { models, options };
}

function parseDelay(raw, fallback) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 300_000) return fallback;
  return Math.trunc(value);
}

function sleep(ms) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cooldownMs(outcome, options) {
  if (outcome.error?.kind === 'rate_limited') {
    return Math.max(outcome.error.retryAfterMs ?? 0, options.rateLimitDelayMs);
  }
  return options.delayMs;
}

function formatCaseLine(caseResult) {
  const status = caseResult.ok
    ? caseResult.reasoningObserved
      ? 'OK (reasoning)'
      : 'OK'
    : `FAIL [${caseResult.error?.kind ?? 'unknown'}]`;
  return `  ${caseResult.id.padEnd(42)} ${status}`;
}

async function main() {
  loadDotEnvLocal();
  const { models, options } = parseArgs(process.argv.slice(2));

  if (models.length === 0) {
    console.log(
      'Usage: node scripts/probe/cli.mjs <model-id> [...] [--no-image] [--no-output] [--delay-ms 1500] [--json out.json]'
    );
    process.exit(1);
  }

  const apiKey = resolveApiKey();
  const reports = [];

  for (const model of models) {
    console.log(`\nProbing ${model}`);
    const cases = buildProbeCases(model, options);
    const results = [];

    for (let index = 0; index < cases.length; index++) {
      const probeCase = cases[index];
      process.stdout.write(`  ${probeCase.id} … `);
      const outcome = await probeChatCompletion({ apiKey, payload: probeCase.payload });
      results.push({ ...probeCase, ...outcome });
      console.log(outcome.ok ? `ok (${outcome.durationMs}ms)` : `fail (${outcome.error?.kind})`);

      const waitMs = cooldownMs(outcome, options);
      if (index < cases.length - 1 && waitMs > 0) {
        console.log(`    cooldown ${waitMs}ms`);
        await sleep(waitMs);
      }
    }

    const report = buildReport(model, results);
    reports.push(report);

    console.log(`\nReport for ${model}:`);
    console.log(`  reachable: ${report.reachable}`);
    console.log(`  thinking:  ${JSON.stringify(report.profileSuggestion.thinking)}`);
    console.log(`  input:     ${JSON.stringify(report.profileSuggestion.input)}`);
    console.log(`  output:    ${JSON.stringify(report.profileSuggestion.output)}`);
    console.log('  cases:');
    for (const caseResult of report.cases) {
      console.log(formatCaseLine(caseResult));
    }
  }

  if (options.jsonPath) {
    writeFileSync(options.jsonPath, JSON.stringify(reports, null, 2));
    console.log(`\nWrote JSON report to ${options.jsonPath}`);
  }
}

main().catch((error) => {
  console.error('Probe failed:', error);
  process.exit(1);
});
