# 存储与配置 Schema

## 目的

本文定义第一阶段重构中的本地存储、会话、设置、导入导出和迁移语义。

Prism 是 local-first 应用。用户的 token、会话、设置和生成记录默认保存在浏览器本地。服务端 API route 只代理当前请求，不持久化用户数据。

## 存储原则

全局原则：

```text
本地优先
schema 带版本号
支持迁移
token 与普通导出数据分离
UI 默认值不等于请求默认值
用户显式启用的参数偏好可以持久化
```

存储层必须表达用户的显式选择，而不是把组件中的临时默认值隐式变成请求参数。

## 顶层结构

第一阶段本地存储结构：

```ts
type PrismStorageV1 = {
  schemaVersion: 1;
  secrets: PrismSecrets;
  settings: PrismSettings;
  sessions: Record<string, Session>;
  activeSessionByWorkspace: ActiveSessionByWorkspace;
  activeImageTask?: ActiveImageTask;
};
```

## Secrets

```ts
type PrismSecrets = {
  apiKey?: string;
};
```

规则：

```text
apiKey 是用户的 ModelScope Access Token
apiKey 只保存在浏览器本地
API route 不持久化 apiKey
普通导出默认不包含 apiKey
用户可以在设置中清除 apiKey
```

环境变量只用于 smoke、probe 和本地开发，不作为产品默认 token 来源。

## Settings

```ts
type PrismSettings = {
  currentWorkspace: WorkspaceType;
  modelDefaults: ModelDefaults;
  conversationDefaults: ConversationDefaults;
  imageDefaults: ImageGenerationDefaults;
};

type WorkspaceType = 'chat' | 'vision' | 'image';
```

`settings` 保存新会话的默认偏好。它不应 retroactively 覆盖已有会话。

## 模型默认值

```ts
type ModelDefaults = {
  chatModelId: string;
  visionModelId: string;
  imageModelId: string;
};
```

规则：

```text
新 Chat session 默认使用 chatModelId
新 Vision session 默认使用 visionModelId
新 Image session 默认使用 imageModelId
已有 session 保存自己的 modelId，不受后续全局默认变化影响
```

内置模型只是推荐入口和能力样例，不是永久稳定契约。

## Conversation 默认设置

```ts
type ConversationDefaults = {
  thinking: ThinkingRequestControl;
  outputLimit: OutputLimitRequest;
};

type ThinkingMode = 'auto' | 'on' | 'off';

type ThinkingFormat =
  | 'enable_thinking'
  | 'chat_template_kwargs.enable_thinking'
  | 'thinking.type';

type ThinkingRequestControl = {
  mode: ThinkingMode;
  format?: ThinkingFormat;
};

type OutputLimitMode = 'standard' | 'high';

type OutputLimitParam = 'max_tokens' | 'max_completion_tokens';

type OutputLimitRequest = {
  enabled: boolean;
  mode: OutputLimitMode;
  param?: OutputLimitParam;
};
```

规则：

```text
thinking.mode = auto 时不发送 thinking 控制参数
outputLimit.enabled = false 时不发送输出上限参数
新 Chat / Vision session 从 conversationDefaults 复制初始设置
用户在某个会话中修改 thinking 或 outputLimit，只影响该会话
全局默认后续变化不自动覆盖已有会话
```

输出上限第一阶段作为高级设置，不放在主界面。内置模型使用两档固定值，不让用户输入任意数字。

## AIGC 默认设置

```ts
type OptionalParam<T> = {
  enabled: boolean;
  value: T;
};

type ImageGenerationDefaults = {
  size: OptionalParam<string>;
  negativePrompt: string;
  seed: OptionalParam<number>;
  steps: OptionalParam<number>;
  guidance: OptionalParam<number>;
  loras: LoraRequest;
};

type LoraRequest = {
  items: LoraItem[];
};

type LoraItem = {
  modelId: string;
  weight: number;
};
```

规则：

```text
imageDefaults 保存新 AIGC session 的参数偏好
enabled = true 表示用户持续偏好，后续请求可以发送该参数
enabled = false 时即使 value 存在也不发送
negativePrompt 非空时可发送
loras.items 为空时不发送 loras
必须提供 Reset / Auto 入口，让用户回到不发送可选参数状态
```

LoRA 规则：

```text
最多 6 个
多个 LoRA 权重总和必须为 1.0
单 LoRA 发送字符串
多 LoRA 发送对象
```

## Session 类型

Chat、Vision、AIGC 历史列表不共用。

底层 Conversation 请求契约统一，但产品层保留三个功能区历史。

```ts
type Session = ChatSession | VisionSession | ImageSession;

type SessionBase = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  modelId: string;
};
```

## Chat Session

```ts
type ChatSession = SessionBase & {
  type: 'chat';
  messages: ConversationMessage[];
  settings: ConversationSessionSettings;
};
```

规则：

```text
Chat session 使用 Conversation 请求契约
Chat session 历史只出现在 Chat 工作区
session.modelId 保存当前会话使用的模型
```

## Vision Session

```ts
type VisionSession = SessionBase & {
  type: 'vision';
  messages: ConversationMessage[];
  settings: ConversationSessionSettings;
};
```

规则：

```text
Vision session 使用 Conversation 请求契约
Vision session 历史只出现在 Vision 工作区
Vision 默认突出图片输入
session.modelId 保存当前会话使用的模型
```

## Conversation Session Settings

```ts
type ConversationSessionSettings = {
  thinking: ThinkingRequestControl;
  outputLimit: OutputLimitRequest;
};
```

规则：

```text
新 Chat / Vision session 从 conversationDefaults 复制 settings
会话内修改 settings 只影响当前 session
session settings 是请求时的默认 UI 状态
仍然遵守显式参数发送原则
```

## Image Session

```ts
type ImageSession = SessionBase & {
  type: 'image';
  images: GeneratedImage[];
  settings: ImageSessionSettings;
};

type ImageSessionSettings = ImageGenerationDefaults;
```

规则：

```text
Image session 历史只出现在 AIGC 工作区
新 Image session 从 imageDefaults 复制 settings
session.modelId 保存当前图片会话使用的模型
```

## Conversation Message

Conversation 消息契约与接口契约保持一致。

```ts
type ConversationMessage =
  | TextConversationMessage
  | MultimodalConversationMessage;

type TextConversationMessage = {
  role: 'system' | 'developer' | 'user' | 'assistant';
  content: string;
  reasoning?: string;
  requestMeta?: ConversationRequestMeta;
};

type MultimodalConversationMessage = {
  role: 'user';
  content: ConversationContentPart[];
  requestMeta?: ConversationRequestMeta;
};
```

`requestMeta` 可记录当次请求使用的显式参数，第一阶段不要求完整 UI 展示。

```ts
type ConversationRequestMeta = {
  modelId: string;
  thinking?: ThinkingRequestControl;
  outputLimit?: OutputLimitRequest;
  createdAt: number;
};
```

## Generated Image

```ts
type GeneratedImage = {
  id: string;
  url: string;
  prompt: string;
  modelId: string;
  createdAt: number;
  size?: string;
  requestMeta?: ImageRequestMeta;
};

type ImageRequestMeta = {
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  size?: string;
  seed?: number;
  steps?: number;
  guidance?: number;
  imageInputCount?: number;
  loras?: LoraItem[];
  createdAt: number;
};
```

`requestMeta` 记录实际发送的参数，而不是 UI 中未启用的默认值。

## Active Session

因为 Chat、Vision、Image 历史不共用，活跃 session 也按工作区保存。

```ts
type ActiveSessionByWorkspace = {
  chat: string | null;
  vision: string | null;
  image: string | null;
};
```

切换工作区时应恢复该工作区上次活跃的 session。

## Active Image Task

```ts
type ActiveImageTask = {
  taskId: string;
  sessionId: string;
  modelId: string;
  prompt: string;
  startedAt: number;
  requestMeta?: ImageRequestMeta;
};
```

规则：

```text
activeImageTask 用于刷新后尽可能恢复未完成任务
activeImageTask 不属于永久历史
导出默认不包含 activeImageTask
任务超过超时窗口后应清理
requestMeta 可用于刷新后恢复任务成功时的生成记录参数信息
```

## Draft 状态

第一阶段不要求持久化所有输入草稿。

可以持久化：

```text
全局默认设置
会话 settings
activeImageTask
```

不要求持久化：

```text
未发送的输入框文本
临时弹窗打开状态
临时 hover / selection 状态
```

如后续需要输入草稿恢复，应单独定义 draft schema，不能混入 session 历史。

## 导出

第一阶段支持完整本地数据导出，但默认不导出 token。

```ts
type PrismExportV1 = {
  app: 'modelscope-prism';
  schemaVersion: 1;
  exportedAt: string;
  data: {
    settings: PrismSettings;
    sessions: Record<string, Session>;
    activeSessionByWorkspace: ActiveSessionByWorkspace;
  };
};
```

导出包含：

```text
settings
sessions
生成记录
模型默认值
Conversation 会话设置
AIGC 参数偏好
```

默认不包含：

```text
apiKey / ModelScope Access Token
activeImageTask
临时 UI 状态
未发送草稿
```

如果未来提供 token 备份功能，必须独立设计并明确风险提示。

## 导入

第一阶段导入策略：

```text
读取导入文件
校验 app 与 schemaVersion
展示摘要预览
用户确认后替换本地 settings、sessions、activeSessionByWorkspace
不导入 apiKey
导入后要求用户重新确认或填写 Access Token
```

第一阶段不要求 merge 导入。

原因：

```text
merge 需要处理 session id 冲突
merge 需要处理重复生成记录
merge 需要定义设置覆盖优先级
```

这些可以作为后续增强。

## 迁移

存储 schema 必须带版本号。

规则：

```text
读取存储时检查 schemaVersion
旧版本通过 migration 转换到当前版本
无法迁移时应提示用户备份或重置
不得静默丢弃用户 sessions
```

迁移函数应是纯数据转换，不依赖 UI 状态。

## 与当前实现的差异

当前实现中 Chat、Vision、Image 使用三类 session，这一方向被保留。

需要调整的方向：

```text
Chat / Vision 底层统一为 Conversation 契约
active session 按 workspace 分开保存
每个 session 保存自己的 modelId
每个 Chat / Vision session 保存自己的 conversation settings
Image session 保存自己的 AIGC 参数偏好
全局默认只用于新 session
显式 enabled/value 结构替代隐式 UI 默认值
导出/导入成为一等本地数据能力
```

## 验收标准

存储与配置 schema 满足以下条件时视为可接受：

```text
schemaVersion 明确
token 与普通导出数据分离
Chat / Vision / Image 历史列表不共用
Chat / Vision 底层仍共享 Conversation 消息契约
每个 session 保存 modelId
全局默认只影响新 session
会话内设置可以覆盖全局默认
AIGC 参数偏好使用 enabled/value 表达显式发送状态
active session 按工作区恢复
active image task 可刷新恢复且不进入导出
导出/导入不包含 apiKey
迁移路径可扩展
```
