/**
 * Probe case matrix (docs/rebuild/04 probe scope).
 *
 * Cases the probe may try — including multiple thinking formats — are
 * exactly what the runtime must never do. The probe exists to build
 * evidence for built-in profiles, offline.
 */

const PROBE_QUESTION = 'What is 17 + 25? Answer with just the number.';
const IMAGE_PROBE_QUESTION = 'Describe this image in one short sentence.';

const PROBE_REMOTE_IMAGE_URL =
  process.env.PRISM_PROBE_IMAGE_URL || 'https://resources.modelscope.cn/aigc/image_edit.png';

// A 1x1 red pixel PNG.
const PROBE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function textMessages() {
  return [{ role: 'user', content: PROBE_QUESTION }];
}

function imageMessages(url) {
  return [
    {
      role: 'user',
      content: [
        { type: 'text', text: IMAGE_PROBE_QUESTION },
        { type: 'image_url', image_url: { url } },
      ],
    },
  ];
}

/**
 * Build the case list for one model.
 * Groups: baseline, thinking (3 formats x on/off), input, output-limit.
 */
export function buildProbeCases(model, { includeImage = true, includeOutputLimit = true } = {}) {
  const base = { model, stream: true };

  const cases = [
    {
      id: 'baseline',
      group: 'baseline',
      description: 'No optional parameters (matches Prism Auto behavior)',
      payload: { ...base, messages: textMessages() },
    },
    {
      id: 'thinking:enable_thinking:on',
      group: 'thinking',
      description: 'Root boolean enable_thinking: true',
      payload: { ...base, messages: textMessages(), enable_thinking: true },
    },
    {
      id: 'thinking:enable_thinking:off',
      group: 'thinking',
      description: 'Root boolean enable_thinking: false',
      payload: { ...base, messages: textMessages(), enable_thinking: false },
    },
    {
      id: 'thinking:chat_template_kwargs:on',
      group: 'thinking',
      description: 'chat_template_kwargs.enable_thinking: true',
      payload: {
        ...base,
        messages: textMessages(),
        chat_template_kwargs: { enable_thinking: true },
      },
    },
    {
      id: 'thinking:chat_template_kwargs:off',
      group: 'thinking',
      description: 'chat_template_kwargs.enable_thinking: false',
      payload: {
        ...base,
        messages: textMessages(),
        chat_template_kwargs: { enable_thinking: false },
      },
    },
    {
      id: 'thinking:thinking.type:on',
      group: 'thinking',
      description: 'thinking: { type: "enabled" }',
      payload: { ...base, messages: textMessages(), thinking: { type: 'enabled' } },
    },
    {
      id: 'thinking:thinking.type:off',
      group: 'thinking',
      description: 'thinking: { type: "disabled" }',
      payload: { ...base, messages: textMessages(), thinking: { type: 'disabled' } },
    },
  ];

  if (includeImage) {
    cases.push(
      {
        id: 'input:image_url:remote',
        group: 'input',
        description: 'Public URL image input',
        payload: { ...base, messages: imageMessages(PROBE_REMOTE_IMAGE_URL) },
      },
      {
        id: 'input:image_url:data',
        group: 'input',
        description: 'Base64 data URL image input',
        payload: { ...base, messages: imageMessages(PROBE_DATA_URL) },
      }
    );
  }

  if (includeOutputLimit) {
    cases.push(
      {
        id: 'output:max_tokens',
        group: 'output',
        description: 'max_tokens: 64',
        payload: { ...base, messages: textMessages(), max_tokens: 64 },
      },
      {
        id: 'output:max_completion_tokens',
        group: 'output',
        description: 'max_completion_tokens: 64',
        payload: { ...base, messages: textMessages(), max_completion_tokens: 64 },
      }
    );
  }

  return cases;
}
