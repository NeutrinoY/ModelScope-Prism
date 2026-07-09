# LLM / VLM Conversation 模块需求

## 模块定位

Conversation 模块是 ModelScope API-Inference 大语言模型与视觉理解能力的统一调用层。

架构层面不区分 LLM 与 VLM。它们都使用同一套 OpenAI-compatible Chat Completions 请求模型：

```text
POST /v1/chat/completions
```

LLM 与 VLM 的差异不是协议差异，而是消息输入能力差异：

```text
LLM：文本消息
VLM：文本消息 + image_url 图片输入
```

前端 UI 可以从用户任务角度保留不同入口：

```text
Chat 工作区：以文本对话为主，可在模型能力允许或用户自定义尝试时附图
Vision 工作区：以图片理解任务为主，默认突出图片输入
```

底层请求、流式解析、错误处理、会话数据结构和 provider 适配应尽量统一。

## 协议范围

第一阶段主路径仅实现 ModelScope OpenAI-compatible Chat Completions。

使用：

```text
base_url: https://api-inference.modelscope.cn/v1/
api_key: ModelScope Access Token
model: ModelScope 模型 ID
messages: OpenAI-compatible messages
stream: true
```

暂不作为第一阶段主路径：

```text
Responses API
Anthropic API-compatible messages
tools / function calling
agent workflow
运行时自动能力探测
```

Responses API 与 Anthropic API 可以作为后续扩展方向，但不得影响第一阶段 Conversation 主契约。

## 支持参数

必需参数：

```text
model
messages
```

产品形态参数：

```text
stream: true
```

可选行为参数：

```text
thinking control
max_tokens / max_completion_tokens
```

输入能力：

```text
text
image_url
```

默认请求体只应包含完成调用所必需的参数和 Prism 的产品形态参数。

```text
model
messages
stream: true
```

## 显式参数发送原则

Prism 不得发送用户未显式选择、启用或提供的模型行为参数。

适用于 Conversation 模块的规则：

```text
thinking control：仅在用户选择 On 或 Off 时发送
max_tokens / max_completion_tokens：仅在用户启用输出上限时发送
image_url：仅在用户添加图片输入时发送
```

`stream: true` 是 Prism 的产品交互形态，可以固定发送。它不属于模型行为调参。

## 消息输入

文本消息使用 OpenAI-compatible message。

```json
{
  "role": "user",
  "content": "用 python 写一下快排"
}
```

图片输入使用 OpenAI-compatible multimodal content parts。

```json
{
  "role": "user",
  "content": [
    {
      "type": "text",
      "text": "描述这幅图"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "https://example.com/image.jpg"
      }
    }
  ]
}
```

本地图片应在前端转换为 base64 data URL 后放入 `image_url.url`。

发送规则：

```text
用户未添加图片：发送纯文本消息
用户添加图片：发送 text + image_url content parts
用户添加多张图片：发送多个 image_url content parts
```

Prism 不在线探测所选模型是否支持图片输入。内置 profile 可以用于 UI 提示或禁用明显不可用入口；自定义模型应允许用户尝试。

## Thinking 控制

Thinking 是可选模型行为参数，必须显式控制。

运行时三态：

```text
Auto：不发送任何 thinking 控制参数
On：发送启用 thinking 的参数
Off：发送关闭 thinking 的参数
```

`Auto` 表示让模型或平台默认行为生效，不表示 Prism 根据 profile 自动注入默认 thinking 参数。

## 内置模型 Thinking 策略

内置确定性模型可以拥有已知 thinking profile。

内置模型运行时规则：

```text
Auto：不发送 thinking 控制参数
On：按内置 profile 的控制格式发送启用参数
Off：按内置 profile 的控制格式发送关闭参数
```

内置 profile 只描述已知控制格式，不改变 Auto 的显式发送原则。

## 自定义模型 Thinking 策略

自定义模型默认不发送 thinking 控制参数。

只有用户显式打开 thinking 控制时，UI 才展示具体控制格式，并按用户选择发送。

自定义模型 UI 应表达：

```text
Mode:
  Auto
  On
  Off

Format:
  enable_thinking
  chat_template_kwargs.enable_thinking
  thinking.type
```

默认格式可以是 `enable_thinking`，但必须对用户可见并允许切换。

自定义模型运行时规则：

```text
Auto：不发送 thinking 控制参数
On / Off：按用户选择的控制格式发送一种参数
```

Prism 不为自定义模型在线探测 thinking 参数格式，不轮流尝试多个格式，不在失败后静默改用其他格式重试。

## Thinking 控制格式

第一阶段支持三种 thinking 控制格式。

Root boolean：

```json
{
  "enable_thinking": true
}
```

```json
{
  "enable_thinking": false
}
```

Chat template kwargs：

```json
{
  "chat_template_kwargs": {
    "enable_thinking": true
  }
}
```

```json
{
  "chat_template_kwargs": {
    "enable_thinking": false
  }
}
```

Thinking object：

```json
{
  "thinking": {
    "type": "enabled"
  }
}
```

```json
{
  "thinking": {
    "type": "disabled"
  }
}
```

`chat_template_kwargs.thinking` 不作为第一阶段默认格式。调研结果显示 ModelScope / Qwen / vLLM / SGLang 主线示例更常使用 `chat_template_kwargs.enable_thinking`。如后续确需兼容旧模板，可作为遗留兼容格式单独引入。

## 输出上限

输出 token 上限是可选行为参数。

运行时规则：

```text
默认不发送 max_tokens 或 max_completion_tokens
用户启用输出上限后才发送
内置 profile 可描述应使用 max_tokens 还是 max_completion_tokens
自定义模型可默认使用 max_tokens，并允许后续扩展为用户可选格式
```

不得因为内置 profile 存在默认输出上限值，就在用户未启用时自动发送。

## 探测模块定位

probe 是开发者离线诊断工具，不属于线上用户请求路径。

probe 的目标是探测模型能力，生成诊断报告，辅助维护内置 profile。

probe 可以主动尝试不同参数格式；正式运行时不得这么做。

## 探测范围

第一阶段 probe 只探测与 Prism 产品能力直接相关的内容。

基础可用性：

```text
chat/completions 是否可用
stream 是否能返回有效文本
错误类型：鉴权、额度、限流、模型不可用、上游错误、网络超时
```

输入能力：

```text
文本输入是否可用
image_url 公网 URL 是否可用
image_url base64 data URL 是否可用
```

Thinking 能力：

```text
baseline：不传 thinking 控制参数
enable_thinking true / false
chat_template_kwargs.enable_thinking true / false
thinking.type enabled / disabled
```

输出上限：

```text
max_tokens 是否有效
max_completion_tokens 是否有效
```

## Thinking 探测说明

Thinking probe 包含 1 个 baseline 与 3 种控制格式。

```text
baseline：
不传任何 thinking 控制参数

格式 1：
enable_thinking: true / false

格式 2：
chat_template_kwargs: { enable_thinking: true / false }

格式 3：
thinking: { type: "enabled" / "disabled" }
```

baseline 用于观察模型默认是否输出 reasoning，以及是否可能属于 native always-on。

控制格式用于判断：

```text
哪种格式能启用 reasoning
哪种格式能关闭 reasoning
哪种格式会被上游拒绝
```

probe 可以测试多个格式；runtime 只能按 profile 或用户显式选择发送一种格式。

## 非目标

第一阶段 Conversation 模块不包含：

```text
Responses API 主路径
Anthropic API 主路径
temperature / top_p 等采样参数面板
tools / function calling
agent workflow
线上自动探测
失败后自动切换 thinking 参数格式重试
默认注入 thinking 参数
默认注入 max token 参数
```

## 验收标准

Conversation 模块满足以下条件时视为可接受：

```text
LLM 与 VLM 底层使用统一 Conversation 契约
Chat 与 Vision 作为前端功能工作区保留
OpenAI-compatible Chat Completions 是第一阶段唯一主路径
文本消息和 image_url 多模态消息格式正确
Auto thinking 不发送任何 thinking 控制参数
内置模型 On / Off 按 profile 发送一种已知 thinking 格式
自定义模型 On / Off 按用户选择发送一种 thinking 格式
chat_template_kwargs 格式只发送 enable_thinking 字段
默认不发送 max_tokens 或 max_completion_tokens
probe 范围明确，且不进入线上请求路径
上游能力或参数错误被清晰展示
```
