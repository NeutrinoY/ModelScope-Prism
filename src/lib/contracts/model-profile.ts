import type { OutputLimitParam, ThinkingFormat } from './conversation';

/**
 * Model profile contract (docs/rebuild/05-interface-contract.md).
 *
 * A profile describes known capabilities. It may drive UI hints and default
 * visible formats, but it never causes Auto to auto-send behavior parameters.
 */

export type ModelProfileSource = 'builtin' | 'custom';

export type Unknownable<T> = T | 'unknown';

export type ModelProfile = {
  id: string;
  label: string;
  source: ModelProfileSource;
  input: {
    text: boolean;
    imageUrl: Unknownable<boolean>;
    imageDataUrl: Unknownable<boolean>;
  };
  thinking: {
    format: ThinkingFormat | 'none' | 'native_always_on' | 'unknown';
    canEnable: Unknownable<boolean>;
    canDisable: Unknownable<boolean>;
    observedByDefault: Unknownable<boolean>;
  };
  output: {
    param: OutputLimitParam | 'none' | 'unknown';
    standard?: number;
    high?: number;
  };
};
