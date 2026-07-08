# 设计规格书：前端风格一致性与单行布局精致化

本规范书确定了 ModelScope Prism 前端 UI 的样式美化和重构方案，旨在确保 Chat、Vision 和 Studio（AIGC）三大模块在排版、布局以及输入框聚焦动效上保持高度一致，采用统一的高级极简单行风格。

## 1. 视觉风格与全局焦点动画

所有模块的对话/输入框将采用统一的单行毛玻璃卡片（Single-Row frosted glass card），并在聚焦时呈现顺滑的“外发光呼吸阴影”：

| 元素 | CSS 类名 | 说明 |
| :--- | :--- | :--- |
| **卡片容器** | `relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-1.5 shadow-2xl transition-all group flex items-end gap-2` | 统一的单行毛玻璃卡片容器 |
| **聚焦动画** | `focus-within:border-primary/45 focus-within:ring-4 focus-within:ring-primary/5` | 获取焦点时的边缘高亮与呼吸外发光 |
| **悬停/激活** | `hover:scale-105 active:scale-95 transition-all duration-200` | 按钮悬停和点击时的物理缩放反馈 |
| **圆角大小** | `rounded-2xl` | 统一的精致大圆角 |

---

## 2. 模型选择栏（Model Selector）精致化

对 [chat-module.tsx](file:///D:/Code/ModelScope-Prism/components/chat/chat-module.tsx) 中的模型选择栏进行以下优化，以改进视觉对齐与对比度：

### A. 模态指示标签（Pills）
将粗糙的纯文本 `Text` 或 `Text + Image` 替换为紧凑优雅的胶囊徽章（Badges）：
- **纯文本模型标签 (TEXT)**：
  ```tsx
  <span className="z-10 text-[9px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground/80 font-mono tracking-wider uppercase scale-90">
    Text
  </span>
  ```
- **多模态模型标签 (VISION)**：
  ```tsx
  <span className="z-10 text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold font-mono tracking-wider uppercase scale-90">
    Vision
  </span>
  ```

### B. 自定义卡片（Custom）对齐
重构 `Custom` 按钮，使其卡片几何尺寸、内边距（padding）、悬停动效与内置徽章结构与普通模型卡片完全一致：
```tsx
<button
  type="button"
  onClick={() => document.dispatchEvent(new CustomEvent('open-settings'))}
  className={cn(
    'flex-none w-[100px] md:w-auto md:flex-1 snap-center rounded-xl text-[11px] transition-all flex flex-col items-center justify-center gap-1.5 relative py-1.5 text-muted-foreground hover:bg-background/40',
    isCustomModel && 'text-foreground'
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

### C. 激活项对比度
在暗色模式下，滑块激活背景 `bg-background`（对应纯暗 `#0a0a0a`）会被调整为 `bg-secondary`（或 `bg-muted`），以确保激活滑块相比于容器 `bg-muted/30` 具有升起的、更明亮的层级，消除凹陷感。

---

## 3. 统一单行输入框与图片上传子模块

我们将 Chat、Vision 和 Image 模块 of 输入区，统一设计为精美的单行布局。

### 视觉布局示意图
```
+-------------------------------------------------------------------------------+
| [图片按钮(Compact)] [Textarea (自适应高度、全宽、无框)] [配置切换/发送按钮]   |
+-------------------------------------------------------------------------------+
```

### 核心实现逻辑
1. **图片上传子模块组件（`ReferenceImageInput`）**：
   * 在三个模块的对话框中均以 `compact={true}` 模式渲染，表现为一个 `36x36px` 圆角正方形按钮，并在被激活或处于开启状态时增加外圈高亮效果。
   * 显示能力控制：根据当前所选模型的 `ModelProfile` 动态控制是否禁用。纯文本模型下该按钮自动处于禁用状态（透明度 45%，禁止指针）。
2. **Textarea 输入区**：
   * 采用 `flex-1 bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-2 px-1 text-sm leading-relaxed max-h-48 overflow-y-auto`，使得文本录入极其流畅。
3. **右侧操作按钮区**：
   * 控制按钮（如“深度思考”开关和 Sliders 开关）采用紧凑的圆形/圆角正方形图标按钮，配合 hover 物理微缩放动效，以避免在单行中抢占文本输入空间。
   * **VLM（Vision）模块支持“思考模式”**：如果所选 VLM 模型是自定义模型（source === 'custom'）或其配置支持思考（`profile.thinking.control !== 'none'`），输入框中将和 Chat 一样展示 `BrainCircuit` 思考开关，根据模型配置动态控制是否发送思考请求，支持 `visionThinkingIntent` 状态持久化。
