import type { SaveData, SavedEntity, SavedRelation, SavedJob, SavedTech } from "./serialize.ts";

/** 一张表的写入行 */
export interface SqlRow {
  table: string;
  values: Record<string, unknown>;
}

const J = (v: unknown): string => JSON.stringify(v);

/**
 * 把 SaveData 摊平成 SQLite 行。
 * 与 docs/数据库schema.sql 一一对应，供 Tauri 侧的 rusqlite 写入。
 */
export function toRows(saveId: number, data: SaveData): SqlRow[] {
  const rows: SqlRow[] = [];

  rows.push({
    table: "save",
    values: {
      id: saveId,
      slot: String(data.flags["slot"] ?? "auto"),
      created_at: data.createdAt,
      game_day: data.time.day,
      game_minute: data.time.minute,
      cheat_badge: data.cheatBadge,
      checksum: ""
    }
  });

  rows.push({
    table: "world",
    values: {
      save_id: saveId,
      weather: String(data.flags["weather"] ?? "clear"),
      season: String(data.flags["season"] ?? "autumn"),
      flags: J(data.flags)
    }
  });

  for (const e of data.entities) {
    rows.push({
      table: "entity",
      values: {
        id: e.id,
        save_id: saveId,
        kind: e.kind,
        identity: J(e.identity),
        physiology: J(e.physiology),
        survival: J(e.survival)
      }
    });
  }

  for (const r of data.relations) {
    rows.push({
      table: "relationship",
      values: {
        save_id: saveId,
        from_id: r.fromId,
        to_id: r.toId,
        affection: r.affection,
        loyalty: r.loyalty,
        bond: r.bond,
        intimacy: r.intimacy,
        lust: r.lust,
        days_since: r.daysSinceIntimacy
      }
    });
  }

  for (const j of data.jobs) {
    rows.push({
      table: "job",
      values: {
        save_id: saveId,
        entity_id: j.entityId,
        job_id: j.jobId,
        bonus: j.bonus,
        days_on_job: j.daysOnJob
      }
    });
  }

  for (const t of data.tech) {
    rows.push({
      table: "tech",
      values: {
        save_id: saveId,
        branch: t.branch,
        node_id: t.nodeId,
        tier: t.tier,
        unlocked: t.unlocked ? 1 : 0,
        progress: t.progress
      }
    });
  }

  return rows;
}

/** 从行数据还原 SaveData（不含 checksum，由上层校验） */
export function fromRows(rows: SqlRow[], version: string, schemaVersion: number): SaveData {
  const byTable = (t: string): SqlRow[] => rows.filter((r) => r.table === t);
  const one = (t: string): Record<string, unknown> | undefined => byTable(t)[0]?.values;

  const saveRow = one("save") ?? {};
  const worldRow = one("world") ?? {};

  const entities: SavedEntity[] = byTable("entity").map((r) => {
    const v = r.values;
    return {
      id: String(v["id"]),
      kind: v["kind"] as SavedEntity["kind"],
      identity: JSON.parse(String(v["identity"])),
      physiology: JSON.parse(String(v["physiology"])),
      survival: JSON.parse(String(v["survival"]))
    };
  });

  const relations: SavedRelation[] = byTable("relationship").map((r) => {
    const v = r.values;
    return {
      fromId: String(v["from_id"]),
      toId: String(v["to_id"]),
      affection: Number(v["affection"]),
      loyalty: Number(v["loyalty"]),
      bond: Number(v["bond"]),
      intimacy: Number(v["intimacy"]),
      lust: Number(v["lust"]),
      daysSinceIntimacy: Number(v["days_since"])
    };
  });

  const jobs: SavedJob[] = byTable("job").map((r) => {
    const v = r.values;
    return {
      entityId: String(v["entity_id"]),
      jobId: v["job_id"] === null || v["job_id"] === undefined ? null : String(v["job_id"]),
      bonus: Number(v["bonus"]),
      daysOnJob: Number(v["days_on_job"])
    };
  });

  const tech: SavedTech[] = byTable("tech").map((r) => {
    const v = r.values;
    return {
      branch: String(v["branch"]),
      nodeId: String(v["node_id"]),
      tier: Number(v["tier"]),
      unlocked: Number(v["unlocked"]) === 1,
      progress: Number(v["progress"])
    };
  });

  const flags = worldRow["flags"] ? JSON.parse(String(worldRow["flags"])) : {};

  return {
    schemaVersion,
    version,
    createdAt: String(saveRow["created_at"] ?? new Date(0).toISOString()),
    time: {
      day: Number(saveRow["game_day"] ?? 1),
      minute: Number(saveRow["game_minute"] ?? 480)
    },
    entities,
    relations,
    jobs,
    tech,
    flags,
    cheatBadge: saveRow["cheat_badge"] === null || saveRow["cheat_badge"] === undefined
      ? null
      : String(saveRow["cheat_badge"])
  };
}

/** 统计各表行数，用于存档体检 */
export function rowSummary(rows: SqlRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.table] = (out[r.table] ?? 0) + 1;
  return out;
}
