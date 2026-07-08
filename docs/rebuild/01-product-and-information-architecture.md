# 产品与信息架构

## 目的

本文定义 Prism 第一阶段重构后的产品结构、用户工作流、信息层级和状态展示规则。

它回答：

```text
用户进入 Prism 后看到什么
Chat / Vision / AIGC 分别解决什么任务
哪些信息必须常驻
哪些控制应按需展开
桌面与移动端如何组织同一套能力
哪些产品能力第一阶段不做
```

本文不定义具体组件实现。组件边界见：

```text
docs/rebuild/08-frontend-organization.md
```

视觉、动效和文案细节见：

```text
docs/rebuild/09-visual-and-interaction-guidelines.md
```

## 产品定位

Prism 是面向 ModelScope API-Inference 的轻量调用工作台。

第一阶段产品目标：

```text
让用户用自己的 ModelScope Access Token
快速选择或填写模型 ID
在 Chat、Vision、AIGC 三个任务入口中调用模型
本地保存会话、设置和生成记录
清楚知道哪些参数会被发送
在上游失败时获得可理解的错误反馈
```

Prism 不是：

```text
ModelScope 社区替代品
模型市场
模型训练或部署平台
多供应商聚合平台
Agent 平台
ComfyUI 式工作流画布
```

## 第一屏

第一屏必须是可用工作区，不是 landing page。

首次进入时，用户应直接看到当前工作区：

```text
Chat 默认工作区
主内容空状态
底部输入栏
模型状态或模型选择入口
token 状态或设置入口
工作区切换入口
```

空状态可以说明当前工作区用途，但不得变成营销页或长说明页。

空状态目标：

```text
告诉用户可以做什么
提供必要入口
降低首次操作摩擦
```

空状态不应包含：

```text
大段产品介绍
复杂教程
API 文档复制
品牌 hero
```

## 工作区总览

第一阶段保留三个产品工作区：

```text
Chat
Vision
AIGC
```

工作区与底层领域关系：

```text
Chat -> Conversation domain
Vision -> Conversation domain
AIGC -> Image generation domain
```

Chat 与 Vision 是不同用户任务入口，不共享历史列表，但共享底层 Conversation 请求契约。

AIGC 是独立图片生成工作区。

## Chat 工作区

Chat 面向文本对话与通用 LLM 调用。

核心任务：

```text
输入文本 prompt
选择或填写模型 ID
发起流式对话
查看普通回答
查看 reasoning
停止生成
继续同一会话
恢复历史会话
```

Chat 可以附加图片，但图片不是主体验。

规则：

```text
未添加图片时发送纯文本 Conversation message
添加图片时发送 multimodal content parts
Prism 不承诺所选模型支持图片
模型拒绝图片输入时展示清晰错误
```

Chat 必须常驻的信息：

```text
当前会话标题或上下文
当前 modelId 或模型摘要
输入栏
发送 / 停止状态
流式生成状态
```

Chat 按需展开的信息：

```text
模型选择详情
thinking 控制
输出上限高级设置
历史列表
消息元信息
错误详情
```

## Vision 工作区

Vision 面向视觉理解任务。

它不是独立 VLM 协议，而是 Conversation domain 的图片优先入口。

核心任务：

```text
添加图片
输入关于图片的问题
选择或填写模型 ID
发送视觉理解请求
查看流式回答
查看 reasoning
继续同一视觉会话
恢复 Vision 历史
```

Vision 的产品差异：

```text
图片输入更突出
空状态引导用户添加图片
消息列表突出图片上下文
模型状态提示图片输入能力
```

Vision 不应：

```text
另建一套 provider 协议
把视觉能力与具体模型家族绑定
在线探测模型是否支持图片
```

Vision 必须常驻的信息：

```text
当前视觉会话
图片输入状态
当前 modelId 或模型摘要
输入栏
发送 / 停止状态
```

Vision 按需展开的信息：

```text
图片来源详情
thinking 控制
输出上限高级设置
历史列表
错误详情
```

## AIGC 工作区

AIGC 面向 ModelScope API-Inference 图片生成和图像编辑。

核心任务：

```text
输入图片生成 prompt
选择或填写 AIGC modelId
可选填写 negative_prompt
可选选择 size
按需添加图片输入
按需启用高级参数
提交异步生成任务
查看任务状态
查看生成图片
继续同一图片 session
恢复图片历史
```

AIGC 支持两类工作流：

```text
文生图：model + prompt
图像编辑 / 图生图：model + prompt + image_url
```

AIGC 不做：

```text
ControlNet
sampler / scheduler 面板
mask / inpaint 工作流
节点式工作流
模型兼容性判断
LoRA 与基础模型兼容性判断
```

AIGC 必须常驻的信息：

```text
当前图片 session
prompt 输入栏
生成按钮 / 生成中状态
当前 modelId
生成图库
任务状态
```

AIGC 桌面端可常驻的信息：

```text
基础参数面板
高级参数折叠入口
```

AIGC 移动端按需展开的信息：

```text
参数面板
LoRA 编辑
图片输入详情
生成图片详情
```

## 导航结构

导航必须让用户随时理解当前所在工作区。

桌面端建议结构：

```text
Sidebar：历史与会话入口
TopBar：当前模型、token 状态、全局入口
MainWorkspace：当前工作区
Dock：Chat / Vision / AIGC 快速切换
SettingsDialog：token、默认值、主题、导入导出
```

移动端建议结构：

```text
MobileHeader：当前工作区、模型摘要、设置入口
MainWorkspace：当前内容流
BottomComposer：输入栏
MobileNav：工作区切换
BottomSheet：历史、参数、设置等辅助界面
```

导航规则：

```text
切换工作区时恢复该工作区上次活跃 session
Chat / Vision / AIGC 历史入口分开
移动端不使用桌面侧栏压缩版
```

## 会话与历史

历史按工作区分开。

```text
Chat 历史：文本对话为主
Vision 历史：图片理解会话
AIGC 历史：图片生成 session
```

每个 session 必须保存：

```text
session id
type
title
createdAt
updatedAt
modelId
当前会话数据
当前会话设置
```

Chat / Vision session 保存 Conversation messages。

Image session 保存生成图片列表和 AIGC 参数偏好。

历史列表应展示：

```text
标题
更新时间
工作区类型
模型摘要
简短内容摘要
```

历史操作：

```text
创建
切换
重命名
删除
```

第一阶段不要求：

```text
跨工作区搜索
标签系统
云同步
多选批量操作
```

## 模型信息

Prism 不把具体模型家族写死为产品架构。

产品层只表达：

```text
当前 modelId
模型来源：内置推荐 / 自定义
已知或未知能力摘要
当前请求会使用的显式控制
```

模型信息可以影响：

```text
UI 提示
默认可见格式
能力 badge
风险说明
```

模型信息不得导致：

```text
Auto 状态自动注入行为参数
自定义模型运行时在线探测
失败后轮流尝试参数格式
```

## Token 状态

Access Token 是调用 ModelScope API-Inference 的必要条件。

产品层必须表达三种状态：

```text
未设置 token
已设置 token
请求中 token 被上游拒绝
```

展示规则：

```text
未设置 token 时，发送动作应引导打开 Settings
已设置 token 时，不展示完整 token
鉴权失败时提示用户检查或更新 token
token 默认只保存在本地
导出默认不包含 token
```

token 入口属于 Settings，不应散落在每个工作区的主流程中。

## 参数信息架构

参数在产品层分为三类：

```text
必需参数
基础可选参数
高级可选参数
```

必需参数：

```text
Conversation: model, messages
AIGC: model, prompt
```

基础可选参数：

```text
AIGC: negative_prompt, size
```

高级可选参数：

```text
Conversation: thinking control, output limit
AIGC: seed, steps, guidance, loras
```

产品规则：

```text
高级入口可以存在，但高级参数必须逐项显式启用
UI 默认值不是请求默认值
Auto 表示不发送控制参数
Reset / Auto 入口必须能回到不发送状态
```

参数面板的目标不是暴露所有可能调参项，而是只暴露 ModelScope API-Inference 第一阶段契约内的必要控制。

## 图片输入

图片输入是共享能力，但产品文案按工作区区分。

Conversation / Vision：

```text
图片作为对话消息的一部分
用于视觉理解或多模态问答
```

AIGC：

```text
图片作为 image_url 参数
用于图像编辑 / 图生图
```

图片输入方式：

```text
公网 URL
本地上传后转 base64 data URL
多图输入
```

产品规则：

```text
图片输入应放在输入对话框或 composer 附近
不要把图片上传放成复杂素材管理系统
不要承诺 Prism 能判断模型是否支持图片
```

## 状态与反馈

所有工作区必须覆盖以下状态：

```text
空状态
输入中
提交中
流式生成中
可停止
成功
失败
恢复中
```

AIGC 额外状态：

```text
任务已提交
轮询中
任务成功
任务失败
任务超时
刷新恢复任务
```

错误展示分三层：

```text
Toast：短反馈
工作区错误块：用户可理解的原因与下一步
详情展开：request id、错误码、上游摘要
```

用户视角错误分类：

```text
缺少 token
鉴权失败
额度或余额不足
限流
模型不可用
参数不支持
任务失败
超时
网络错误
未知上游错误
```

错误信息不能只显示泛化失败。

## 桌面信息层级

桌面端可利用横向空间，但主工作区仍然优先。

优先级：

```text
主内容
输入栏
当前模型与任务状态
历史
参数
设置
```

桌面端允许：

```text
历史侧栏常驻
AIGC 参数侧栏常驻或可折叠
顶部展示模型与 token 摘要
图库多列展示
```

桌面端避免：

```text
主内容被参数淹没
页面变成复杂控制台
多层卡片嵌套
```

## 移动端信息层级

移动端是单列任务流。

优先级：

```text
当前内容
输入栏
发送 / 停止
工作区切换
状态反馈
参数和历史
设置
```

移动端规则：

```text
输入栏必须键盘友好
历史进入 sheet
AIGC 参数进入 sheet
设置进入 sheet 或 dialog
图片查看器可接近全屏
不依赖 hover
触控目标足够大
```

移动端不做：

```text
常驻复杂侧栏
桌面 Dock 的等比例缩小
多列参数面板
```

## 设置区

Settings 是全局配置入口。

必须包含：

```text
ModelScope Access Token
默认 Chat modelId
默认 Vision modelId
默认 AIGC modelId
Conversation 默认高级设置
AIGC 默认参数偏好
主题切换
导出本地数据
导入本地数据
```

设置区规则：

```text
全局默认只影响新 session
已有 session 保存自己的 modelId 与设置
导出默认不包含 token
导入后要求用户重新确认 token
```

Settings 不应成为复杂管理后台。

## 导入导出

导入导出是本地数据能力，不是云同步。

导出包含：

```text
settings
sessions
生成记录
工作区活跃 session
```

默认不包含：

```text
Access Token
activeImageTask
输入草稿
临时 UI 状态
```

导入流程：

```text
选择文件
校验
展示摘要
确认替换
提示重新确认 token
```

第一阶段不要求 merge 导入。

## 非目标

第一阶段产品架构不包含：

```text
landing page
模型市场
模型收藏系统
模型在线搜索
云同步
账号系统
团队协作
Prompt 模板市场
复杂工作流画布
probe 报告 UI
全局跨模块搜索
批量图片任务队列
```

这些能力可能有价值，但会扩张第一阶段边界。

## 验收标准

产品与信息架构满足以下条件时视为可接受：

```text
第一屏是可用工作区，不是 landing page
Chat / Vision / AIGC 三个任务入口清晰
Chat / Vision 历史不共用，但底层 Conversation 契约统一
AIGC 作为独立图片生成工作区
每个工作区有清晰主流程、常驻信息和按需信息
桌面与移动端都有完整信息层级
token 状态、模型状态、任务状态和错误状态可见
参数是否会被发送在产品层可理解
导入导出放在 Settings，且默认不包含 token
第一阶段非目标被明确排除
```
