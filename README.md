<div align="center">
  <img src="public/logo.webp" alt="ModelScope Prism" width="150" />


  # ModelScope Prism

  **融合对话、视觉与创意的 ModelScope 探索空间**

**中文 | [English](./README_EN.md)**

</div>



---

**[ModelScope Prism](https://modelscope-prism.neutrinoy.xyz)** 是一个基于 Next.js 构建的开源 AI Web 应用。作为 ModelScope（魔搭社区）API 服务的现代化前端界面，它集成了 **LLM 对话**、**VLM 视觉识别** 和 **AIGC 绘图** 三大核心能力，无需部署复杂后端，即可为您提供流畅、美观且强大的 AI 体验。

### ✨ 核心亮点

- **🧠 深度思考模式**：支持 **DeepSeek V4 Flash**、**DeepSeek V4 Pro**、**GLM-5.2**、**Qwen3.5** 等内置模型，开启后可原生展示思维链（Chain of Thought），让 AI 的推理过程清晰可见。
- **🎨  AIGC 画板**：不仅是生成图片，更支持 **LoRA 模型加载**、**CFG/Steps 微调**、**自定义分辨率** 以及 **沉浸式图片浏览器**。
- **👀 多模态视觉**：支持 **Qwen3-VL** 等视觉大模型，上传图片即可进行深度问答与分析。
- **🔒 数据隐私安全**：秉持 Local-First 原则，所有对话记录、Access Token 和设置均存储在您的**浏览器本地 (Local Storage)**，除直连 ModelScope API 外，不会上传至任何第三方服务器。
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
*   **💬 聊天**：切换到 **LLM 模块**。内置了 DeepSeek、Qwen、GLM 等多个系列模型，您可以在页面顶部导航栏一键开启 **"Reasoning"** 体验深度推理。
*   **👁️ 视觉**：切换到 **VLM 模块**。点击上传或粘贴图片，即可让 AI 识别图像内容、提取文字或进行看图说话。
*   **🎨 绘图**：切换到 **AIGC 模块**。输入提示词（Prompt），调整参数，即可生成高质量图片。

#### ⚠️ 重要提示：数据安全与备份
您的所有聊天记录和生成的图片链接都**保存在您当前的浏览器中**。
*   如果您**清除浏览器缓存**或使用**无痕模式**，数据将会丢失。
*   建议定期点击侧边栏历史记录中的 **下载图标** 📥，将重要的会话导出为 **Markdown** 文件进行本地备份。

---

### 🧩 模块详解

#### 💬 LLM 深度对话
*   **内置模型**：顶部栏预设了 Qwen, DeepSeek, GLM 等热门系列。点击名称即可快速切换。
*   **自定义模型**：支持手动输入 ModelScope 上的任意文本生成模型 ID。
    *   👉 [查找更多文本生成模型 (Text Generation)](https://modelscope.cn/models?filter=inference_type&page=1&tabKey=task&tasks=hotTask:text-generation&type=tasks)
*   **思考模式 (Thinking Process)**：
    *   **内置模型**：直接点击顶部模型名称下方的 **"Reasoning"** 标签即可开启/关闭。
    *   **自定义模型**：请点击底部设置图标 ⚙️，在全局设置中选择 `Auto`、`Try On` 或 `Try Off`。Prism 会隐藏具体协议细节；如果模型拒绝思考控制参数，会自动回退到模型默认模式并给出提示。
    *   *注：思考过程会以折叠/引用的方式优雅展示，支持点击展开查看详细推理步骤。*

#### 👁️ VLM 视觉理解
*   **看图说话**：上传一张图片，询问 "图中有什么？" 或 "提取图中的文字"。
*   **视觉思考模式**：支持在输入栏中直接切换思考模式，和 LLM 模块保持一致的推理展示体验。
*   **自定义模型**：除了内置的 Qwen-VL，您也可以尝试其他支持 OpenAI 格式的多模态模型。
    *   👉 [查找更多多模态模型 (Image-to-Text)](https://modelscope.cn/models?filter=inference_type&page=1&tabKey=task&tasks=hotTask:image-text-to-text&type=tasks)

#### 🎨 AIGC 创意画板
ModelScope 拥有繁荣的文生图模型生态。由于模型众多，我们采用了开放式设计：
*   **自定义模型 ID**：您可以在设置中填入任意 ModelScope 上的文生图模型 ID。
    *   👉 [查找更多文生图模型 (Text-to-Image)](https://modelscope.cn/models?filter=inference_type&page=1&tabKey=task&tasks=hotTask:text-to-image-synthesis&type=tasks)
    *   *兼容性提示：推荐使用 **SDXL** 或 **SD 1.5** 架构的模型，兼容性最佳。Flux、Qwen-Image 等新架构模型请自行测试参数效果。*

**专业参数控制面板**（点击输入框右侧调节图标打开）：

为了适配不同模型的参数兼容性，我们设计了**基础/高级**双模式：

*   **基础模式 (默认)**：仅传递通用参数，确保最大兼容性。
    *   **Aspect Ratio / Size**：预设常用分辨率，支持 **Custom** 自定义宽高。
    *   **Negative Prompt**：反向提示词（例如：`blurry, ugly, low quality`），告诉 AI 你**不**想看到什么。
*   **高级模式 (Advanced Mode)**：
    *   点击面板中的 **"Enable Advanced Mode"** 开关解锁。解锁后支持调节以下参数（*注意：部分模型可能会忽略这些参数，不当设置可能导致画质下降*）：
    *   **Steps**：迭代步数。数值越高细节越丰富，但也越耗时（推荐 **20 - 30**）。
    *   **CFG**：提示词相关性。数值越高越遵循 Prompt，数值越低 AI 发挥空间越大（推荐 **3.5 - 7.0**）。
    *   **Seed**：种子数。填入相同种子可复现特定画面。
    *   **LoRA**：支持加载风格模型。输入 ModelScope 上的 LoRA 模型 ID，系统会自动平衡权重（支持最多混合 6 个 LoRA）。

---

### 📝 更新日志

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
*   **终止生成控制**：LLM 与 VLM 模块均加入基于 `AbortController` 的打断功能，生成期间发送按钮动态切换为“停止”按钮，并静默处理中断异常。
*   **VLM 推理折叠**：将 VLM（视觉多模态）模块的后端数据流重构为 NDJSON 结构，支持将最新多模态大模型的思维链（Reasoning）进行原生提取，并在前端实现与 LLM 模块一致的优雅折叠效果。

**🚀 优化与重构 (Improvements)**
*   **策略架构重构**：将模型思考参数注入逻辑升级为结构化类型（`root_boolean`, `kwargs_dict`, `native_always_on`），重构前端 UI 逻辑，对强制思考模型进行“始终开启”的视觉锁定与状态防护。
*   **智能画质压缩**：前端新增无损尺寸画质压缩算法（`canvas quality 0.8`），在保留 VLM 原图分辨率的同时，大幅降低 payload 传输体积，显著提高网络响应速度。
*   **智能滚动交互**：重构了聊天区域的自动滚动逻辑（平滑吸底），当用户在生成期间向上滑动查看历史记录时，自动滚动将智能失效，把界面控制权还给用户。

**🐛 漏洞修复 (Bug Fixes)**
*   **本地存储溢出修复**：将底层状态管理引擎从容量受限的 `localStorage` (5MB) 彻底迁移至无限容量的异步 `IndexedDB`，完美解决多模态高清图片场景下抛出的 `QuotaExceededError` 崩溃问题。

#### v1.0 [2025.12.29]
*   🎉 ModelScope Prism 初始版本发布，集成 LLM、VLM、AIGC 核心功能。

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
# ModelScope Access Token（用于 probe/smoke，本地使用）
MS_API_KEY=ms-xxxxxxxxxxxxxxxx

# 可选：API 阈值配置（不填则使用默认值）
PRISM_CONVERSATION_RATE_MAX=30
PRISM_CONVERSATION_TIMEOUT_MS=60000
PRISM_IMAGE_GENERATE_RATE_MAX=10
PRISM_IMAGE_GENERATE_TIMEOUT_MS=30000
PRISM_IMAGE_STATUS_RATE_MAX=120
PRISM_IMAGE_STATUS_TIMEOUT_MS=20000
```

#### 发布前最小验证（build + smoke）

确保本地开发服务已启动（`pnpm dev`）后，另开终端执行：

```bash
# 1) Biome lint + 单元测试 + 编译检查
pnpm check
pnpm test
pnpm build

# 2) 最小链路检查（conversation + image generate + image status）
pnpm smoke
```

可选参数：

```bash
# 指定本地服务地址（默认 http://localhost:3000）
SMOKE_BASE_URL=http://localhost:3000 pnpm smoke

# 指定测试模型
SMOKE_CHAT_MODEL=Qwen/Qwen3.5-397B-A17B SMOKE_IMAGE_MODEL=Qwen/Qwen-Image pnpm smoke
```

#### 模型探测（Probe）

```bash
# 轻量兼容性探测
pnpm probe Qwen/Qwen3.5-397B-A17B
```

探测报告会输出到 `probe-reports/`。每次探测会生成两份文件：`probe-report-*.json` 是完整诊断，包含每个探测 case 的状态码、延迟、内容有效性、reasoning 检出、解析错误、错误分类和原始错误预览；`probe-report-*.md` 是面向人工阅读的能力概览，包含流式聊天、思考开关、视觉输入、输出 token 参数和可复制到 `lib/model-capabilities.ts` 的 profile 片段。

探测重点：
*   **chat availability**：模型是否能在 ModelScope OpenAI-compatible endpoint 的流式接口上返回有效文本。
*   **thinking control**：是否支持 `enable_thinking`、`chat_template_kwargs` 或 `thinking.type`。
*   **vision input**：是否支持远程图片 URL 或 data URL。
*   **output token parameter**：优先确认 `max_tokens` 是否有效，无效时再尝试 `max_completion_tokens`。

#### 项目核心结构
*   **`app/api/`**: 后端 API 路由层（Node/Edge Runtime）
    *   `conversation/route.ts`：处理 LLM / VLM 统一流式请求。
    *   `image/generate/route.ts`、`image/status/[taskId]/route.ts`：处理 AIGC 任务提交与状态轮询。
*   **`components/`**: 视图与交互组件层
    *   `chat/`、`vision/`、`image/`：三大功能模块 UI。
    *   `shared/`：跨模块复用组件（如 `reference-image-input.tsx`、Markdown 渲染器、设置弹窗）。
    *   `layout/`、`ui/`：布局容器与基础 UI 组件。
*   **`hooks/`**: 可复用前端流程逻辑
    *   `use-ndjson-stream.ts`：统一 NDJSON 流式解析。
    *   `use-stream-session-runner.ts`：统一会话请求、停止与错误处理。
*   **`lib/`**: 领域能力与基础设施
    *   `store.ts`：基于 Zustand + IndexedDB 的全局状态持久化。
    *   `model-capabilities.ts`：模型能力轮廓、模态支持与思考参数策略。
    *   `modelscope/conversation.ts`：基于 OpenAI SDK 的 ModelScope 兼容接口适配层。
    *   `models.ts`：兼容旧前端 import 的模型配置 facade。
    *   `config.ts`：限流/超时/Body 大小等阈值配置中心（支持环境变量）。
    *   `api-security.ts`：API 安全工具（限流、超时、错误脱敏、requestId 等）。
    *   `services/`：前端 API 调用封装（如 `conversation-service.ts`）。
*   **`scripts/`**: 自动化验证与探测
    *   `smoke.mjs`：发布前最小链路验证（chat + image）。
    *   `probe.mjs`：轻量模型兼容性探测。

---

<div align="center">
  如果这个项目对您有帮助，请给一个 ⭐️ Star 支持一下！<br/>
  Made with ❤️ by NeutrinoY
</div>
