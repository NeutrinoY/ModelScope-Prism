export function classifyStatus(statusCode, parseError = null) {
  if (parseError === 'INVALID_JSON') return 'invalid_json';
  if (statusCode === 0) return 'network';
  if (statusCode === 408) return 'timeout';
  if (statusCode === 401 || statusCode === 403) return 'auth';
  if (statusCode === 429) return 'rate_limit';
  if (statusCode >= 500) return 'server';
  if (statusCode >= 400) return 'client';
  return null;
}

export function parseNonStreamResult(statusCode, body) {
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
      reasoningLength: 0,
      finishReason: null,
      contentPreview: '',
      reasoningPreview: '',
      rawLength: body.length,
      rawPreview: body.slice(0, 500),
      parseError,
      errorMessage: null,
      errorCategory: classifyStatus(statusCode, parseError),
    };
  }
  const errorMessage = parseErrorMessage(json);

  const choices = json.choices;
  if (statusCode === 200 && (!Array.isArray(choices) || choices.length === 0)) {
    return {
      statusCode: 400,
      mode: 'non_stream',
      accepted: false,
      validContent: false,
      hasReasoning: false,
      contentLength: 0,
      reasoningLength: 0,
      finishReason: null,
      contentPreview: '',
      reasoningPreview: '',
      rawLength: body.length,
      rawPreview: body.slice(0, 500),
      parseError: 'EMPTY_CHOICES',
      errorMessage,
      errorCategory: 'client',
    };
  }

  const message = choices?.[0]?.message || {};
  const finishReason =
    typeof choices?.[0]?.finish_reason === 'string' ? choices[0].finish_reason : null;
  const content = typeof message.content === 'string' ? message.content : '';
  const reasoning = typeof message.reasoning_content === 'string' ? message.reasoning_content : '';
  const usage = parseUsage(json.usage);

  return {
    statusCode,
    mode: 'non_stream',
    accepted: statusCode === 200,
    validContent: content.trim().length > 0,
    hasReasoning: reasoning.trim().length > 0,
    contentLength: content.length,
    reasoningLength: reasoning.length,
    finishReason,
    contentPreview: content.slice(0, 500),
    reasoningPreview: reasoning.slice(0, 500),
    rawLength: body.length,
    rawPreview: statusCode === 200 ? '' : body.slice(0, 500),
    usage,
    parseError: null,
    errorMessage,
    errorCategory: classifyStatus(statusCode),
  };
}

export function parseUsage(usage) {
  if (!usage || typeof usage !== 'object') return null;

  const completionDetails = usage.completion_tokens_details || {};
  const promptDetails = usage.prompt_tokens_details || {};

  return {
    promptTokens: Number.isFinite(usage.prompt_tokens) ? usage.prompt_tokens : null,
    completionTokens: Number.isFinite(usage.completion_tokens) ? usage.completion_tokens : null,
    totalTokens: Number.isFinite(usage.total_tokens) ? usage.total_tokens : null,
    reasoningTokens: Number.isFinite(completionDetails.reasoning_tokens)
      ? completionDetails.reasoning_tokens
      : null,
    cachedTokens: Number.isFinite(promptDetails.cached_tokens) ? promptDetails.cached_tokens : null,
  };
}

export function parseErrorMessage(json) {
  const error = json?.error;
  if (typeof error === 'string') return error.slice(0, 500);
  if (error && typeof error === 'object') {
    if (typeof error.message === 'string') return error.message.slice(0, 500);
    if (typeof error.code === 'string') return error.code.slice(0, 500);
  }
  if (typeof json?.message === 'string') return json.message.slice(0, 500);
  return null;
}

export function parseStreamResult(statusCode, raw) {
  const lines = raw.split('\n');
  let contentLength = 0;
  let reasoningLength = 0;
  let contentPreview = '';
  let reasoningPreview = '';
  let parsedChunks = 0;
  let parseErrors = 0;
  let usage = null;
  let finishReason = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'data: [DONE]') continue;
    if (!trimmed.startsWith('data: ')) continue;

    try {
      const chunk = JSON.parse(trimmed.slice(6));
      usage = parseUsage(chunk.usage) || usage;
      const chunkFinishReason = chunk?.choices?.[0]?.finish_reason;
      if (typeof chunkFinishReason === 'string') finishReason = chunkFinishReason;
      const delta = chunk?.choices?.[0]?.delta;
      if (!delta) continue;
      if (typeof delta.content === 'string') {
        contentLength += delta.content.length;
        contentPreview = `${contentPreview}${delta.content}`.slice(0, 500);
      }
      if (typeof delta.reasoning_content === 'string') {
        reasoningLength += delta.reasoning_content.length;
        reasoningPreview = `${reasoningPreview}${delta.reasoning_content}`.slice(0, 500);
      }
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
    reasoningLength,
    finishReason,
    contentPreview,
    reasoningPreview,
    rawLength: raw.length,
    rawPreview: statusCode === 200 ? '' : raw.slice(0, 500),
    usage,
    parsedChunks,
    parseErrors,
    parseError: parseErrors > 0 ? 'STREAM_CHUNK_PARSE_ERROR' : null,
    errorCategory: parseErrors > 0 ? 'invalid_json' : classifyStatus(statusCode),
  };
}

export function summarizeResults(results) {
  const threshold = Math.ceil(results.length / 2);
  const acceptedCount = results.filter((result) => result.accepted).length;
  const validCount = results.filter((result) => result.validContent).length;
  const reasoningCount = results.filter((result) => result.hasReasoning).length;
  const parseErrorCount = results.filter((result) => result.parseError).length;
  const usageCount = results.filter((result) => result.usage).length;
  const avgLatencyMs = Math.round(
    results.reduce((sum, result) => sum + result.durationMs, 0) / Math.max(results.length, 1)
  );

  return {
    samples: results.length,
    acceptedCount,
    validCount,
    reasoningCount,
    parseErrorCount,
    usageCount,
    acceptedMajority: results.length > 0 && acceptedCount >= threshold,
    validMajority: results.length > 0 && validCount >= threshold,
    reasoningMajority: results.length > 0 && reasoningCount >= threshold,
    usageMajority: results.length > 0 && usageCount >= threshold,
    avgLatencyMs,
  };
}
