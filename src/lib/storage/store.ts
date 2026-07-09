import { del, get, set } from 'idb-keyval';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type {
  ActiveImageTask,
  ActiveSessionByWorkspace,
  ChatSession,
  ConversationMessage,
  ConversationSessionSettings,
  GeneratedImage,
  ImageSession,
  ImageSessionSettings,
  PrismExportV1,
  PrismSecrets,
  PrismSettings,
  Session,
  VisionSession,
  WorkspaceType,
} from '../contracts';
import { defaultSessionTitle } from '../domain';
import { createDefaultStorage } from './defaults';
import { CURRENT_SCHEMA_VERSION, migrateStorage } from './migrations';

/**
 * The local-first store (docs/rebuild/06).
 *
 * State enters features exclusively through this store — components never
 * touch IndexedDB directly. New sessions copy global defaults; existing
 * sessions keep their own modelId and settings.
 */

const STORAGE_KEY = 'prism-storage-v1';

const idbStorage: StateStorage = {
  getItem: async (name) => (await get(name)) || null,
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};

type PrismState = {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  secrets: PrismSecrets;
  settings: PrismSettings;
  sessions: Record<string, Session>;
  activeSessionByWorkspace: ActiveSessionByWorkspace;
  activeImageTask: ActiveImageTask | null;
  hasHydrated: boolean;

  // secrets
  setApiKey: (apiKey: string) => void;
  clearApiKey: () => void;

  // settings
  setCurrentWorkspace: (workspace: WorkspaceType) => void;
  updateSettings: (update: Partial<Omit<PrismSettings, 'currentWorkspace'>>) => void;

  // sessions
  createSession: (type: WorkspaceType, modelId?: string) => string;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  setActiveSession: (workspace: WorkspaceType, id: string | null) => void;
  setSessionModelId: (id: string, modelId: string) => void;
  setSessionMessages: (id: string, messages: ConversationMessage[]) => void;
  updateConversationSessionSettings: (
    id: string,
    settings: Partial<ConversationSessionSettings>
  ) => void;
  addGeneratedImage: (id: string, image: GeneratedImage) => void;
  updateImageSessionSettings: (id: string, settings: Partial<ImageSessionSettings>) => void;

  // active image task
  setActiveImageTask: (task: ActiveImageTask | null) => void;

  // import
  replaceFromImport: (data: PrismExportV1) => void;

  setHasHydrated: (value: boolean) => void;
};

function touchSession<T extends Session>(session: T): T {
  return { ...session, updatedAt: Date.now() };
}

export const usePrismStore = create<PrismState>()(
  persist(
    (setState, getState) => {
      const defaults = createDefaultStorage();

      return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        secrets: defaults.secrets,
        settings: defaults.settings,
        sessions: {},
        activeSessionByWorkspace: defaults.activeSessionByWorkspace,
        activeImageTask: null,
        hasHydrated: false,

        setApiKey: (apiKey) =>
          setState((state) => ({ secrets: { ...state.secrets, apiKey: apiKey.trim() } })),
        clearApiKey: () => setState((state) => ({ secrets: { ...state.secrets, apiKey: '' } })),

        setCurrentWorkspace: (workspace) =>
          setState((state) => ({
            settings: { ...state.settings, currentWorkspace: workspace },
          })),

        updateSettings: (update) =>
          setState((state) => ({
            settings: { ...state.settings, ...update },
          })),

        createSession: (type, modelId) => {
          const state = getState();
          const id = crypto.randomUUID();
          const now = Date.now();
          const { modelDefaults, conversationDefaults, imageDefaults } = state.settings;

          let session: Session;
          if (type === 'image') {
            const imageSession: ImageSession = {
              id,
              type: 'image',
              title: defaultSessionTitle('image'),
              createdAt: now,
              updatedAt: now,
              modelId: modelId ?? modelDefaults.imageModelId,
              images: [],
              settings: structuredClone(imageDefaults),
            };
            session = imageSession;
          } else {
            const base = {
              id,
              title: defaultSessionTitle(type),
              createdAt: now,
              updatedAt: now,
              modelId:
                modelId ??
                (type === 'chat' ? modelDefaults.chatModelId : modelDefaults.visionModelId),
              messages: [],
              settings: structuredClone(conversationDefaults),
            };
            session =
              type === 'chat'
                ? ({ ...base, type: 'chat' } satisfies ChatSession)
                : ({ ...base, type: 'vision' } satisfies VisionSession);
          }

          setState((current) => ({
            sessions: { [id]: session, ...current.sessions },
            activeSessionByWorkspace: {
              ...current.activeSessionByWorkspace,
              [type]: id,
            },
          }));
          return id;
        },

        deleteSession: (id) =>
          setState((state) => {
            const session = state.sessions[id];
            if (!session) return state;
            const sessions = { ...state.sessions };
            delete sessions[id];
            const active = { ...state.activeSessionByWorkspace };
            if (active[session.type] === id) {
              active[session.type] = null;
            }
            return { sessions, activeSessionByWorkspace: active };
          }),

        renameSession: (id, title) =>
          setState((state) => {
            const session = state.sessions[id];
            if (!session || !title.trim()) return state;
            return {
              sessions: {
                ...state.sessions,
                [id]: touchSession({ ...session, title: title.trim() }),
              },
            };
          }),

        setActiveSession: (workspace, id) =>
          setState((state) => ({
            activeSessionByWorkspace: { ...state.activeSessionByWorkspace, [workspace]: id },
          })),

        setSessionModelId: (id, modelId) =>
          setState((state) => {
            const session = state.sessions[id];
            if (!session) return state;
            return {
              sessions: { ...state.sessions, [id]: touchSession({ ...session, modelId }) },
            };
          }),

        setSessionMessages: (id, messages) =>
          setState((state) => {
            const session = state.sessions[id];
            if (!session || session.type === 'image') return state;
            return {
              sessions: { ...state.sessions, [id]: touchSession({ ...session, messages }) },
            };
          }),

        updateConversationSessionSettings: (id, settings) =>
          setState((state) => {
            const session = state.sessions[id];
            if (!session || session.type === 'image') return state;
            return {
              sessions: {
                ...state.sessions,
                [id]: touchSession({
                  ...session,
                  settings: { ...session.settings, ...settings },
                }),
              },
            };
          }),

        addGeneratedImage: (id, image) =>
          setState((state) => {
            const session = state.sessions[id];
            if (session?.type !== 'image') return state;
            return {
              sessions: {
                ...state.sessions,
                [id]: touchSession({ ...session, images: [image, ...session.images] }),
              },
            };
          }),

        updateImageSessionSettings: (id, settings) =>
          setState((state) => {
            const session = state.sessions[id];
            if (session?.type !== 'image') return state;
            return {
              sessions: {
                ...state.sessions,
                [id]: touchSession({
                  ...session,
                  settings: { ...session.settings, ...settings },
                }),
              },
            };
          }),

        setActiveImageTask: (task) => setState({ activeImageTask: task }),

        replaceFromImport: (data) =>
          setState({
            settings: data.data.settings,
            sessions: data.data.sessions,
            activeSessionByWorkspace: data.data.activeSessionByWorkspace,
            activeImageTask: null,
            // secrets are intentionally untouched: imports never carry tokens.
          }),

        setHasHydrated: (value) => setState({ hasHydrated: value }),
      };
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => idbStorage),
      version: CURRENT_SCHEMA_VERSION,
      partialize: (state) => ({
        schemaVersion: state.schemaVersion,
        secrets: state.secrets,
        settings: state.settings,
        sessions: state.sessions,
        activeSessionByWorkspace: state.activeSessionByWorkspace,
        activeImageTask: state.activeImageTask,
      }),
      migrate: (persisted) => {
        const result = migrateStorage(
          persisted && typeof persisted === 'object'
            ? { schemaVersion: CURRENT_SCHEMA_VERSION, ...persisted }
            : persisted
        );
        if (!result.ok) {
          const defaults = createDefaultStorage();
          return {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            secrets: defaults.secrets,
            settings: defaults.settings,
            sessions: {},
            activeSessionByWorkspace: defaults.activeSessionByWorkspace,
            activeImageTask: null,
          };
        }
        const persistedState = persisted as {
          apiKey?: string;
          activeImageTask?: ActiveImageTask;
        };
        const apiKey = result.data.secrets.apiKey ?? persistedState.apiKey ?? '';
        return {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          secrets: { ...result.data.secrets, apiKey },
          settings: result.data.settings,
          sessions: result.data.sessions,
          activeSessionByWorkspace: result.data.activeSessionByWorkspace,
          activeImageTask: persistedState.activeImageTask ?? result.data.activeImageTask ?? null,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/** Convenience selector: the active session of a workspace, typed by kind. */
export function selectActiveSession(
  state: Pick<PrismState, 'sessions' | 'activeSessionByWorkspace'>,
  workspace: WorkspaceType
): Session | null {
  const id = state.activeSessionByWorkspace[workspace];
  if (!id) return null;
  const session = state.sessions[id];
  return session && session.type === workspace ? session : null;
}
