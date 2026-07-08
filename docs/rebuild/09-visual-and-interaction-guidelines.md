# 视觉与交互规范

## 目的

本文定义第一阶段重构中的视觉语言、动效、图标、文案、主题和移动端体验要求。

目标是保留当前 Prism 已经形成的流畅、轻盈、细腻的工作台气质，并通过统一 token、组件语义和交互规则把体验打磨到更稳定的产品状态。

## 设计方向

Prism 的视觉方向：

```text
轻量
沉浸
细腻
直接
低摩擦
现代工作台
```

允许优化：

```text
动画节奏
图标一致性
控件状态
参数启用语义
文案清晰度
移动端交互
双主题 token
```

不允许：

```text
大幅偏离当前整体框架
改成营销式 landing page
引入复杂装饰背景
每个模块使用不同视觉语言
为了重构而去动画化
```

## 继承当前体验

当前项目已有的动效和视觉气质应被保留。

需要继承：

```text
柔和的模块切换
轻微位移与透明度过渡
模型选择器 layout 动画
面板展开 / 收起
按钮状态切换
生成中 loading / shimmer
图片入场 scale + opacity
reasoning 折叠展开
弹窗 / sheet 的轻量进入
```

重构只能整理和统一这些体验，不能让产品变得僵硬、突兀或机械。

## 视觉语言

保留：

```text
暗色优先
半透明面板
细边框
柔和阴影
轻量磨砂
低饱和强调色
沉浸式工作区
克制圆角
```

避免：

```text
大面积装饰渐变
高饱和霓虹堆叠
过多卡片嵌套
花哨背景元素
营销 hero 构图
每个模块一套配色
```

页面应首先是可用工作区，而不是产品介绍页。

## Design Tokens

必须统一语义 token，减少组件内一次性颜色和阴影。

颜色 token：

```text
color.background
color.surface
color.surfaceMuted
color.surfaceElevated
color.border
color.borderStrong
color.textPrimary
color.textSecondary
color.textMuted
color.accent
color.accentSoft
color.danger
color.warning
color.success
```

尺寸 token：

```text
radius.sm
radius.md
radius.lg
radius.panel

space.1
space.2
space.3
space.4
space.6
space.8
```

阴影 token：

```text
shadow.panel
shadow.popover
shadow.focus
shadow.image
```

动效 token：

```text
motion.duration.instant = 80ms
motion.duration.fast = 140ms
motion.duration.base = 220ms
motion.duration.slow = 320ms

motion.ease.standard = cubic-bezier(0.22, 1, 0.36, 1)
motion.ease.exit = cubic-bezier(0.4, 0, 1, 1)
motion.ease.emphasis = cubic-bezier(0.16, 1, 0.3, 1)
```

## 双主题

深色和浅色模式都是正式目标。

```text
Dark mode 是当前审美基准
Light mode 不得是降级 fallback
两种模式共享语义 token
组件不得硬编码只适合某个主题的颜色
```

浅色模式应保持 Prism 的轻盈感：

```text
浅色背景
轻微灰阶 surface
低对比边框
柔和阴影
克制强调色
```

## 动效原则

动效不是装饰，而是状态变化反馈。

规则：

```text
短
柔
可预期
不抢注意力
不拖慢高频操作
不影响输入响应
```

建议时长：

```text
按钮 hover / press：80-140ms
小控件启用状态：140-180ms
面板展开：180-240ms
工作区切换：220-300ms
弹窗 / sheet：220-320ms
图片入场：240-320ms
```

允许继续使用 Framer Motion：

```text
AnimatePresence
layout 动画
弹窗 / sheet 入场
工作区切换
图片入场
```

普通 hover、focus、颜色变化优先使用 CSS transition。

避免：

```text
夸张弹跳
大幅旋转
过大位移
多处同时复杂动画
输入过程中触发昂贵动画
layout animation 导致文本抖动
```

## Reduced Motion

必须尊重 `prefers-reduced-motion`。

降级策略：

```text
保留 opacity 状态变化
移除大幅位移
移除 blur 过渡
缩短或跳过非必要动画
```

Reduced motion 下功能不能受影响。

## 移动端一等公民

移动端不是桌面版压缩结果。

移动端目标：

```text
单列清晰
触控友好
输入优先
参数按需弹出
状态明确
动画更短更稳
```

移动端必须保留核心能力：

```text
Chat / Vision / AIGC 切换
会话创建与恢复
发送 / 停止
reasoning 查看
图片上传 / URL 输入
AIGC 参数控制
LoRA 编辑
生成图片查看
设置、token、导入导出
```

移动端优先使用：

```text
MobileHeader
MobileNav
BottomSheet
固定底部输入栏
单列内容流
全屏或近全屏图片查看器
```

移动端避免：

```text
依赖 hover
过小触控区域
键盘遮挡输入栏
弹窗遮挡关键动作
复杂并列面板
过重 blur 和 layout animation
```

## 图标

继续使用 `lucide-react` 作为默认图标系统。

常用映射：

```text
发送：Send
停止：Square
设置：Settings / Sliders
图片：Image / ImagePlus
上传：Upload
链接：Link
复制：Copy
下载：Download
删除：Trash
思考：BrainCircuit
模型：Bot / Cpu
历史：Clock / MessagesSquare
导入：UploadCloud
导出：DownloadCloud
```

规则：

```text
动作按钮优先图标
不熟悉图标必须有 tooltip 或 aria-label
危险操作使用语义色与确认
同类动作图标尺寸一致
不要手写已有 lucide 图标
```

## 文案

文案应短、明确、面向用户动作。

规则：

```text
同一界面语言保持一致
技术参数名可以保留英文
用户提示使用短句
错误提示说明原因与下一步
按钮文案表达动作，不写实现细节
```

参数文案应表达发送语义：

```text
Auto：不发送控制参数，使用模型默认
On：发送启用参数
Off：发送关闭参数
Enabled：该参数将被发送
Disabled：该参数不会被发送
```

避免：

```text
含糊的“智能模式”
不解释 Auto 的实际行为
把上游参数错误写成泛化失败
过长说明占据主工作区
```

## 参数控件视觉语义

可选参数必须一眼看出是否会发送。

推荐表达：

```text
未启用：低对比、控件可见但不活跃
已启用：强调边框或强调色状态
Auto：明确显示不发送参数
Reset / Auto：允许回到不发送状态
```

AIGC 高级参数：

```text
[ ] Steps      30
[ ] Guidance   3.5
[ ] Seed       12345
```

勾选后才发送。

Conversation thinking：

```text
Auto
On
Off
Format
```

自定义模型选择 On / Off 时，应显示将发送的格式。

## 状态设计

必须覆盖：

```text
空状态
加载状态
流式生成中
停止生成
任务轮询中
任务成功
任务失败
参数错误
token 缺失
额度不足
限流
```

错误状态应可恢复。用户应知道下一步可以做什么。

## 可访问性

第一阶段至少保证：

```text
按钮有 aria-label 或可见文本
图标按钮有 tooltip
表单控件有 label
键盘可操作核心路径
焦点状态可见
颜色不是唯一状态表达
移动端触控目标足够大
```

## 非目标

第一阶段不做：

```text
大幅视觉重做
品牌营销页
复杂插画系统
三维场景
工作流画布
重型动画系统
每个模块独立视觉主题
```

## 验收标准

视觉与交互满足以下条件时视为可接受：

```text
保留当前流畅细腻的动效手感
动效节奏统一且不拖慢操作
桌面与移动端都是完整体验
移动端不是桌面压缩版
深色与浅色模式共享语义 token
图标系统一致
参数是否发送在视觉上明确
错误提示有用户可理解的原因和下一步
reduced motion 可用
整体框架不大幅偏离当前美学风格
```
