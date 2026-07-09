import {
  activeImageTaskSchema,
  activeSessionByWorkspaceSchema,
  prismSecretsSchema,
  prismSettingsSchema,
  sessionSchema,
  type ActiveImageTask,
  type ActiveSessionByWorkspace,
  type PrismSecrets,
  type PrismSettings,
  type PrismStorageV1,
  type Session,
} from '../contracts';
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

function readObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function recoverSecrets(value: unknown, legacyApiKey: unknown): PrismSecrets {
  const fallbackApiKey = typeof legacyApiKey === 'string' ? legacyApiKey : undefined;
  const parsed = prismSecretsSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data.apiKey || !fallbackApiKey
      ? parsed.data
      : { ...parsed.data, apiKey: fallbackApiKey };
  }
  return fallbackApiKey ? { apiKey: fallbackApiKey } : {};
}

function recoverSettings(value: unknown, defaults: PrismStorageV1): PrismSettings {
  const parsed = prismSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : defaults.settings;
}

function recoverSessions(value: unknown): Record<string, Session> {
  const object = readObject(value);
  if (!object) return {};

  const sessions: Record<string, Session> = {};
  for (const [id, session] of Object.entries(object)) {
    const parsed = sessionSchema.safeParse(session);
    if (parsed.success) {
      sessions[id] = parsed.data;
    }
  }
  return sessions;
}

function recoverActiveSessions(
  value: unknown,
  sessions: Record<string, Session>,
  defaults: PrismStorageV1
): ActiveSessionByWorkspace {
  const parsed = activeSessionByWorkspaceSchema.safeParse(value);
  const active = parsed.success ? parsed.data : defaults.activeSessionByWorkspace;

  return {
    chat: active.chat && sessions[active.chat]?.type === 'chat' ? active.chat : null,
    vision: active.vision && sessions[active.vision]?.type === 'vision' ? active.vision : null,
    image: active.image && sessions[active.image]?.type === 'image' ? active.image : null,
  };
}

function recoverActiveImageTask(
  value: unknown,
  sessions: Record<string, Session>
): ActiveImageTask | undefined {
  const parsed = activeImageTaskSchema.safeParse(value);
  if (!parsed.success) return undefined;
  return sessions[parsed.data.sessionId]?.type === 'image' ? parsed.data : undefined;
}

export function migrateStorage(raw: unknown): MigrationResult {
  const candidate = readObject(raw);
  if (!candidate) {
    return { ok: false, reason: 'unrecognized' };
  }

  if (candidate.schemaVersion === CURRENT_SCHEMA_VERSION) {
    // Current version: recover each top-level section independently. This
    // preserves valid sessions even if one preference field becomes malformed.
    const defaults = createDefaultStorage();
    const sessions = recoverSessions(candidate.sessions);
    const activeImageTask = recoverActiveImageTask(candidate.activeImageTask, sessions);

    return {
      ok: true,
      migrated: false,
      data: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        secrets: recoverSecrets(candidate.secrets, candidate.apiKey),
        settings: recoverSettings(candidate.settings, defaults),
        sessions,
        activeSessionByWorkspace: recoverActiveSessions(
          candidate.activeSessionByWorkspace,
          sessions,
          defaults
        ),
        ...(activeImageTask ? { activeImageTask } : {}),
      },
    };
  }

  // Future versions register their upgrade steps here:
  // if (candidate.schemaVersion === 0) { ...upgrade to 1... }

  return { ok: false, reason: 'unrecognized' };
}
