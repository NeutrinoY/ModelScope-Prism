import fs from 'node:fs';
import path from 'node:path';

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

export function buildProfileSnippet({ modelId, strategy, provider, label, modalities = ['text'] }) {
  const modalityText = modalities.map((modality) => `'${modality}'`).join(', ');
  return `'${modelId}': {
  id: '${modelId}',
  label: '${label || inferLabel(modelId)}',
  provider: '${provider || inferProvider(modelId)}',
  modalities: [${modalityText}],
  thinking: {
    control: '${strategy}',
    defaultEnabled: ${strategy === 'native_always_on'},
    canDisable: ${strategy !== 'native_always_on'}
  }
}`;
}

export function buildReport(options) {
  const profileSnippet = buildProfileSnippet({
    modelId: options.modelId,
    strategy: options.recommendation.strategy,
    provider: options.provider,
    label: options.label,
    modalities: options.modalities,
  });

  return {
    generatedAt: options.generatedAt || nowIso(),
    modelId: options.modelId,
    mode: options.mode,
    repeats: options.repeats,
    strict: options.strict,
    baselineReasoning: options.baselineReasoning,
    streamReasoning: options.streamReasoning,
    recommendation: options.recommendation,
    diagnostics: options.diagnostics || {},
    tests: options.tests,
    profileSnippet,
  };
}

export function writeReport(report, cwd = process.cwd()) {
  const reportName = `probe-report-${slugifyModelId(report.modelId)}-${Date.now()}.json`;
  const reportPath = path.join(cwd, reportName);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  return { reportName, reportPath };
}

export function compareWithPreviousReports(report, currentReportName, cwd = process.cwd()) {
  const prefix = `probe-report-${slugifyModelId(report.modelId)}-`;
  const candidates = fs
    .readdirSync(cwd)
    .filter(
      (name) => name.startsWith(prefix) && name.endsWith('.json') && name !== currentReportName
    )
    .sort();
  const previous = candidates[candidates.length - 1];
  if (!previous) return null;

  try {
    const previousPath = path.join(cwd, previous);
    const previousReport = JSON.parse(fs.readFileSync(previousPath, 'utf-8'));
    return {
      previousReport: previous,
      strategyChanged: previousReport?.recommendation?.strategy !== report.recommendation.strategy,
      confidenceChanged:
        previousReport?.recommendation?.confidence !== report.recommendation.confidence,
      strictnessChanged: previousReport?.strict !== report.strict,
      reasoningChanged: previousReport?.baselineReasoning !== report.baselineReasoning,
      regressionRisk:
        previousReport?.recommendation?.strategy !== report.recommendation.strategy ||
        previousReport?.strict !== report.strict ||
        previousReport?.baselineReasoning !== report.baselineReasoning,
    };
  } catch {
    return null;
  }
}
