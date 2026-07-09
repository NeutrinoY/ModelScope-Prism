import { z } from 'zod';
import {
  type ConversationMessage,
  conversationMessageSchema,
  type OutputLimitRequest,
  outputLimitRequestSchema,
  type ThinkingRequestControl,
  thinkingRequestControlSchema,
} from './conversation';
import {
  type ActiveImageTask,
  type LoraRequest,
  loraRequestSchema,
  type OptionalParam,
} from './image-generation';

/**
 * Local-first storage schema (docs/rebuild/06-storage-and-config-schema.md).
 *
 * schemaVersion is mandatory; migrations convert older versions forward.
 * Secrets (the ModelScope access token) never enter the regular export.
 */

export type WorkspaceType = 'chat' | 'vision' | 'image';

export type PrismSecrets = {
  apiKey?: string;
};

export type ModelDefaults = {
  chatModelId: string;
  visionModelId: string;
  imageModelId: string;
};

export type ConversationDefaults = {
  thinking: ThinkingRequestControl;
  outputLimit: OutputLimitRequest;
};

export type ImageGenerationDefaults = {
  size: OptionalParam<string>;
  negativePrompt: string;
  seed: OptionalParam<number>;
  steps: OptionalParam<number>;
  guidance: OptionalParam<number>;
  loras: LoraRequest;
};

export type PrismSettings = {
  currentWorkspace: WorkspaceType;
  modelDefaults: ModelDefaults;
  conversationDefaults: ConversationDefaults;
  imageDefaults: ImageGenerationDefaults;
};

export type SessionBase = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  modelId: string;
};

export type ConversationSessionSettings = {
  thinking: ThinkingRequestControl;
  outputLimit: OutputLimitRequest;
};

export type ChatSession = SessionBase & {
  type: 'chat';
  messages: ConversationMessage[];
  settings: ConversationSessionSettings;
};

export type VisionSession = SessionBase & {
  type: 'vision';
  messages: ConversationMessage[];
  settings: ConversationSessionSettings;
};

export type ImageRequestMeta = {
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  size?: string;
  seed?: number;
  steps?: number;
  guidance?: number;
  imageInputCount?: number;
  loras?: { modelId: string; weight: number }[];
  createdAt: number;
};

export type GeneratedImage = {
  id: string;
  url: string;
  prompt: string;
  modelId: string;
  createdAt: number;
  size?: string;
  requestMeta?: ImageRequestMeta;
};

export type ImageSessionSettings = ImageGenerationDefaults;

export type ImageSession = SessionBase & {
  type: 'image';
  images: GeneratedImage[];
  settings: ImageSessionSettings;
};

export type Session = ChatSession | VisionSession | ImageSession;

export type ActiveSessionByWorkspace = {
  chat: string | null;
  vision: string | null;
  image: string | null;
};

export type PrismStorageV1 = {
  schemaVersion: 1;
  secrets: PrismSecrets;
  settings: PrismSettings;
  sessions: Record<string, Session>;
  activeSessionByWorkspace: ActiveSessionByWorkspace;
  activeImageTask?: ActiveImageTask;
};

export type PrismExportV1 = {
  app: 'modelscope-prism';
  schemaVersion: 1;
  exportedAt: string;
  data: {
    settings: PrismSettings;
    sessions: Record<string, Session>;
    activeSessionByWorkspace: ActiveSessionByWorkspace;
  };
};

// ---------------------------------------------------------------------------
// Zod schemas (import validation + migration guards)
// ---------------------------------------------------------------------------

const optionalStringParamSchema = z.object({ enabled: z.boolean(), value: z.string() });
const optionalNumberParamSchema = z.object({ enabled: z.boolean(), value: z.number() });

export const workspaceTypeSchema = z.enum(['chat', 'vision', 'image']);

export const modelDefaultsSchema = z.object({
  chatModelId: z.string(),
  visionModelId: z.string(),
  imageModelId: z.string(),
});

export const conversationDefaultsSchema = z.object({
  thinking: thinkingRequestControlSchema,
  outputLimit: outputLimitRequestSchema,
});

export const imageGenerationDefaultsSchema = z.object({
  size: optionalStringParamSchema,
  negativePrompt: z.string(),
  seed: optionalNumberParamSchema,
  steps: optionalNumberParamSchema,
  guidance: optionalNumberParamSchema,
  loras: loraRequestSchema,
});

export const prismSettingsSchema = z.object({
  currentWorkspace: workspaceTypeSchema,
  modelDefaults: modelDefaultsSchema,
  conversationDefaults: conversationDefaultsSchema,
  imageDefaults: imageGenerationDefaultsSchema,
});

const sessionBaseShape = {
  id: z.string().min(1),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  modelId: z.string(),
};

const conversationSessionSettingsSchema = z.object({
  thinking: thinkingRequestControlSchema,
  outputLimit: outputLimitRequestSchema,
});

// Stored messages may carry reasoning / requestMeta on top of the wire format.
const storedMessageSchema = conversationMessageSchema.and(
  z.object({
    reasoning: z.string().optional(),
    requestMeta: z
      .object({
        modelId: z.string(),
        thinking: thinkingRequestControlSchema.optional(),
        outputLimit: outputLimitRequestSchema.optional(),
        createdAt: z.number(),
      })
      .optional(),
  })
);

export const chatSessionSchema = z.object({
  ...sessionBaseShape,
  type: z.literal('chat'),
  messages: z.array(storedMessageSchema),
  settings: conversationSessionSettingsSchema,
});

export const visionSessionSchema = z.object({
  ...sessionBaseShape,
  type: z.literal('vision'),
  messages: z.array(storedMessageSchema),
  settings: conversationSessionSettingsSchema,
});

export const generatedImageSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  prompt: z.string(),
  modelId: z.string(),
  createdAt: z.number(),
  size: z.string().optional(),
  requestMeta: z
    .object({
      modelId: z.string(),
      prompt: z.string(),
      negativePrompt: z.string().optional(),
      size: z.string().optional(),
      seed: z.number().optional(),
      steps: z.number().optional(),
      guidance: z.number().optional(),
      imageInputCount: z.number().optional(),
      loras: z.array(z.object({ modelId: z.string(), weight: z.number() })).optional(),
      createdAt: z.number(),
    })
    .optional(),
});

export const imageSessionSchema = z.object({
  ...sessionBaseShape,
  type: z.literal('image'),
  images: z.array(generatedImageSchema),
  settings: imageGenerationDefaultsSchema,
});

export const sessionSchema = z.discriminatedUnion('type', [
  chatSessionSchema,
  visionSessionSchema,
  imageSessionSchema,
]);

export const activeSessionByWorkspaceSchema = z.object({
  chat: z.string().nullable(),
  vision: z.string().nullable(),
  image: z.string().nullable(),
});

export const prismExportV1Schema = z.object({
  app: z.literal('modelscope-prism'),
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  data: z.object({
    settings: prismSettingsSchema,
    sessions: z.record(z.string(), sessionSchema),
    activeSessionByWorkspace: activeSessionByWorkspaceSchema,
  }),
});
