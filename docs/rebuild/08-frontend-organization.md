# 前端组织

## 目的

本文定义第一阶段重构后的前端工作区、组件边界、状态入口和桌面 / 移动端组织方式。

前端重构目标不是大幅改版，而是在保留当前体验气质的基础上，让功能区、组件、状态和交互边界更清晰。

## 总体原则

```text
第一屏是工作区，不是 landing page
输入栏是主交互中心
参数面板是辅助控制区
Chat / Vision / AIGC 是三个用户任务入口
桌面与移动端都是一等目标体验
UI 不直接拼 ModelScope provider payload
UI 状态必须表达用户显式选择
```

前端组件应服务于接口契约与存储 schema，而不是在组件内部重新定义请求语义。

## 工作区结构

第一阶段保留三个前端工作区：

```text
ChatWorkspace
VisionWorkspace
ImageWorkspace
```

工作区与底层领域的关系：

```text
ChatWorkspace -> Conversation domain
VisionWorkspace -> Conversation domain
ImageWorkspace -> AIGC domain
```

Chat 与 Vision 不共享历史列表，但共享 Conversation 请求契约、流式解析和消息渲染能力。

Image 是独立 AIGC 工作区。

## 桌面布局

桌面端保留工作台式布局。

核心区域：

```text
Sidebar：历史、会话管理、模块上下文
TopBar：模型、状态、全局操作
MainWorkspace：当前功能区内容
Dock：模块切换与常用入口
SettingsDialog：设置、token、导入导出、高级默认值
```

桌面端可以利用横向空间：

```text
AIGC 参数侧栏
多列图片图库
更完整的模型状态展示
更清晰的会话历史扫描
```

桌面端不应把主体验做成营销页或说明页。

## 移动端布局

移动端是一等公民，不是桌面端压缩版。

移动端结构：

```text
MobileHeader：当前工作区、模型/状态摘要、设置入口
MobileNav：模块切换
MainWorkspace：单列内容流
BottomComposer：固定底部输入栏
BottomSheet：参数、设置、会话列表等辅助界面
```

移动端不强求桌面的侧栏、顶部栏和 Dock 布局。

移动端必须覆盖：

```text
切换 Chat / Vision / AIGC
创建和恢复会话
输入长文本
发送 / 停止生成
查看 reasoning
上传或粘贴图片
填写图片 URL
打开 AIGC 参数
启用高级参数
查看生成图片
打开设置
输入 / 清除 token
导入 / 导出本地数据
```

## 响应式策略

桌面与移动端共享信息架构，但允许不同表达。

```text
桌面：沉浸工作台，多区域并列
移动端：单列任务流，辅助内容按需弹出
```

所有新功能必须同时定义：

```text
桌面入口
移动端入口
键盘和触控行为
空状态
加载状态
错误状态
```

移动端控件不得依赖 hover。

## Shared 组件

跨工作区复用组件放在 `src/components/shared`。

建议共享组件：

```text
ImageInputDialog
ReferenceImageInput
MarkdownRenderer
ReasoningBlock
ModelBadge
ErrorNotice
TokenStatus
ParameterToggle
```

共享组件必须保持语义通用，不应硬编码某个 feature 的业务流。

## Conversation 前端组件

Chat 与 Vision 共享 Conversation UI 基础组件。

建议组件：

```text
ConversationMessageList
ConversationMessageBubble
ConversationComposer
ConversationModelSelector
ReasoningBlock
StopOrSendButton
ImageAttachmentPreview
OutputLimitControl
ThinkingControl
```

Chat feature 可以组合：

```text
ChatWorkspace
ChatEmptyState
ChatModelSelector
ChatComposer
```

Vision feature 可以组合：

```text
VisionWorkspace
VisionEmptyState
VisionComposer
VisionImagePromptPanel
```

共享底层组件，不强制共享所有 UI 文案。

## AIGC 前端组件

AIGC 工作区围绕图片生成和任务状态组织。

建议组件：

```text
ImageWorkspace
ImageComposer
ImageParameterPanel
ImageInputDialog
ImageAdvancedPanel
LoraEditor
ImageTaskStatus
GeneratedImageGrid
GeneratedImageViewer
ImagePromptActions
```

参数组织：

```text
基础参数：negative_prompt, size
高级参数：seed, steps, guidance, loras
图片输入：输入对话框子模块，控制 image_url
```

高级参数必须逐项启用。高级区打开不等于发送高级参数。

## Settings 前端组件

设置区负责全局默认值和本地数据能力。

必须覆盖：

```text
Access Token 输入与清除
默认模型 ID
Conversation 默认 thinking / output limit
AIGC 默认参数偏好
导出本地数据
导入本地数据
主题切换
```

设置区不得直接调用外部 provider。

## Sessions 前端组件

历史列表按工作区区分。

```text
Chat 历史
Vision 历史
AIGC 历史
```

会话组件负责：

```text
创建
切换
重命名
删除
按更新时间排序
展示模型与类型摘要
```

切换工作区时，应恢复该工作区上次活跃 session。

## 状态入口

前端状态应通过 storage/store 层进入。

允许：

```text
feature hooks 读取 session、settings、active task
feature hooks 调用 store action
feature hooks 调用 services client
```

禁止：

```text
组件直接访问 IndexedDB
组件直接构造 provider payload
组件绕过 store 修改 session 数据
组件把临时 UI 默认值当作请求参数
```

## 参数 UI 语义

所有可选参数必须有清晰发送状态。

推荐表达：

```text
Auto：不发送，让平台默认
On：发送启用参数
Off：发送关闭参数
Enabled：该参数将被发送
Disabled：该参数不会被发送
```

AIGC 高级参数示例：

```text
[ ] Steps      30
[ ] Guidance   3.5
[ ] Seed       12345
```

未勾选时不发送，即使显示值存在。

## 图片输入 UI

图片输入是共享能力，但不同工作区有不同文案。

Conversation：

```text
图片作为 image_url content part
用于视觉理解或多模态对话
```

AIGC：

```text
图片作为 image_url 参数
用于图像编辑 / 图生图
```

UI 必须避免让用户误以为 Prism 会判断模型是否支持图片。模型拒绝时展示清晰上游错误。

## 非目标

第一阶段前端组织不包含：

```text
大幅视觉改版
营销首页
复杂工作流画布
多供应商模型市场
probe 报告导入 UI
所有参数的高级调参台
```

## 验收标准

前端组织满足以下条件时视为可接受：

```text
Chat / Vision / AIGC 三个工作区清晰
桌面与移动端均有完整入口
Chat / Vision 共享 Conversation 底层能力但历史不共用
AIGC 参数面板符合基础 / 高级 / 图片输入分组
可选参数发送状态在 UI 上可见
图片输入组件可复用
设置区覆盖 token、默认模型、默认参数、导入导出、主题
组件不直接拼 ModelScope payload
移动端不依赖桌面布局压缩
```
