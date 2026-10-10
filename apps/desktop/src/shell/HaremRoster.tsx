import { useMemo, useState } from "react";
import { COMPANIONS, companionDef, PERSONALITY_LABEL } from "@doomsday/core";
import { useGame } from "../store/game.ts";
import { Portrait } from "./Portrait.tsx";

type SortKey = "affection" | "lust" | "bond" | "name";

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
  const [showLocked, setShowLocked] = useState(true);
  void version;

  const joined = session.joined();

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

  // 未解锁（21 位基础后宫里的其余部分）
  const locked = COMPANIONS.filter((c) => !session.companion(c.id));

  const raids = new Set(session.pendingNightRaids().map((c) => c.id));

  return (
    <aside className="roster">
      <header className="roster-head">
        <span className="roster-title">后宫</span>
        <span className="roster-count">{joined.length} / {COMPANIONS.length}</span>
      </header>

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
                {c.id === "ai" ? (
                  <div className="ai-face">AI</div>
                ) : (
                  <Portrait
                    name={c.identity.name}
                    mood={session.hero.survival.mood}
                    pregnant={c.physiology.pregnant}
                    exposure={outfit?.exposure ?? 0}
                    size={44}
                  />
                )}
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

        {showLocked && locked.length > 0 && (
          <>
            <div className="roster-divider" onClick={() => setShowLocked(false)}>
              未解锁 {locked.length} 位（点击收起）
            </div>
            {locked.map((c) => (
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
          </>
        )}
        {!showLocked && locked.length > 0 && (
          <div className="roster-divider" onClick={() => setShowLocked(true)}>
            未解锁 {locked.length} 位（点击展开）
          </div>
        )}
      </div>
    </aside>
  );
}