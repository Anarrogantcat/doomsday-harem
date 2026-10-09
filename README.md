# Doomsday Harem

> 末日生存沙盒 + 科技树 + 后宫养成 + 成人文字游戏
> 版本 **0.6.1** · 平台 PC（Tauri 2 + React + Phaser）

一个隐藏天才的扶她御姐，在末日降临前觉醒预知并编写出 AI，用 180 天在山体里
建起要塞、买下房车。末日之后，她靠科技树强化自身、收集女性同伴，在无限自由的
沙盒世界里活下去 —— 直至角色死亡或弃档。

---

## 特性

| 系统 | 说明 |
|---|---|
| **双基地** | 地表现代风格安全屋（伪装）+ 山体内部避难所 |
| **武装房车** | 从普通 C 型房车起步，8 级改装科技线 |
| **8 条科技树** | 避难所 / 远征 / 自我 / 防御 / 机器人 / 能源 / 制药 / 寿命 |
| **AI 后宫成员** | 末日前编写，初始好感 85，安全屋建成即接入全基地 |
| **后宫系统** | 好感 / 忠诚只升不降，欲情只升不降，21 人基础容量 |
| **岗位系统** | 11 类岗位，直接影响基地运作效率 |
| **成人内容** | **默认详细文字**（四层并进），像素/插画/Live2D 可选 |
| **本地模型** | Ollama 等七种后端，失败自动降级手写剧本 |
| **内置作弊器** | 设置中开启，开启即全开，三项开关玩家自选 |

---

## 目录结构

```
doomsday-harem/
├─ packages/core/          纯 TS 引擎（零 IO 依赖，可测试）
│  ├─ src/
│  │  ├─ ecs.ts            实体 / 组件 / 查询
│  │  ├─ components.ts     Survival / Lust / Relationship / Job / AiCore
│  │  ├─ time.ts           7 时段覆盖 24h
│  │  ├─ systems/          生存 / 关系 / 岗位 / 作弊 / 怀孕 / 后宫 / 战斗
│  │  ├─ text/             文本引擎（四层描写）+ 视图层抽象
│  │  ├─ script/           DSL 解析器 + 条件求值器（不用 eval）
│  │  ├─ save/             序列化 + 六项不变式校验
│  │  ├─ tech/             八分支科技树（118 节点）
│  │  ├─ render/           像素渲染器
│  │  ├─ registry/         场景注册表
│  │  └─ runtime/          主循环
│  ├─ data/
│  │  ├─ scripts/          DSL 剧本（20 个）
│  │  ├─ scenes/           JSON 场景
│  │  └─ tech/             科技树数据
│  └─ test/                103 项测试
├─ packages/llm/           本地模型接口（七种后端）
│  ├─ src/
│  │  ├─ providers/        Ollama / OpenAI 兼容 / 离线
│  │  ├─ narrator.ts       叙事服务（降级 / 重试 / 缓存）
│  │  ├─ prompt.ts         提示词构建（强制四层结构）
│  │  ├─ cache.ts          LRU 缓存
│  │  └─ settings.ts       设置与校验
│  └─ test/                32 项测试（mock fetch）
├─ apps/desktop/
│  ├─ src-tauri/           Rust 后端（存档加密 / Mod 加载）
│  └─ src/                 React UI（6 个面板）
├─ docs/                   技术文档
└─ scripts/version.mjs     版本管理
```

---

## 快速开始

```bash
# 安装依赖
pnpm install

# 运行测试（135 项）
pnpm test

# 引擎演示
pnpm demo

# 类型检查
pnpm typecheck

# 启动客户端（需 Rust 工具链）
pnpm tauri dev

# 构建发布版
pnpm tauri build
```

### 环境要求

| 组件 | 版本 |
|---|---|
| Node.js | ≥ 18（推荐 24） |
| pnpm | ≥ 9 |
| Rust | stable（MSVC 目标） |
| MSVC Build Tools | 2022 + Windows SDK |
| WebView2 Runtime | 系统自带或单独安装 |

---

## 本地模型配置

设置 → 模型 标签页，或直接编辑配置：

```ts
{
  enabled: true,
  config: {
    kind: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    model: "qwen2.5:14b"
  }
}
```

支持后端：Ollama / LM Studio / vLLM / llama.cpp server / OpenAI 兼容 / 自定义 / 离线。

详见 [本地模型接口文档](docs/本地模型接口.md)。

**关键保证**：模型不可用时自动降级到手写剧本，游戏不会中断。

---

## 开发约定

### 三条铁律

1. **好感度**：只升不降，任何拒绝都不扣
2. **忠诚度**：只升不降，永不叛逃 / 偷窃 / 逃跑
3. **欲情值**：只升不降，唯一出路是被满足

### 六项不变式（测试锁定）

| 代码 | 内容 |
|---|---|
| INV-1 | 好感 / 忠诚 / 欲情只升不降，范围不越界 |
| INV-2 | 后宫之间禁用怀孕型扶她药 |
| INV-3 | 扶她药必须带到期时间 |
| INV-4 | 后代性别恒为 female |
| INV-5 | 夜袭场景无拒绝选项 |
| INV-6 | 扶她特性不入战斗数值 |

### 版本管理

`VERSION` 文件是唯一权威源：

```bash
node scripts/version.mjs              # 同步到所有 package.json / Cargo.toml / version.ts
node scripts/version.mjs --check      # CI 校验
node scripts/version.mjs --set 0.7.0  # 升版并同步
```

### 技术约束

- `packages/core` 保持零依赖，不引用 Phaser / React / SQLite
- TypeScript 启用 `erasableSyntaxOnly` —— 不使用 `enum`、命名空间、构造函数参数属性
- 模块路径必须带 `.ts` 扩展名（`NodeNext` 解析）
- 渲染层与文本来源解耦：模型生成与手写剧本产出同构的 `Scene`

---

## 版本历史

| 版本 | 内容 |
|---|---|
| 0.6.1 | Tauri 构建修复、模型接入 UI |
| 0.6.0 | 本地模型接口（七种后端） |
| 0.5.0 | 回合制战斗、运行时主循环 |
| 0.4.0 | 八分支科技树（118 节点）、科技树面板 |
| 0.3.0 | 怀孕系统、后宫多人场景、像素渲染器、20 个剧本 |
| 0.2.0 | 事件 DSL、存档序列化、版本管理 |
| 0.1.0 | 核心引擎 |

详见 [CHANGELOG.md](CHANGELOG.md)。

---

## 许可

私有项目。
