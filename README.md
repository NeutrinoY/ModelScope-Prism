[English](./README_EN.md)

<div align="center">
  <img src="public/logo.webp" alt="ModelScope Prism" width="120" />

  # ModelScope Prism

  **对话 · 视觉 · 绘图，您的 ModelScope 全能探索空间**

  [![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
  ![Next.js](https://img.shields.io/badge/built%20with-Next.js-black)
  ![ModelScope](https://img.shields.io/badge/powered%20by-ModelScope-purple)
</div>

---

**ModelScope Prism** 是一个基于 Next.js 构建的开源 AI Web 应用。作为 ModelScope（魔搭社区）API 服务的现代化前端界面，它集成了 **LLM 深度对话**、**VLM 视觉识别** 和 **AIGC 专业绘图** 三大核心能力，无需部署复杂后端，即可为您提供流畅、美观且强大的 AI 体验。

### ✨ 核心亮点

- **🧠 深度思考模式**：完美支持 **DeepSeek V3.2**、**Qwen3**、**GLM-4.7** 等前沿模型，开启后可原生展示思维链（Chain of Thought），让 AI 的推理过程清晰可见。
- **🎨 专业级 AIGC 画板**：不仅是生成图片，更支持 **LoRA 模型加载**、**CFG/Steps 微调**、**自定义分辨率** 以及 **沉浸式图片浏览器**。
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
1. 打开部署好的网页（或本地启动后访问 `http://localhost:3000`）。
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
    *   **自定义模型**：请点击底部设置图标 ⚙️，在全局设置中勾选 `Enable Thinking Process` 来启用。
    *   *注：思考过程会以折叠/引用的方式优雅展示，支持点击展开查看详细推理步骤。*

#### 👁️ VLM 视觉理解
*   **看图说话**：上传一张图片，询问 "图中有什么？" 或 "提取图中的文字"。
*   **自定义模型**：除了内置的 Qwen-VL，您也可以尝试其他支持 OpenAI 格式的多模态模型。
    *   👉 [查找更多多模态模型 (Image-to-Text)](https://modelscope.cn/models?filter=inference_type&page=1&tabKey=task&tasks=hotTask:image-text-to-text&type=tasks)

#### 🎨 AIGC 创意画板
ModelScope 拥有繁荣的文生图模型生态。由于模型众多，我们采用了开放式设计：
*   **自定义模型 ID**：您可以在设置中填入任意 ModelScope 上的文生图模型 ID。
    *   👉 [查找更多文生图模型 (Text-to-Image)](https://modelscope.cn/models?filter=inference_type&page=1&tabKey=task&tasks=hotTask:text-to-image-synthesis&type=tasks)
    *   *兼容性提示：推荐使用 **SDXL** 或 **SD 1.5** 架构的模型，兼容性最佳。Flux、Qwen-Image 等新架构模型请自行测试参数效果。*

**专业参数控制面板**（点击输入框右侧调节图标打开）：

*   **Aspect Ratio / Size**：预设常用分辨率，支持 **Custom** 自定义宽高。
*   **Negative Prompt**：反向提示词（例如：`blurry, ugly, low quality`）。
*   **Steps**：迭代步数。数值越高细节越丰富，但也越耗时（推荐 **20 - 30**）。
*   **CFG**：提示词相关性。数值越高越遵循 Prompt，数值越低 AI 发挥空间越大（推荐 **3.5 - 7.0**）。
*   **Seed**：种子数。填入相同种子可复现特定画面。
*   **LoRA**：支持加载风格模型。输入 ModelScope 上的 LoRA 模型 ID，系统会自动平衡权重（支持最多混合 6 个 LoRA）。

---

### 💻 开发者指南

如果您希望在本地运行或进行二次开发，请参考以下步骤。

#### 环境要求
*   Node.js 18+
*   npm / pnpm / yarn

#### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/modelscope-prism.git

# 2. 进入目录
cd modelscope-prism

# 3. 安装依赖
npm install

# 4. 启动开发服务器
npm run dev
```

打开浏览器访问 `http://localhost:3000`。

#### 项目核心结构
*   **`app/api/`**: 后端 API 路由 (Edge/Node.js Runtime)
    *   `chat/route.ts`: 处理 LLM 流式对话，包含手动 SSE 解析逻辑以支持 `reasoning_content` (思考字段)。
    *   `image/`: 处理 AIGC 绘图请求与任务状态轮询。
*   **`components/`**: UI 组件库
    *   `chat/`: LLM 模块专用组件 (气泡、Markdown 渲染)。
    *   `image/`: AIGC 模块专用组件 (画板、参数面板、LoRA 管理)。
    *   `vision/`: VLM 模块专用组件。
    *   `layout/`: 全局布局 (侧边栏、Dock 栏)。
*   **`lib/`**: 工具与状态
    *   `store.ts`: 基于 **Zustand** 的全局状态管理，实现了 `persist` 本地持久化逻辑。
    *   `models.ts`: 模型列表配置与 Thinking 模式策略定义。

---

<div align="center">
  如果这个项目对您有帮助，请给一个 ⭐️ Star 支持一下！<br/>
  Made with ❤️ by ModelScope Studio Team
</div>
