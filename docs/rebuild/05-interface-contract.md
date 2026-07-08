# 接口契约

## 目的

本文定义第一阶段重构中前端、API route、provider adapter、存储层之间共享的接口语义。

它不是最终 TypeScript 类型定义，但实现时应以这些契约为事实来源。

全局原则：

```text
协议必需参数自动发送
产品形态参数可以固定发送
模型行为参数必须显式启用或提供后才发送
runtime 不做在线探测
probe 不进入线上请求路径
```

## 通用错误契约

所有 API route 应尽量返回统一错误结构。

```ts
type PrismError = {
  error: {
    code: PrismErrorCode;
    message: string;
    details?: unknown;
  };
};
```

错误分类：

```ts
type PrismErrorCode =
  | 'MISSING_API_KEY'
  | 'AUTH_FAILED'
  | 'QUOTA_LIMITED'
  | 'RATE_LIMITED'
  | 'MODEL_UNAVAILABLE'
  | 'UNSUPPORTED_PARAMETER'
  | 'INVALID_REQUEST'
  | 'PAYLOAD_TOO_LARGE'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_ERROR'
  | 'NETWORK_ERROR'
  | 'TASK_FAILED'
  | 'INTERNAL_ERROR';
```

用户展示可以使用更自然的文案，但底层应保留可区分的错误码。

## Token 传递契约

产品默认路径：

```text
Access Token 存在浏览器本地
前端发起请求时随请求传递
API route 只读取当前请求 token
服务端不持久化 token
```

支持的请求来源：

```text
Authorization: Bearer <token>
request body apiKey
```

优先级：

```text
Authorization header 优先
body apiKey 作为兼容路径
```

环境变量只用于本地开发、smoke 和 probe，不作为产品默认 token 来源。

## Conversation 请求契约

Conversation 统一承载 LLM 与 VLM。

```ts
type ConversationRequest = {
  model: string;
  messages: ConversationMessage[];
  apiKey?: string;
  thinking?: ThinkingRequestControl;
  outputLimit?: OutputLimitRequest;
};
```

默认最小请求语义：

```text
model
messages
stream: true
```

`stream: true` 由 provider adapter 固定发送。

## Conversation 消息契约

```ts
type ConversationMessage =
  | TextConversationMessage
  | MultimodalConversationMessage;

type TextConversationMessage = {
  role: 'system' | 'developer' | 'user' | 'assistant';
  content: string;
};

type MultimodalConversationMessage = {
  role: 'user';
  content: ConversationContentPart[];
};

type ConversationContentPart =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'image_url';
      image_url: {
        url: string;
      };
    };
```

约束：

```text
system / developer / assistant 第一阶段只使用纯文本 content
user 可使用纯文本或 multimodal content parts
image_url.url 可以是公网 URL 或 base64 data URL
本地图片由前端转换为 base64 data URL
```

## Thinking 请求契约

```ts
type ThinkingMode = 'auto' | 'on' | 'off';

type ThinkingFormat =
  | 'enable_thinking'
  | 'chat_template_kwargs.enable_thinking'
  | 'thinking.type';

type ThinkingRequestControl = {
  mode: ThinkingMode;
  format?: ThinkingFormat;
};
```

发送规则：

```text
mode = auto：不发送 thinking 控制参数
mode = on：按 format 发送启用参数
mode = off：按 format 发送关闭参数
```

内置模型：

```text
format 可由内置 profile 提供
Auto 仍然不发送
```

自定义模型：

```text
format 必须由用户显式选择或使用可见默认值
默认可见格式为 enable_thinking
```

## Thinking provider payload

`enable_thinking`：

```json
{
  "enable_thinking": true
}
```

`chat_template_kwargs.enable_thinking`：

```json
{
  "chat_template_kwargs": {
    "enable_thinking": true
  }
}
```

`thinking.type`：

```json
{
  "thinking": {
    "type": "enabled"
  }
}
```

关闭时使用：

```text
true -> false
enabled -> disabled
```

第一阶段不发送 `chat_template_kwargs.thinking`。

## 输出上限契约

输出上限是可选行为参数。

```ts
type OutputLimitMode = 'standard' | 'high';

type OutputLimitParam = 'max_tokens' | 'max_completion_tokens';

type OutputLimitRequest = {
  enabled: boolean;
  mode: OutputLimitMode;
  param?: OutputLimitParam;
};
```

发送规则：

```text
enabled = false：不发送任何输出上限参数
enabled = true：按 mode 和 param 发送对应参数
```

内置模型：

```text
param 可由内置 profile 提供
mode 对应内置两档数值
用户不直接输入任意数字
```

自定义模型：

```text
默认可使用 max_tokens
后续可扩展为用户选择 max_tokens / max_completion_tokens
```

## Conversation 流式响应契约

API route 对前端返回 Prism 内部 NDJSON，而不是直接暴露上游完整 chunk。

```ts
type ConversationStreamEvent =
  | {
      c: string;
    }
  | {
      r: string;
    }
  | {
      c?: string;
      r?: string;
    }
  | {
      n: string;
      code?: string;
    };
```

字段含义：

```text
c：普通回答内容增量
r：reasoning 内容增量
n：非致命提示或 provider fallback notice
code：notice 代码
```

约束：

```text
前端应能同时累积 c 与 r
reasoning 展示是 UI 行为，不改变 provider 请求
错误仍通过 HTTP 错误结构返回
```

## Model Profile 契约

profile 描述已知能力，不等于运行时自动发送参数。

```ts
type ModelProfile = {
  id: string;
  label: string;
  source: 'builtin' | 'custom';
  input: {
    text: boolean;
    imageUrl: boolean | 'unknown';
    imageDataUrl: boolean | 'unknown';
  };
  thinking: {
    format: ThinkingFormat | 'none' | 'native_always_on' | 'unknown';
    canEnable: boolean | 'unknown';
    canDisable: boolean | 'unknown';
    observedByDefault: boolean | 'unknown';
  };
  output: {
    param: OutputLimitParam | 'none' | 'unknown';
    standard?: number;
    high?: number;
  };
};
```

规则：

```text
builtin profile 可来自人工维护或 probe 结果
custom profile 默认 unknown
profile 可影响 UI 提示和默认可见格式
profile 不允许让 Auto 自动发送 behavior 参数
```

## AIGC 请求契约

```ts
type ImageGenerationRequest = {
  model: string;
  prompt: string;
  negativePrompt?: string;
  size?: ImageSizeRequest;
  imageInput?: ImageInputValue[];
  advanced?: ImageAdvancedRequest;
  apiKey?: string;
};
```

默认最小请求语义：

```text
model
prompt
X-ModelScope-Async-Mode: true
```

`X-ModelScope-Async-Mode: true` 由 provider adapter 固定发送。

## AIGC 基础参数契约

```ts
type ImageSizeRequest = {
  enabled: boolean;
  value: string;
};
```

发送规则：

```text
negativePrompt 非空时发送 negative_prompt
size.enabled = true 时发送 size
size.enabled = false 时不发送 size
```

size 格式：

```text
WIDTHxHEIGHT
```

具体模型分辨率范围由 ModelScope API-Inference 文档和上游模型决定。Prism 不根据模型 ID 自动判断模型所属范围。

## AIGC 高级参数契约

```ts
type OptionalParam<T> = {
  enabled: boolean;
  value: T;
};

type ImageAdvancedRequest = {
  seed?: OptionalParam<number>;
  steps?: OptionalParam<number>;
  guidance?: OptionalParam<number>;
  loras?: LoraRequest;
};
```

发送规则：

```text
seed.enabled = true 时发送 seed
steps.enabled = true 时发送 steps
guidance.enabled = true 时发送 guidance
loras 有条目时发送 loras
```

UI 默认值不等于请求默认值。

## AIGC 参数范围契约

```text
prompt：长度小于 2000
negative_prompt：长度小于 2000
seed：[0, 2^31 - 1]
steps：[1, 100]
guidance：[1.5, 20]
```

size 文档范围：

```text
SD 系列：[64x64, 2048x2048]
FLUX：[64x64, 1024x1024]
Qwen-Image：[64x64, 1664x1664]
Z-Image-Turbo：[512x512, 2048x2048]
```

Prism 可做基础格式校验，并把具体模型不支持的范围交给上游错误反馈。

## 图片输入契约

图片输入在 Conversation 与 AIGC 之间复用语义。

```ts
type ImageInputValue = {
  url: string;
  source: 'remote_url' | 'data_url';
  mimeType?: string;
};
```

规则：

```text
远程图片使用公网 URL
本地图片转换为 base64 data URL
不同模块可限制数量和文案
```

Conversation provider payload：

```text
每张图片转换为一个 image_url content part
```

AIGC provider payload：

```text
0 张：不发送 image_url
1 张：发送单个 image_url
多张：发送 image_url 数组
```

## LoRA 契约

```ts
type LoraItem = {
  modelId: string;
  weight: number;
};

type LoraRequest = {
  items: LoraItem[];
};
```

发送规则：

```text
0 个：不发送 loras
1 个：发送 loras: "<lora-repo-id>"
多个：发送 loras: { "<lora-repo-id>": weight }
```

校验：

```text
最多 6 个
多个 LoRA 权重总和必须为 1.0
modelId 非空
```

LoRA 与基础模型兼容性由用户负责。

## AIGC provider payload

最小 payload：

```json
{
  "model": "<model-id>",
  "prompt": "<prompt>"
}
```

可选字段只在显式提供或启用后出现：

```json
{
  "negative_prompt": "...",
  "size": "1024x1024",
  "seed": 12345,
  "steps": 30,
  "guidance": 3.5,
  "image_url": "...",
  "loras": {
    "<lora-repo-id1>": 0.6,
    "<lora-repo-id2>": 0.4
  }
}
```

## AIGC 任务契约

提交响应：

```ts
type ImageGenerateResponse = {
  taskId: string;
  requestId?: string;
};
```

任务状态：

```ts
type ImageTaskStatus =
  | {
      status: 'pending' | 'running';
      taskId: string;
    }
  | {
      status: 'succeeded';
      taskId: string;
      outputImages: string[];
    }
  | {
      status: 'failed';
      taskId: string;
      error?: PrismError;
    };
```

前端 active task：

```ts
type ActiveImageTask = {
  taskId: string;
  sessionId: string;
  model: string;
  prompt: string;
  startedAt: number;
};
```

刷新恢复只要求尽可能恢复活跃任务，不保证服务端长期任务可恢复。

## 存储契约预告

详细存储 schema 后续单独定义。

第一阶段接口层先确认：

```text
Conversation session 承载 Chat / Vision 消息
Image session 承载 AIGC 生成记录
settings 保存 token、模型 ID、显式参数偏好
存储 schema 必须带版本号和迁移路径
```

## 验收标准

接口契约满足以下条件时视为可接受：

```text
Conversation 与 AIGC 的最小请求体清晰
所有可选行为参数都有显式 enabled 或用户输入条件
Thinking 三种格式明确，且 chat_template_kwargs 只使用 enable_thinking
输出上限默认不发送
图片输入可被 Conversation 与 AIGC 复用
LoRA 单个和多个请求格式清晰
错误码可区分主要失败类型
provider payload 与 UI 状态之间没有隐式默认参数
```
