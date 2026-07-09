# 实现简报

## 目的

本文是给执行 Agent 的入口文档。

执行实现前应先阅读本文，再按需追溯详细文档。本文不替代详细契约，而是压缩第一阶段目标、边界、实施顺序和验收标准。

## 项目目标

ModelScope Prism 第一阶段重构目标：

```text
重建为一个轻量、local-first、面向 ModelScope API-Inference 的 Web 调用工作台
保留当前项目的产品语义和体验灵魂
修正参数发送语义、模块边界、存储 schema 和 provider 适配
让 Chat / Vision / AIGC 三个工作区可持续维护
```

Prism 的核心不是模型平台，不是工作流画布，也不是多供应商聚合器。

## 必读文档顺序

执行 Agent 应按以下顺序阅读：

```text
00-rebuild-direction.md
01-product-and-information-architecture.md
05-interface-contract.md
06-storage-and-config-schema.md
07-core-and-provider-organization.md
08-frontend-organization.md
09-visual-and-interaction-guidelines.md
10-technology-stack-and-dependency-decisions.md
03-aigc-module-requirements.md
04-conversation-module-requirements.md
```

模块实现时再重点追溯：

```text
AIGC：03 + 05 + 06 + 08
Conversation：04 + 05 + 06 + 08
样式和交互：08 + 09 + 10
```

## 价值来源

当前项目是语义源和体验灵魂源。

旧实现参考快照位于：

```text
legacy-reference/implementation
```

该目录只能作为语义、体验和上游调用参考，不能作为目标架构或目录结构模板。

继承：

```text
ModelScope Access Token 调用方式
Chat / Vision / AIGC 三个任务入口
OpenAI-compatible Chat Completions 调用经验
AIGC 异步任务提交和轮询经验
local-first 会话与设置
流式输出、reasoning 展示、停止生成
当前轻量、流畅、细腻的工作台气质
```

不继承：

```text
大组件混合 UI、请求构造和领域规则的写法
可选参数默认值被隐式发送的行为
运行时探测和参数试错倾向
偶然形成的目录结构
provider 字段散落在 UI 中的实现
```

## 第一阶段范围

第一阶段只实现两个主路径：

```text
Conversation:
POST /v1/chat/completions

AIGC:
POST /v1/images/generations
GET /v1/tasks/{task_id}
```

前端工作区：

```text
Chat
Vision
AIGC
Settings
Sessions
```

底层领域：

```text
Conversation domain：承载 Chat / Vision
Image generation domain：承载 AIGC
```

## 最重要的全局规则

可选模型行为参数必须显式发送。

规则：

```text
协议必需参数可以自动发送
产品形态参数可以固定发送
模型行为参数必须由用户显式填写、选择、启用或添加后才发送
UI 默认值不等于请求默认值
Auto 表示不发送控制参数
高级区打开不等于发送高级参数
profile 描述能力，不代表 runtime 自动发送参数
probe 可以试探，runtime 不试探
```

如果实现中无法判断是否应该发送某个可选参数，应默认不发送。

## 目标目录结构

目标结构见：

```text
docs/rebuild/07-core-and-provider-organization.md
```

推荐方向：

```text
src/app
src/features
src/components
src/lib/contracts
src/lib/domain
src/lib/providers/modelscope
src/lib/storage
src/lib/services
src/lib/config
scripts/probe
```

若项目暂时未迁移到 `src/`，也应遵守同样边界。

核心边界：

```text
UI 不构造 ModelScope payload
API route 保持薄
provider adapter 负责上游协议
domain 负责纯规则
contracts 负责共享类型和错误语义
storage 负责 schema、migration、import/export
services 负责前端调用内部 API
```

## 建议实施顺序

### 1. 建立契约层

先实现：

```text
PrismErrorCode
ConversationRequest
ConversationMessage
ThinkingRequestControl
OutputLimitRequest
ImageGenerationRequest
ImageInputValue
LoraRequest
ImageTaskStatus
Storage schema 类型
```

目标：

```text
让 UI、route、provider、storage 使用同一套语言
阻止 payload 结构在组件内自由生长
```

### 2. 建立 domain 规则

实现纯函数：

```text
Conversation message 构造
thinking 参数选择
output limit 参数选择
AIGC 显式参数过滤
size 基础格式校验
LoRA 校验和 payload 形态选择
图片输入规范化
错误码映射辅助
```

要求：

```text
domain 不依赖 React
domain 不依赖 Next
domain 不依赖 OpenAI SDK
domain 不访问 IndexedDB
```

### 3. 建立 ModelScope provider

实现：

```text
Conversation provider：OpenAI SDK + custom baseURL + stream
AIGC provider：fetch images/generations + task status polling adapter
错误映射
timeout 与 abort
request id 传递
```

provider 负责：

```text
ModelScope URL
headers
X-ModelScope-Async-Mode
X-ModelScope-Task-Type
thinking provider payload
NDJSON stream 转换
上游错误收敛
```

### 4. 重建 API routes

实现：

```text
POST /api/conversation
POST /api/image/generate
GET /api/image/status/[taskId]
```

API route 负责：

```text
读取当前请求 token
校验 body
限流和大小限制
调用 provider
返回统一错误
```

API route 不负责：

```text
长期保存 token
维护会话
决定 UI 默认值
构造复杂 provider payload
```

### 5. 重建 storage

实现：

```text
PrismStorageV1
schemaVersion
settings
secrets
sessions
activeSessionByWorkspace
activeImageTask
migration
export
import
```

规则：

```text
token 与普通导出分离
Chat / Vision / Image 历史不共用
每个 session 保存 modelId
全局默认只影响新 session
可选参数偏好使用 enabled/value
```

### 6. 重建前端工作区

按工作区实现：

```text
ChatWorkspace
VisionWorkspace
ImageWorkspace
Settings
Sessions
```

保留当前体验方向：

```text
底部 composer 是主交互中心
工作区切换轻柔
reasoning 可折叠
图片入场细腻
移动端使用 header/nav/sheet
参数发送状态可见
```

### 7. 精修视觉与交互

统一：

```text
design tokens
深浅色模式
动效 token
图标
错误文案
空状态
移动端触控行为
```

保持：

```text
当前轻量、沉浸、细腻的工作台气质
```

## Conversation 实现要求

必须满足：

```text
Chat / Vision 底层使用统一 Conversation 契约
OpenAI-compatible Chat Completions 是第一阶段唯一主路径
默认发送 model、messages、stream: true
Auto thinking 不发送任何 thinking 控制参数
On / Off 只发送一种选定 thinking 格式
默认不发送 max_tokens / max_completion_tokens
图片输入只在用户添加图片后发送
流式返回能区分 content 与 reasoning
```

自定义模型：

```text
默认基础调用
不在线探测
不自动试错 thinking 格式
用户显式选择 On / Off 时显示格式并发送一种格式
```

## AIGC 实现要求

必须满足：

```text
默认最小请求只有 model + prompt
negative_prompt 非空才发送
size 启用后才发送
seed / steps / guidance 逐项启用后才发送
loras 有条目才发送
image_url 有图片输入才发送
任务提交和轮询完整
任务失败和超时有清晰反馈
刷新后尽可能恢复 active task
```

参数面板：

```text
基础参数：negative_prompt, size
高级参数：seed, steps, guidance, loras
图片输入：输入对话框子模块
```

LoRA：

```text
最多 6 个
单 LoRA 发送字符串
多 LoRA 发送对象
多 LoRA 权重总和为 1.0
不判断与基础模型兼容性
```

## 前端体验要求

必须满足：

```text
第一屏是工作区，不是 landing page
桌面与移动端都是完整体验
移动端不是桌面压缩版
输入栏是主交互中心
参数面板是辅助控制区
状态与错误可见
高级参数是否发送在 UI 上清楚
```

移动端必须覆盖：

```text
切换 Chat / Vision / AIGC
创建和恢复会话
发送 / 停止
图片上传或 URL 输入
AIGC 参数控制
生成图片查看
设置 token
导入 / 导出
```

## 技术栈要求

保留：

```text
Next.js App Router
React 19
TypeScript
Tailwind CSS v4
Radix Primitives
motion
lucide-react
next-themes
zustand
idb-keyval
zod
openai
react-markdown / remark-gfm
sonner
Biome
```

不新增：

```text
数据库
ORM
账号认证系统
多供应商聚合 SDK
tRPC / GraphQL
Redux
XState
TanStack Query
大型 UI 套件
Radix Themes
测试框架
MSW
Playwright
```

摇摆依赖按 `10-technology-stack-and-dependency-decisions.md` 处理。

## Probe 边界

probe 是本地开发工具。

允许：

```text
探测模型可用性
探测图片输入能力
探测 thinking 三种格式
探测 max_tokens / max_completion_tokens
生成诊断报告
辅助维护内置 profile
```

禁止：

```text
线上运行时自动探测
Vercel 部署自动刷新能力
用户 UI 导入 probe 报告
失败后自动轮流尝试参数格式
```

## 错误处理要求

必须区分：

```text
MISSING_API_KEY
AUTH_FAILED
QUOTA_LIMITED
RATE_LIMITED
MODEL_UNAVAILABLE
UNSUPPORTED_PARAMETER
INVALID_REQUEST
PAYLOAD_TOO_LARGE
UPSTREAM_TIMEOUT
UPSTREAM_ERROR
NETWORK_ERROR
TASK_FAILED
INTERNAL_ERROR
```

UI 可使用更自然文案，但底层错误码应保留。

错误展示：

```text
toast 快速反馈
工作区错误块展示原因和下一步
详情展开展示 request id / 错误码 / 上游摘要
```

## 禁止事项

不得：

```text
把 UI 默认值直接变成请求参数
打开高级区就发送所有高级参数
让 Auto 自动注入 thinking 或输出上限
在 runtime 为自定义模型在线探测能力
失败后静默切换 thinking 参数格式重试
让 UI 直接拼 ModelScope payload
让组件直接访问 IndexedDB
让 API route 长期保存 token
把 Chat 和 Vision 做成两套底层协议
把 AIGC 扩展成工作流画布
引入数据库、账号系统或云同步
用大幅视觉改版替代架构重构
```

## 第一阶段不要求

不要求：

```text
Responses API
Anthropic API-compatible messages
tools / function calling
Agent workflow
temperature / top_p 参数面板
ControlNet
mask / inpaint 工作流
模型在线搜索
模型市场
云同步
账号系统
测试体系建设
probe UI
```

## 验收标准

第一阶段实现完成时，应满足：

```text
Chat / Vision / AIGC 三个工作区可用
Chat / Vision 底层统一 Conversation 契约
Chat / Vision 历史列表分开
AIGC 独立图片 session 和生成记录
本地 token、设置、会话和生成记录可持久化
导入导出可用且默认不包含 token
Conversation 可流式输出 content 与 reasoning
AIGC 可提交、轮询、成功、失败、超时和刷新恢复
所有可选行为参数遵守显式发送原则
错误分级清晰
桌面与移动端都有完整体验
视觉气质保留当前轻量、流畅、细腻方向
业务代码边界符合 07 文档
依赖选择符合 10 文档
```

## 完成度评估

实现后按维度评估：

```text
方向一致性
接口契约一致性
存储 schema 完整度
Conversation 工作流完整度
AIGC 工作流完整度
前端体验完成度
移动端完成度
错误与边界处理
依赖边界
可继续维护性
```

每个维度使用：

```text
未开始
骨架
可运行
可用
可靠
可发布
```

不要用“代码写了多少”替代产品完成度。
