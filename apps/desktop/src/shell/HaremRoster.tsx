import { useMemo, useState } from "react";
import {
  COMPANIONS, companionDef, PERSONALITY_LABEL, buildFromText,
  type HeroRuntime, type CompanionRuntime
} from "@doomsday/core";
import { useGame } from "../store/game.ts";
import { Portrait } from "./Portrait.tsx";

type SortKey = "affection" | "lust" | "bond" | "name";

/** 主角卡片（置顶，独立样式） */
function HeroCard({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  void version;
  const h = session.hero;
  const s = h.survival;

  return (
    <button className={`rcard hero-card ${selected ? "active" : ""}`} onClick={onSelect}>
      <div className="rcard-face hero-face">
        <Portrait
          name={h.identity.name}
          mode="full"
          mood={s.mood}
          lust={h.lust.value}
          pregnant={h.physiology.pregnant}
          pregnancyProgress={h.pregnancy?.progress ?? 0}
          wardrobe={h.wardrobe}
          heightCm={h.identity.heightCm}
          build={0.55}
          cup={6}
          personality="bold"
          futanari
          size={40}
        />
      </div>
      <div className="rcard-info">
        <div className="rcard-name">
          {h.identity.name}
          <span className="hero-tag">主角</span>
        </div>
        <div className="rbars">
          <div className="rbar" title={`体力 ${Math.round(s.stamina)}`}>
            <div className="rbar-fill stam" style={{ width: `${s.stamina}%` }} />
          </div>
          <div className="rbar" title={`欲情 ${Math.round(h.lust.value)}`}>
            <div className="rbar-fill lust" style={{ width: `${h.lust.value}%` }} />
          </div>
        </div>
        <div className="rcard-sub">
          {h.identity.title}
          {h.physiology.pregnant && `　孕 ${Math.floor(h.pregnancy?.progress ?? 0)}天`}
        </div>
      </div>
    </button>
  );
}

/** AI 卡片（置顶，独立样式） */
function AiCard({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  void version;
  const ai = session.companion("ai");
  if (!ai) return null;

  const affinity = Math.round(ai.relationship.affection);

  return (
    <button className={`rcard ai-card ${selected ? "active" : ""}`} onClick={onSelect}>
      <div className="rcard-face ai-face">AI</div>
      <div className="rcard-info">
        <div className="rcard-name">
          特殊AI
          <span className="ai-tag">核心</span>
        </div>
        <div className="rbars">
          <div className="rbar" title={`好感 ${affinity}`}>
            <div className="rbar-fill aff" style={{ width: `${affinity}%` }} />
          </div>
          <div className="rbar" title={`忠诚 ${Math.round(ai.relationship.loyalty)}`}>
            <div className="rbar-fill loy" style={{ width: `${ai.relationship.loyalty}%` }} />
          </div>
        </div>
        <div className="rcard-sub">基地核心 · 无实体</div>
      </div>
    </button>
  );
}

export function HaremRoster({
  selected,
  onSelect
}: {
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const [sort, setSort] = useState<SortKey>("affection");
  const [showLocked, setShowLocked] = useState(false);
  void version;

  // 排除主角与 AI（它们单独置顶）
  const joined = session.joined().filter((c) => c.id !== "ai");

  const list = useMemo(() => {
    const arr = [...joined];
    arr.sort((a, b) => {
      switch (sort) {
        case "affection": return b.relationship.affection - a.relationship.affection;
        case "lust": return b.lust.value - a.lust.value;
        case "bond": return b.relationship.bond - a.relationship.bond;
        case "name": return a.identity.name.localeCompare(b.identity.name);
      }
    });
    return arr;
  }, [joined, sort]);

  const locked = COMPANIONS.filter((c) => c.id !== "ai" && !session.companion(c.id));
  const raids = new Set(session.pendingNightRaids().map((c) => c.id));

  return (
    <aside className="roster">
      <header className="roster-head">
        <span className="roster-title">后宫</span>
        <span className="roster-count">{joined.length} / {COMPANIONS.length - 1}</span>
      </header>

      {/* 主角与 AI 置顶 */}
      <div className="roster-pinned">
        <HeroCard selected={selected === "hero"} onSelect={() => onSelect("hero")} />
        <AiCard selected={selected === "ai"} onSelect={() => onSelect("ai")} />
      </div>

      <div className="roster-sort">
        {(["affection", "lust", "bond", "name"] as SortKey[]).map((k) => (
          <button
            key={k}
            className={sort === k ? "mini active" : "mini"}
            onClick={() => setSort(k)}
          >
            {k === "affection" ? "好感" : k === "lust" ? "欲情" : k === "bond" ? "羁绊" : "名字"}
          </button>
        ))}
      </div>

      <div className="roster-list">
        {list.map((c) => {
          const def = companionDef(c.id);
          const aff = Math.round(c.relationship.affection);
          const lust = Math.round(c.lust.value);
          const raid = raids.has(c.id);
          const outfit = session.outfitOf(c.id);
          return (
            <button
              key={c.id}
              className={`rcard ${selected === c.id ? "active" : ""} ${raid ? "alert" : ""}`}
              onClick={() => onSelect(c.id)}
              title={def ? `${def.name}｜${PERSONALITY_LABEL[def.personality]}` : c.identity.name}
            >
              <div className="rcard-face">
                <Portrait
                  name={c.identity.name}
                  mode="full"
                  mood={session.hero.survival.mood}
                  lust={c.lust.value}
                  pregnant={c.physiology.pregnant}
                  pregnancyProgress={c.physiology.pregnancyProgress}
                  wardrobe={c.wardrobe}
                  heightCm={c.identity.heightCm}
                  build={def?.build ?? 0.5}
                  cup={def?.cup ?? undefined}
                  personality={def?.personality}
                  exposure={outfit?.exposure ?? 0}
                  size={40}
                />
                <span className="rcard-bond">Lv{c.relationship.bond}</span>
                {raid && <span className="rcard-alert">!</span>}
              </div>
              <div className="rcard-info">
                <div className="rcard-name">{c.identity.name}</div>
                <div className="rbars">
                  <div className="rbar" title={`好感 ${aff}`}>
                    <div className="rbar-fill aff" style={{ width: `${aff}%` }} />
                  </div>
                  <div className="rbar" title={`欲情 ${lust}`}>
                    <div className="rbar-fill lust" style={{ width: `${lust}%` }} />
                  </div>
                </div>
                <div className="rcard-sub">
                  {c.job.id ? c.job.id : "空闲"}
                  {c.physiology.pregnant && "　孕"}
                </div>
              </div>
            </button>
          );
        })}

        {locked.length > 0 && (
          <div className="roster-divider" onClick={() => setShowLocked((v) => !v)}>
            未解锁 {locked.length} 位（{showLocked ? "收起" : "展开"}）
          </div>
        )}
        {showLocked && locked.map((c) => (
          <div key={c.id} className="rcard locked" title={`${c.name}｜${c.title}`}>
            <div className="rcard-face">
              <div className="locked-face">?</div>
            </div>
            <div className="rcard-info">
              <div className="rcard-name">{c.name}</div>
              <div className="rcard-sub">{c.title}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
