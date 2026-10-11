import { useCallback, useEffect, useState } from "react";
import {
  BUILTIN_PLUGINS, PLUGIN_KIND_LABEL, PLUGIN_KIND_ICON,
  PLUGIN_STATUS_LABEL, PLUGIN_STATUS_COLOR,
  pluginsOfKind, mergedParams, defaultPluginConfig,
  pluginStats,
  type PluginManifest, type PluginKind, type PluginStatus
} from "@doomsday/core";
import { probePlugin, cacheClear, cacheSize, listComfyModels } from "../plugins/runtime.ts";
import { useGame } from "../store/game.ts";

/** 插件卡片 */
function PluginCard({
  plugin, status, onProbe, onToggle, onActivate, isActive, isEnabled
}: {
  plugin: PluginManifest;
  status: PluginStatus;
  onProbe: () => void;
  onToggle: (on: boolean) => void;
  onActivate: () => void;
  isActive: boolean;
  isEnabled: boolean;
}) {
  const cfg = useGame((s) => s.pluginConfig);
  const setParam = useGame((s) => s.setPluginParam);
  const [expanded, setExpanded] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [probing, setProbing] = useState(false);

  const params = mergedParams(plugin, cfg);

  async function loadModels() {
    if (plugin.id !== "comfyui") return;
    const list = await listComfyModels(plugin.endpoint);
    setModels(list);
  }

  return (
    <div className={`proto-plugin-card ${isEnabled ? "proto-on" : "proto-off"} ${isActive ? "proto-active" : ""}`}>
      <div className="proto-plugin-head">
        <span className="proto-plugin-icon">{PLUGIN_KIND_ICON[plugin.kind]}</span>
        <span className="proto-plugin-name">{plugin.name}</span>
        <span
          className="proto-plugin-status"
          style={{ color: PLUGIN_STATUS_COLOR[status] }}
          title={PLUGIN_STATUS_LABEL[status]}
        >
          ● {PLUGIN_STATUS_LABEL[status]}
        </span>
      </div>

      <div className="proto-plugin-desc">{plugin.description}</div>

      <div className="proto-plugin-meta">
        <span className="proto-plugin-chip">{PLUGIN_KIND_LABEL[plugin.kind]}</span>
        <span className="proto-plugin-chip">{plugin.provider}</span>
        <span className="proto-plugin-chip">v{plugin.version}</span>
      </div>

      <div className="proto-plugin-caps">
        {plugin.capabilities.map((c) => (
          <span key={c} className="proto-cap-chip">{c}</span>
        ))}
      </div>

      <div className="proto-controls">
        <label className="proto-chk">
          <input type="checkbox" checked={isEnabled}
            onChange={(e) => onToggle(e.target.checked)} />
          启用
        </label>
        <button className="proto-mini" onClick={async () => {
          setProbing(true);
          onProbe();
          await loadModels();
          setProbing(false);
        }} disabled={probing}>
          {probing ? "探测中…" : "探测"}
        </button>
        {isEnabled && !isActive && (
          <button className="proto-mini" onClick={onActivate}>设为当前</button>
        )}
        {isActive && <span className="proto-plugin-active-badge">当前使用</span>}
        <button className="proto-mini" onClick={() => setExpanded(!expanded)}>
          {expanded ? "收起参数" : "参数"}
        </button>
      </div>

      {expanded && (
        <div className="proto-plugin-params">
          <div className="param-row">
            <span className="param-key">服务地址</span>
            <input
              className="param-input"
              value={plugin.endpoint}
              readOnly
              title="地址固定，如需修改请在插件文件中调整"
            />
          </div>

          {Object.entries(params).map(([k, v]) => (
            <div key={k} className="param-row">
              <span className="param-key">{k}</span>
              {k === "model" && models.length > 0 ? (
                <select
                  className="param-input"
                  value={String(v)}
                  onChange={(e) => setParam(plugin.id, k, e.target.value)}
                >
                  {models.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input
                  className="param-input"
                  value={String(v ?? "")}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const num = Number(raw);
                    setParam(plugin.id, k, raw !== "" && !Number.isNaN(num) ? num : raw);
                  }}
                />
              )}
            </div>
          ))}

          {plugin.id === "comfyui" && models.length === 0 && (
            <p className="proto-hint">点「探测」可加载可用模型列表</p>
          )}
        </div>
      )}
    </div>
  );
}

/** 文生图区 */
function ImageSection() {
  const cfg = useGame((s) => s.pluginConfig);
  const setPluginConfig = useGame((s) => s.setPluginConfig);
  const probe = useGame((s) => s.probePlugins);
  const statuses = useGame((s) => s.pluginStatus);
  const [cache, setCache] = useState(cacheSize());

  const list = pluginsOfKind("image");

  return (
    <div className="proto-plugin-section">
      <h3>
        <span className="proto-section-icon">▣</span> 文生图插件
        <span className="proto-sub">（立绘 / 场景图）</span>
      </h3>

      <label className="proto-chk proto-big">
        <input type="checkbox" checked={cfg.imageEnabled}
          onChange={(e) => setPluginConfig({ imageEnabled: e.target.checked })} />
        启用文生图立绘
      </label>
      <p className="proto-hint">
        关闭时使用程序化立绘（会根据身高/体型/怀孕/着装变化，但不如生成图精美）。
        开启后会调用下方插件生成，首次生成较慢，之后走缓存。
      </p>

      <div className="proto-plugin-grid">
        {list.map((p) => (
          <PluginCard
            key={p.id}
            plugin={p}
            status={statuses[p.id] ?? "unknown"}
            isEnabled={cfg.enabled[p.id] === true}
            isActive={cfg.activeImagePlugin === p.id}
            onProbe={() => probe(p.id)}
            onToggle={(on) => setPluginConfig({
              enabled: { ...cfg.enabled, [p.id]: on }
            })}
            onActivate={() => setPluginConfig({ activeImagePlugin: p.id })}
          />
        ))}
      </div>

      <div className="proto-controls">
        <span className="proto-sub">
          缓存：内存 {cache.memory} 项　持久 {cache.persisted} 项
        </span>
        <button className="proto-mini" onClick={() => {
          cacheClear();
          setCache(cacheSize());
        }}>清空缓存</button>
      </div>
    </div>
  );
}

/** 语音区 */
function TtsSection() {
  const cfg = useGame((s) => s.pluginConfig);
  const setPluginConfig = useGame((s) => s.setPluginConfig);
  const probe = useGame((s) => s.probePlugins);
  const statuses = useGame((s) => s.pluginStatus);

  const list = pluginsOfKind("tts");

  return (
    <div className="proto-plugin-section">
      <h3>
        <span className="proto-section-icon">♪</span> 语音合成插件
        <span className="proto-sub">（角色语音）</span>
      </h3>

      <label className="proto-chk proto-big">
        <input type="checkbox" checked={cfg.ttsEnabled}
          onChange={(e) => setPluginConfig({ ttsEnabled: e.target.checked })} />
        启用角色语音
      </label>

      <div className="proto-controls">
        <label className="proto-chk">
          <input type="checkbox" checked={cfg.autoSpeak}
            onChange={(e) => setPluginConfig({ autoSpeak: e.target.checked })} />
          自动朗读台词
        </label>
        <span className="proto-sub">音量</span>
        <input
          type="range" min="0" max="1" step="0.05"
          value={cfg.ttsVolume}
          onChange={(e) => setPluginConfig({ ttsVolume: Number(e.target.value) })}
        />
        <span className="proto-sub">{(cfg.ttsVolume * 100).toFixed(0)}%</span>
      </div>

      <div className="proto-plugin-grid">
        {list.map((p) => (
          <PluginCard
            key={p.id}
            plugin={p}
            status={statuses[p.id] ?? "unknown"}
            isEnabled={cfg.enabled[p.id] === true}
            isActive={cfg.activeTtsPlugin === p.id}
            onProbe={() => probe(p.id)}
            onToggle={(on) => setPluginConfig({
              enabled: { ...cfg.enabled, [p.id]: on }
            })}
            onActivate={() => setPluginConfig({ activeTtsPlugin: p.id })}
          />
        ))}
      </div>

      <p className="proto-hint">
        GPT-SoVITS / IndexTTS 需先启动对应服务。
        Edge TTS 与系统语音零依赖（用浏览器内置），但音色通用、无法克隆。
      </p>
    </div>
  );
}

export function PluginPanel() {
  const probeAll = useGame((s) => s.probePlugins);
  const statuses = useGame((s) => s.pluginStatus);
  const stats = pluginStats();

  const probe = useCallback(() => { void probeAll(); }, [probeAll]);

  useEffect(() => { void probeAll(); }, [probeAll]);

  const online = Object.values(statuses).filter((x) => x === "online").length;

  return (
    <div className="proto-plugin-root">
      <div className="proto-plugin-topbar">
        <span className="proto-sub">
          共 {stats.total} 个插件　在线 {online}
        </span>
        <button className="proto-mini" onClick={probe}>全部探测</button>
        <button className="proto-mini" onClick={() => {
          // 重置为默认
          const cfg = defaultPluginConfig();
          useGame.getState().setPluginConfig(cfg);
        }}>恢复默认</button>
      </div>

      <ImageSection />
      <TtsSection />

      <div className="proto-plugin-section">
        <h3>说明</h3>
        <p className="proto-hint">
          插件通过本地 HTTP 服务调用，不需要安装额外依赖。
          <br />
          · <b>ComfyUI</b>：启动后监听 8188，用 <code>anything-v5</code> 等动漫模型出图
          <br />
          · <b>GPT-SoVITS</b>：启动 API 服务（默认 9880），可做音色克隆
          <br />
          · <b>IndexTTS</b>：启动 webui（默认 7860），零样本合成
          <br />
          · <b>Edge TTS / 系统语音</b>：无需服务，直接用系统能力
          <br />
          任何插件失败都会静默降级，不影响游戏进行。
        </p>
      </div>
    </div>
  );
}
