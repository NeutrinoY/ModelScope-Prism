<div align="center">
  <img src="public/logo.webp" alt="ModelScope Prism" width="150" />

  # ModelScope Prism

  **融合对话、视觉与创意的 ModelScope 探索空间**

**中文 | [English](./README_EN.md)**

</div>



---

**[ModelScope Prism](https://modelscope-prism.neutrinoy.xyz)** 是一个基于 Next.js 构建的开源 AI Web 应用。作为 ModelScope（魔搭社区）API-Inference 服务的现代化前端界面，它集成了 **LLM 对话**、**VLM 视觉识别** 和 **AIGC 绘图** 三大核心能力，无需部署复杂后端，即可为您提供流畅、美观且强大的 AI 体验。

---

### ✨ 核心亮点

- **🧠 深度思考模式**：支持 **DeepSeek V4 Flash**、**DeepSeek V4 Pro**、**GLM-5.2**、**Qwen3.5** 等内置模型，开启后可原生展示思维链（Chain of Thought），让 AI 的推理过程清晰可见。
- **🎨 AIGC 画板**：不仅是生成图片，更支持 **LoRA 模型加载**、**CFG/Steps 微调**、**自定义分辨率** 以及 **沉浸式图片浏览器**。
- **👀 多模态视觉**：支持 **Qwen3-VL** 等视觉大模型，上传图片即可进行深度问答与分析。
- **🔒 数据隐私安全**：秉持 Local-First 原则，所有对话记录、Access Token 和设置均存储在您的**浏览器本地（IndexedDB）**，除直连 ModelScope API 外，不会上传至任何第三方服务器。
- **🎛️ 显式参数语义**：所有可选模型参数（思考模式、输出上限、Seed/Steps/Guidance/LoRA…）必须由您显式启用才会被发送——界面上看到的默认值，从不等于请求里发送的值。
- **📱 响应式设计**：无论是 4K 大屏显示器还是移动设备，都能获得最佳的交互体验。

---

### 🚀 快速开始

#### 1. 获取 Access Token
本项目依赖 ModelScope 提供的 Serverless Inference API 服务。
1. 登录账号并访问 [ModelScope Access Token](https://modelscope.cn/my/myaccesstoken)。
2. 复制您的 Access Token。

#### 2. 配置 ModelScope Prism
1. 打开[部署好的网页](https://modelscope-prism.neutrinoy.xyz)（或本地启动后访问 `http://localhost:3000`）。
2. 点击页面底部 **Dock 栏** 的 **设置图标** ⚙️。
3. 将 Access Token 粘贴至 **ModelScope Access Token** 输入框并保存。

#### 3. 开始创作！
*   **💬 聊天**：切换到 **Chat 工作区**。内置了 DeepSeek、Qwen、GLM 等多个系列模型，可在输入栏一键开启 **"Think"** 体验深度推理。
*   **👁️ 视觉**：切换到 **Vision 工作区**。点击上传或粘贴图片，即可让 AI 识别图像内容、提取文字或进行看图说话。
*   **🎨 绘图**：切换到 **Studio 工作区**。输入提示词（Prompt），调整参数，即可生成高质量图片。

#### ⚠️ 重要提示：数据安全与备份
您的所有聊天记录和生成的图片链接都**保存在您当前的浏览器中**。
*   如果您**清除浏览器缓存**或使用**无痕模式**，数据将会丢失。
*   建议定期在 **设置 → Local data** 中点击 **Export**，将本地数据导出为 JSON 文件进行备份（导出内容**不含** Access Token）。

---

### 🧩 模块详解

#### 💬 Chat（LLM 深度对话）
*   **内置模型**：预设了 Qwen、DeepSeek、GLM 等热门系列。点击模型名即可快速切换。
*   **自定义模型**：支持手动输入 ModelScope 上的任意文本生成模型 ID。
    *   👉 [查找更多文本生成模型 (Text Generation)](https://modelscope.cn/models?filter=inference_type&page=1&tabKey=task&tasks=hotTask:text-generation&type=tasks)
*   **思考模式（Thinking）**：
    *   点击输入栏的 **Think** 按钮展开面板，在 `Auto` / `On` / `Off` 三态间切换；当前状态也会常驻显示在顶部模型摘要条上。
    *   `Auto` 表示不发送任何思考控制参数，完全交给模型或平台默认行为；`On` / `Off` 才会按选定格式显式发送启用或关闭参数。
    *   内置模型使用已探测确认的固定格式；自定义模型可在 `On` / `Off` 时手动选择 `enable_thinking`、`chat_template_kwargs.enable_thinking` 或 `thinking.type` 三种格式之一。
    *   思考过程以折叠/引用的方式优雅展示，支持点击展开查看详细推理步骤。

#### 👁️ Vision（VLM 视觉理解）
*   **看图说话**：上传一张图片，询问"图中有什么？"或"提取图中的文字"。
*   Vision 与 Chat 底层共享同一套对话请求能力，只是图片输入被放在了更突出的位置——两者历史记录相互独立，互不干扰。
*   **自定义模型**：除了内置的 Qwen3.5（支持远程图片 URL），您也可以尝试其他支持 OpenAI 格式的多模态模型。
    *   👉 [查找更多多模态模型 (Image-to-Text)](https://modelscope.cn/models?filter=inference_type&page=1&tabKey=task&tasks=hotTask:image-text-to-text&type=tasks)

#### 🎨 Studio（AIGC 创意画板）
ModelScope 拥有繁荣的文生图模型生态。由于模型众多，我们采用了开放式设计：
*   **自定义模型 ID**：您可以在设置中填入任意 ModelScope 上的文生图模型 ID。
    *   👉 [查找更多文生图模型 (Text-to-Image)](https://modelscope.cn/models?filter=inference_type&page=1&tabKey=task&tasks=hotTask:text-to-image-synthesis&type=tasks)
    *   *兼容性提示：推荐使用 **SDXL** 或 **SD 1.5** 架构的模型，兼容性最佳。Flux、Qwen-Image 等新架构模型请自行测试参数效果。*

**专业参数控制面板**（点击输入框右侧调节图标打开）：

请求体默认只包含 `model` + `prompt`；下方所有参数都必须显式启用才会被加入请求：

*   **基础参数**：
    *   **Size**：预设常用分辨率，支持自定义 `WIDTHxHEIGHT`（需启用后才发送）。
    *   **Negative prompt**：反向提示词（例如：`blurry, ugly, low quality`），仅在非空时发送。
*   **高级参数**（逐项勾选启用）：
    *   **Steps**：迭代步数 [1, 100]，推荐 **20–30**。
    *   **Guidance**：提示词相关性 [1.5, 20]，推荐 **3.5–7.0**。
    *   **Seed**：种子数，填入相同种子可复现特定画面。
    *   **LoRA**：支持加载风格模型，输入 ModelScope 上的 LoRA 模型 ID。最多混合 **6 个**，多个 LoRA 时权重总和须为 **1.0**。
*   **图片输入**：点击输入框左侧图标添加参考图（URL 或本地上传），用于图像编辑 / 图生图；不添加则为纯文生图。
*   面板底部提供 **Reset** 按钮，一键回到"只发送 model + prompt"的状态。

生成的图片支持下载、复制 prompt，并可在近全屏查看器中用键盘方向键浏览。

---

### 📝 更新日志

#### v2.0.0 [2026.07.10] — 架构重写

这是一次**彻底的重写**，而非增量迭代。Chat / Vision / AIGC 三个任务入口、Local-first 数据、流畅的工作台体验等产品方向保持不变，但工程实现被系统性地重新设计，围绕一个核心信条展开：**可选参数必须由用户显式发送，界面默认值不等于请求参数**。完整的重构指南见 [`docs/rebuild/`](docs/rebuild)。

**🏗️ 架构与工程质量**
*   前端与协议适配、领域规则、本地存储之间建立了清晰边界；界面不再直接拼装上游请求，也不直接读写浏览器存储。
*   三个工作区（Chat / Vision / AIGC）在底层共享统一的能力抽象，同时各自保留独立的产品入口与历史记录。

**⚖️ 参数发送语义**
*   `Auto` 现在严格等于"不发送任何控制参数"——思考模式、输出上限、AIGC 的尺寸/种子/步数/引导强度/LoRA 全部必须逐项显式启用才会真正发送。
*   自定义模型不再进行任何形式的运行时试探或失败后静默切换参数格式重试；诊断工作完全收敛到离线开发工具中。

**💾 本地数据**
*   本地存储升级为版本化结构，Access Token 与会话、设置数据分开存放。
*   新增标准的本地数据**导入 / 导出**：导出不含 Access Token，导入后会提示您重新确认 Token。
*   AIGC 生成任务在刷新页面后可在有效时间窗口内自动恢复轮询，不会因为误刷新而丢失进行中的任务。

**🧭 错误反馈**
*   上游错误统一收敛为一套标准分类，覆盖鉴权失败、额度不足、限流、模型不可用、参数不支持、任务失败、超时、网络错误等常见场景。
*   工作区内的错误提示统一展示"发生了什么 + 下一步可以做什么"，并可展开查看技术详情。

**✨ 体验优化**
*   生成图片新增下载能力。
*   历史记录重命名改为显式保存 / 取消交互，输入更可控。
*   侧栏底部展示当前应用版本号。

**🚀 依赖与工具链**
*   动效库升级为 `motion`，图库瀑布流改用原生 CSS 实现。
*   移除若干仅服务于旧实现的依赖，保持技术栈精简。
*   模型能力诊断工具（Probe）重新组织为更易维护的模块化结构。

<details>
<summary><strong>v1.x 历史更新日志</strong>（架构重写前的迭代记录，点击展开）</summary>

#### v1.4 [2026.07.08]

**✨ 新特性 (Features)**
*   **内置模型能力收敛**：根据 ModelScope 实测结果重整预设列表，仅保留 DeepSeek V4 Flash、DeepSeek V4 Pro、GLM-5.2、Qwen3.5 四个已确认可用模型，并为每个模型固定文本/视觉/思考/输出 token 能力画像。
*   **LLM 多模态输入补齐**：LLM 模块新增图片输入入口，与 VLM 共用参考图组件；当模型不支持图片、仅支持远程 URL 或不支持本地上传时，前端会按能力画像自动禁用对应入口。
*   **VLM 思考模式补齐**：视觉模块新增独立的 `visionThinkingIntent` 状态与输入栏思考开关，支持按模型能力切换 Auto / On / Off，并复用统一的 reasoning 展示链路。
*   **流式模型探测升级**：探测链路收敛为符合产品场景的流式优先模式，自动识别 `enable_thinking`、`thinking.type`、`chat_template_kwargs`、`max_tokens` 与配额/上游不可用等关键兼容性信号。

**🚀 优化与重构 (Improvements)**
*   **模型能力策略轻量化**：将运行时多重 fallback 收敛为内置模型硬编码画像 + 自定义模型保守试探的组合，减少 Vercel 线上环境中的不可控探测成本。
*   **三模块输入栏统一**：Chat、Vision、AIGC 的底部输入区统一为单行紧凑布局，参考图、参数、思考、发送/停止按钮在同一操作面内完成。
*   **思考开关交互下沉**：将思考模式控制移动到发送框区域，并按模型能力展示 `Reasoning Active`、`Chat Mode`、`Thinking Auto` 等状态，减少顶部模型选择区的认知负担。
*   **模型选择器视觉整理**：将模型能力标签整理为 `Text` / `Vision` 徽标，选中态统一为更克制的 secondary 背景，提升轻量对话页面的一致性。
*   **前端风格规范补齐**：新增前端风格一致性设计说明，明确轻量对话页面的布局密度、组件边界和能力状态表达，便于后续 UI 迭代保持一致。

**🐛 漏洞修复 (Bug Fixes)**
*   **探测错误分类修复**：将 ModelScope `402 insufficient balance` 归类为 `quota_limited`，避免误判为模型不可用；同时增强流式 JSON 错误解析与 token cap 截断识别。
*   **Qwen 视觉能力修正**：按实测结果将 Qwen3.5 标记为支持远程图片 URL、不支持 data URL 上传，避免前端放开不可用的本地图片上传路径。

#### v1.3 [2026.06.27]

**✨ 新特性 (Features)**
*   **统一对话 API 落地**：将原 LLM 与 VLM 后端链路合并为 `app/api/conversation`，统一处理文本、图片、思考内容与流式输出。
*   **最小回归链路落地**：新增 `scripts/smoke.mjs`，可在发布前验证 chat + image 关键链路可用性。
*   **自动化黑盒探针**：新增模块化 probe 脚本结构，可面向任意 ModelScope 模型生成 JSON 诊断报告与 Markdown 能力概览。

**🚀 优化与重构 (Improvements)**
*   **ModelScope 适配层重构**：新增 `lib/modelscope/conversation.ts` 与 `conversation-service`，将 OpenAI-compatible 请求、NDJSON 解析和前端会话调用统一封装。
*   **流式会话能力复用**：抽离共享 stream session runner，Chat / Vision 复用停止生成、错误处理和增量更新逻辑。
*   **工具链与配置更新**：迁移至 pnpm lockfile 与 Biome 检查链路，并将限流、超时、Body 大小等 API 阈值集中到配置层。
*   **AIGC 稳定性增强**：图像任务接口补齐 requestId、超时、限流和错误脱敏处理，提升线上问题定位与失败恢复能力。

**🐛 漏洞修复 (Bug Fixes)**
*   **本地存储溢出修复**：将底层状态管理从容量受限的 `localStorage` 迁移至异步 `IndexedDB`，解决多模态高清图片场景下的 `QuotaExceededError` 风险。
*   **请求可观测性补齐**：为 chat / vision / image API 全链路增加 `requestId`（响应头 + 日志串联），加速线上问题定位。

#### v1.2 [2026.03.03]

**✨ 新特性 (Features)**
*   **统一参考图入口升级**：VLM 与 AIGC 输入区新增左侧图标式参考图入口，点击后展开 URL / 本地上传双通道，上传路径更直觉。
*   **最小回归链路落地**：新增 `scripts/smoke.mjs`，可在发布前一键验证 chat + image 关键链路可用性。
*   **探针模式增强**：`scripts/probe.mjs` 增加 `quick/full` 双模式，并支持同模型历史报告对比输出。

**🚀 优化与重构 (Improvements)**
*   **API 配置中心化**：新增 `lib/config.ts`，将限流、超时、Body 大小与重试参数迁移为环境变量可配置。
*   **流式会话能力复用**：抽离共享 NDJSON 解析与 session runner（Chat / Vision 复用），减少重复实现并提升一致性。
*   **AIGC 稳定性增强**：图像任务轮询升级为退避策略（3s → 5s → 8s），并加入任务总超时与刷新恢复机制。
*   **模型策略抽象升级**：在保持兼容的前提下引入最小 `ModelProfile` 结构，便于后续策略扩展与自动化接入。

**🐛 漏洞修复 (Bug Fixes)**
*   **请求可观测性补齐**：为 chat / vision / image API 全链路增加 `requestId`（响应头 + 日志串联），加速线上问题定位。
*   **探针误判修复**：修复 quick 模式下思考策略可能误判为 `native_always_on` 的问题，提升新模型探测准确性。

#### v1.1 [2026.03.02]

**✨ 新特性 (Features)**
*   **模型生态升级**：收敛预设模型列表，保留已探测可用的 DeepSeek V4 Flash、DeepSeek V4 Pro、GLM-5.2、Qwen3.5。
*   **自动化黑盒探针**：新增 `scripts/probe.mjs` 自动化测试脚本，可动态嗅探 ModelScope 平台任意新模型的传参限制与能力边界（支持双向拨动测试防 429 限流误判）。
*   **终止生成控制**：LLM 与 VLM 模块均加入基于 `AbortController` 的打断功能，生成期间发送按钮动态切换为"停止"按钮，并静默处理中断异常。
*   **VLM 推理折叠**：将 VLM（视觉多模态）模块的后端数据流重构为 NDJSON 结构，支持将最新多模态大模型的思维链（Reasoning）进行原生提取，并在前端实现与 LLM 模块一致的优雅折叠效果。

**🚀 优化与重构 (Improvements)**
*   **策略架构重构**：将模型思考参数注入逻辑升级为结构化类型（`root_boolean`, `kwargs_dict`, `native_always_on`），重构前端 UI 逻辑，对强制思考模型进行"始终开启"的视觉锁定与状态防护。
*   **智能画质压缩**：前端新增无损尺寸画质压缩算法（`canvas quality 0.8`），在保留 VLM 原图分辨率的同时，大幅降低 payload 传输体积，显著提高网络响应速度。
*   **智能滚动交互**：重构了聊天区域的自动滚动逻辑（平滑吸底），当用户在生成期间向上滑动查看历史记录时，自动滚动将智能失效，把界面控制权还给用户。

**🐛 漏洞修复 (Bug Fixes)**
*   **本地存储溢出修复**：将底层状态管理引擎从容量受限的 `localStorage`（5MB）彻底迁移至无限容量的异步 `IndexedDB`，完美解决多模态高清图片场景下抛出的 `QuotaExceededError` 崩溃问题。

#### v1.0 [2025.12.29]
*   🎉 ModelScope Prism 初始版本发布，集成 LLM、VLM、AIGC 核心功能。

</details>

---

### 💻 开发者指南

如果您希望在本地运行或进行二次开发，请参考以下步骤。

#### 环境要求
*   Node.js 18+
*   pnpm

#### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/NeutrinoY/ModelScope-Prism.git

# 2. 进入目录
cd ModelScope-Prism

# 3. 安装依赖
pnpm install

# 4. 启动开发服务器
pnpm dev
```

打开浏览器访问 `http://localhost:3000`。

#### 本地环境变量（推荐）

在项目根目录创建 `.env.local`：

```bash
# ModelScope Access Token（仅用于 smoke / probe 本地开发工具；产品运行时的 Token 来自浏览器本地设置，不读取此变量）
MS_API_KEY=ms-xxxxxxxxxxxxxxxx

# 可选：API route 阈值配置（不填则使用默认值，见 src/lib/config/api.ts）
PRISM_CONVERSATION_RATE_MAX=30
PRISM_CONVERSATION_RATE_WINDOW_MS=60000
PRISM_CONVERSATION_MAX_BODY_BYTES=15000000
PRISM_CONVERSATION_TIMEOUT_MS=60000

PRISM_IMAGE_GENERATE_RATE_MAX=10
PRISM_IMAGE_GENERATE_RATE_WINDOW_MS=60000
PRISM_IMAGE_GENERATE_MAX_BODY_BYTES=15000000
PRISM_IMAGE_GENERATE_TIMEOUT_MS=30000

PRISM_IMAGE_STATUS_RATE_MAX=120
PRISM_IMAGE_STATUS_RATE_WINDOW_MS=60000
PRISM_IMAGE_STATUS_TIMEOUT_MS=20000
```

#### 发布前最小验证

确保代码通过类型检查、Lint 和构建：

```bash
pnpm typecheck   # tsc --noEmit
pnpm check       # biome lint .
pnpm build       # next build
```

再用 smoke 脚本验证一次真实的流式对话链路是否可用（需要 `MS_API_KEY`）：

```bash
# 默认探测 deepseek-ai/DeepSeek-V4-Flash
pnpm smoke

# 指定模型
pnpm smoke Qwen/Qwen3.5-397B-A17B
```

`smoke` 是唯一的发布前真实链路检查，`typecheck` + `check` + `build` 是唯一的静态验证组合；本项目当前不包含自动化测试框架。

#### 模型探测（Probe）

Probe 是**离线开发工具**，用于诊断某个 ModelScope 模型的流式可用性、思考控制格式、图片输入能力和输出上限参数，产出可用于维护内置模型画像的诊断信息。它不会以任何形式进入线上运行时。

```bash
# 探测单个模型
pnpm probe deepseek-ai/DeepSeek-V4-Flash

# 探测多个模型，并把完整诊断写入 JSON 文件
pnpm probe Qwen/Qwen3.5-397B-A17B ZhipuAI/GLM-5.2 --json probe-reports/report.json

# 跳过图片输入 / 输出上限探测，调整探测间隔（毫秒）
pnpm probe <model-id> --no-image --no-output --delay-ms 2000 --rate-limit-delay-ms 15000
```

探测报告默认只打印到终端；只有传入 `--json <path>` 时才会写入文件（建议写到被 `.gitignore` 忽略的 `probe-reports/` 目录）。

探测覆盖的能力维度：
*   **chat availability**：模型是否能在 ModelScope OpenAI-compatible endpoint 的流式接口上返回有效文本。
*   **thinking control**：`enable_thinking`、`chat_template_kwargs.enable_thinking`、`thinking.type` 三种格式各自是否生效。
*   **vision input**：是否支持远程图片 URL 或 base64 data URL。
*   **output token parameter**：`max_tokens` 是否有效，无效时是否应改用 `max_completion_tokens`。

> Probe 可以为了诊断目的尝试多种参数格式；这正是 Prism 运行时永远不会做的事——运行时只会按用户显式选择或内置画像发送**一种**确定的格式，绝不试探、绝不失败后静默切换重试。

#### 项目核心结构

**`src/app/`** — Next.js App Router 边界
*   `api/conversation/route.ts` — Conversation 统一流式请求（Chat + Vision）
*   `api/image/generate/route.ts` — AIGC 图片生成任务提交
*   `api/image/status/[taskId]/route.ts` — AIGC 图片生成任务状态轮询
*   `layout.tsx` / `page.tsx` / `globals.css` — 根布局与全局样式

**`src/features/`** — 按用户工作区组织的前端功能
*   `chat/` — Chat 工作区
*   `vision/` — Vision 工作区
*   `image/` — AIGC（Studio）工作区：参数面板、图库、任务 hook
*   `settings/` — 设置弹窗、导入导出
*   `sessions/` — 历史列表（按工作区分开）

**`src/components/`**
*   `ui/` — 基础 UI primitives（Radix 封装：Button / Dialog / Sheet…）
*   `layout/` — 全局布局（Sidebar / TopBar / Dock / MobileNav / MobileHeader）
*   `shared/` — 跨工作区复用组件
    *   `conversation/` — Conversation 消息列表、Composer、模型选择器、思考控制
    *   `image-input-dialog.tsx` — 图片输入子模块（URL / 本地上传，Chat / Vision / AIGC 共用）
    *   `markdown-renderer.tsx`、`reasoning-block.tsx`、`error-notice.tsx`、`parameter-toggle.tsx`

**`src/lib/`**
*   `contracts/` — 共享类型与错误码（`PrismErrorCode`、`ConversationRequest`、`ImageGenerationRequest`、`ModelProfile`、Storage schema…）
*   `domain/` — 纯 TypeScript 领域规则，不依赖 React / Next / OpenAI SDK（显式参数发送规则、模型画像解析、LoRA 校验、消息构造、session 标题与过滤、错误码到文案映射）
*   `providers/modelscope/` — ModelScope 协议适配层
    *   `conversation.ts` — OpenAI SDK + 自定义 baseURL + 流式解析
    *   `image-generation.ts` / `task-status.ts` — AIGC 任务提交与轮询
    *   `payloads.ts` / `errors.ts` — payload 构造与错误映射
*   `storage/` — 本地存储：schema、默认值、迁移、导入导出、Zustand + IndexedDB store
*   `services/` — 前端调用本应用 API route 的 client（`conversation-client.ts` / `image-client.ts`）
*   `config/` — 集中配置：API 限流 / 超时 / Body 大小、AIGC 轮询间隔、输出上限两档值、图片输入限制

**`scripts/`**
*   `smoke.mjs` — 发布前最小链路验证（单次流式 chat completion）
*   `probe/` — 模型能力离线诊断（`cli.mjs` / `cases.mjs` / `http.mjs` / `report.mjs`）

代码组织遵循的边界原则（详见 [`docs/rebuild/07`](docs/rebuild/07-core-and-provider-organization.md)）：

*   UI 不直接构造 ModelScope payload，也不直接访问 IndexedDB；
*   `domain` 是不依赖任何框架的纯规则层，负责"哪些可选参数应该被发送"；
*   `providers/modelscope` 是唯一知道 `enable_thinking`、`X-ModelScope-Async-Mode` 等协议细节的地方；
*   API route（`src/app/api/**/route.ts`）保持薄——只做鉴权、限流、调用 provider、返回统一错误。

---

<div align="center">
  如果这个项目对您有帮助，请给一个 ⭐️ Star 支持一下！<br/>
  Made with ❤️ by NeutrinoY
</div>
