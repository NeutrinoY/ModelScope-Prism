# 重构方向

## 项目定位

ModelScope Prism 是面向 ModelScope API-Inference 的轻量调用前端。

它的核心价值不是复刻 ModelScope 社区，也不是构建通用模型工作流平台，而是让用户用自己的 ModelScope Access Token，以更低摩擦调用 API-Inference 上的文本、视觉和图片生成能力。

Prism 的产品形态：

```text
轻量 Web 前端
Local-first 用户数据
ModelScope API-Inference 调用工作台
面向开发者和重度模型使用者的可控参数入口
```

Prism 不应被重构成：

```text
ModelScope 社区替代品
模型训练平台
模型部署平台
模型托管管理台
ComfyUI 式图像工作流工具
多供应商聚合平台
Agent 平台
```

## 价值来源

### 语义源

当前项目是业务语义源。

需要继承：

```text
ModelScope Access Token 调用方式
OpenAI-compatible Chat Completions 调用路径
图片生成异步任务流程
本地优先 token、会话和生成记录保存
模型能力画像与 probe 经验
LLM / VLM / AIGC 三类用户任务入口
流式输出、reasoning 展示、停止生成、错误反馈
```

不继承：

```text
当前文件结构中的偶然耦合
大组件中混合 UI、请求构造、任务状态和领域规则的写法
默认注入可选模型行为参数的历史实现
以运行时探测替代显式用户选择的倾向
```

### 灵魂源

当前 UI 是体验灵魂源。

需要继承：

```text
轻量、直接、低摩擦的调用体验
Chat / Vision / AIGC 三个用户任务入口
底部输入栏作为主交互中心
参数面板作为辅助控制区
对话与生成结果的沉浸式工作区
本地记录与快速继续工作流
```

不继承：

```text
不清晰的参数发送语义
高级参数默认值被隐式发送的行为
模块 UI 与请求协议互相耦合的结构
```

## 第一阶段主路径

第一阶段只围绕 ModelScope API-Inference 的两个主路径重建：

```text
Conversation:
POST /v1/chat/completions

AIGC:
POST /v1/images/generations
GET /v1/tasks/{task_id}
```

Conversation 第一阶段主协议是 OpenAI-compatible Chat Completions。

暂不进入第一阶段主路径：

```text
Responses API
Anthropic API-compatible messages
tools / function calling
Agent workflow
多供应商 provider 抽象
```

这些可以作为未来扩展，但不得污染第一阶段的核心契约。

## 全局参数原则

Prism 只自动发送两类参数：

```text
协议必需参数
产品形态参数
```

所有模型行为参数必须由用户显式填写、选择、启用或添加后才发送。

协议必需参数示例：

```text
Conversation: model, messages
AIGC: model, prompt
```

产品形态参数示例：

```text
Conversation: stream: true
AIGC: X-ModelScope-Async-Mode: true
```

模型行为参数示例：

```text
thinking control
max_tokens / max_completion_tokens
negative_prompt
size
seed
steps
guidance
image_url
loras
```

规则：

```text
Auto 不等于自动注入参数
UI 默认值不等于请求默认值
高级区打开不等于发送高级参数
profile 描述能力，不代表运行时必须发送参数
probe 可以试探，runtime 不试探
```

## 模块边界

### Conversation

LLM 与 VLM 在架构层面统一为 Conversation。

它们共享：

```text
请求契约
流式解析
错误处理
会话数据结构
ModelScope provider 适配
```

前端可以保留不同工作区：

```text
Chat：文本对话为主，可附图
Vision：图片理解为主，突出图片输入
```

两者不是两套底层协议。

详细需求见：

```text
docs/rebuild/04-conversation-module-requirements.md
```

### AIGC

AIGC 是单独领域模块，面向 ModelScope 图片生成与图像编辑异步任务。

它支持：

```text
文生图
图像编辑 / 图生图
LoRA
任务轮询
本地生成记录
```

它不支持第一阶段外的复杂图像工作流。

详细需求见：

```text
docs/rebuild/03-aigc-module-requirements.md
```

## 内置模型与自定义模型

内置模型的角色：

```text
推荐入口
能力样例
已知参数格式的便利 profile
```

内置模型不是长期稳定契约。ModelScope 模型可能上线、下线或改变 API-Inference 行为，Prism 不能把具体模型 ID 当成永久产品承诺。

自定义模型策略：

```text
默认只提供基础调用能力
用户知道模型能力时，可以显式启用图片、thinking、输出上限等能力
Prism 不为自定义模型在线探测
Prism 不轮流试错参数格式
```

## Probe 定位

probe 是本地开发工具。

它用于：

```text
离线诊断模型是否可用
探测文本、图片输入、thinking 控制、输出上限参数
生成诊断报告
辅助维护内置 profile
```

它不用于：

```text
线上运行时自动探测
Vercel 部署时自动刷新模型能力
用户 UI 导入 probe 报告
失败后自动切换参数格式重试
```

## Token 与数据边界

Prism 遵守 Local-first 原则。

用户数据策略：

```text
ModelScope Access Token 保存在浏览器本地
会话、设置、生成记录保存在浏览器本地
API route 只代理当前请求，不持久化用户 token
```

环境变量策略：

```text
环境变量可用于 smoke / probe / 本地开发
环境变量不作为产品默认 token 来源
```

## 错误反馈原则

Prism 应把上游错误转换为用户能理解的分级反馈。

至少区分：

```text
缺少 token
鉴权失败
额度或余额不足
限流
模型不可用
参数不支持
任务失败
超时
网络错误
未知上游错误
```

错误展示可以做用户视角抽象，但不能把所有问题隐藏为泛化失败。

## 会话模型方向

第一阶段会话方向：

```text
Conversation session：承载 Chat 与 Vision
Image session：承载 AIGC 生成记录
```

Chat 与 Vision 是同一 Conversation domain 的不同前端入口。

AIGC 保持单独 domain。

## 图片输入方向

图片输入应复用同一组件契约。

可支持：

```text
公网 URL
base64 data URL
本地上传后转换为 data URL
多图输入
```

不同模块可以有不同文案、数量限制和默认入口，但底层输入值应尽量统一。

## 设计系统边界

第一阶段重构方向文档不决定视觉重做。

当前原则：

```text
保留轻量工作台气质
优先修正信息架构、参数语义和模块边界
视觉系统精修后续单独讨论
```

## 第一阶段完成标准

第一阶段重构方向被满足时，应具备：

```text
Conversation 与 AIGC 的请求契约清晰
可选参数显式发送原则贯彻到所有模块
Chat / Vision 前端入口保留，但底层统一
AIGC 参数严格收敛到 ModelScope API-Inference 文档范围
probe 与 runtime 边界清楚
token 与本地数据边界清楚
错误分级清楚
后续实现 Agent 可以基于文档直接执行
```
