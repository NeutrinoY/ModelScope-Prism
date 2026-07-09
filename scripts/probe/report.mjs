/**
 * Derive a profile suggestion from probe results (pure data transform).
 * The output is a starting point for a built-in ModelProfile; it enters
 * the codebase only through code review, never automatically.
 */

function outcome(results, id) {
  return results.find((result) => result.id === id);
}

function hasReasoning(result) {
  return Boolean(result?.ok && result.reasoning && result.reasoning.trim().length > 0);
}

function reasoningDisabled(result) {
  return Boolean(result?.ok && (!result.reasoning || result.reasoning.trim().length === 0));
}

/** Determine which thinking format can enable and disable reasoning. */
export function deriveThinkingProfile(results) {
  const baseline = outcome(results, 'baseline');
  const observedByDefault = hasReasoning(baseline);

  const formats = [
    {
      format: 'enable_thinking',
      on: 'thinking:enable_thinking:on',
      off: 'thinking:enable_thinking:off',
    },
    {
      format: 'chat_template_kwargs.enable_thinking',
      on: 'thinking:chat_template_kwargs:on',
      off: 'thinking:chat_template_kwargs:off',
    },
    { format: 'thinking.type', on: 'thinking:thinking.type:on', off: 'thinking:thinking.type:off' },
  ];

  for (const candidate of formats) {
    const onResult = outcome(results, candidate.on);
    const offResult = outcome(results, candidate.off);
    const canEnable = hasReasoning(onResult);
    const canDisable = reasoningDisabled(offResult);

    if (canEnable || (observedByDefault && canDisable)) {
      return {
        format: candidate.format,
        canEnable,
        canDisable,
        observedByDefault,
      };
    }
  }

  if (observedByDefault) {
    return {
      format: 'native_always_on',
      canEnable: true,
      canDisable: false,
      observedByDefault: true,
    };
  }

  return { format: 'none', canEnable: false, canDisable: false, observedByDefault: false };
}

export function deriveInputProfile(results) {
  const remote = outcome(results, 'input:image_url:remote');
  const dataUrl = outcome(results, 'input:image_url:data');
  return {
    text: Boolean(outcome(results, 'baseline')?.ok),
    imageUrl: remote ? remote.ok === true : 'unknown',
    imageDataUrl: dataUrl ? dataUrl.ok === true : 'unknown',
  };
}

export function deriveOutputProfile(results) {
  const maxTokens = outcome(results, 'output:max_tokens');
  const maxCompletion = outcome(results, 'output:max_completion_tokens');
  if (maxTokens?.ok) return { param: 'max_tokens' };
  if (maxCompletion?.ok) return { param: 'max_completion_tokens' };
  if (maxTokens || maxCompletion) return { param: 'none' };
  return { param: 'unknown' };
}

/** Assemble the full report object for one model. */
export function buildReport(model, results) {
  const baseline = outcome(results, 'baseline');
  return {
    model,
    probedAt: new Date().toISOString(),
    reachable: Boolean(baseline?.ok),
    baselineError: baseline?.ok ? null : (baseline?.error ?? null),
    profileSuggestion: {
      id: model,
      source: 'builtin',
      input: deriveInputProfile(results),
      thinking: deriveThinkingProfile(results),
      output: deriveOutputProfile(results),
    },
    cases: results.map((result) => ({
      id: result.id,
      group: result.group,
      description: result.description,
      ok: result.ok,
      status: result.status,
      durationMs: result.durationMs,
      contentPreview: result.content ? result.content.slice(0, 80) : null,
      reasoningObserved: hasReasoning(result),
      error: result.error ?? null,
    })),
  };
}
