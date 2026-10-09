import type { EntityId } from "./types.ts";

export type ComponentName = string;

export interface Entity {
  id: EntityId;
  components: Map<ComponentName, unknown>;
}

/**
 * 极简 ECS：组件以名字挂在实体上。
 * 设计原则：数据与系统分离，系统是纯函数 (world, dt) => void。
 */
export class World {
  private entities = new Map<EntityId, Entity>();
  private nextId = 1;

  create(id?: EntityId): Entity {
    const eid = id ?? `e${this.nextId++}`;
    if (this.entities.has(eid)) throw new Error(`entity exists: ${eid}`);
    const e: Entity = { id: eid, components: new Map() };
    this.entities.set(eid, e);
    return e;
  }

  /** 取实体本体（与组件 get 区分开，避免重载歧义） */
  entity(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  all(): Entity[] {
    return [...this.entities.values()];
  }

  remove(id: EntityId): boolean {
    return this.entities.delete(id);
  }

  add<T>(id: EntityId, name: ComponentName, data: T): void {
    const e = this.must(id);
    e.components.set(name, data);
  }

  tryGet<T>(id: EntityId, name: ComponentName): T | undefined {
    return this.entities.get(id)?.components.get(name) as T | undefined;
  }

  get<T>(id: EntityId, name: ComponentName): T {
    const v = this.tryGet<T>(id, name);
    if (v === undefined) throw new Error(`missing component ${name} on ${id}`);
    return v;
  }

  has(id: EntityId, name: ComponentName): boolean {
    return this.entities.get(id)?.components.has(name) ?? false;
  }

  /** 按组件名查询所有实体 */
  query(...names: ComponentName[]): Entity[] {
    return this.all().filter((e) => names.every((n) => e.components.has(n)));
  }

  private must(id: EntityId): Entity {
    const e = this.entities.get(id);
    if (!e) throw new Error(`no such entity: ${id}`);
    return e;
  }
}
