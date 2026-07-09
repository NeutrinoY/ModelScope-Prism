<div align="center">
  <img src="public/logo.webp" alt="ModelScope Prism" width="150" />

  # ModelScope Prism

  **Blending Conversation, Vision, and Creativity into One ModelScope Exploration Space**

**[中文](./README.md) | English**

</div>



---

**[ModelScope Prism](https://modelscope-prism.neutrinoy.xyz)** is an open-source AI web application built with Next.js. As a modern frontend for ModelScope's API-Inference service, it brings together three core capabilities — **LLM Chat**, **VLM Visual Understanding**, and **AIGC Image Generation** — into one smooth, polished, and powerful experience, with no backend deployment required.

---

### ✨ Highlights

- **🧠 Deep Thinking Mode**: Built-in models such as **DeepSeek V4 Flash**, **DeepSeek V4 Pro**, **GLM-5.2**, and **Qwen3.5** can natively surface their Chain of Thought, making the model's reasoning process visible.
- **🎨 AIGC Canvas**: More than plain image generation — supports **LoRA loading**, **CFG/Steps fine-tuning**, **custom resolutions**, and an **immersive image viewer**.
- **👀 Multimodal Vision**: Vision models like **Qwen3-VL** let you upload an image and ask in-depth questions about it.
- **🔒 Privacy by Design**: Local-first, end to end. All conversations, your Access Token, and settings live in your **browser (IndexedDB)** — nothing is ever uploaded anywhere except directly to the ModelScope API.
- **🎛️ Explicit Parameter Semantics**: Every optional model parameter (thinking mode, output limits, seed/steps/guidance/LoRA…) is only sent once you explicitly enable it. What you see as a default on screen is never what gets sent in the request.
- **📱 Responsive by Default**: A first-class experience on everything from a 4K desktop monitor to a phone.

---

### 🚀 Quick Start

#### 1. Get an Access Token
Prism relies on ModelScope's Serverless Inference API.
1. Sign in and visit [ModelScope Access Token](https://modelscope.cn/my/myaccesstoken).
2. Copy your Access Token.

#### 2. Configure ModelScope Prism
1. Open the [hosted app](https://modelscope-prism.neutrinoy.xyz) (or `http://localhost:3000` if running locally).
2. Click the **Settings** icon ⚙️ in the bottom **Dock**.
3. Paste your Access Token into the **ModelScope Access Token** field and save.

#### 3. Start Creating!
*   **💬 Chat**: Switch to the **Chat** workspace. Built-in models from DeepSeek, Qwen, and GLM are ready to go — toggle **"Think"** in the composer to enable deep reasoning.
*   **👁️ Vision**: Switch to the **Vision** workspace. Upload or paste an image and let the model describe it, extract text, or answer questions about it.
*   **🎨 Studio**: Switch to the **Studio** workspace. Write a prompt, tune the parameters, and generate.

#### ⚠️ Important: Data Safety & Backup
Everything — your conversations and generated image links — is **saved in your current browser only**.
*   Clearing your browser cache or using **incognito mode** will lose that data.
*   We recommend periodically opening **Settings → Local data** and clicking **Export** to back up your local data as a JSON file (the export never includes your Access Token).

---

### 🧩 Module Guide

#### 💬 Chat (LLM Conversation)
*   **Built-in models**: Popular series from Qwen, DeepSeek, and GLM are preset — click a model name to switch instantly.
*   **Custom models**: Type in any text-generation model ID from ModelScope.
    *   👉 [Browse more Text Generation models](https://modelscope.cn/models?filter=inference_type&page=1&tabKey=task&tasks=hotTask:text-generation&type=tasks)
*   **Thinking mode**:
    *   Click **Think** in the composer to open the panel and switch between `Auto` / `On` / `Off`; the current state also stays visible as a badge on the model summary bar at the top.
    *   `Auto` means no thinking control parameter is sent at all — the model or platform's own default behavior applies. `On` / `Off` sends exactly one selected format, explicitly.
    *   Built-in models use a fixed, pre-verified format. Custom models let you pick between `enable_thinking`, `chat_template_kwargs.enable_thinking`, or `thinking.type` when you switch to `On` / `Off`.
    *   Reasoning is displayed elegantly in a collapsible block — expand it any time to read the full chain of thought.

#### 👁️ Vision (VLM Visual Understanding)
*   **Ask about an image**: Upload a picture and ask "What's in this image?" or "Extract the text from this image."
*   Vision shares the same underlying conversation request capability as Chat — image input is simply given more prominence. The two keep fully independent histories.
*   **Custom models**: Besides the built-in Qwen3.5 (which supports remote image URLs), you can try any other OpenAI-format-compatible multimodal model.
    *   👉 [Browse more Image-to-Text models](https://modelscope.cn/models?filter=inference_type&page=1&tabKey=task&tasks=hotTask:image-text-to-text&type=tasks)

#### 🎨 Studio (AIGC Creative Canvas)
ModelScope has a thriving text-to-image model ecosystem, so Studio is deliberately open-ended:
*   **Custom model ID**: Enter any text-to-image model ID from ModelScope in settings.
    *   👉 [Browse more Text-to-Image models](https://modelscope.cn/models?filter=inference_type&page=1&tabKey=task&tasks=hotTask:text-to-image-synthesis&type=tasks)
    *   *Compatibility tip: **SDXL** and **SD 1.5**-based models tend to be the most compatible. Newer architectures like Flux or Qwen-Image may need some experimentation with parameters.*

**Parameter panel** (open it via the sliders icon next to the input box):

The request body defaults to just `model` + `prompt`. Every parameter below is only added to the request once you explicitly enable it:

*   **Basic parameters**:
    *   **Size**: Common resolution presets, or a custom `WIDTHxHEIGHT` (only sent once enabled).
    *   **Negative prompt**: What you don't want to see (e.g. `blurry, ugly, low quality`) — sent only when non-empty.
*   **Advanced parameters** (each toggled on individually):
    *   **Steps**: Iteration count [1, 100], typically **20–30**.
    *   **Guidance**: Prompt adherence [1.5, 20], typically **3.5–7.0**.
    *   **Seed**: Reuse the same seed to reproduce a specific result.
    *   **LoRA**: Load style models by ModelScope LoRA model ID. Mix up to **6**, with weights that must sum to **1.0**.
*   **Image input**: Add a reference image (URL or local upload) via the icon on the left of the input box, for image editing / img2img. Skip it for plain text-to-image.
*   A **Reset** button at the bottom of the panel returns instantly to "send only model + prompt."

Generated images can be downloaded, have their prompt copied, and can be browsed with keyboard arrow keys in a near-fullscreen viewer.

---

### 📝 Changelog

#### v2.0.0 [2026.07.10] — Architecture Rewrite

This is a **ground-up rewrite**, not an incremental update. The product direction — Chat / Vision / AIGC as three task-focused workspaces, local-first data, a fluid workbench feel — stays the same. What changed is the engineering underneath it, rebuilt around one core belief: **optional parameters are only sent when the user explicitly chooses to send them — a default shown in the UI is never a default sent in the request.** The full rebuild rationale lives in [`docs/rebuild/`](docs/rebuild).

**🏗️ Architecture & Engineering Quality**
*   Clear boundaries now separate the UI from protocol adaptation, domain rules, and local storage — the interface no longer assembles upstream requests directly, nor reads or writes browser storage directly.
*   The three workspaces (Chat / Vision / AIGC) share a unified capability layer underneath, while each keeps its own product entry point and history.

**⚖️ Parameter Sending Semantics**
*   `Auto` now strictly means "send no control parameter at all" — thinking mode, output limits, and every AIGC parameter (size, seed, steps, guidance, LoRA) must be individually and explicitly enabled before they're ever sent.
*   Custom models no longer undergo any form of runtime probing, nor silently retry with a different parameter format on failure. All diagnostic work has moved entirely into offline developer tooling.

**💾 Local Data**
*   Local storage is now a versioned structure, with your Access Token stored separately from sessions and settings.
*   Standard local data **import / export** has been added: exports never include your Access Token, and importing prompts you to re-confirm it.
*   AIGC generation tasks can resume polling automatically after a page refresh, within a bounded time window — an accidental reload no longer loses an in-progress generation.

**🧭 Error Handling**
*   Upstream errors are now unified into one standard classification, covering authentication failures, insufficient quota, rate limiting, unavailable models, unsupported parameters, task failures, timeouts, and network errors.
*   Every workspace shows errors consistently: what happened, what to do next, and an expandable technical detail view.

**✨ Experience Polish**
*   Generated images can now be downloaded.
*   Renaming a history entry now uses explicit save / cancel actions instead of committing instantly.
*   The sidebar footer now shows the current app version.

**🚀 Dependencies & Tooling**
*   The animation library moved to `motion`; the image gallery's masonry layout now uses plain CSS.
*   Several dependencies that only served the previous implementation have been removed, keeping the stack lean.
*   The model-capability diagnostic tool (Probe) was reorganized into a more maintainable, modular structure.

<details>
<summary><strong>v1.x changelog</strong> (pre-rewrite release history — click to expand)</summary>

#### v1.4 [2026.07.08]

**✨ Features**
*   **Built-in Model Capability Convergence**: Rebuilt the preset list from ModelScope probe results, keeping only four confirmed usable models: DeepSeek V4 Flash, DeepSeek V4 Pro, GLM-5.2, and Qwen3.5. Each model now has a fixed profile for text, vision, thinking, and output token behavior.
*   **Multimodal Input in LLM Chat**: Added image input to the LLM module using the shared reference image component. The UI now disables unsupported entry points automatically when a model is text-only, URL-only, or does not support local image uploads.
*   **VLM Thinking Mode**: Added a dedicated `visionThinkingIntent` state and composer-level thinking toggle for the Vision module, supporting Auto / On / Off behavior based on model capability while reusing the unified reasoning display path.
*   **Streaming-first Model Probe**: Refined probing around the product's real streaming chat path, detecting `enable_thinking`, `thinking.type`, `chat_template_kwargs`, `max_tokens`, quota limits, and unavailable upstream providers.

**🚀 Improvements & Refactoring**
*   **Lighter Model Strategy**: Replaced broad runtime fallback behavior with fixed built-in model profiles plus conservative best-effort handling for custom model IDs, reducing unpredictable probing costs on Vercel.
*   **Unified Single-row Composer**: Aligned Chat, Vision, and AIGC around a compact single-row input layout where reference image, parameters, thinking, and send/stop actions live in one control surface.
*   **Composer-level Thinking Control**: Moved thinking controls into the message composer and surfaced capability-aware states such as `Reasoning Active`, `Chat Mode`, and `Thinking Auto`.
*   **Cleaner Model Selector**: Reworked model capability labels into `Text` / `Vision` badges and unified the selected state with a more restrained secondary background.
*   **Frontend Style Spec**: Added a frontend style consistency design note to keep future UI work aligned on layout density, component boundaries, and capability-state presentation.

**🐛 Bug Fixes**
*   **Probe Error Classification**: Classified ModelScope `402 insufficient balance` as `quota_limited` instead of model unavailable, and improved streaming JSON error parsing plus token-cap truncation detection.
*   **Qwen Vision Capability Fix**: Updated Qwen3.5 to support remote image URLs while rejecting data URL uploads, preventing the UI from exposing an unsupported local-upload path.

#### v1.3 [2026.06.27]

**✨ Features**
*   **Unified Conversation API**: Merged the former LLM and VLM backend paths into `app/api/conversation`, with one streaming endpoint for text, images, reasoning output, and incremental responses.
*   **Minimal Regression Pipeline**: Added `scripts/smoke.mjs` for pre-release validation of the critical chat + image paths.
*   **Automated Blackbox Probe**: Introduced a modular probe script that generates both JSON diagnostics and Markdown capability overviews for arbitrary ModelScope models.

**🚀 Improvements & Refactoring**
*   **ModelScope Adapter Refactor**: Added `lib/modelscope/conversation.ts` and `conversation-service` to centralize OpenAI-compatible requests, NDJSON parsing, and frontend session calls.
*   **Shared Streaming Session Layer**: Extracted a reusable stream session runner so Chat and Vision share stop-generation, error handling, and incremental update behavior.
*   **Tooling and Config Update**: Migrated to pnpm lockfiles and Biome checks, while centralizing rate limits, timeouts, and body-size thresholds in the config layer.
*   **AIGC Stability Upgrade**: Added request IDs, timeouts, rate limiting, and sanitized error handling to image task APIs for better production diagnostics and recovery.

**🐛 Bug Fixes**
*   **Local Storage Overflow Fix**: Replaced capacity-limited `localStorage` with asynchronous `IndexedDB`, reducing `QuotaExceededError` risk for multimodal sessions with large images.
*   **Request Observability**: Added end-to-end `requestId` propagation (response header + server logs) across chat, vision, and image APIs for faster incident tracing.

#### v1.2 [2026.03.03]

**✨ Features**
*   **Unified Reference Image Entry**: Added a left-icon reference image trigger in both VLM and AIGC input bars. Click to expand URL upload and local upload in one place.
*   **Minimal Regression Pipeline**: Added `scripts/smoke.mjs` for pre-release one-command validation of the critical chat + image paths.
*   **Probe Mode Upgrade**: Enhanced `scripts/probe.mjs` with `quick/full` modes and historical report comparison for the same model.

**🚀 Improvements & Refactoring**
*   **Centralized API Config**: Introduced `lib/config.ts` and moved rate-limit, timeout, body-size, and retry thresholds to env-driven configuration.
*   **Shared Streaming Session Layer**: Extracted reusable NDJSON parser and session runner for Chat/Vision to reduce duplicated logic and improve behavior consistency.
*   **AIGC Stability Upgrade**: Replaced fixed polling with backoff polling (3s → 5s → 8s), plus total timeout control and refresh-resume for in-progress tasks.
*   **Model Strategy Abstraction**: Introduced a minimal `ModelProfile` structure while preserving backward compatibility.

**🐛 Bug Fixes**
*   **Request Observability**: Added end-to-end `requestId` propagation (response header + server logs) across chat/vision/image APIs for faster incident tracing.
*   **Probe Misclassification Fix**: Fixed a quick-mode edge case where reasoning strategy could be incorrectly classified as `native_always_on`.

#### v1.1 [2026.03.02]

**✨ Features**
*   **Model Ecosystem Upgrade**: Converged the preset model list to probed usable models: DeepSeek V4 Flash, DeepSeek V4 Pro, GLM-5.2, and Qwen3.5.
*   **Automated Blackbox Probe**: Introduced `scripts/probe.mjs`, an automated testing script to dynamically sniff parameter strictness and reasoning capabilities of any new ModelScope model.
*   **Enhanced Streaming Control**: Integrated native `AbortController` into both LLM and VLM modules. The send button now dynamically transforms into a "Stop Generation" button.
*   **VLM Reasoning Collapse**: Refactored the VLM backend stream to NDJSON format, allowing the frontend to neatly extract and elegantly collapse the Chain of Thought (Reasoning) of modern multimodal models.

**🚀 Improvements & Refactoring**
*   **Strategy Architecture**: Upgraded the reasoning parameter injection logic to a structural type system (`root_boolean`, `kwargs_dict`, `native_always_on`). Refactored UI logic to visually lock and protect "always-on" reasoning models.
*   **Smart Image Compression**: Introduced a frontend quality-based compression algorithm (`canvas quality 0.8`) that preserves original image dimensions for VLM, drastically reducing payload size.
*   **Smart Scroll Interaction**: Overhauled the chat auto-scroll logic. Auto-scrolling is automatically suspended when the user scrolls up to review history, returning full scroll control to the user.

**🐛 Bug Fixes**
*   **Local Storage Overflow Fix**: Replaced the capacity-limited `localStorage` (5MB) with the highly scalable, asynchronous `IndexedDB` for global state management, permanently solving `QuotaExceededError` crashes in multimodal scenarios.

#### v1.0 [2025.12.29]
*   🎉 Initial release of ModelScope Prism, integrating LLM, VLM, and AIGC core features.

</details>

---

### 💻 Developer Guide

If you want to run this locally or contribute, follow the steps below.

#### Requirements
*   Node.js 18+
*   pnpm

#### Install & Run

```bash
# 1. Clone the repository
git clone https://github.com/NeutrinoY/ModelScope-Prism.git

# 2. Enter the directory
cd ModelScope-Prism

# 3. Install dependencies
pnpm install

# 4. Start the dev server
pnpm dev
```

Open `http://localhost:3000` in your browser.

#### Local Environment Variables (recommended)

Create a `.env.local` file at the project root:

```bash
# ModelScope Access Token (used only by the smoke / probe developer tools;
# the app itself reads your token from browser-local settings, never from this variable)
MS_API_KEY=ms-xxxxxxxxxxxxxxxx

# Optional: API route thresholds (fall back to sane defaults — see src/lib/config/api.ts)
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

#### Pre-release Verification

Make sure the code type-checks, lints, and builds:

```bash
pnpm typecheck   # tsc --noEmit
pnpm check       # biome lint .
pnpm build       # next build
```

Then run the smoke script to verify a real streaming chat completion actually works (requires `MS_API_KEY`):

```bash
# Defaults to deepseek-ai/DeepSeek-V4-Flash
pnpm smoke

# Or specify a model
pnpm smoke Qwen/Qwen3.5-397B-A17B
```

`smoke` is the only real-upstream check before a release; `typecheck` + `check` + `build` is the only static-verification combo. This project does not currently include an automated test framework.

#### Model Probe

Probe is an **offline developer tool** for diagnosing a given ModelScope model's streaming availability, thinking control formats, image input support, and output token limits — producing evidence you can use to maintain the built-in model profiles. It never runs as part of the deployed app in any form.

```bash
# Probe a single model
pnpm probe deepseek-ai/DeepSeek-V4-Flash

# Probe several models and write the full diagnostic to a JSON file
pnpm probe Qwen/Qwen3.5-397B-A17B ZhipuAI/GLM-5.2 --json probe-reports/report.json

# Skip image-input / output-limit probing, and tune the delay between requests (ms)
pnpm probe <model-id> --no-image --no-output --delay-ms 2000 --rate-limit-delay-ms 15000
```

Reports print to the terminal by default; a file is only written when you pass `--json <path>` (point it at `probe-reports/`, which is already git-ignored).

What Probe checks:
*   **Chat availability**: whether the model returns valid text over ModelScope's OpenAI-compatible streaming endpoint.
*   **Thinking control**: whether `enable_thinking`, `chat_template_kwargs.enable_thinking`, and `thinking.type` each work.
*   **Vision input**: whether remote image URLs or base64 data URLs are supported.
*   **Output token parameter**: whether `max_tokens` works, and whether `max_completion_tokens` should be used instead when it doesn't.

> Probe is allowed to try multiple parameter formats for diagnostic purposes — which is exactly what Prism's runtime never does. At runtime, only **one** definite format is ever sent, chosen by the user or by a built-in profile — never probed, never silently retried on failure.

#### Project Structure

**`src/app/`** — Next.js App Router boundary
*   `api/conversation/route.ts` — the unified streaming Conversation endpoint (Chat + Vision)
*   `api/image/generate/route.ts` — AIGC image generation task submission
*   `api/image/status/[taskId]/route.ts` — AIGC task status polling
*   `layout.tsx` / `page.tsx` / `globals.css` — root layout and global styles

**`src/features/`** — frontend features organized by workspace
*   `chat/` — the Chat workspace
*   `vision/` — the Vision workspace
*   `image/` — the AIGC (Studio) workspace: parameter panel, gallery, task hook
*   `settings/` — the settings dialog and import/export
*   `sessions/` — history lists (kept separate per workspace)

**`src/components/`**
*   `ui/` — base UI primitives (Radix wrappers: Button / Dialog / Sheet…)
*   `layout/` — global layout (Sidebar / TopBar / Dock / MobileNav / MobileHeader)
*   `shared/` — components reused across workspaces
    *   `conversation/` — the Conversation message list, composer, model selector, thinking control
    *   `image-input-dialog.tsx` — the image input sub-module (URL / local upload, shared by Chat / Vision / AIGC)
    *   `markdown-renderer.tsx`, `reasoning-block.tsx`, `error-notice.tsx`, `parameter-toggle.tsx`

**`src/lib/`**
*   `contracts/` — shared types and error codes (`PrismErrorCode`, `ConversationRequest`, `ImageGenerationRequest`, `ModelProfile`, storage schema…)
*   `domain/` — pure TypeScript domain rules with no dependency on React / Next / the OpenAI SDK (explicit parameter sending rules, model profile resolution, LoRA validation, message construction, session titling and filtering, error-code-to-copy mapping)
*   `providers/modelscope/` — the ModelScope protocol adapter layer
    *   `conversation.ts` — OpenAI SDK + custom baseURL + streaming parsing
    *   `image-generation.ts` / `task-status.ts` — AIGC task submission and polling
    *   `payloads.ts` / `errors.ts` — payload construction and error mapping
*   `storage/` — local storage: schema, defaults, migrations, import/export, the Zustand + IndexedDB store
*   `services/` — frontend clients that call this app's own API routes (`conversation-client.ts` / `image-client.ts`)
*   `config/` — centralized configuration: API rate limits / timeouts / body size, AIGC polling intervals, output-limit tiers, image input limits

**`scripts/`**
*   `smoke.mjs` — minimal pre-release chain verification (a single streaming chat completion)
*   `probe/` — offline model capability diagnostics (`cli.mjs` / `cases.mjs` / `http.mjs` / `report.mjs`)

Boundary principles the codebase follows (see [`docs/rebuild/07`](docs/rebuild/07-core-and-provider-organization.md) for the full rationale):

*   The UI never constructs ModelScope payloads directly, and never touches IndexedDB directly;
*   `domain` is a framework-free pure-rules layer responsible for deciding which optional parameters should be sent;
*   `providers/modelscope` is the only place that knows about protocol details like `enable_thinking` or `X-ModelScope-Async-Mode`;
*   API routes (`src/app/api/**/route.ts`) stay thin — authentication, rate limiting, calling the provider, and returning a uniform error, nothing more.

---

<div align="center">
  If this project helps you, please consider giving it a ⭐️ Star!<br/>
  Made with ❤️ by NeutrinoY
</div>
