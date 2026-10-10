import { useMemo, useRef, useState } from "react";
import {
  renderScene, sceneLength, tierOfScene, describeTier, shouldGenerate, MODE_LABEL,
  type DetailLevel, type Scene, type GenerationMode
} from "@doomsday/core";
import { buildSceneContext } from "@doomsday/llm";
import { useGame } from "../store/game.ts";

const LEVELS: DetailLevel[] = ["brief", "standard", "detailed", "exhaustive"];
const LABEL: Record<DetailLevel, string> = {
  brief: "简洁", standard: "标准", detailed: "详细（默认）", exhaustive: "极详"
};
const MODES: GenerationMode[] = ["off", "minor", "all"];

export function ScenePlayer() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const llm = useGame((s) => s.llm);
  const narrator = useGame((s) => s.narrator);
  const pipeline = useGame((s) => s.pipeline);
  const generationMode = useGame((s) => s.generationMode);
  const setGenerationMode = useGame((s) => s.setGenerationMode);
  void version;

  const [detail, setDetail] = useState<DetailLevel>("detailed");
  const [showTags, setShowTags] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [genText, setGenText] = useState("");
  const [source, setSource] = useState("");
  const [tierNote, setTierNote] = useState("");
  const abortRef = useRef(false);

  const available = useMemo(() => session.availableScenes(), [session, version]);

  const scene: Scene | null = useMemo(() => {
    if (selected) return available.find((x) => x.id === selected) ?? null;
    return available[0] ?? null;
  }, [available, selected]);

  const text = useMemo(
    () => (scene ? renderScene(scene, { detail, showLayerTags: showTags }) : ""),
    [scene, detail, showTags]
  );
  const len = useMemo(
    () => (scene ? sceneLength(scene, { detail, showLayerTags: showTags }) : 0),
    [scene, detail, showTags]
  );

  // 该场景在当前设置下是否会走生成
  const willGenerate = scene ? shouldGenerate(scene.id, generationMode) && !!narrator : false;
  const tier = scene ? tierOfScene(scene.id) : "ambient";

  async function generate() {
    if (!scene) return;
    if (!narrator) {
      setError("模型未启用，请先到「模型」标签页开启并测试连接");
      return;
    }
    setBusy(true);
    setError("");
    setGenText("");
    setSource("");
    setTierNote("");
    abortRef.current = false;

    const partnerName = scene.participants.find((p) => p !== "主角") ?? "";
    const partner = session.findCompanion(partnerName);

    // 用上下文构建器自动组装（含性格、着装、关系、姿势）
    const ctx = buildSceneContext(session, {
      scene,
      dominant: partner?.id,
      props: (() => {
        const p = ["双头龙", "娱乐型扶她药"];
        if (partner) {
          const o = session.outfitOf(partner.id);
          if (o) p.push(`着装：${o.describe}（暴露度 ${o.exposure}）`);
        }
        return p;
      })(),
      beatCount: 3
    });

    try {
      const result = await pipeline.getSceneStream(
        scene.id,
        scene,
        ctx,
        (delta) => {
          if (!abortRef.current) setGenText((t) => t + delta);
        }
      );
      setSource(result.source);
      setTierNote(result.tierNote);
      if (result.error) setError(result.error);
      if (result.skippedReason === "critical") {
        setError("这是关键剧情，按设计不允许模型生成（保证质量与一致性）");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const rep = useMemo(() => {
    try {
      return pipeline.planReport(session.registry.all().map((s) => s.id));
    } catch {
      return null;
    }
  }, [pipeline, session, version]);

  return (
    <section className="panel">
      <h2>
        场景播放器　<span className="sub">
          当前可触发 {available.length} 个场景
        </span>
      </h2>

      <h3>剧情生成模式</h3>
      <div className="controls">
        {MODES.map((m) => (
          <button
            key={m}
            className={generationMode === m ? "tab active" : "tab"}
            onClick={() => setGenerationMode(m)}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>
      <p className="sub">
        关键剧情（破处/怀孕/分娩/主线节点）永远使用手写剧本，模型不参与。
        {rep && `　当前剧本：关键 ${rep.byTier.critical}　重要 ${rep.byTier.major}　日常 ${rep.byTier.minor}　氛围 ${rep.byTier.ambient}`}
        {rep && `　将生成 ${rep.willGenerate.length} 个`}
      </p>

      {available.length === 0 ? (
        <p className="sub">（当前条件下没有可触发的场景。推进时间、提升好感或设置主线标志。）</p>
      ) : (
        <>
          <h3>选择场景</h3>
          <div className="controls">
            <select value={scene?.id ?? ""} onChange={(e) => setSelected(e.target.value)}>
              {available.map((x) => (
                <option key={x.id} value={x.id}>
                  [{tierOfScene(x.id)}] {x.title}（{x.participants.join(" × ")}）
                </option>
              ))}
            </select>
            {scene && (
              <span className={willGenerate ? "ok" : "sub"}>
                {describeTier(scene.id)}
              </span>
            )}
          </div>

          <div className="controls">
            {LEVELS.map((l) => (
              <button key={l} className={detail === l ? "tab active" : "tab"} onClick={() => setDetail(l)}>
                {LABEL[l]}
              </button>
            ))}
            <label className="chk">
              <input type="checkbox" checked={showTags} onChange={(e) => setShowTags(e.target.checked)} />
              显示层次标签
            </label>
            <span className="sub">{scene?.beats.length ?? 0} 节拍 · {len} 字</span>
          </div>

          <pre className="scenetext">{text}</pre>

          <div className="controls" style={{ marginTop: 12 }}>
            <button onClick={generate} disabled={busy || !llm.enabled || tier === "critical"}>
              {busy ? "生成中…" : tier === "critical" ? "关键剧情不可生成" : "用本地模型生成这一场"}
            </button>
            {busy && <button onClick={() => { abortRef.current = true; }}>停止</button>}
            {source && <span className={source === "model" ? "ok" : "sub"}>来源：{source}</span>}
            {tierNote && <span className="sub">{tierNote}</span>}
            {!llm.enabled && <span className="sub">模型未启用（到「模型」标签页开启）</span>}
          </div>

          {error && <p className="warn">⚠ {error}</p>}

          {genText && (
            <pre className="scenetext" style={{ marginTop: 12, borderColor: "var(--accent)" }}>{genText}</pre>
          )}
        </>
      )}

      <p className="hint">
        分级规则：关键剧情手写锁定；重要剧情在「除关键外全部」模式下可生成；
        日常与氛围默认生成。模型失败自动回退手写剧本，游戏不会中断。
        生成结果按场景缓存，同一场景不重复推理。
      </p>
    </section>
  );
}
