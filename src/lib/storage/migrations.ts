import type { PrismStorageV1 } from '../contracts';
import { createDefaultStorage } from './defaults';

/**
 * Storage schema versioning and migration (docs/rebuild/06).
 *
 * Migrations are pure data transforms. Unknown or unmigratable data falls
 * back to defaults rather than crashing, but recognizable user sessions
 * are never silently dropped when a migration path exists.
 */

export const CURRENT_SCHEMA_VERSION = 1 as const;

export type MigrationResult =
  | { ok: true; data: PrismStorageV1; migrated: boolean }
  | { ok: false; reason: 'unrecognized' };

export function migrateStorage(raw: unknown): MigrationResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, reason: 'unrecognized' };
  }

  const candidate = raw as { schemaVersion?: unknown };

  if (candidate.schemaVersion === CURRENT_SCHEMA_VERSION) {
    // Current version: fill any missing top-level fields defensively.
    const defaults = createDefaultStorage();
    const data = raw as Partial<PrismStorageV1>;
    return {
      ok: true,
      migrated: false,
      data: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        secrets: data.secrets ?? defaults.secrets,
        settings: data.settings ?? defaults.settings,
        sessions: data.sessions ?? defaults.sessions,
        activeSessionByWorkspace:
          data.activeSessionByWorkspace ?? defaults.activeSessionByWorkspace,
        ...(data.activeImageTask ? { activeImageTask: data.activeImageTask } : {}),
      },
    };
  }

  // Future versions register their upgrade steps here:
  // if (candidate.schemaVersion === 0) { ...upgrade to 1... }

  return { ok: false, reason: 'unrecognized' };
}
