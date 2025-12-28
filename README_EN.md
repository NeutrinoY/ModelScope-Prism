<div align="center">
  <img src="public/logo.webp" alt="ModelScope Prism" width="150" />

  # ModelScope Prism

  **Blending Conversation, Vision, and Creativity into One ModelScope Exploration Space**

**[中文](./README.md) | English**

  </div>

  

---

**ModelScope Prism** is an open-source AI web application built with Next.js. As a modern frontend interface for ModelScope API services, it integrates three core capabilities: **LLM Chat**, **VLM Visual Recognition**, and **AIGC Image Generation**. It provides a smooth, beautiful, and powerful AI experience without the need for complex backend deployment.

### ✨ Core Highlights

- **🧠 Deep Thinking Mode**: Perfectly supports advanced models like **DeepSeek V3.2**, **Qwen3**, and **GLM-4.7**. Enable it to natively display the **Chain of Thought (CoT)**, making the AI's reasoning process visible.
- **🎨 AIGC Canvas**: More than just image generation—supports **LoRA Model Loading**, **CFG/Steps Fine-tuning**, **Custom Resolutions**, and an **Immersive Image Gallery**.
- **👀 Multimodal Vision**: Supports visual models like **Qwen3-VL**, allowing you to upload images for in-depth Q&A and analysis.
- **🔒 Data Privacy & Security**: Adheres to the **Local-First** principle. All chat history, Access Tokens, and settings are stored locally in your **browser (Local Storage)**. No data is uploaded to third-party servers other than direct calls to the ModelScope API.
- **📱 Responsive Design**: Optimized for the best interactive experience, whether on a 4K large monitor or a mobile device.

---

### 🚀 Quick Start

#### 1. Get Access Token
This project relies on the Serverless Inference API provided by ModelScope.
1. Log in and visit [ModelScope Access Token](https://modelscope.cn/my/myaccesstoken).
2. Copy your Access Token.

#### 2. Configure ModelScope Prism
1. Open the deployed website (or visit `http://localhost:3000` after starting locally).
2. Click the **Settings Icon** ⚙️ on the **Dock** at the bottom of the page.
3. Paste your Access Token into the **ModelScope Access Token** field and save.

#### 3. Start Creating!
*   **💬 Chat**: Switch to the **LLM Module**. Built-in models (DeepSeek, Qwen, GLM, etc.) allow you to toggle **"Reasoning"** from the top navigation bar to experience deep thinking.
*   **👁️ Vision**: Switch to the **VLM Module**. Upload or paste an image to recognize objects, extract text, or chat about the scene.
*   **🎨 Image**: Switch to the **AIGC Module**. Enter a prompt, adjust parameters, and generate high-quality images.

#### ⚠️ Important: Data Safety & Backup
All your chat history and generated image links are **saved in your current browser**.
*   If you **clear your browser cache** or use **Incognito Mode**, data will be lost.
*   It is recommended to periodically click the **Download Icon** 📥 in the sidebar history to export important sessions as **Markdown** files for local backup.

---

### 🧩 Module Details

#### 💬 LLM Deep Chat
*   **Built-in Models**: Popular series like Qwen, DeepSeek, and GLM are preset in the top bar. Click the name to switch instantly.
*   **Custom Models**: Supports manual input of any text generation model ID from ModelScope.
    *   👉 [Find more Text Generation Models](https://modelscope.cn/models?filter=inference_type&page=1&tabKey=task&tasks=hotTask:text-generation&type=tasks)
*   **Thinking Process**:
    *   **Built-in Models**: Click the **"Reasoning"** tag under the model name in the top bar to toggle on/off.
    *   **Custom Models**: Click the settings icon ⚙️ at the bottom and check `Enable Thinking Process` in global settings.
    *   *Note: The thinking process is displayed elegantly in a collapsible/quoted format, supporting click-to-expand.*

#### 👁️ VLM Visual Understanding
*   **Image Chat**: Upload an image and ask "What is in the picture?" or "Extract text from the image".
*   **Custom Models**: Besides the built-in Qwen-VL, you can try other multimodal models supporting OpenAI format.
    *   👉 [Find more Image-to-Text Models](https://modelscope.cn/models?filter=inference_type&page=1&tabKey=task&tasks=hotTask:image-text-to-text&type=tasks)

#### 🎨 AIGC Creative Canvas
ModelScope has a thriving ecosystem of text-to-image models. We adopted an open design:
*   **Custom Model ID**: You can enter any Text-to-Image Model ID from ModelScope in the settings.
    *   👉 [Find more Text-to-Image Models](https://modelscope.cn/models?filter=inference_type&page=1&tabKey=task&tasks=hotTask:text-to-image-synthesis&type=tasks)
    *   *Compatibility Hint: Models based on **SDXL** or **SD 1.5** architectures work best. Newer architectures like Flux or Qwen-Image may require self-testing of parameters.*

**Professional Control Panel** (Click the adjustment icon inside the input box to open):

To accommodate varying parameter compatibility across models, we designed a **Basic/Advanced** dual mode:

*   **Basic Mode (Default)**: Sends only essential parameters for maximum compatibility.
    *   **Aspect Ratio / Size**: Presets for common resolutions; supports **Custom** width/height.
    *   **Negative Prompt**: Tell the AI what you do **NOT** want to see (e.g., `blurry, ugly, low quality`).
*   **Advanced Mode**:
    *   Unlock by toggling **"Enable Advanced Mode"** in the panel. Once unlocked, you can adjust (*Note: Improper settings may degrade quality*):
    *   **Steps**: Iteration steps. Higher values mean more detail but longer time (Recommended: **20 - 30**).
    *   **CFG**: Prompt adherence. Higher follows prompt strictly; lower allows AI freedom (Recommended: **3.5 - 7.0**).
    *   **Seed**: Seed number. Use the same seed to reproduce a specific image.
    *   **LoRA**: Supports loading style models. Enter the LoRA Model ID, and the system automatically balances weights (Supports mixing up to 6 LoRAs).

---

### 💻 Developer Guide

If you wish to run locally or contribute, follow these steps.

#### Requirements
*   Node.js 18+
*   npm / pnpm / yarn

#### Installation & Run

```bash
# 1. Clone repository
git clone https://github.com/NeutrinoY/ModelScope-Prism.git

# 2. Enter directory
cd ModelScope-Prism

# 3. Install dependencies
npm install

# 4. Start development server
npm run dev
```

Open your browser and visit `http://localhost:3000`.

#### Core Project Structure
*   **`app/api/`**: Backend API Routes (Edge/Node.js Runtime)
    *   `chat/route.ts`: Handles LLM streaming chat, including manual SSE parsing for `reasoning_content`.
    *   `image/`: Handles AIGC generation requests and status polling.
*   **`components/`**: UI Component Library
    *   `chat/`: LLM specific components (Bubbles, Markdown Renderer).
    *   `image/`: AIGC specific components (Canvas, Control Panel, LoRA Manager).
    *   `vision/`: VLM specific components.
    *   `layout/`: Global layout (Sidebar, Dock).
*   **`lib/`**: Utilities & State
    *   `store.ts`: Zustand-based global state management with `persist` for local storage.
    *   `models.ts`: Model list configuration and Thinking Mode strategies.

---

<div align="center">
  If this project helps you, please give it a ⭐️ Star!<br/>
  Made with ❤️ by NeutrinoY
</div>
