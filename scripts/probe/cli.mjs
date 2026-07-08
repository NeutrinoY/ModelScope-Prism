import { makeModelScopeRequest, sleep } from './http.mjs';
import { summarizeResults } from './parsers.mjs';
import { deriveThinkingProfile } from './strategy.mjs';
import { buildReport, inferProvider, nowIso, writeReport } from './report.mjs';

const THINKING_PROMPT = 'Compare 9.11 and 9.8. Think step by step before answering.';
const LONG_OUTPUT_PROMPT = [
  'Write exactly 80 numbered lines about the benefits of careful software testing.',
  'Each line must be a complete sentence.',
  'Do not summarize and do not stop early.',
].join(' ');
const VISION_PROMPT = 'What is the dominant color of this image? Reply with one English word.';
const RED_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAWSURBVChTY/jPwPAfH2ZAF0DHw0MBAMLXf4F1N6FEAAAAAElFTkSuQmCC';
const RED_IMAGE_URL = 'https://dummyimage.com/64x64/ff0000/ffffff.png';
const SLEEP_MS = 1500;
const TIMEOUT_MS = 45_000;
const TOKEN_PROBE_CAP = 64;
const PREFERRED_MAX_TOKENS = 16_384;

function parseArgs(argv, env) {
  return {
    modelId: argv[2],
    apiKey: env.MS_API_KEY || env.MODELSCOPE_ACCESS_TOKEN || '',
  };
}

function validateConfig(config) {
  if (!config.modelId) {
    return [
      'Usage: node probe.mjs <Model/ID>',
      'Example:',
      '  node probe.mjs Qwen/Qwen3.5-397B-A17B',
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
  return [];
}

async function runCase(config, caseName, payload, options = {}) {
  return makeModelScopeRequest({
    apiKey: config.apiKey,
    modelId: config.modelId,
    messages: options.messages,
    prompt: options.prompt || THINKING_PROMPT,
    payloadName: caseName,
    payload,
    stream: options.stream === true,
    timeoutMs: TIMEOUT_MS,
  });
}

function summarizeCase(result) {
  const summary = summarizeResults([result]);
  return {
    ...summary,
    statusCode: result.statusCode,
    errorCategory: result.errorCategory || null,
    errorMessage: result.errorMessage || null,
    finishReason: result.finishReason || null,
    rawPreview: result.rawPreview || '',
  };
}

function printCase(index, name, result) {
  const summary = summarizeCase(result);
  console.log(
    `[${index}] ${name} accepted=${summary.acceptedCount}/1 valid=${summary.validCount}/1 reasoning=${summary.reasoningCount}/1 latency=${summary.avgLatencyMs}ms`
  );
  if (summary.statusCode) console.log(`    status: ${summary.statusCode}`);
  if (summary.errorCategory) console.log(`    error: ${summary.errorCategory}`);
  if (summary.errorMessage) console.log(`    message: ${summary.errorMessage}`);
  if (summary.rawPreview) console.log(`    raw: ${summary.rawPreview}`);
  if (summary.finishReason) console.log(`    finish: ${summary.finishReason}`);
}

function createDiagnostics(tests) {
  return Object.fromEntries(
    Object.entries(tests).map(([name, result]) => [name, summarizeCase(result)])
  );
}

function classifyAvailabilityStatus(result) {
  if (result.accepted && result.validContent) return 'available';

  if (result.errorCategory === 'auth') return 'auth_error';
  if (result.errorCategory === 'rate_limit') return 'quota_limited';
  if (result.errorCategory === 'server') return 'server_error';
  return 'unavailable';
}

function hasReasoning(result) {
  return result.accepted === true && result.hasReasoning === true;
}

function disablesReasoning(result) {
  return result.accepted === true && result.hasReasoning !== true;
}

function visionSucceeded(result) {
  if (!result.accepted || !result.validContent) return false;
  return /\b(red|scarlet|crimson)\b/i.test(result.contentPreview || '');
}

function tokenParamEffective(result) {
  if (!result.accepted || !result.validContent) return false;
  if (result.finishReason === 'length') return true;
  if (result.usage?.completionTokens && result.usage.completionTokens <= TOKEN_PROBE_CAP + 8) {
    return true;
  }
  return result.contentLength > 0 && result.contentLength < 500;
}

function buildVisionMessages(imageUrl) {
  return [
    {
      role: 'user',
      content: [
        { type: 'text', text: VISION_PROMPT },
        { type: 'image_url', image_url: { url: imageUrl } },
      ],
    },
  ];
}

async function waitBetweenCases() {
  await sleep(SLEEP_MS);
}

export async function runProbeCli(argv = process.argv, env = process.env) {
  const config = parseArgs(argv, env);
  const validationErrors = validateConfig(config);
  if (validationErrors.length > 0) {
    for (const line of validationErrors) console.error(line);
    return 1;
  }

  console.log(`\n[PROBE] target=${config.modelId}`);

  const tests = {};
  let caseIndex = 1;

  tests.baseline = await runCase(config, 'text_baseline', {}, { stream: false });
  printCase(caseIndex++, 'text baseline', tests.baseline);

  if (!tests.baseline.accepted || !tests.baseline.validContent) {
    const capability = {
      availability: {
        chat: false,
        stream: false,
        status: classifyAvailabilityStatus(tests.baseline),
        latencyMs: tests.baseline.durationMs || null,
      },
      input: {
        text: false,
        imageUrl: false,
        imageDataUrl: false,
      },
      thinking: {
        control: 'none',
        defaultEnabled: false,
        canDisable: true,
        notes:
          'Baseline chat completion failed. The model may be unavailable, missing an inference provider, blocked by quota, or incompatible with the endpoint.',
      },
      output: {
        maxTokenParam: 'none',
        preferredMaxTokens: null,
      },
    };

    const report = buildReport({
      generatedAt: nowIso(),
      modelId: config.modelId,
      provider: inferProvider(config.modelId),
      capability,
      diagnostics: createDiagnostics(tests),
      tests,
    });
    const { reportPath, overviewPath } = writeReport(report);
    console.log('\n[ANALYSIS]');
    console.log(`- status: ${capability.availability.status}`);
    console.log(`\n[REPORT] ${reportPath}`);
    console.log(`[OVERVIEW] ${overviewPath}`);
    return 1;
  }

  await waitBetweenCases();
  tests.stream = await runCase(config, 'text_stream', {}, { stream: true });
  printCase(caseIndex++, 'text stream', tests.stream);

  const baselineReasoning = hasReasoning(tests.baseline);

  if (baselineReasoning) {
    await waitBetweenCases();
    tests.rootOff = await runCase(config, 'thinking_root_off', { enable_thinking: false });
    printCase(caseIndex++, 'thinking root off', tests.rootOff);

    await waitBetweenCases();
    tests.kwargsOff = await runCase(config, 'thinking_kwargs_off', {
      chat_template_kwargs: { thinking: false, enable_thinking: false },
    });
    printCase(caseIndex++, 'thinking kwargs off', tests.kwargsOff);

    await waitBetweenCases();
    tests.thinkingTypeOff = await runCase(config, 'thinking_type_off', {
      thinking: { type: 'disabled' },
    });
    printCase(caseIndex++, 'thinking.type off', tests.thinkingTypeOff);
  } else {
    await waitBetweenCases();
    tests.rootOn = await runCase(config, 'thinking_root_on', { enable_thinking: true });
    printCase(caseIndex++, 'thinking root on', tests.rootOn);

    await waitBetweenCases();
    tests.kwargsOn = await runCase(config, 'thinking_kwargs_on', {
      chat_template_kwargs: { thinking: true, enable_thinking: true },
    });
    printCase(caseIndex++, 'thinking kwargs on', tests.kwargsOn);

    await waitBetweenCases();
    tests.thinkingTypeOn = await runCase(config, 'thinking_type_on', {
      thinking: { type: 'enabled' },
    });
    printCase(caseIndex++, 'thinking.type on', tests.thinkingTypeOn);
  }

  await waitBetweenCases();
  tests.visionDataUrl = await runCase(
    config,
    'vision_data_url',
    {},
    { messages: buildVisionMessages(RED_PNG_DATA_URL) }
  );
  printCase(caseIndex++, 'vision data URL', tests.visionDataUrl);

  await waitBetweenCases();
  tests.visionUrl = await runCase(
    config,
    'vision_url',
    {},
    { messages: buildVisionMessages(RED_IMAGE_URL) }
  );
  printCase(caseIndex++, 'vision image URL', tests.visionUrl);

  await waitBetweenCases();
  tests.maxTokens = await runCase(
    config,
    'max_tokens_cap',
    { max_tokens: TOKEN_PROBE_CAP },
    { prompt: LONG_OUTPUT_PROMPT }
  );
  printCase(caseIndex++, `max_tokens cap ${TOKEN_PROBE_CAP}`, tests.maxTokens);

  let maxTokenParam = 'none';
  if (tokenParamEffective(tests.maxTokens)) {
    maxTokenParam = 'max_tokens';
  } else {
    await waitBetweenCases();
    tests.maxCompletionTokens = await runCase(
      config,
      'max_completion_tokens_cap',
      { max_completion_tokens: TOKEN_PROBE_CAP },
      { prompt: LONG_OUTPUT_PROMPT }
    );
    printCase(
      caseIndex++,
      `max_completion_tokens cap ${TOKEN_PROBE_CAP}`,
      tests.maxCompletionTokens
    );

    if (tokenParamEffective(tests.maxCompletionTokens)) {
      maxTokenParam = 'max_completion_tokens';
    }
  }

  const thinking = deriveThinkingProfile({
    baselineReasoning,
    rootOnReasoning: hasReasoning(tests.rootOn || {}),
    kwargsOnReasoning: hasReasoning(tests.kwargsOn || {}),
    thinkingTypeOnReasoning: hasReasoning(tests.thinkingTypeOn || {}),
    rootOffDisabled: disablesReasoning(tests.rootOff || {}),
    kwargsOffDisabled: disablesReasoning(tests.kwargsOff || {}),
    thinkingTypeOffDisabled: disablesReasoning(tests.thinkingTypeOff || {}),
  });

  const capability = {
    availability: {
      chat: tests.baseline.accepted && tests.baseline.validContent,
      stream: tests.stream.accepted && tests.stream.validContent,
      status: classifyAvailabilityStatus(tests.baseline),
      latencyMs: tests.stream.durationMs || tests.baseline.durationMs || null,
    },
    input: {
      text: tests.baseline.accepted && tests.baseline.validContent,
      imageUrl: visionSucceeded(tests.visionUrl),
      imageDataUrl: visionSucceeded(tests.visionDataUrl),
    },
    thinking,
    output: {
      maxTokenParam,
      preferredMaxTokens: maxTokenParam === 'none' ? null : PREFERRED_MAX_TOKENS,
    },
  };

  const report = buildReport({
    generatedAt: nowIso(),
    modelId: config.modelId,
    provider: inferProvider(config.modelId),
    capability,
    diagnostics: createDiagnostics(tests),
    tests,
  });

  const { reportPath, overviewPath } = writeReport(report);

  console.log('\n[ANALYSIS]');
  console.log(`- chat: ${capability.availability.chat ? 'yes' : 'no'}`);
  console.log(`- stream: ${capability.availability.stream ? 'yes' : 'no'}`);
  console.log(`- image URL: ${capability.input.imageUrl ? 'yes' : 'no'}`);
  console.log(`- image data URL: ${capability.input.imageDataUrl ? 'yes' : 'no'}`);
  console.log(`- thinking control: ${capability.thinking.control}`);
  console.log(`- thinking default enabled: ${capability.thinking.defaultEnabled ? 'yes' : 'no'}`);
  console.log(`- thinking can disable: ${capability.thinking.canDisable ? 'yes' : 'no'}`);
  console.log(`- output token parameter: ${capability.output.maxTokenParam}`);

  console.log('\n[RECOMMENDED lib/model-capabilities.ts PROFILE]');
  console.log(report.profileSnippet);
  console.log(`\n[REPORT] ${reportPath}`);
  console.log(`[OVERVIEW] ${overviewPath}`);

  return 0;
}
