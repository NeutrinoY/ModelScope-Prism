# 核心与 Provider 代码组织

## 目的

本文定义第一阶段重构后的代码组织、层级职责和依赖边界。

目标不是引入大型企业架构，而是在当前项目规模下建立足够清晰的边界，避免 UI、API route、provider payload、存储和领域规则继续混在一起。

## 总体策略

Prism 采用轻量分层 + 功能区组织。

```text
app：Next.js 边界
features：前端功能区
components：跨功能复用 UI
lib/contracts：共享接口契约
lib/domain：纯领域规则
lib/providers：外部服务协议适配
lib/storage：本地存储、迁移、导入导出
lib/services：前端请求 client
lib/config：配置与限制
```

不采用重型 Clean Architecture / DDD 目录模板。

不继续采用所有组件、hooks、服务平铺在少数目录下的结构。

## 推荐目录结构

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
    api/
      conversation/route.ts
      image/
        generate/route.ts
        status/[taskId]/route.ts

  features/
    chat/
      components/
      hooks/
      workspace.tsx

    vision/
      components/
      hooks/
      workspace.tsx

    image/
      components/
      hooks/
      workspace.tsx

    settings/
      components/
      hooks/

    sessions/
      components/
      hooks/

  components/
    ui/
    layout/
    shared/

  lib/
    contracts/
      conversation.ts
      image-generation.ts
      errors.ts
      storage.ts

    domain/
      model-profile.ts
      messages.ts
      image-input.ts
      lora.ts
      sessions.ts
      explicit-params.ts

    providers/
      modelscope/
        conversation.ts
        image-generation.ts
        task-status.ts
        errors.ts
        payloads.ts

    storage/
      schema.ts
      defaults.ts
      migrations.ts
      export-import.ts
      store.ts

    services/
      conversation-client.ts
      image-client.ts

    config/
      api.ts
      limits.ts
```

根目录保留：

```text
docs/
scripts/
public/
package.json
next.config.ts
tsconfig.json
biome.json
pnpm-lock.yaml
```

## src 目录

正式重构建议使用 `src/`。

理由：

```text
应用代码与根目录配置文件分离
更容易表达 app / features / lib 的边界
避免根目录继续膨胀
符合现代 Next.js 项目常见组织方式
```

`public/`、配置文件和 `.env.*` 保持在项目根目录。

## app 层

`src/app` 是 Next.js App Router 边界。

它负责：

```text
页面入口
布局
全局样式
Route Handler
metadata / icon 等 Next.js 文件约定
```

它不负责：

```text
领域规则
ModelScope payload 构造
LoRA 校验
thinking 参数格式选择
session schema 迁移
本地导入导出逻辑
```

API route 只做 HTTP 边界：

```text
解析请求
生成 requestId
限流
读取 token
调用 provider / domain 服务
返回统一响应
```

API route 不应包含复杂业务规则。

## features 层

`src/features` 按前端功能区组织。

```text
chat：文本对话工作区
vision：视觉理解工作区
image：AIGC 工作区
settings：设置体验
sessions：历史与会话管理
```

Chat 与 Vision 在 UI 上分开，但底层共享 Conversation 契约和 provider。

Image 是独立 AIGC feature。

Feature 内可以包含：

```text
workspace.tsx
components/
hooks/
feature-local helpers
```

Feature 内不应直接拼 ModelScope provider payload。

Feature 内不应直接读写 IndexedDB 细节。

## components 层

`src/components` 只放跨 feature 复用 UI。

```text
ui：基础 UI primitives
layout：全局布局、导航、工作区外壳
shared：跨模块复用组件
```

适合放在 shared 的例子：

```text
图片输入组件
Markdown 渲染器
通用设置对话框片段
通用错误提示
```

不应把所有业务组件都放进 `components/`。

只被 Chat 使用的组件应放在 `features/chat/components/`。

只被 AIGC 使用的组件应放在 `features/image/components/`。

## contracts 层

`src/lib/contracts` 是前后端共享事实来源。

它负责定义：

```text
请求类型
响应类型
错误码
stream event
任务状态
导入导出数据结构
```

示例：

```text
conversation.ts
image-generation.ts
errors.ts
storage.ts
```

contracts 可以被以下层引用：

```text
app
features
domain
providers
storage
services
```

contracts 不应依赖：

```text
React
Next.js
provider SDK
Zustand
IndexedDB
```

## domain 层

`src/lib/domain` 放纯领域规则。

它负责：

```text
显式参数发送规则
模型 profile 解析
消息构造与标准化
图片输入标准化
LoRA 校验
session 标题生成
session 分类与过滤
```

示例：

```text
model-profile.ts
messages.ts
image-input.ts
lora.ts
sessions.ts
explicit-params.ts
```

domain 不应依赖：

```text
React
Next.js
DOM
OpenAI SDK
Zustand
IndexedDB
```

domain 可以依赖：

```text
contracts
纯 TypeScript 工具函数
```

## providers 层

`src/lib/providers` 负责外部服务协议适配。

第一阶段只有：

```text
providers/modelscope
```

ModelScope provider 负责：

```text
OpenAI-compatible Chat Completions 调用
图片生成提交
图片任务状态查询
ModelScope 上游错误分类
ModelScope provider payload 构造
ModelScope 特有 header
ModelScope 特有 thinking 参数翻译
```

ModelScope 特有字段只能出现在 provider 或靠近 provider 的契约翻译层。

示例：

```text
enable_thinking
chat_template_kwargs
thinking.type
X-ModelScope-Async-Mode
X-ModelScope-Task-Type
```

UI 不得直接拼这些字段。

## storage 层

`src/lib/storage` 负责本地数据。

它负责：

```text
schema 定义
默认数据
迁移
导入导出
Zustand / IndexedDB 适配
```

示例：

```text
schema.ts
defaults.ts
migrations.ts
export-import.ts
store.ts
```

storage 可以依赖：

```text
contracts
domain
idb-keyval
zustand
```

storage 不应依赖：

```text
React components
Next.js route handlers
ModelScope provider
```

## services 层

`src/lib/services` 是前端请求 client。

它负责：

```text
调用本应用 API route
包装 fetch
处理前端可读错误
暴露 typed client 方法
```

示例：

```text
conversation-client.ts
image-client.ts
```

services 不应直接调用 ModelScope 外部 API。

前端 feature 通过 services 调用本应用 API，而不是直接调用 provider。

## config 层

`src/lib/config` 负责集中配置。

它负责：

```text
API 超时
body 大小限制
限流配置
轮询默认间隔
输出上限两档值
```

示例：

```text
api.ts
limits.ts
```

配置值不应散落在组件和 route handler 中。

## scripts 与 probe

`scripts/` 继续位于根目录。

probe 是本地开发工具，不进入线上运行时。

probe 可以复用：

```text
contracts 中的类型语义
domain 中的纯解析/报告辅助逻辑
```

probe 不应驱动：

```text
runtime 自动探测
线上 profile 自动刷新
用户 UI 行为
```

probe 可以产生报告或 profile 片段，但内置 profile 仍应通过代码审查纳入项目。

## 依赖方向

允许的依赖方向：

```text
features -> components
features -> services
features -> storage
features -> domain
features -> contracts

app/api -> contracts
app/api -> domain
app/api -> providers
app/api -> config

providers -> contracts
providers -> domain
providers -> config

storage -> contracts
storage -> domain

services -> contracts

domain -> contracts
```

禁止的依赖方向：

```text
domain -> React
domain -> Next.js
domain -> provider SDK
providers -> React
providers -> storage
providers -> feature components
contracts -> anything app-specific
app/api -> feature components
features -> providers/modelscope
components/ui -> domain business rules
```

## 参数构造边界

显式参数发送原则必须在 domain / provider 边界落地。

规则：

```text
UI 保存用户显式选择
domain 判断哪些可选参数应被发送
provider 将领域请求翻译成 ModelScope payload
```

禁止：

```text
UI 直接构造 ModelScope payload
API route 手写复杂 payload 条件
provider 猜测用户未显式选择的参数
profile 让 Auto 自动发送模型行为参数
```

## Route Handler 边界

Route Handler 应保持薄。

Conversation route：

```text
解析 ConversationRequest
读取 token
限流与 requestId
调用 ModelScope conversation provider
返回 NDJSON stream 或错误
```

Image generate route：

```text
解析 ImageGenerationRequest
读取 token
限流与 requestId
调用 ModelScope image-generation provider
返回 taskId 或错误
```

Image status route：

```text
读取 taskId
读取 token
调用 ModelScope task-status provider
返回统一任务状态或错误
```

## Feature 组织规则

Chat feature：

```text
负责文本对话 UI
负责 Chat 历史入口
使用 Conversation client
不直接处理 ModelScope payload
```

Vision feature：

```text
负责视觉理解 UI
负责 Vision 历史入口
突出图片输入
使用 Conversation client
不直接处理 ModelScope payload
```

Image feature：

```text
负责文生图与图像编辑 UI
负责 AIGC 参数面板
负责本地图库体验
使用 Image client
不直接处理 ModelScope payload
```

Settings feature：

```text
负责 token、模型默认值、全局默认参数偏好、导入导出入口
不直接调用外部 provider
```

Sessions feature：

```text
负责历史列表、session 创建、重命名、删除、切换
按 workspace 区分 Chat / Vision / Image 历史
```

## 不建议的结构

不建议继续扩大：

```text
components/
hooks/
lib/
services/
```

这种平铺结构在项目增长后会让功能边界不清。

也不建议引入过重目录：

```text
application/
infrastructure/
use-cases/
repositories/
entities/
```

Prism 是轻量 Web 前端，不需要重型企业模板。

## 与当前实现的迁移关系

当前实现可以渐进迁移，不需要一次性移动所有文件。

建议顺序：

```text
先建立 contracts
再建立 domain 纯规则
再建立 providers/modelscope
再调整 API route
再迁移 storage
最后迁移 features/components
```

迁移过程中必须保持：

```text
现有功能可运行
测试和 smoke 能持续执行
不做无关视觉重做
不混入新供应商抽象
```

## 验收标准

代码组织满足以下条件时视为可接受：

```text
app 只承担 Next.js 边界
features 按用户工作区组织
components 只放跨 feature 复用 UI
contracts 是前后端共享事实来源
domain 是纯 TypeScript 规则
providers/modelscope 集中处理 ModelScope 协议翻译
storage 集中处理 schema、迁移、导入导出
services 只调用本应用 API route
UI 不直接拼 ModelScope payload
API route 保持薄
probe 不进入 runtime
显式参数发送原则在 domain / provider 边界落实
```
