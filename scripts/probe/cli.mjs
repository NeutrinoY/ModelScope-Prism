import { makeModelScopeRequest, sleep } from './http.mjs';
import { summarizeResults } from './parsers.mjs';
import { deriveStrategy, getConfidenceLabel } from './strategy.mjs';
import {
  buildReport,
  compareWithPreviousReports,
  inferProvider,
  nowIso,
  writeReport,
} from './report.mjs';

const PROMPT = 'Compare 9.11 and 9.8. Think step by step before answering.';
const SLEEP_MS = 1200;
const TIMEOUT_MS = 45000;

function parseArgs(argv, env) {
  const modelId = argv[2];
  const argModeOrRepeats = argv[3] || '';
  const argRepeats = argv[4] || '';
  const mode = ['quick', 'full'].includes(argModeOrRepeats)
    ? argModeOrRepeats
    : (env.MS_PROBE_MODE || 'full').toLowerCase();
  const repeatsRaw = ['quick', 'full'].includes(argModeOrRepeats) ? argRepeats : argModeOrRepeats;
  const defaultRepeats = mode === 'quick' ? 1 : 2;

  return {
    modelId,
    mode,
    repeats: Number(repeatsRaw || env.MS_PROBE_REPEATS || defaultRepeats),
    apiKey: env.MS_API_KEY || env.MODELSCOPE_ACCESS_TOKEN || '',
  };
}

function validateConfig(config) {
  if (!config.modelId) {
    return [
      'Usage: node probe.mjs <Model/ID> [quick|full] [repeats]',
      'Examples:',
      '  node probe.mjs MiniMax/MiniMax-M2.5',
      '  node probe.mjs MiniMax/MiniMax-M2.5 quick',
      '  node probe.mjs MiniMax/MiniMax-M2.5 full 2',
    ];
  }
  if (!config.apiKey) {
    return [
      'Missing API key.',
      'Set MS_API_KEY (or MODELSCOPE_ACCESS_TOKEN) in your local env first.',
      'Example (.env.local):',
      '  MS_API_KEY=ms-xxxxxxxxxxxxxxxx',
    ];
  }
  if (!Number.isInteger(config.repeats) || config.repeats < 1 || config.repeats > 5) {
    return ['Invalid repeats. Use an integer between 1 and 5.'];
  }
  if (!['quick', 'full'].includes(config.mode)) {
    return ['Invalid mode. Use quick or full.'];
  }
  return [];
}

async function runCase(config, caseName, payload, options = {}) {
  const stream = options.stream === true;
  const repeats = options.repeats || config.repeats;
  const results = [];

  for (let i = 0; i < repeats; i += 1) {
    const result = await makeModelScopeRequest({
      apiKey: config.apiKey,
      modelId: config.modelId,
      prompt: PROMPT,
      payloadName: caseName,
      payload,
      stream,
      timeoutMs: TIMEOUT_MS,
    });
    results.push(result);
    if (i < repeats - 1) await sleep(SLEEP_MS);
  }

  return results;
}

function summarizeCase(results) {
  const summary = summarizeResults(results);
  const statuses = [...new Set(results.map((result) => result.statusCode))];
  const errorCategories = [
    ...new Set(results.map((result) => result.errorCategory).filter(Boolean)),
  ];

  return {
    ...summary,
    statuses,
    errorCategories,
  };
}

function printCase(index, name, summary) {
  console.log(
    `[${index}] ${name} accepted=${summary.acceptedCount}/${summary.samples} valid=${summary.validCount}/${summary.samples} reasoning=${summary.reasoningCount}/${summary.samples} avg=${summary.avgLatencyMs}ms`
  );
  if (summary.statuses.length > 0) console.log(`    statuses: ${summary.statuses.join(', ')}`);
  if (summary.errorCategories.length > 0)
    console.log(`    errors: ${summary.errorCategories.join(', ')}`);
}

function createDiagnostics(tests) {
  return Object.fromEntries(
    Object.entries(tests).map(([name, results]) => [name, summarizeCase(results)])
  );
}

export async function runProbeCli(argv = process.argv, env = process.env) {
  const config = parseArgs(argv, env);
  const validationErrors = validateConfig(config);
  if (validationErrors.length > 0) {
    for (const line of validationErrors) console.error(line);
    return 1;
  }

  console.log(`\n[PROBE] target=${config.modelId} mode=${config.mode} repeats=${config.repeats}`);

  const baseline = await runCase(config, 'baseline_non_stream', {}, { stream: false });
  const baselineSummary = summarizeCase(baseline);
  printCase(1, 'baseline non-stream', baselineSummary);
  if (!baselineSummary.acceptedMajority || !baselineSummary.validMajority) {
    console.error(
      'Baseline failed. Model may be unavailable, invalid key, or incompatible endpoint.'
    );
    return 1;
  }

  await sleep(SLEEP_MS);
  const unknownParam = await runCase(
    config,
    'strictness_unknown_param',
    { prism_dummy: true },
    { stream: false }
  );
  const unknownSummary = summarizeCase(unknownParam);
  const strict = baselineSummary.acceptedMajority && !unknownSummary.acceptedMajority;
  printCase(2, `strictness unknown-param -> strict=${strict ? 'yes' : 'no'}`, unknownSummary);

  await sleep(SLEEP_MS);
  const baselineStream = await runCase(config, 'baseline_stream', {}, { stream: true, repeats: 1 });
  const baselineStreamSummary = summarizeCase(baselineStream);
  printCase(3, 'baseline stream', baselineStreamSummary);

  const baselineReasoning = baselineSummary.reasoningMajority;
  let rootOn = [];
  let kwargsThinkingOn = [];
  let kwargsEnableOn = [];
  let rootOff = [];
  let kwargsThinkingOff = [];
  let kwargsEnableOff = [];

  if (!strict) {
    if (baselineReasoning) {
      rootOff = await runCase(
        config,
        'root_off',
        { enable_thinking: false },
        { stream: false, repeats: config.mode === 'quick' ? 1 : config.repeats }
      );
      printCase(4, 'root off', summarizeCase(rootOff));
      await sleep(SLEEP_MS);
      kwargsThinkingOff = await runCase(
        config,
        'kwargs_thinking_off',
        { chat_template_kwargs: { thinking: false } },
        { stream: false, repeats: config.mode === 'quick' ? 1 : config.repeats }
      );
      printCase(5, 'kwargs thinking off', summarizeCase(kwargsThinkingOff));
      if (config.mode === 'full') {
        await sleep(SLEEP_MS);
        kwargsEnableOff = await runCase(
          config,
          'kwargs_enable_off',
          { chat_template_kwargs: { enable_thinking: false } },
          { stream: false }
        );
        printCase(6, 'kwargs enable off', summarizeCase(kwargsEnableOff));
      }
    } else {
      rootOn = await runCase(config, 'root_on', { enable_thinking: true }, { stream: false });
      printCase(4, 'root on', summarizeCase(rootOn));
      await sleep(SLEEP_MS);
      kwargsThinkingOn = await runCase(
        config,
        'kwargs_thinking_on',
        { chat_template_kwargs: { thinking: true } },
        { stream: false, repeats: config.mode === 'quick' ? 1 : config.repeats }
      );
      printCase(5, 'kwargs thinking on', summarizeCase(kwargsThinkingOn));
      if (config.mode === 'full') {
        await sleep(SLEEP_MS);
        kwargsEnableOn = await runCase(
          config,
          'kwargs_enable_on',
          { chat_template_kwargs: { enable_thinking: true } },
          { stream: false }
        );
        printCase(6, 'kwargs enable on', summarizeCase(kwargsEnableOn));
      }
    }
  }

  const rootOnSummary = summarizeResults(rootOn);
  const kwargsThinkingOnSummary = summarizeResults(kwargsThinkingOn);
  const kwargsEnableOnSummary = summarizeResults(kwargsEnableOn);
  const rootOffSummary = summarizeResults(rootOff);
  const kwargsThinkingOffSummary = summarizeResults(kwargsThinkingOff);
  const kwargsEnableOffSummary = summarizeResults(kwargsEnableOff);

  const recommendation = deriveStrategy({
    mode: config.mode,
    strict,
    baselineReasoning,
    rootOnReasoning: rootOnSummary.acceptedMajority && rootOnSummary.reasoningMajority,
    kwargsThinkingOnReasoning:
      kwargsThinkingOnSummary.acceptedMajority && kwargsThinkingOnSummary.reasoningMajority,
    kwargsEnableOnReasoning:
      kwargsEnableOnSummary.acceptedMajority && kwargsEnableOnSummary.reasoningMajority,
    rootOffDisabled: rootOffSummary.acceptedMajority && !rootOffSummary.reasoningMajority,
    kwargsThinkingOffDisabled:
      kwargsThinkingOffSummary.acceptedMajority && !kwargsThinkingOffSummary.reasoningMajority,
    kwargsEnableOffDisabled:
      kwargsEnableOffSummary.acceptedMajority && !kwargsEnableOffSummary.reasoningMajority,
  });

  const acceptedSamples = baselineSummary.acceptedCount + baselineStreamSummary.acceptedCount;
  const parseErrors = baselineSummary.parseErrorCount + baselineStreamSummary.parseErrorCount;
  recommendation.confidence =
    recommendation.confidence ||
    getConfidenceLabel({
      mode: config.mode,
      acceptedSamples,
      parseErrors,
    });

  const tests = {
    baseline,
    strictnessUnknownParam: unknownParam,
    baselineStream,
    rootOn,
    kwargsThinkingOn,
    kwargsEnableOn,
    rootOff,
    kwargsThinkingOff,
    kwargsEnableOff,
  };

  const report = buildReport({
    generatedAt: nowIso(),
    modelId: config.modelId,
    provider: inferProvider(config.modelId),
    mode: config.mode,
    repeats: config.repeats,
    strict,
    baselineReasoning,
    streamReasoning: baselineStreamSummary.reasoningMajority,
    recommendation,
    diagnostics: createDiagnostics(tests),
    tests,
  });

  const { reportName, reportPath } = writeReport(report);
  const comparison = compareWithPreviousReports(report, reportName);
  if (comparison) {
    report.comparison = comparison;
    // Re-write with comparison appended, still without secrets.
    const fs = await import('node:fs');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  }

  console.log('\n[ANALYSIS]');
  console.log(`- strict: ${strict ? 'yes' : 'no'}`);
  console.log(`- reasoning detected (non-stream): ${baselineReasoning ? 'yes' : 'no'}`);
  console.log(
    `- reasoning detected (stream): ${baselineStreamSummary.reasoningMajority ? 'yes' : 'no'}`
  );
  console.log(`- suggested strategy: ${recommendation.strategy}`);
  console.log(`- confidence: ${recommendation.confidence}`);
  console.log(`- notes: ${recommendation.notes}`);

  if (comparison) {
    console.log('\n[COMPARE]');
    console.log(`- previous: ${comparison.previousReport}`);
    console.log(`- strategy changed: ${comparison.strategyChanged ? 'yes' : 'no'}`);
    console.log(`- confidence changed: ${comparison.confidenceChanged ? 'yes' : 'no'}`);
    console.log(`- strictness changed: ${comparison.strictnessChanged ? 'yes' : 'no'}`);
    console.log(`- baseline reasoning changed: ${comparison.reasoningChanged ? 'yes' : 'no'}`);
    console.log(`- regression risk: ${comparison.regressionRisk ? 'yes' : 'no'}`);
  }

  console.log('\n[RECOMMENDED lib/model-capabilities.ts PROFILE]');
  console.log(report.profileSnippet);
  console.log(`\n[REPORT] ${reportPath}`);

  return 0;
}
