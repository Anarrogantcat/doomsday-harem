import type { Scene } from "../text/engine.ts";
import { parseScript, materializeScene, type ScriptScene } from "../script/parser.ts";
import type { Vars } from "../script/condition.ts";

/**
 * 场景注册表：汇总所有 DSL 剧本，按变量集实体化可用场景。
 * 纯内存实现，不触碰文件系统 —— 加载由调用方（Node 或 Tauri）负责。
 */
export class SceneRegistry {
  private scripts: ScriptScene[] = [];

  /** 载入一份 DSL 源文本，返回新增场景数 */
  load(src: string): number {
    const parsed = parseScript(src);
    let added = 0;
    for (const s of parsed.scenes) {
      if (this.scripts.some((x) => x.id === s.id)) continue;
      this.scripts.push(s);
      added++;
    }
    return added;
  }

  loadAll(sources: string[]): number {
    let total = 0;
    for (const s of sources) total += this.load(s);
    return total;
  }

  all(): ScriptScene[] {
    return [...this.scripts];
  }

  get(id: string): ScriptScene | undefined {
    return this.scripts.find((s) => s.id === id);
  }

  size(): number {
    return this.scripts.length;
  }

  /** 实体化单个场景；条件不满足返回 null */
  materialize(id: string, vars: Vars = {}): Scene | null {
    const s = this.get(id);
    if (!s) return null;
    return materializeScene(s, vars);
  }

  /** 列出当前变量集下所有可触发的场景 */
  available(vars: Vars = {}): Scene[] {
    const out: Scene[] = [];
    for (const s of this.scripts) {
      const scene = materializeScene(s, vars);
      if (scene) out.push(scene);
    }
    return out;
  }

  /** 按角色 id 过滤可触发场景（参与人里含该角色） */
  availableFor(entityId: string, vars: Vars = {}): Scene[] {
    return this.available(vars).filter((s) => s.participants.includes(entityId));
  }
}
