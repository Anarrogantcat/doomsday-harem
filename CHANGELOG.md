# 更新日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)：`MAJOR.MINOR.PATCH`

- **MAJOR** — 存档结构不兼容变更
- **MINOR** — 向后兼容的功能新增
- **PATCH** — 向后兼容的问题修复

## [0.2.0] — 2026-02-14

### 新增
- 事件脚本 DSL 解析器（`packages/core/src/script/`）
  - `@scene` / `@beat` / `@variant` 三层结构
  - 条件表达式求值器（无 eval，纯递归下降）
  - 差分文本按条件挂载到同一节拍
- 存档序列化层（`packages/core/src/save/`）
  - JSON 往返（serialize / deserialize）
  - FNV-1a 完整性校验
  - 不变式检查（INV-1 ~ INV-6）
- 版本单一来源：`VERSION` 文件 + `scripts/version.mjs` 同步/校验
- 示例 DSL 剧本 `data/scripts/sister_first.dsl`

### 变更
- `World.get()` 重命名为 `World.entity()`，与组件 `get()` 区分

## [0.1.0] — 2026-02-14

### 新增
- 核心 ECS（实体 / 组件 / 查询）
- 生存系统（饥饿 / 口渴 / 体力 / 精力 / 心情，6 种活动强度）
- 关系系统（好感 / 忠诚只升不降，欲情四阶段，后宫两两亲密度）
- 岗位系统（11 类岗位 + 疲劳衰减）
- 文本引擎（四层并进描写 + 四档详细度 + 首尾保留采样）
- 视图层抽象（像素 / 插画 / Live2D 均为可选订阅者）
- 内置作弊器（开启即全开，三项开关解耦）
- Tauri 2 外壳（AES-256-GCM + HMAC 存档加密、Mod 加载器）
- React UI（状态 / 后宫 / 岗位 / 场景 / 设置 五个面板）
- SQLite Schema（9 张表）
- 技术设计文档
- 18 项单元测试
