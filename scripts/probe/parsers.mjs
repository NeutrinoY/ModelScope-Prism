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
      rawLength: body.length,
      parseError,
      errorCategory: classifyStatus(statusCode, parseError),
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
      reasoningLength: 0,
      rawLength: body.length,
      parseError: 'EMPTY_CHOICES',
      errorCategory: 'client',
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
    reasoningLength: reasoning.length,
    rawLength: body.length,
    parseError: null,
    errorCategory: classifyStatus(statusCode),
  };
}

export function parseStreamResult(statusCode, raw) {
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
      if (typeof delta.reasoning_content === 'string')
        reasoningLength += delta.reasoning_content.length;
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
    rawLength: raw.length,
    parsedChunks,
    parseErrors,
    parseError: parseErrors > 0 ? 'STREAM_CHUNK_PARSE_ERROR' : null,
    errorCategory: parseErrors > 0 ? 'invalid_json' : classifyStatus(statusCode),
  };
}

export function summarizeResults(results) {
  const acceptedCount = results.filter((result) => result.accepted).length;
  const validCount = results.filter((result) => result.validContent).length;
  const reasoningCount = results.filter((result) => result.hasReasoning).length;
  const parseErrorCount = results.filter((result) => result.parseError).length;
  const avgLatencyMs = Math.round(
    results.reduce((sum, result) => sum + result.durationMs, 0) / Math.max(results.length, 1)
  );

  return {
    samples: results.length,
    acceptedCount,
    validCount,
    reasoningCount,
    parseErrorCount,
    acceptedMajority: acceptedCount >= Math.ceil(results.length / 2),
    validMajority: validCount >= Math.ceil(results.length / 2),
    reasoningMajority: reasoningCount >= Math.ceil(results.length / 2),
    avgLatencyMs,
  };
}
