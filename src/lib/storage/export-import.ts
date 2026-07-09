import type { ActiveSessionByWorkspace, PrismExportV1, PrismSettings, Session } from '../contracts';
import { prismExportV1Schema } from '../contracts';

/**
 * Local data export / import (docs/rebuild/06).
 *
 * Export never includes the access token, the active image task, or
 * transient UI state. Import is validate -> preview -> confirm replace;
 * the user re-confirms the token afterwards.
 */

export type ExportInput = {
  settings: PrismSettings;
  sessions: Record<string, Session>;
  activeSessionByWorkspace: ActiveSessionByWorkspace;
};

export function createExport(input: ExportInput): PrismExportV1 {
  return {
    app: 'modelscope-prism',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      settings: input.settings,
      sessions: input.sessions,
      activeSessionByWorkspace: input.activeSessionByWorkspace,
    },
  };
}

export function serializeExport(input: ExportInput): string {
  return JSON.stringify(createExport(input), null, 2);
}

export type ImportPreview = {
  exportedAt: string;
  chatSessions: number;
  visionSessions: number;
  imageSessions: number;
  generatedImages: number;
};

export type ImportParseResult =
  | { ok: true; data: PrismExportV1; preview: ImportPreview }
  | { ok: false; reason: 'invalid_json' | 'invalid_schema' };

export function parseImportFile(text: string): ImportParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }

  const parsed = prismExportV1Schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: 'invalid_schema' };
  }

  const sessions = Object.values(parsed.data.data.sessions);
  const preview: ImportPreview = {
    exportedAt: parsed.data.exportedAt,
    chatSessions: sessions.filter((s) => s.type === 'chat').length,
    visionSessions: sessions.filter((s) => s.type === 'vision').length,
    imageSessions: sessions.filter((s) => s.type === 'image').length,
    generatedImages: sessions.reduce(
      (total, s) => total + (s.type === 'image' ? s.images.length : 0),
      0
    ),
  };

  return { ok: true, data: parsed.data as PrismExportV1, preview };
}
