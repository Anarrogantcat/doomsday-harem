/**
 * 主角 / 同伴详情面板（原型 UI 移植）。
 *
 * 对应原型 `#hero-detail` 与 `#detail` 两个弹窗，各 6 个标签：
 *
 *   主角   状态 / 属性 / 性爱统计 / 成长 / 着装 / 技能
 *   同伴   状态 / 亲密 / 性爱统计 / 成长 / 着装 / 技能
 *
 * 性爱统计区块用 core 的 sexStatsView 渲染 9 个分组，
 * 与原型 sexBlock 字段一一对应。
 */
import { useMemo, useState } from "react";
import {
  companionDef,
  PART_LABEL, DIRECTION_LABEL, ACT_TIER_LABEL,
  ATTR_KEYS, ATTR_LABEL,
  JOB_LABEL, SLOT_LABEL,
  PERSONALITY_LABEL,
  type SexStatsView,
  type CompanionRuntime
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

type Kind = "hero" | "companion";

/** 6 个标签定义 */
const TABS: Record<Kind, Array<{ id: string; label: string }>> = {
  hero: [
    { id: "status", label: "状态" },
    { id: "attrs", label: "属性" },
    { id: "sex", label: "性爱统计" },
    { id: "growth", label: "成长" },
    { id: "wear", label: "着装" },
    { id: "skill", label: "技能" }
  ],
  companion: [
    { id: "status", label: "状态" },
    { id: "acts", label: "亲密" },
    { id: "sex", label: "性爱统计" },
    { id: "growth", label: "成长" },
    { id: "wear", label: "着装" },
    { id: "skill", label: "技能" }
  ]
};

/** 单元格 */
function cell(k: string, v: string | number, dim = false) {
  return (
    <div className="proto-dcell" key={k}>
      <span className="k">{k}</span>
      <span className="v" style={dim ? { color: "var(--dim)" } : undefined}>{v}</span>
    </div>
  );
}

/** 熟练度进度条 */
function profBar(k: string, lv: number) {
  return (
    <div className="proto-kv" key={k}>
      <span className="k">{k}</span>
      <div className="proto-tr">
        <div className="proto-fl" style={{ width: Math.min(100, lv * 10) + "%", background: "var(--accent-lt)" }} />
      </div>
      <span className="v">Lv{lv}</span>
    </div>
  );
}

/** 性爱统计（与 core sexStatsView 字段一一对应） */
export function SexStatsBlock({ v, name }: { v: SexStatsView; name: string }) {
  const n = (x: number) => x || 0;
  const dim = (x: number) => n(x) === 0;

  if (n(v.total) === 0) {
    return (
      <>
        <div className="proto-sec">性爱统计</div>
        <div className="proto-dgrid">
          {cell("累计亲密", "0 次", true)}
          {cell("累计高潮", "0 次", true)}
          {cell("解锁行为", "0 / 26", true)}
          {cell("后庭准备", v.prep, !v.prepReady)}
        </div>
        <div className="proto-hint-line">{name}尚无性经验 · 完整统计将在首次亲密后解锁</div>
      </>
    );
  }

  return (
    <>
      <div className="proto-sec">总览</div>
      <div className="proto-dgrid">
        {cell("累计亲密", n(v.total) + " 次", dim(v.total))}
        {cell("累计高潮", n(v.orgasm) + " 次", dim(v.orgasm))}
        {cell("解锁行为", n(v.unlocked) + " / 26", dim(v.unlocked))}
        {cell("攻受比", n(v.topRatio) + "%", dim(v.topRatio))}
        {cell("后庭准备", v.prep, !v.prepReady)}
        {cell("平均时长", n(v.avgMinutes) ? n(v.avgMinutes) + " 分钟" : "—", dim(v.avgMinutes))}
      </div>

      <div className="proto-sec">插入 / 被插入</div>
      <div className="proto-dgrid">
        {cell("插入总次数", n(v.penetrate) + " 次", dim(v.penetrate))}
        {cell("被插入总次数", n(v.penetrated) + " 次", dim(v.penetrated))}
        {cell("插入前庭", n(v.penetrateVagina) + " 次", dim(v.penetrateVagina))}
        {cell("插入后庭", n(v.penetrateAnus) + " 次", dim(v.penetrateAnus))}
        {cell("被插入前庭", n(v.penetratedVagina) + " 次", dim(v.penetratedVagina))}
        {cell("被插入后庭", n(v.penetratedAnus) + " 次", dim(v.penetratedAnus))}
      </div>

      <div className="proto-sec">射精（自己主动）</div>
      <div className="proto-dgrid">
        {cell("射精总次数", n(v.shots) + " 次", dim(v.shots))}
        {cell("其中内射", n(v.shotInside) + " 次", dim(v.shotInside))}
        {cell("外射", n(v.shotOutside) + " 次", dim(v.shotOutside))}
        {cell("口爆", n(v.shotMouth) + " 次", dim(v.shotMouth))}
        {cell("颜射", n(v.shotFacial) + " 次", dim(v.shotFacial))}
        {cell("胸射", n(v.shotBreast) + " 次", dim(v.shotBreast))}
        {cell("内射率", n(v.shotInsideRate) + "%", dim(v.shotInsideRate))}
      </div>

      <div className="proto-sec">被射（自己接受）</div>
      <div className="proto-dgrid">
        {cell("被内射", n(v.inside) + " 次", dim(v.inside))}
        {cell("被外射", n(v.outside) + " 次", dim(v.outside))}
        {cell("被口爆", n(v.inMouth) + " 次", dim(v.inMouth))}
        {cell("被颜射", n(v.facial) + " 次", dim(v.facial))}
        {cell("被胸射", n(v.breast) + " 次", dim(v.breast))}
        {cell("被射总计", n(v.receivedTotal) + " 次", dim(v.receivedTotal))}
        {cell("被内射占比", n(v.receivedInsideRate) + "%", dim(v.receivedInsideRate))}
      </div>

      <div className="proto-sec">主动服务</div>
      <div className="proto-dgrid">
        {cell("口交（施）", n(v.giveBJ) + " 次", dim(v.giveBJ))}
        {cell("口交（受）", n(v.receiveBJ) + " 次", dim(v.receiveBJ))}
        {cell("手活（施）", n(v.giveHand) + " 次", dim(v.giveHand))}
        {cell("手活（受）", n(v.receiveHand) + " 次", dim(v.receiveHand))}
        {cell("使用道具", n(v.toys) + " 次", dim(v.toys))}
        {cell("使用润滑剂", n(v.lube) + " 次", dim(v.lube))}
      </div>

      <div className="proto-sec">后庭专项</div>
      <div className="proto-dgrid">
        {cell("准备流程完成", n(v.analPrep) + " 次", dim(v.analPrep))}
        {cell("灌肠次数", n(v.enema) + " 次", dim(v.enema))}
        {cell("后庭玩具", n(v.analToy) + " 次", dim(v.analToy))}
        {cell("双穴同时", n(v.analDouble) + " 次", dim(v.analDouble))}
        {cell("后庭总次数", n(v.analTotal) + " 次", dim(v.analTotal))}
        {cell("后庭开发度", "Lv" + n(v.analLevel), dim(v.analLevel))}
      </div>

      <div className="proto-sec">受精与生育</div>
      <div className="proto-dgrid">
        {cell("受精风险", n(v.fertilized) + " 次", dim(v.fertilized))}
        {cell("成功受孕", n(v.conceived) + " 次", dim(v.conceived))}
        {cell("事后避孕", n(v.pill) + " 次", dim(v.pill))}
        {cell("累计生产", n(v.births) + " 次", dim(v.births))}
        {cell("已育子女", String(n(v.children)), dim(v.children))}
      </div>

      <div className="proto-sec">部位熟练度</div>
      {profBar("口", Math.min(10, Math.floor((n(v.giveBJ) * 4 + n(v.receiveBJ) * 3) / 6)))}
      {profBar("前庭", Math.min(10, Math.floor((n(v.penetrateVagina) * 3 + n(v.penetratedVagina) * 3) / 6)))}
      {profBar("后庭", n(v.analLevel))}
      {profBar("手", Math.min(10, Math.floor((n(v.giveHand) * 4 + n(v.receiveHand) * 3) / 6)))}
      {profBar("道具", Math.min(10, Math.floor((n(v.toys) * 4 + n(v.lube) * 2) / 6)))}

      <div className="proto-sec">偏好</div>
      <div className="proto-dgrid">
        {cell("主要对象", v.partner || "—", v.partner === "—")}
        {cell("最常用体位", v.pose || "—", (v.pose || "—") === "—")}
        {cell("累计时长", n(v.minutes) ? n(v.minutes) + " 分钟" : "—", dim(v.minutes))}
        {cell("首次亲密", v.firstDay != null ? "第 " + v.firstDay + " 天" : "—", v.firstDay == null)}
        {cell("最近亲密", v.lastDay != null ? "第 " + v.lastDay + " 天" : "—", v.lastDay == null)}
      </div>
    </>
  );
}

/** 同伴状态页（含生理九项，R-1 新增 face） */
function CompanionStatus({ c }: { c: CompanionRuntime }) {
  const def = companionDef(c.id);
  const body = def ? {
    sex: "女",
    gender: "女性",
    orient: "女",
    height: c.identity.heightCm + "cm",
    cup: (def.cup ?? 0) > 0 ? ["A", "B", "C", "D", "E", "F", "G", "H"][def.cup!] : "—",
    build: def.build,
    face: def.face ?? "—"
  } : null;

  return (
    <>
      <div className="proto-sec">生理</div>
      <div className="proto-dgrid">
        {cell("生理性别", "女")}
        {cell("性别认同", "女性")}
        {cell("性取向", "女")}
        {cell("身高", c.identity.heightCm + "cm")}
        {cell("体型", body?.build ?? "—")}
        {cell("罩杯", body?.cup ?? "—")}
        {cell("伴侣履历", c.hadPartner ? "有过伴侣" : "无", !c.hadPartner)}
        {cell("处女", c.physiology.virgin ? "是" : "否", !c.physiology.virgin)}
      </div>
      {body?.face ? (
        <>
          <div className="proto-sec">相貌</div>
          <div className="proto-hint-line">{body.face}</div>
        </>
      ) : null}
    </>
  );
}

export function DetailPanel({ kind, id }: { kind: Kind; id?: string }) {
  const [tab, setTab] = useState("status");
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  void version;

  const tabs = TABS[kind];

  const sexView: SexStatsView | null = useMemo(() => {
    if (kind === "hero") return session.heroSexStatsView();
    const cid = id;
    return cid && cid !== "hero" ? session.companionSexStatsView(cid) : null;
  }, [session, kind, id, version]);

  const companion: CompanionRuntime | null = useMemo(() => {
    if (kind === "hero") return null;
    const cid = id;
    return cid && cid !== "hero" ? (session.companion(cid) ?? null) : null;
  }, [session, kind, id, version]);

  return (
    <div className="proto-ds-hero">
      <div className="proto-ds-head">
        <div className="proto-dname">
          {kind === "hero" ? "主角" : companion?.identity.name ?? "同伴"}
        </div>
        <div className="proto-dtitle">
          {kind === "hero" ? "扶她 · 指挥者" : companion?.identity.title ?? ""}
        </div>
      </div>
      <div className="proto-dtabs">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={"proto-dtab" + (t.id === tab ? " proto-on" : "")}
            onClick={() => setTab(t.id)}
          >{t.label}</div>
        ))}
      </div>

      <div className="proto-dbody">
        {tab === "sex" && sexView ? (
          <div className="proto-pane proto-on">
            <SexStatsBlock v={sexView} name={kind === "hero" ? "主角" : companion?.identity.name ?? "该角色"} />
          </div>
        ) : null}

        {tab === "status" ? (
          <div className="proto-pane proto-on">
            {kind === "hero" ? (
              <>
                <div className="proto-sec">生理</div>
                <div className="proto-dgrid">
                  {cell("生理性别", "扶她")}
                  {cell("性别认同", "女性")}
                  {cell("性取向", "女")}
                  {cell("身高", session.hero.identity.heightCm + "cm")}
                  {cell("处女", session.hero.physiology.virgin ? "是" : "否")}
                  {cell("怀孕", session.hero.physiology.pregnant ? "是" : "否")}
                </div>
                <div className="proto-sec">生存</div>
                <div className="proto-dgrid">
                  {cell("体力", Math.round(session.hero.survival.stamina))}
                  {cell("精力", Math.round(session.hero.survival.energy))}
                  {cell("心情", Math.round(session.hero.survival.mood))}
                  {cell("饥饿", Math.round(session.hero.survival.hunger))}
                  {cell("口渴", Math.round(session.hero.survival.thirst))}
                  {cell("欲情", Math.round(session.hero.lust.value))}
                </div>
              </>
            ) : companion ? (
              <CompanionStatus c={companion} />
            ) : (
              <div className="proto-hint-line">未选中角色</div>
            )}
          </div>
        ) : null}

        {tab === "attrs" && kind === "hero" ? (
          <div className="proto-pane proto-on">
            <div className="proto-sec">属性</div>
            <div className="proto-dgrid">
              {ATTR_KEYS.map((k) => cell(ATTR_LABEL[k], Math.round(session.hero.growth.attributes[k] ?? 0)))}
            </div>
            <div className="proto-sec">加成</div>
            <div className="proto-dgrid">
              {cell("可用点数", session.hero.growth.points ?? 0)}
              {cell("等级", session.hero.growth.level)}
            </div>
          </div>
        ) : null}

        {tab === "acts" && kind === "companion" && companion ? (
          <div className="proto-pane proto-on">
            <div className="proto-sec">可用行为</div>
            <div className="proto-dgrid">
              {session.availableSexActs(companion.id).map((a) => (
                <div className="proto-dcell" key={a.def.id}>
                  <span className="k">{a.def.name}
                    <span className="proto-dim"> · {PART_LABEL[a.def.part]}{DIRECTION_LABEL[a.def.direction]}</span>
                  </span>
                  <span className="v" style={{ color: a.usable ? "var(--ok)" : "var(--dim)" }}>
                    {a.usable ? "可用" : a.reason ?? "未解锁"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "growth" ? (
          <div className="proto-pane proto-on">
            {kind === "hero" ? (
              <>
                <div className="proto-dgrid">
                  {cell("等级", session.hero.growth.level)}
                  {cell("技能总数", Object.keys(session.hero.growth.skills ?? {}).length)}
                </div>
              </>
            ) : companion ? (
              <>
                <div className="proto-dgrid">
                  {cell("岗位", companion.job.id ? JOB_LABEL[companion.job.id] : "无")}
                  {cell("在岗天数", companion.job.daysOnJob)}
                  {cell("被动增益", companion.growth.perks.length + " 项")}
                  {cell("亲密度", "T" + companion.relationship.bond)}
                </div>
                <div className="proto-sec">熟练度</div>
                {session.companionProficiencyDetail(companion.id)?.map((x) =>
                  profBar(x.label, x.level))}
              </>
            ) : null}
          </div>
        ) : null}

        {tab === "wear" && companion ? (
          <div className="proto-pane proto-on">
            <div className="proto-sec">着装</div>
            <div className="proto-dgrid">
              {(Object.keys(SLOT_LABEL) as Array<keyof typeof SLOT_LABEL>).map((slot) => {
                const g = companion.wardrobe.equipped[slot];
                return (
                  <div className="proto-dcell" key={slot}>
                    <span className="k">{SLOT_LABEL[slot]}</span>
                    <span className="v" style={!g ? { color: "var(--dim)" } : undefined}>
                      {g ? `${g.itemId}（耐久 ${Math.round(g.durability)}）` : "未装备"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {tab === "skill" && companion ? (
          <div className="proto-pane proto-on">
            <div className="proto-sec">技能</div>
            {companion.growth.skills.length === 0
              ? <div className="proto-hint-line">尚无技能</div>
              : companion.growth.skills.map((s) => (
                <div className="proto-skl" key={s.id}>
                  <span className="proto-sn">{s.name}</span>
                  <span className="proto-sl">Lv{s.level}</span>
                  <span className="proto-sd">{s.description ?? ""}</span>
                </div>
              ))}
            <div className="proto-sec">性格</div>
            <div className="proto-hint-line">{PERSONALITY_LABEL[companion.identity.tags[1] as keyof typeof PERSONALITY_LABEL] ?? companion.identity.tags[1]}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
