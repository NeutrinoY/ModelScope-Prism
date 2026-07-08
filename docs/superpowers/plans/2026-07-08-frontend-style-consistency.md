# 前端风格一致性与单行布局重构实现计划

> **对于 Agent 开发者：** 必须使用的子技能：使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务逐步执行此计划。步骤使用复选框（`- [ ]`）语法进行跟踪。

**Goal:** 重构模型选择栏为徽章卡片式设计，并将 Chat、Vision、Studio 三个核心模块的对话输入框统一重构为高颜值的单行极简布局，加入输入框聚焦外发光动画，并在 VLM（Vision）模块中加入与模型能力联动的思考开关，达成全局风格、阴影、对齐的高度一致。

**Architecture:** 统一采用 Tailwind frosted glass 卡片阴影规范，添加 `focus-within:ring-4 focus-within:ring-primary/5` 呼吸发光。在 store 中新增 `visionThinkingIntent` 状态，对 VLM 输入栏进行升级。

**Tech Stack:** React, Next.js, Tailwind CSS, Framer Motion, Lucide React

## 全局约束

- 必须保持项目既有的代码命名和 Biome 语法校验规范。
- 所有输入框卡片应使用一致的磨砂玻璃背景，并加入统一的聚焦外发光效果。
- 修改 React 组件后，必须运行 `pnpm check` 验证 Biome 检查通过，并运行 `pnpm build` 确认打包无编译错误。
- 每次任务完成后不进行自动 Git commit，由用户手动确认提交。

---

## 任务列表

### 任务 1：重构 [chat-module.tsx](file:///D:/Code/ModelScope-Prism/components/chat/chat-module.tsx) 模型选择栏

**文件：**
- 修改：[components/chat/chat-module.tsx](file:///D:/Code/ModelScope-Prism/components/chat/chat-module.tsx) （主要涉及 `LLM_SERIES` 循环渲染与 `Custom` 按钮渲染块）

**接口：**
- 消费者：`ChatModule` 内部交互
- 生产者：无

- [ ] **步骤 1：重构选项卡文本为徽章（Pill Badge）**
  
  修改模型列表中支持/不支持 Image 的文字渲染。原代码为：
  ```tsx
  <span className="z-10 text-[8px] text-muted-foreground/70">
    {supportsImage ? 'Text + Image' : 'Text'}
  </span>
  ```
  修改为以下高颜值的微型徽章：
  ```tsx
  {supportsImage ? (
    <span className="z-10 text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold font-mono tracking-wider uppercase scale-90">
      Vision
    </span>
  ) : (
    <span className="z-10 text-[9px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground/80 font-mono tracking-wider uppercase scale-90">
      Text
    </span>
  )}
  ```

- [ ] **步骤 2：对齐 Custom 卡片样式**
  
  修改 `Custom` 卡片的结构和 CSS 类，使其高度、内边距、过渡动画和 hover 背景与前面的普通模型卡片完全一致：
  ```tsx
  <button
    type="button"
    onClick={() => document.dispatchEvent(new CustomEvent('open-settings'))}
    className={cn(
      'flex-none w-[100px] md:w-auto md:flex-1 snap-center rounded-xl text-[11px] font-medium transition-all flex flex-col items-center justify-center gap-1.5 relative py-1.5 text-muted-foreground hover:bg-background/40',
      isCustomModel ? 'text-foreground' : 'hover:bg-background/40'
    )}
  >
    <span className="font-semibold z-10">Custom</span>
    <span className="z-10 text-[9px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground/80 font-mono tracking-wider uppercase scale-90 flex items-center gap-0.5">
      Config <Settings2 className="h-2.5 w-2.5" />
    </span>
    {isCustomModel && (
      <motion.div
        layoutId="act-bg"
        className="absolute inset-0 bg-secondary shadow-sm border border-border/50 rounded-xl -z-10"
      />
    )}
  </button>
  ```

- [ ] **步骤 3：增强激活项在暗色模式下的对比度**
  
  将 `layoutId="act-bg"` 的容器背景类从纯黑 `bg-background` 修改为更升起的微浅色（例如 `bg-secondary`），以便在深色模式下具有轻微的对比立体感，消除“下陷”视觉。
  ```tsx
  <motion.div
    layoutId="act-bg"
    className="absolute inset-0 bg-secondary shadow-sm border border-border/50 rounded-xl -z-10"
  />
  ```

---

### 任务 2：重构 [chat-module.tsx](file:///D:/Code/ModelScope-Prism/components/chat/chat-module.tsx) 输入框为单行精致布局与外发光动效

**文件：**
- 修改：[components/chat/chat-module.tsx](file:///D:/Code/ModelScope-Prism/components/chat/chat-module.tsx) （主要涉及底部的 `form` 容器及其子元素）

**接口：**
- 消费者：`ChatModule` 内部交互
- 生产者：无

- [ ] **步骤 1：重构对话框为聚焦外发光单行结构**
  
  修改原本单行 `form` 容器的 padding、圆角和外发光样式。对右侧的“深度思考（Think）”和“发送”按钮统一加上物理悬停反馈。
  ```tsx
  <form
    onSubmit={handleSubmit}
    className="relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-1.5 shadow-2xl focus-within:border-primary/45 focus-within:ring-4 focus-within:ring-primary/5 transition-all group flex items-end gap-2"
  >
    {/* 图片输入按钮（Compact 气泡弹窗式） */}
    <ReferenceImageInput
      compact
      value={selectedImage || ''}
      onChange={(next) => setSelectedImage(next || null)}
      uploadQuality={0.8}
      allowUrl={allowImageUrl}
      allowUpload={allowImageDataUrl}
      disabledReason={imageDisabledReason}
    />

    {/* 第一行自适应 textarea */}
    <textarea
      ref={textareaRef}
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' || e.shiftKey) return;
        e.preventDefault();
        handleSubmit();
      }}
      placeholder={selectedImage ? 'Ask about this image...' : 'Message ModelScope...'}
      rows={1}
      className="flex-1 min-h-[24px] max-h-48 bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-2 px-1 text-sm leading-relaxed overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent"
    />

    {/* 深度思考药丸 Toggle 开关 (精致紧凑版) */}
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleCurrentReasoning}
      className={cn(
        'h-9 shrink-0 rounded-xl px-2.5 text-[10px] gap-1 transition-all hover:scale-105 active:scale-95 mb-0.5',
        isCurrentlyReasoning
          ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15'
          : 'text-muted-foreground hover:bg-muted'
      )}
      title={thinkingStatusLabel}
    >
      <BrainCircuit className="h-4 w-4" />
      <span className="hidden sm:inline">Think</span>
    </Button>

    {/* 发送/停止按钮 */}
    {isLoading ? (
      <Button
        type="button"
        onClick={handleStop}
        size="icon"
        className="h-9 w-9 shrink-0 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/15 transition-all hover:scale-105 active:scale-95 mb-0.5 flex items-center justify-center"
      >
        <Square className="h-3.5 w-3.5 fill-current" />
      </Button>
    ) : (
      <Button
        type="submit"
        size="icon"
        disabled={!input.trim() && !selectedImage}
        className="h-9 w-9 shrink-0 rounded-xl transition-all hover:scale-105 active:scale-95 mb-0.5 flex items-center justify-center"
      >
        <Send className="h-3.5 w-3.5" />
      </Button>
    )}
  </form>
  ```

---

### 任务 3：在 Store 中集成 VLM 思考状态并在 [vision-module.tsx](file:///D:/Code/ModelScope-Prism/components/vision/vision-module.tsx) 中重构为带思考开关的单行精致布局

**文件：**
- 修改：[lib/store.ts](file:///D:/Code/ModelScope-Prism/lib/store.ts) （添加 `visionThinkingIntent` 的声明、初始状态与持久化）
- 修改：[components/vision/vision-module.tsx](file:///D:/Code/ModelScope-Prism/components/vision/vision-module.tsx) （添加思考切换按钮，接入 VLM 模型的思考控制逻辑）

**接口：**
- 消费者：`VisionModule` 内部交互
- 生产者：`AppState.visionThinkingIntent` 状态

- [ ] **步骤 1：在 [store.ts](file:///D:/Code/ModelScope-Prism/lib/store.ts) 中增加 VLM 思考模式状态**
  
  在 `AppState` 接口中添加：
  ```typescript
  visionThinkingIntent: ThinkingIntent;
  setVisionThinkingIntent: (intent: ThinkingIntent) => void;
  ```
  在初始化参数中添加：
  ```typescript
  visionThinkingIntent: 'auto',
  setVisionThinkingIntent: (visionThinkingIntent) => set({ visionThinkingIntent }),
  ```
  在 `persist` 部分的 `partialize` 中添加：
  ```typescript
  visionThinkingIntent: state.visionThinkingIntent,
  ```

- [ ] **步骤 2：在 [vision-module.tsx](file:///D:/Code/ModelScope-Prism/components/vision/vision-module.tsx) 中实现思考开关与单行布局**
  
  在 `VisionModule` 组件中，取出状态：
  ```typescript
  const {
    // ...
    visionThinkingIntent,
    setVisionThinkingIntent,
  } = useAppStore();
  ```
  添加思考模式相关的显示与控制逻辑：
  ```typescript
  // 思考模式控制
  const canToggleThinking = profile.source === 'custom' || profile.thinking.control !== 'none';
  const resolveThinkingEnabled = (prof: any, intent: any) => {
    if (intent === 'auto') return prof.thinking.defaultEnabled;
    return intent === 'on';
  };
  const isCurrentlyReasoning = profile.source === 'custom'
    ? visionThinkingIntent === 'on'
    : profile.thinking.control === 'native_always_on' || resolveThinkingEnabled(profile, visionThinkingIntent);

  const thinkingStatusLabel = profile.source === 'custom'
    ? visionThinkingIntent === 'auto'
      ? 'Thinking Auto'
      : visionThinkingIntent === 'on'
        ? 'Try Thinking'
        : 'Try No Thinking'
    : isCurrentlyReasoning
      ? 'Reasoning Active'
      : 'Chat Mode';

  const toggleCurrentReasoning = () => {
    if (profile.source === 'custom') {
      const nextIntent =
        visionThinkingIntent === 'auto' ? 'on' : visionThinkingIntent === 'on' ? 'off' : 'auto';
      setVisionThinkingIntent(nextIntent);
      return;
    }
    if (profile.thinking.control === 'native_always_on') {
      toast.info('This model natively outputs reasoning and cannot be turned off.');
      return;
    }
    setVisionThinkingIntent(visionThinkingIntent === 'on' ? 'off' : 'on');
  };
  ```
  并在发送请求的参数组装里，修改 `thinkingIntent`：
  ```typescript
  const thinkingIntent = visionThinkingIntent;
  ```
  
  修改原本单行 `form` 容器。如果 `canToggleThinking` 为真，则在右侧展示 `BrainCircuit` 思考切换按钮：
  ```tsx
  <form
    onSubmit={handleSubmit}
    className="relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-1.5 shadow-2xl focus-within:border-primary/45 focus-within:ring-4 focus-within:ring-primary/5 transition-all group flex items-end gap-2"
  >
    {/* 图片输入按钮（Compact 气泡弹窗式） */}
    <ReferenceImageInput
      compact
      value={selectedImage || ''}
      onChange={(next) => setSelectedImage(next || null)}
      uploadQuality={0.8}
      allowUrl={allowImageUrl}
      allowUpload={allowImageDataUrl}
      disabledReason={imageDisabledReason}
    />

    {/* 自适应 textarea */}
    <textarea
      ref={textareaRef}
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={supportsAnyImage ? "What's in this image?" : 'Ask this model...'}
      rows={1}
      className="flex-1 min-h-[24px] max-h-48 bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-2 px-1 text-sm leading-relaxed overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent"
    />

    {/* VLM 思考模式 Toggle 开关 (根据模型支持度动态显示) */}
    {canToggleThinking && (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={toggleCurrentReasoning}
        className={cn(
          'h-9 shrink-0 rounded-xl px-2.5 text-[10px] gap-1 transition-all hover:scale-105 active:scale-95 mb-0.5',
          isCurrentlyReasoning
            ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15'
            : 'text-muted-foreground hover:bg-muted'
        )}
        title={thinkingStatusLabel}
      >
        <BrainCircuit className="h-4 w-4" />
        <span className="hidden sm:inline">Think</span>
      </Button>
    )}

    {/* 发送/停止按钮 */}
    {isLoading ? (
      <Button
        type="button"
        onClick={handleStop}
        size="icon"
        className="h-9 w-9 shrink-0 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/15 transition-all hover:scale-105 active:scale-95 mb-0.5 flex items-center justify-center"
      >
        <Square className="h-3.5 w-3.5 fill-current" />
      </Button>
    ) : (
      <Button
        type="submit"
        size="icon"
        disabled={!input.trim() && !selectedImage}
        className="h-9 w-9 shrink-0 rounded-xl transition-all hover:scale-105 active:scale-95 mb-0.5 flex items-center justify-center"
      >
        <Send className="h-3.5 w-3.5" />
      </Button>
    )}
  </form>
  ```

---

### 任务 4：重构 [image-module.tsx](file:///D:/Code/ModelScope-Prism/components/image/image-module.tsx) 输入框为单行精致布局与外发光动效

**文件：**
- 修改：[components/image/image-module.tsx](file:///D:/Code/ModelScope-Prism/components/image/image-module.tsx) （底部的输入框容器）

**接口：**
- 消费者：`ImageModule` 内部交互
- 生产者：无

- [ ] **步骤 1：同步重构对话框为聚焦外发光单行结构**
  
  原输入栏修改为：
  ```tsx
  <div className="relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-1.5 shadow-2xl focus-within:border-primary/45 focus-within:ring-4 focus-within:ring-primary/5 transition-all group flex items-end gap-2">
    {/* 图片输入按钮（Compact 气泡弹窗式） */}
    <ReferenceImageInput compact value={imageEditUrl} onChange={setImageEditUrl} />

    {/* 自适应 textarea */}
    <textarea
      ref={textareaRef}
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
      placeholder="A cyberpunk city in the rain, neon lights..."
      rows={1}
      className="flex-1 min-h-[24px] max-h-48 bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-2 px-1 text-sm leading-relaxed overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSubmit();
        }
      }}
    />

    {/* 移动端参数设置触发按钮 */}
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0 rounded-xl hover:bg-muted text-muted-foreground md:hidden flex items-center justify-center transition-all hover:scale-105 active:scale-95 mb-0.5"
      onClick={() => setIsMobileSettingsOpen(true)}
    >
      <Sliders className="h-4 w-4" />
    </Button>

    {/* 桌面端参数设置触发按钮 */}
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'h-9 w-9 shrink-0 rounded-xl hover:bg-muted text-muted-foreground hidden md:flex items-center justify-center transition-all hover:scale-105 active:scale-95 mb-0.5',
        showSettings && 'bg-muted text-foreground'
      )}
      onClick={() => setShowSettings(!showSettings)}
    >
      <Sliders className="h-4 w-4" />
    </Button>

    {/* 生成动作按钮 */}
    <Button
      onClick={handleSubmit}
      size="icon"
      disabled={isGenerating || !prompt.trim()}
      className="h-9 w-9 shrink-0 rounded-xl transition-all hover:scale-105 active:scale-95 mb-0.5 flex items-center justify-center"
    >
      {isGenerating ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
    </Button>
  </div>
  ```

- [ ] **步骤 2：进行整体项目打包测试与校验**
  
  执行：`pnpm check`
  执行：`pnpm build`
  预期：打包成功，没有任何 Lint 警告或 TypeScript 编译错误。
