import {
  COMPANIONS, PERSONALITY_LABEL, PERSONALITY_TRAITS, companionStats,
  describeCompanion, bestJobFor, JOB_LABEL, type CompanionPersonality
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

export function CompanionDataPanel() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  void version;

  const stats = companionStats();

  return (
    <div className="grid2">
      <section className="panel">
        <h2>
          角色数据　<span className="sub">共 {stats.total} 位</span>
        </h2>

        <table className="grid">
          <tbody>
            <tr><td className="sub">家庭（末日前已在）</td><td>{stats.byOrigin.family}</td></tr>
            <tr><td className="sub">主线解锁</td><td>{stats.byOrigin.mainline}</td></tr>
            <tr><td className="sub">附带后宫</td><td>{stats.byOrigin.side}</td></tr>
            <tr><td className="sub">特殊 AI</td><td>{stats.byOrigin.ai}</td></tr>
            <tr><td className="sub">开局在队</td><td>{stats.starting}</td></tr>
          </tbody>
        </table>

        <h3>性格分布</h3>
        <table className="grid">
          <tbody>
            {(Object.keys(PERSONALITY_LABEL) as CompanionPersonality[]).map((p) => {
              const n = stats.byPersonality[p] ?? 0;
              if (n === 0) return null;
              const t = PERSONALITY_TRAITS[p];
              return (
                <tr key={p}>
                  <td>{PERSONALITY_LABEL[p]}</td>
                  <td className="sub">{n} 人</td>
                  <td className="sub">欲情 ×{t.lustGrowth.toFixed(1)}</td>
                  <td className="sub">邀约 {t.inviteThreshold}</td>
                  <td className="sub">夜袭 {t.raidThreshold}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h3>角色清单</h3>
        <table className="grid">
          <thead>
            <tr><th>角色</th><th>年龄</th><th>身高</th><th>性格</th><th>最佳岗位</th><th>状态</th></tr>
          </thead>
          <tbody>
            {COMPANIONS.map((c) => {
              const inTeam = session.companion(c.id);
              const t = PERSONALITY_TRAITS[c.personality];
              return (
                <tr key={c.id} className={inTeam ? "row-ok" : undefined}>
                  <td>{c.name}<span className="sub"> {c.title}</span></td>
                  <td>{c.age}</td>
                  <td>{c.heightCm}</td>
                  <td className="sub">{PERSONALITY_LABEL[c.personality]}</td>
                  <td className="sub">{bestJobFor(c.id) ? JOB_LABEL[bestJobFor(c.id)!] : "—"}</td>
                  <td className={inTeam ? "ok" : "sub"}>{inTeam ? "已加入" : "未加入"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>角色详情</h2>
        <div style={{ maxHeight: 700, overflow: "auto" }}>
          {COMPANIONS.map((c) => {
            const t = PERSONALITY_TRAITS[c.personality];
            const inTeam = session.companion(c.id);
            return (
              <div key={c.id} className="jobcard" style={{ marginBottom: 8 }}>
                <h3>
                  {c.name} <span className="sub">— {c.title}</span>
                  {inTeam && <span className="ok"> ✓在队</span>}
                </h3>
                <p className="sub">{c.age} 岁 / {c.heightCm}cm / {c.build}</p>
                <p className="sub">性格：{PERSONALITY_LABEL[c.personality]}（{t.tone}）</p>
                <p className="sub">
                  岗位：{c.specialties.map((s) => `${JOB_LABEL[s.job]} +${Math.round(s.bonus * 100)}%`).join("　")}
                </p>
                <p className="sub">
                  初始：好感 {c.initial.affection}　忠诚 {c.initial.loyalty}　羁绊 Lv{c.initial.bond}　欲情 {c.initialLust}
                </p>
                <p className="sub" style={{ fontStyle: "italic" }}>主动时：「{t.approach}」</p>
                <p className="sub" style={{ fontStyle: "italic" }}>夜袭时：「{t.raidLine}」</p>
                {c.note && <p className="warn">{c.note}</p>}
                {c.questId && <p className="sub">关联主线：{c.questId}</p>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
