/**
 * 性爱统计区块（原型 UI）。
 *
 * 字段与 core 的 sexStatsView 一一对应，主角 / 后宫 / 后期同伴 / 女性敌人通用。
 * 从 DetailTabs 抽出，供详情弹窗与侧栏共用。
 */
import type { SexStatsView } from "@doomsday/core";

/** 单元格 */
function cell(k: string, v: string | number, dim = false) {
  return (
    <div className="dcell" key={k}>
      <span className="k">{k}</span>
      <span className="v" style={dim ? { color: "var(--dim)" } : undefined}>{v}</span>
    </div>
  );
}

/** 熟练度进度条 */
function profBar(k: string, lv: number) {
  return (
    <div className="kv" key={k}>
      <span className="k">{k}</span>
      <div className="tr">
        <div className="fl" style={{ width: Math.min(100, lv * 10) + "%", background: "var(--accent-lt)" }} />
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


