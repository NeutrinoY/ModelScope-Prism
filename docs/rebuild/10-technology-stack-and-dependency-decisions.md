# 技术栈与依赖决策

## 目的

本文定义第一阶段重构的技术栈、依赖去留、摇摆区处理方式和禁止引入的技术方向。

技术栈决策服务于 Prism 的产品定位：

```text
轻量 Web 前端
Local-first 用户数据
ModelScope API-Inference 调用工作台
细腻的桌面与移动端体验
清晰的参数发送语义
```

第一阶段不是换技术栈，也不是追逐最新依赖。重构目标是把当前项目中已经有效的技术选择整理成稳定边界，并移除或延后不必要的复杂度。

## 总体原则

```text
保留现有轻量主干
优先减少依赖漂移
不引入重型后端
不引入多供应商抽象
不把测试体系作为第一阶段目标
按功能真实需要新增 primitive
摇摆依赖先隔离边界，再决定替换
```

依赖的价值判断顺序：

```text
是否服务核心工作流
是否降低协议和参数语义复杂度
是否保护当前视觉与动效气质
是否适合 Vercel / Next.js 部署
是否增加长期维护负担
```

## 核心技术栈

第一阶段核心技术栈：

```text
Next.js App Router
React 19
TypeScript
Tailwind CSS v4
Radix Primitives
Motion / Framer Motion
Zustand
IndexedDB via idb-keyval
Zod
OpenAI SDK for OpenAI-compatible Conversation
fetch for ModelScope AIGC task APIs
Biome
```

这些技术共同形成 Prism 的基本形态：

```text
Next.js 负责页面、Route Handlers 和部署边界
React 负责客户端工作台交互
Tailwind 负责设计 token 与视觉实现
Radix 负责无障碍交互 primitive
Motion 负责细腻动效
Zustand + IndexedDB 负责本地优先状态
Zod 负责请求、存储和导入导出校验
OpenAI SDK 负责 LLM / VLM 兼容接口
Biome 负责代码质量工具链
```

## Next.js

决策：

```text
保留 Next.js App Router
API 代理继续使用 app/api/*/route.ts Route Handlers
不引入独立后端服务
不引入 tRPC / GraphQL / RPC 框架
```

理由：

```text
Prism 需要少量服务端边界来代理用户当前请求
API route 可以隔离 token、请求大小、限流、错误映射和上游协议
项目不需要数据库、账号系统或长期服务端状态
```

边界：

```text
Route Handler 应保持薄
Provider payload 构造放在 provider adapter
领域规则放在 domain / contract 层
UI 不直接调用 ModelScope 上游接口
```

## React

决策：

```text
保留 React 19
工作区组件使用 client component
静态 shell 和布局可逐步利用 server component
```

理由：

```text
Prism 的核心是高交互工作台
聊天流式输出、图片生成任务、参数面板和移动端 sheet 都是客户端交互
React 19 与 Next.js 16 是当前项目主干
```

边界：

```text
不要把所有 app 内容都无差别标记为 client
不要把 provider、schema、domain 逻辑写进 React 组件
重组件和可延后能力应考虑动态加载
```

## TypeScript

决策：

```text
保留 TypeScript
重构后的 contracts / domain / provider / storage 必须有明确类型
```

理由：

```text
Prism 的关键复杂度在参数语义、存储迁移、消息结构和 provider 转换
这些复杂度需要类型约束，而不是组件内约定
```

边界：

```text
避免 any 在契约层扩散
允许 provider 边界临时承接上游不稳定字段
上游未知响应必须先收敛为 PrismError 或内部 result 类型
```

## Tailwind CSS

决策：

```text
保留 Tailwind CSS v4
使用 CSS-first token
继续使用 @theme inline 暴露语义变量
```

理由：

```text
当前项目已经使用 Tailwind v4
Tailwind v4 的 CSS theme variables 适合统一深浅色、间距、圆角和动效 token
Prism 的视觉系统应轻量、可控、接近现有实现
```

边界：

```text
不要引入另一套完整视觉主题系统
不要把颜色散落在大量一次性 class 中
不要让每个 feature 定义自己的配色语言
```

## Radix Primitives

决策：

```text
保留当前 Radix primitive 依赖
按需增加 Select / Switch / Tabs / Slider / Popover 等 primitive
不引入 Radix Themes
```

理由：

```text
Dialog、Sheet、Tooltip、Label、Slot 已经符合当前组件组织方式
Radix Primitives 无样式，能保护 Prism 自己的视觉语言
更多 primitive 应由具体交互需求驱动，而不是一次性安装
```

边界：

```text
Radix 只提供行为和无障碍基础
视觉样式由 Prism 设计 token 决定
不要为了方便引入会改写整体审美的组件套件
```

## 动效库

决策：

```text
第一阶段保留 framer-motion
后续可评估迁移到 motion / motion/react
不要同时长期保留两套动效入口
```

理由：

```text
当前项目已经大量使用 AnimatePresence、layout、motion.div
用户明确希望保留现有流畅细腻的动效手感
第一阶段不应把动效迁移和架构重构混在一起
```

迁移条件：

```text
前端组件边界稳定
动效 token 已统一
确认 motion/react 替换成本低
构建产物或维护成本有明确收益
```

## 图标

决策：

```text
保留 lucide-react
图标按钮默认使用 lucide 图标
```

理由：

```text
当前项目已经使用 lucide
图标风格轻、线性、克制，符合 Prism 工作台气质
组件按图标导入，便于 tree-shaking
```

边界：

```text
不要手写 lucide 已有图标
不要混入多套图标风格
不熟悉图标必须有 tooltip 或 aria-label
```

## 主题

决策：

```text
保留 next-themes
深色和浅色模式共享语义 token
```

理由：

```text
Prism 需要稳定的双色模式
next-themes 与 Tailwind class dark mode 的配合足够轻量
```

边界：

```text
不要把主题状态塞进业务 store
不要为浅色模式写一套独立组件
```

## 状态与本地存储

决策：

```text
保留 Zustand
保留 idb-keyval
第一阶段不引入 Redux、XState、TanStack Store、Dexie
```

理由：

```text
Prism 的状态是本地优先的工作台状态
会话、设置、活跃工作区和 AIGC 记录适合 Zustand 管理
当前 schema 适合保存为版本化对象，不需要复杂 IndexedDB 查询
```

边界：

```text
store 负责状态入口，不负责构造 provider payload
storage 负责 schema、migration、import/export
组件不得直接访问 IndexedDB
```

升级条件：

```text
如果未来出现多对象索引、分页查询、复杂事务或大文件元数据管理，再考虑 idb 或 Dexie
如果状态机复杂到难以靠普通 action 表达，再重新评估 XState
```

## 校验与契约

决策：

```text
保留 Zod
contracts、API body、导入导出和 migration 使用 Zod 校验
```

理由：

```text
Zod 可读性高，适合同时作为运行时校验和契约文档
Prism 的关键不是极致 schema 性能，而是防止参数语义漂移
```

边界：

```text
不要在组件里重复手写松散校验
不要把上游任意字段直接写入本地 schema
```

不采用：

```text
Valibot / ArkType 可以作为未来替代候选
第一阶段不切换，避免增加重构变量
```

## ModelScope 调用

决策：

```text
Conversation 使用 OpenAI SDK
AIGC 使用 fetch
```

理由：

```text
ModelScope LLM / VLM 是 OpenAI-compatible Chat Completions
OpenAI SDK 可以自然处理 baseURL、stream、timeout 和 API error
AIGC 的 images/generations 与 tasks 轮询更接近 ModelScope 自有协议，直接 fetch 更清楚
```

边界：

```text
OpenAI SDK 只出现在 provider 或 route 邻近层
UI 不直接 import OpenAI SDK
AIGC provider 负责 headers、async mode、task type 和错误映射
```

## Markdown 与代码高亮

决策：

```text
保留 react-markdown
保留 remark-gfm
短期保留 react-syntax-highlighter
中期可评估 Shiki
```

理由：

```text
LLM 输出需要 Markdown、表格、列表和代码块
当前 react-syntax-highlighter 已可用
Shiki 高亮质量更接近 VS Code，但会引入异步高亮、缓存和加载策略
```

第一阶段要求：

```text
MarkdownRenderer 应保持独立组件
代码高亮应可以被替换
重代码高亮能力可考虑动态加载
```

替换条件：

```text
聊天代码块成为核心体验
react-syntax-highlighter 包体或语言加载成为明显问题
MarkdownRenderer 边界已经稳定
```

## 图像图库布局

决策：

```text
react-masonry-css 是替换候选
重构 ImageWorkspace 时优先尝试 CSS columns / CSS grid
暂不依赖未完全稳定的原生 CSS Masonry
```

理由：

```text
当前图库只需要响应式图片流和不同高度图片排列
这类需求通常可以用 CSS columns 或 grid 解决
减少一个专用布局依赖有利于长期维护
```

边界：

```text
替换前必须保持移动端单列体验
图片入场、hover overlay、查看器导航不能退化
不要为了瀑布流引入重型虚拟布局库
```

## Toast 与错误反馈

决策：

```text
保留 sonner
错误分级由 domain / service / API route 负责
toast 只负责呈现用户可理解的短反馈
```

理由：

```text
Prism 需要轻量通知，而不是复杂消息中心
sonner 已覆盖当前成功、失败、提示场景
```

边界：

```text
不要把错误分类逻辑写在 toast 调用处
不要把所有上游失败都 toast 成同一句泛化失败
```

## 表单库

决策：

```text
第一阶段不引入 react-hook-form、TanStack Form 或 Formik
```

理由：

```text
Prism 的参数面板难点不是大型表单
难点是每个可选参数是否被显式启用、是否发送
自写 enabled/value 状态比通用表单库更贴合当前语义
```

允许重新评估的条件：

```text
设置页变成大型嵌套表单
导入导出编辑需要复杂字段级错误
参数 preset 管理需要大量动态字段和校验状态
```

## 测试依赖

决策：

```text
第一阶段暂不建设测试模块
不新增 Testing Library、Playwright、MSW 或 E2E 框架
```

现有状态：

```text
重构骨架不包含测试脚本和测试依赖
旧实现中的测试文件已随旧实现移入本地备份
第一阶段不要求建设测试覆盖
```

处理方式：

```text
不要在本阶段围绕测试重组项目结构
如果后续实现阶段需要恢复测试，应单独作为工程质量任务讨论
```

## 代码质量工具

决策：

```text
保留 Biome
不引入 ESLint + Prettier 双工具链替换
```

理由：

```text
Biome 覆盖格式化和 lint
当前项目规模不需要更复杂工具链
保持工具简单有利于 Agent 执行
```

边界：

```text
格式化和 lint 配置不要与业务重构混杂提交
如需调整规则，应单独说明原因
```

## 可清理候选

重构骨架已经移除旧实现中明确不进入第一阶段的直接依赖：

```text
baseline-browser-mapping
react-masonry-css
tailwindcss-animate
vitest
```

仍保留为后续评估候选：

```text
react-syntax-highlighter
```

具体判断：

```text
baseline-browser-mapping：不作为 direct devDependency 保留
react-masonry-css：图库重构时优先用 CSS columns / grid
tailwindcss-animate：动效先由 Motion 与 CSS token 承载
vitest：第一阶段不建设测试模块
react-syntax-highlighter：MarkdownRenderer 稳定后再评估 Shiki
```

## 禁止引入

第一阶段禁止引入：

```text
数据库
ORM
账号认证系统
NextAuth / Auth.js
Prisma
多供应商模型聚合 SDK
tRPC / GraphQL
Redux
XState
TanStack Query
大型 UI 组件套件
Radix Themes
完整 shadcn 项目化脚手架
ComfyUI / workflow canvas 依赖
Playwright / E2E 测试体系
MSW
```

原因：

```text
这些能力要么与第一阶段目标无关
要么会把轻量 ModelScope 调用前端扩张成另一个产品
要么会提前污染接口契约和目录结构
```

## 新增依赖规则

新增依赖必须满足至少一条：

```text
解决明确的无障碍交互问题
显著降低复杂 UI primitive 的维护成本
替代当前已经确认有问题的摇摆依赖
直接支撑 ModelScope API-Inference 调用
直接支撑本地数据安全、迁移或导入导出
```

新增依赖不得只是因为：

```text
流行
模板常见
Agent 熟悉
未来可能用到
可以少写几十行代码
```

新增依赖前必须明确：

```text
使用位置
替代方案
不使用它的成本
卸载成本
是否影响移动端
是否影响 bundle
```

## 与现有代码的关系

当前代码是语义源和体验源，不是依赖使用方式的最终范式。

需要继承：

```text
Next.js + React + Tailwind 的总体路线
Radix primitive 风格的基础 UI
Framer Motion 带来的细腻动效
lucide 图标系统
Zustand + IndexedDB 的 local-first 方向
OpenAI SDK 调用 ModelScope Chat Completions 的经验
```

需要修正：

```text
组件过重
UI 直接接近请求 payload 构造
参数默认值和发送语义混在一起
provider 字段散落到 UI 或 model profile 附近
storage schema 缺少清晰版本化边界
```

## 验收标准

技术栈与依赖决策满足以下条件时视为可接受：

```text
核心栈保持轻量稳定
没有引入第一阶段不需要的后端、认证、数据库或测试体系
依赖边界与 docs/rebuild/07-core-and-provider-organization.md 一致
前端依赖支持 docs/rebuild/08 和 docs/rebuild/09 的体验要求
可选参数显式发送原则不被表单库或默认值机制破坏
摇摆依赖有清晰替换条件
新增依赖必须有明确理由和卸载边界
实现 Agent 可以据此判断依赖去留而不反复询问
```
