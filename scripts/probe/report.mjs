import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_MAX_TOKENS = 16_384;
const HIGH_MAX_TOKENS = 65_536;

export function nowIso() {
  return new Date().toISOString();
}

export function slugifyModelId(modelId) {
  return modelId.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

export function inferProvider(modelId) {
  return modelId.split('/')[0] || 'unknown';
}

export function inferLabel(modelId) {
  const shortName = modelId.split('/').pop() || modelId;
  return shortName.replace(/[-_]/g, ' ');
}

export function buildProfileSnippet({
  modelId,
  provider,
  label,
  modalities = ['text'],
  availability,
  input,
  thinking,
  output,
}) {
  const modalityText = modalities.map((modality) => `'${modality}'`).join(', ');
  const chat = availability?.chat === true;
  const stream = availability?.stream === true;
  const status = availability?.status || 'unknown';
  const text = input?.text !== false;
  const imageUrl = input?.imageUrl === true;
  const imageDataUrl = input?.imageDataUrl === true;
  const control = thinking?.control || 'none';
  const defaultEnabled = thinking?.defaultEnabled === true;
  const canDisable = thinking?.canDisable !== false;
  const maxTokenParam = output?.maxTokenParam || 'none';

  return `'${modelId}': {
  id: '${modelId}',
  label: '${label || inferLabel(modelId)}',
  provider: '${provider || inferProvider(modelId)}',
  source: 'builtin',
  modalities: [${modalityText}],
  availability: { chat: ${chat}, stream: ${stream}, status: '${status}' },
  input: { text: ${text}, imageUrl: ${imageUrl}, imageDataUrl: ${imageDataUrl} },
  thinking: { control: '${control}', defaultEnabled: ${defaultEnabled}, canDisable: ${canDisable} },
  output: { maxTokenParam: '${maxTokenParam}', defaultMaxTokens: ${DEFAULT_MAX_TOKENS}, highMaxTokens: ${HIGH_MAX_TOKENS} },
}`;
}

export function buildReport(options) {
  const capability = options.capability || {
    availability: {
      chat: false,
      stream: false,
      status: 'unavailable',
      latencyMs: null,
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
      notes: 'No probe capability was supplied.',
    },
    output: {
      maxTokenParam: 'none',
      preferredMaxTokens: null,
    },
  };

  const modalities =
    options.modalities ||
    (capability.input.imageUrl || capability.input.imageDataUrl ? ['text', 'image'] : ['text']);
  const profileSnippet = buildProfileSnippet({
    modelId: options.modelId,
    provider: options.provider,
    label: options.label,
    modalities,
    availability: capability.availability,
    input: capability.input,
    thinking: capability.thinking,
    output: capability.output,
  });

  return {
    generatedAt: options.generatedAt || nowIso(),
    modelId: options.modelId,
    provider: options.provider || inferProvider(options.modelId),
    capability,
    diagnostics: options.diagnostics || {},
    tests: options.tests || {},
    profileSnippet,
  };
}

export function buildMarkdownOverview(report) {
  const capability = report.capability;
  const lines = [
    `# ${inferLabel(report.modelId)} Probe Overview`,
    '',
    `- Model: \`${report.modelId}\``,
    `- Generated: ${report.generatedAt}`,
    '',
    '## Compatibility',
    '',
    `- Chat: ${capability.availability.chat ? 'yes' : 'no'}`,
    `- Stream: ${capability.availability.stream ? 'yes' : 'no'}`,
    `- Status: ${capability.availability.status}`,
    `- Avg latency: ${capability.availability.latencyMs ?? 'unknown'}ms`,
    `- Image URL input: ${capability.input.imageUrl ? 'yes' : 'no'}`,
    `- Image data URL input: ${capability.input.imageDataUrl ? 'yes' : 'no'}`,
    `- Thinking control: ${capability.thinking.control}`,
    `- Thinking default enabled: ${capability.thinking.defaultEnabled ? 'yes' : 'no'}`,
    `- Thinking can disable: ${capability.thinking.canDisable ? 'yes' : 'no'}`,
    `- Output token parameter: ${capability.output.maxTokenParam}`,
    `- Preferred max tokens: ${capability.output.preferredMaxTokens ?? 'none'}`,
    '',
    '## Recommended Profile',
    '',
    '```ts',
    report.profileSnippet,
    '```',
    '',
    '## Notes',
    '',
    `- ${capability.thinking.notes}`,
  ];

  return `${lines.join('\n')}\n`;
}

function ensureReportDir(cwd) {
  const reportDir = path.join(cwd, 'probe-reports');
  fs.mkdirSync(reportDir, { recursive: true });
  return reportDir;
}

export function writeReport(report, cwd = process.cwd()) {
  const reportDir = ensureReportDir(cwd);
  const baseName = `probe-report-${slugifyModelId(report.modelId)}-${Date.now()}`;
  const reportName = `${baseName}.json`;
  const overviewName = `${baseName}.md`;
  const reportPath = path.join(reportDir, reportName);
  const overviewPath = path.join(reportDir, overviewName);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(overviewPath, buildMarkdownOverview(report), 'utf-8');
  return { reportName, reportPath, overviewName, overviewPath };
}
