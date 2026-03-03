import fs from 'fs';
import https from 'https';
import path from 'path';

const API_KEY = process.env.MS_API_KEY || process.env.MODELSCOPE_ACCESS_TOKEN || '';
const MODEL_ID = process.argv[2];
const argModeOrRepeats = process.argv[3] || '';
const argRepeats = process.argv[4] || '';
const MODE = ['quick', 'full'].includes(argModeOrRepeats)
  ? argModeOrRepeats
  : (process.env.MS_PROBE_MODE || 'full').toLowerCase();
const repeatsRaw = ['quick', 'full'].includes(argModeOrRepeats) ? argRepeats : argModeOrRepeats;
const defaultRepeats = MODE === 'quick' ? 1 : 2;
const REPEATS = Number(repeatsRaw || process.env.MS_PROBE_REPEATS || defaultRepeats);
const SLEEP_MS = 1200;
const TIMEOUT_MS = 45000;

if (!MODEL_ID) {
  console.error('Usage: node probe.mjs <Model/ID> [quick|full] [repeats]');
  console.error('Examples:');
  console.error('  node probe.mjs MiniMax/MiniMax-M2.5');
  console.error('  node probe.mjs MiniMax/MiniMax-M2.5 quick');
  console.error('  node probe.mjs MiniMax/MiniMax-M2.5 full 2');
  process.exit(1);
}

if (!API_KEY) {
  console.error('Missing API key.');
  console.error('Set MS_API_KEY (or MODELSCOPE_ACCESS_TOKEN) in your local env first.');
  console.error('Example (.env.local):');
  console.error('  MS_API_KEY=ms-xxxxxxxxxxxxxxxx');
  process.exit(1);
}

if (!Number.isInteger(REPEATS) || REPEATS < 1 || REPEATS > 5) {
  console.error('Invalid repeats. Use an integer between 1 and 5.');
  process.exit(1);
}

if (!['quick', 'full'].includes(MODE)) {
  console.error('Invalid mode. Use quick or full.');
  process.exit(1);
}

const BASE_URL = 'api-inference.modelscope.cn';
const PATH = '/v1/chat/completions';
const PROMPT = 'Compare 9.11 and 9.8. Think step by step before answering.';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function nowIso() {
  return new Date().toISOString();
}

function slugifyModelId(modelId) {
  return modelId.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

function parseNonStreamResult(statusCode, body) {
  let json = null;
  let parseError = null;
  try {
    json = JSON.parse(body);
  } catch {
    parseError = 'INVALID_JSON';
  }

  if (!json) {
    return {
      statusCode,
      mode: 'non_stream',
      accepted: false,
      validContent: false,
      hasReasoning: false,
      contentLength: 0,
      rawLength: body.length,
      parseError,
    };
  }

  const choices = json.choices;
  if (statusCode === 200 && (!Array.isArray(choices) || choices.length === 0)) {
    return {
      statusCode: 400,
      mode: 'non_stream',
      accepted: false,
      validContent: false,
      hasReasoning: false,
      contentLength: 0,
      rawLength: body.length,
      parseError: 'EMPTY_CHOICES',
    };
  }

  const message = choices?.[0]?.message || {};
  const content = typeof message.content === 'string' ? message.content : '';
  const reasoning = typeof message.reasoning_content === 'string' ? message.reasoning_content : '';

  return {
    statusCode,
    mode: 'non_stream',
    accepted: statusCode === 200,
    validContent: content.trim().length > 0,
    hasReasoning: reasoning.trim().length > 0,
    contentLength: content.length,
    rawLength: body.length,
    parseError: null,
  };
}

function parseStreamResult(statusCode, raw) {
  const lines = raw.split('\n');
  let contentLength = 0;
  let reasoningLength = 0;
  let parsedChunks = 0;
  let parseErrors = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'data: [DONE]') continue;
    if (!trimmed.startsWith('data: ')) continue;
    try {
      const chunk = JSON.parse(trimmed.slice(6));
      const delta = chunk?.choices?.[0]?.delta;
      if (!delta) continue;
      if (typeof delta.content === 'string') contentLength += delta.content.length;
      if (typeof delta.reasoning_content === 'string') reasoningLength += delta.reasoning_content.length;
      parsedChunks += 1;
    } catch {
      parseErrors += 1;
    }
  }

  return {
    statusCode,
    mode: 'stream',
    accepted: statusCode === 200,
    validContent: contentLength > 0,
    hasReasoning: reasoningLength > 0,
    contentLength,
    rawLength: raw.length,
    parsedChunks,
    parseErrors,
  };
}

function makeRequest({ payloadName, payload, stream }) {
  return new Promise((resolve) => {
    const requestBody = JSON.stringify({
      model: MODEL_ID,
      messages: [{ role: 'user', content: PROMPT }],
      stream,
      ...payload,
    });

    const options = {
      hostname: BASE_URL,
      port: 443,
      path: PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const startedAt = Date.now();
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        const durationMs = Date.now() - startedAt;
        const statusCode = res.statusCode || 0;
        const parsed = stream
          ? parseStreamResult(statusCode, body)
          : parseNonStreamResult(statusCode, body);
        resolve({
          payloadName,
          stream,
          durationMs,
          ...parsed,
        });
      });
    });

    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy(new Error('REQUEST_TIMEOUT'));
    });

    req.on('error', (error) => {
      resolve({
        payloadName,
        stream,
        durationMs: Date.now() - startedAt,
        statusCode: 0,
        mode: stream ? 'stream' : 'non_stream',
        accepted: false,
        validContent: false,
        hasReasoning: false,
        contentLength: 0,
        rawLength: 0,
        parseError: error.message,
      });
    });

    req.write(requestBody);
    req.end();
  });
}

async function runCase(caseName, payload, options = {}) {
  const stream = options.stream === true;
  const repeats = options.repeats || REPEATS;
  const results = [];
  for (let i = 0; i < repeats; i++) {
    const result = await makeRequest({ payloadName: caseName, payload, stream });
    results.push(result);
    if (i < repeats - 1) await sleep(SLEEP_MS);
  }
  return results;
}

function summarizeResults(results) {
  const acceptedCount = results.filter((r) => r.accepted).length;
  const validCount = results.filter((r) => r.validContent).length;
  const reasoningCount = results.filter((r) => r.hasReasoning).length;
  const avgLatencyMs = Math.round(results.reduce((sum, r) => sum + r.durationMs, 0) / results.length);
  return {
    samples: results.length,
    acceptedCount,
    validCount,
    reasoningCount,
    acceptedMajority: acceptedCount >= Math.ceil(results.length / 2),
    validMajority: validCount >= Math.ceil(results.length / 2),
    reasoningMajority: reasoningCount >= Math.ceil(results.length / 2),
    avgLatencyMs,
  };
}

function deriveStrategy(ctx) {
  const {
    mode,
    strict,
    baselineReasoning,
    rootOnReasoning,
    kwargsThinkingOnReasoning,
    kwargsEnableOnReasoning,
    rootOffDisabled,
    kwargsThinkingOffDisabled,
    kwargsEnableOffDisabled,
  } = ctx;

  if (baselineReasoning && strict) {
    return {
      strategy: 'native_always_on',
      notes: 'Reasoning appears by default and unknown params are rejected.',
    };
  }

  if (baselineReasoning && !strict) {
    if (rootOffDisabled) {
      return {
        strategy: 'root_boolean',
        notes: 'Reasoning can be turned off with top-level enable_thinking.',
      };
    }
    if (kwargsThinkingOffDisabled || kwargsEnableOffDisabled) {
      return {
        strategy: 'kwargs_dict',
        notes: 'Reasoning can be toggled using chat_template_kwargs.',
      };
    }
    if (mode === 'quick') {
      return {
        strategy: 'none',
        notes: 'Quick mode result is inconclusive for disable-path. Run full mode for reliable toggle strategy.',
      };
    }
    return {
      strategy: 'native_always_on',
      notes: 'Reasoning is default and not reliably disabled by known toggles.',
    };
  }

  if (rootOnReasoning) {
    return {
      strategy: 'root_boolean',
      notes: 'Reasoning can be enabled with top-level enable_thinking.',
    };
  }
  if (kwargsThinkingOnReasoning || kwargsEnableOnReasoning) {
    return {
      strategy: 'kwargs_dict',
      notes: 'Reasoning can be enabled with chat_template_kwargs.',
    };
  }

  return {
    strategy: 'none',
    notes: 'No reliable reasoning toggle detected with known probes.',
  };
}

async function runProbe() {
  console.log(`\n[PROBE] target=${MODEL_ID} mode=${MODE} repeats=${REPEATS}`);

  const baseline = await runCase('baseline_non_stream', {}, { stream: false });
  const baselineSummary = summarizeResults(baseline);
  console.log(`[1] baseline non-stream accepted=${baselineSummary.acceptedCount}/${baselineSummary.samples} valid=${baselineSummary.validCount}/${baselineSummary.samples}`);
  if (!baselineSummary.acceptedMajority || !baselineSummary.validMajority) {
    console.error('Baseline failed. Model may be unavailable, invalid key, or incompatible endpoint.');
    process.exit(1);
  }

  await sleep(SLEEP_MS);
  const unknownParam = await runCase('strictness_unknown_param', { prism_dummy: true }, { stream: false });
  const unknownSummary = summarizeResults(unknownParam);
  const strict = baselineSummary.acceptedMajority && !unknownSummary.acceptedMajority;
  console.log(`[2] strictness accepted=${unknownSummary.acceptedCount}/${unknownSummary.samples} -> strict=${strict ? 'yes' : 'no'}`);

  await sleep(SLEEP_MS);
  const baselineStream = await runCase('baseline_stream', {}, { stream: true, repeats: 1 });
  const baselineStreamSummary = summarizeResults(baselineStream);
  console.log(`[3] stream check valid=${baselineStreamSummary.validCount}/${baselineStreamSummary.samples} reasoning=${baselineStreamSummary.reasoningCount}/${baselineStreamSummary.samples}`);

  const baselineReasoning = baselineSummary.reasoningMajority;
  let rootOnReasoning = false;
  let kwargsThinkingOnReasoning = false;
  let kwargsEnableOnReasoning = false;
  let rootOffDisabled = false;
  let kwargsThinkingOffDisabled = false;
  let kwargsEnableOffDisabled = false;

  let rootOn = [];
  let kwargsThinkingOn = [];
  let kwargsEnableOn = [];
  let rootOff = [];
  let kwargsThinkingOff = [];
  let kwargsEnableOff = [];

  if (!strict) {
    if (baselineReasoning) {
      rootOff = await runCase('root_off', { enable_thinking: false }, { stream: false, repeats: MODE === 'quick' ? 1 : REPEATS });
      await sleep(SLEEP_MS);
      kwargsThinkingOff = await runCase('kwargs_thinking_off', { chat_template_kwargs: { thinking: false } }, { stream: false, repeats: MODE === 'quick' ? 1 : REPEATS });
      if (MODE === 'full') {
        await sleep(SLEEP_MS);
        kwargsEnableOff = await runCase('kwargs_enable_off', { chat_template_kwargs: { enable_thinking: false } }, { stream: false });
      }

      rootOffDisabled = summarizeResults(rootOff).acceptedMajority && !summarizeResults(rootOff).reasoningMajority;
      kwargsThinkingOffDisabled = kwargsThinkingOff.length > 0
        ? (summarizeResults(kwargsThinkingOff).acceptedMajority && !summarizeResults(kwargsThinkingOff).reasoningMajority)
        : false;
      kwargsEnableOffDisabled = kwargsEnableOff.length > 0
        ? (summarizeResults(kwargsEnableOff).acceptedMajority && !summarizeResults(kwargsEnableOff).reasoningMajority)
        : false;
    } else {
      rootOn = await runCase('root_on', { enable_thinking: true }, { stream: false });
      await sleep(SLEEP_MS);
      kwargsThinkingOn = await runCase('kwargs_thinking_on', { chat_template_kwargs: { thinking: true } }, { stream: false, repeats: MODE === 'quick' ? 1 : REPEATS });
      if (MODE === 'full') {
        await sleep(SLEEP_MS);
        kwargsEnableOn = await runCase('kwargs_enable_on', { chat_template_kwargs: { enable_thinking: true } }, { stream: false });
      }

      rootOnReasoning = summarizeResults(rootOn).acceptedMajority && summarizeResults(rootOn).reasoningMajority;
      kwargsThinkingOnReasoning = kwargsThinkingOn.length > 0
        ? (summarizeResults(kwargsThinkingOn).acceptedMajority && summarizeResults(kwargsThinkingOn).reasoningMajority)
        : false;
      kwargsEnableOnReasoning = kwargsEnableOn.length > 0
        ? (summarizeResults(kwargsEnableOn).acceptedMajority && summarizeResults(kwargsEnableOn).reasoningMajority)
        : false;
    }
  }

  const recommendation = deriveStrategy({
    mode: MODE,
    strict,
    baselineReasoning,
    rootOnReasoning,
    kwargsThinkingOnReasoning,
    kwargsEnableOnReasoning,
    rootOffDisabled,
    kwargsThinkingOffDisabled,
    kwargsEnableOffDisabled,
  });

  const shortName = MODEL_ID.split('/').pop() || MODEL_ID;
  const provider = MODEL_ID.split('/')[0] || 'unknown';
  const configSnippet = `{
  key: '${shortName.toLowerCase()}',
  name: '${shortName.replace(/-/g, ' ')}',
  provider: '${provider}',
  isIdSwitch: false,
  instruct: { id: '${MODEL_ID}', strategy: 'none' },${recommendation.strategy !== 'none' ? `\n  thinking: { id: '${MODEL_ID}', strategy: '${recommendation.strategy}' }` : ''}
}`;

  const report = {
    generatedAt: nowIso(),
    modelId: MODEL_ID,
    mode: MODE,
    repeats: REPEATS,
    strict,
    baselineReasoning,
    streamReasoning: baselineStreamSummary.reasoningMajority,
    recommendation,
    tests: {
      baseline,
      strictnessUnknownParam: unknownParam,
      baselineStream,
      rootOn,
      kwargsThinkingOn,
      kwargsEnableOn,
      rootOff,
      kwargsThinkingOff,
      kwargsEnableOff,
    },
    configSnippet,
  };

  const reportName = `probe-report-${slugifyModelId(MODEL_ID)}-${Date.now()}.json`;
  const reportPath = path.join(process.cwd(), reportName);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  let comparison = null;
  const prefix = `probe-report-${slugifyModelId(MODEL_ID)}-`;
  const candidates = fs
    .readdirSync(process.cwd())
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json') && name !== reportName)
    .sort();
  const previous = candidates[candidates.length - 1];
  if (previous) {
    try {
      const previousPath = path.join(process.cwd(), previous);
      const previousReport = JSON.parse(fs.readFileSync(previousPath, 'utf-8'));
      comparison = {
        previousReport: previous,
        strategyChanged: previousReport?.recommendation?.strategy !== report.recommendation.strategy,
        strictnessChanged: previousReport?.strict !== report.strict,
        reasoningChanged: previousReport?.baselineReasoning !== report.baselineReasoning,
        regressionRisk:
          (previousReport?.recommendation?.strategy !== report.recommendation.strategy) ||
          (previousReport?.strict !== report.strict) ||
          (previousReport?.baselineReasoning !== report.baselineReasoning),
      };
    } catch {
      comparison = null;
    }
  }

  console.log('\n[ANALYSIS]');
  console.log(`- strict: ${strict ? 'yes' : 'no'}`);
  console.log(`- reasoning detected (non-stream): ${baselineReasoning ? 'yes' : 'no'}`);
  console.log(`- reasoning detected (stream): ${baselineStreamSummary.reasoningMajority ? 'yes' : 'no'}`);
  console.log(`- suggested strategy: ${recommendation.strategy}`);
  console.log(`- notes: ${recommendation.notes}`);
  if (comparison) {
    console.log('\n[COMPARE]');
    console.log(`- previous: ${comparison.previousReport}`);
    console.log(`- strategy changed: ${comparison.strategyChanged ? 'yes' : 'no'}`);
    console.log(`- strictness changed: ${comparison.strictnessChanged ? 'yes' : 'no'}`);
    console.log(`- baseline reasoning changed: ${comparison.reasoningChanged ? 'yes' : 'no'}`);
    console.log(`- regression risk: ${comparison.regressionRisk ? 'yes' : 'no'}`);
  }
  console.log('\n[RECOMMENDED lib/models.ts ENTRY]');
  console.log(configSnippet);
  if (recommendation.strategy !== 'none') {
    console.log('\n[MODEL_STRATEGIES MAP]');
    console.log(`'${MODEL_ID}': '${recommendation.strategy}'`);
  }
  if (comparison) {
    report.comparison = comparison;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  }
  console.log(`\n[REPORT] ${reportPath}`);
}

runProbe().catch((error) => {
  console.error('Probe execution failed:', error);
  process.exit(1);
});
