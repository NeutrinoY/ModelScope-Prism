# AIGC 模块需求

## 模块定位

AIGC 模块是 ModelScope API-Inference 图片推理能力的轻量调用工作区。

它只面向官方异步图片生成流程：

```text
POST /v1/images/generations
GET /v1/tasks/{task_id}
```

该模块不是完整图像工作流编辑器，不替代 ModelScope AIGC 页面、ComfyUI、模型训练工具、部署工具或模型托管管理功能。

## 核心工作流

AIGC 模块支持两类常见 API-Inference 图片工作流。

```text
文生图：
model + prompt -> image

图像编辑 / 图生图：
model + prompt + image_url -> image
```

Prism 不推断某个模型是否支持图像编辑。用户提供图片输入时，Prism 发送 `image_url`；如果所选模型拒绝该参数，应清晰展示上游错误。

## 支持参数

AIGC 模块只暴露 ModelScope API-Inference AIGC 文档中的图片参数。

必需参数：

```text
model
prompt
```

基础可选参数：

```text
negative_prompt
size
```

高级可选参数：

```text
seed
steps
guidance
loras
```

图片输入参数：

```text
image_url
```

`image_url` 由输入对话框中的图片输入子模块控制，不属于主参数面板。

## 参数范围

参数校验以 ModelScope API-Inference AIGC 文档为准。

```text
model:
  类型：string
  必需：是
  含义：ModelScope 上的 AIGC 模型 ID

prompt:
  类型：string
  必需：是
  含义：正向提示词
  范围：长度小于 2000

negative_prompt:
  类型：string
  必需：否
  含义：负向提示词
  范围：长度小于 2000

size:
  类型：string
  必需：否
  示例：1024x1024
  范围：
    SD 系列：[64x64, 2048x2048]
    FLUX：[64x64, 1024x1024]
    Qwen-Image：[64x64, 1664x1664]
    Z-Image-Turbo：[512x512, 2048x2048]

seed:
  类型：int
  必需：否
  范围：[0, 2^31 - 1]

steps:
  类型：int
  必需：否
  范围：[1, 100]

guidance:
  类型：float
  必需：否
  范围：[1.5, 20]

image_url:
  类型：string 或 string[]
  必需：否
  含义：待编辑图片的 URL 地址或 base64 data URL
  约束：仅适用于支持图片编辑的模型；公网 URL 必须可访问

loras:
  类型：string 或 dict
  必需：否
  含义：LoRA 模型，用于风格迁移或细节增强
  约束：单 LoRA 使用字符串；多 LoRA 使用对象；最多 6 个；多 LoRA 权重总和必须为 1.0
```

Prism 不根据模型 ID 自动判断尺寸范围属于哪一类。UI 可以提示不同模型存在不同分辨率范围；基础格式校验与上游错误展示必须可靠。

## 显式参数发送原则

Prism 不得发送用户未显式填写、选择、启用或添加的可选参数。

默认请求体只包含：

```text
model
prompt
```

发送规则：

```text
negative_prompt：仅在非空时发送
size：仅在用户选择具体尺寸时发送
seed：仅在用户启用 seed 时发送
steps：仅在用户启用 steps 时发送
guidance：仅在用户启用 guidance 时发送
image_url：仅在用户添加图片输入时发送
loras：仅在用户添加 LoRA 输入时发送
```

打开或启用高级区只表示显示高级控件，不得导致默认高级参数被发送。

UI 中显示的默认值不是请求默认值。例如禁用状态下显示 `steps = 30` 或 `guidance = 3.5`，不代表这些值属于请求体。

## 参数面板组织

主参数面板按用户意图分组。

基础参数：

```text
negative_prompt
size
```

高级参数：

```text
seed
steps
guidance
loras
```

图片输入：

```text
image_url
```

图片上传、URL 输入和 base64 data URL 处理位于输入对话框的图片输入子模块中，不常驻主参数面板。

## LoRA

LoRA 是保留能力，因为它是 ModelScope AIGC 生态中的轻量扩展路径。

单 LoRA 请求格式：

```json
{
  "loras": "<lora-repo-id>"
}
```

多 LoRA 请求格式：

```json
{
  "loras": {
    "<lora-repo-id1>": 0.6,
    "<lora-repo-id2>": 0.4
  }
}
```

规则：

```text
最多 6 个 LoRA
多 LoRA 权重总和必须为 1.0
LoRA 兼容性由用户判断
Prism 不推断 LoRA 是否兼容当前基础模型
```

UI 可以提供权重均衡辅助，但请求契约必须遵守 ModelScope API-Inference 的 LoRA 规则。

## 图片输入

图片输入只表达为 `image_url`。

用户可提供：

```text
公网 URL
base64 data URL
多张图片输入
```

发送规则：

```text
未添加图片：不发送 image_url
添加一张图片：发送单个 image_url
添加多张图片：发送 image_url 数组
```

本地图片应在前端转换为 base64 data URL 后作为 `image_url` 传递。对于图像编辑模型，优先建议用户使用公网可访问的图片 URL。

## 任务处理

AIGC 模块必须支持 ModelScope 异步任务生命周期。

必需状态：

```text
idle
submitting
polling
succeeded
failed
timed out
```

必需行为：

```text
提交图片生成请求
保存活跃 task_id
轮询任务状态
任务成功时展示 output_images
任务失败时展示明确失败反馈
处理任务超时
刷新后尽可能恢复未完成任务状态
```

## 非目标

第一阶段重构目标不包含：

```text
ControlNet
sampler
scheduler
VAE
refiner
clip skip
mask 或 inpaint 工作流控制
节点式工作流
模型训练
模型部署
模型托管管理
ModelScope AIGC 页面替代
```

这些超出 Prism 作为轻量 ModelScope API-Inference 前端的定位。

## 验收标准

AIGC 模块满足以下条件时视为可接受：

```text
文生图请求可以只依赖 model 和 prompt 发起
negative_prompt 和 size 作为基础可选参数实现
seed、steps、guidance、loras 作为高级可选参数实现
所有可选参数只在用户显式提供或启用后发送
image_url 由输入对话框中的图片输入子模块控制
单 LoRA 和多 LoRA 请求格式符合 ModelScope API-Inference 规则
多 LoRA 权重校验总和为 1.0，最多 6 个
任务提交、轮询、成功、失败、超时和刷新恢复均被处理
上游参数错误被清晰展示，而不是隐藏为泛化失败
```
