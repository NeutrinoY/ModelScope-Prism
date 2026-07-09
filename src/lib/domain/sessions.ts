import type { ConversationMessage, Session, WorkspaceType } from '../contracts';
import { messageText } from './messages';

/**
 * Session domain helpers (pure rules): titles, ordering, previews.
 */

const DEFAULT_TITLES: Record<WorkspaceType, string> = {
  chat: 'New chat',
  vision: 'New vision session',
  image: 'New image session',
};

export function defaultSessionTitle(type: WorkspaceType): string {
  return DEFAULT_TITLES[type];
}

/** Derive a session title from the first user input (trimmed to maxLength). */
export function deriveSessionTitle(text: string, maxLength = 30): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}…`;
}

export function isDefaultTitle(title: string): boolean {
  return Object.values(DEFAULT_TITLES).includes(title);
}

export function sortSessionsByUpdatedAt(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function filterSessionsByType<T extends WorkspaceType>(
  sessions: Record<string, Session>,
  type: T
): Extract<Session, { type: T }>[] {
  return sortSessionsByUpdatedAt(
    Object.values(sessions).filter((session) => session.type === type)
  ) as Extract<Session, { type: T }>[];
}

/** Short content preview for the history list. */
export function sessionPreview(session: Session, maxLength = 60): string {
  if (session.type === 'image') {
    const latest = session.images[0];
    return latest ? deriveSessionTitle(latest.prompt, maxLength) : '';
  }
  const lastUserMessage = [...session.messages]
    .reverse()
    .find((message: ConversationMessage) => message.role === 'user');
  return lastUserMessage ? deriveSessionTitle(messageText(lastUserMessage), maxLength) : '';
}
