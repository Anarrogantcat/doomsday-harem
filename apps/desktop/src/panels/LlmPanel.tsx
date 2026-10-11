import { useState } from "react";
import {
  PROVIDER_PRESETS, applyPreset, validateSettings, describeSettings,
  type ProviderKind, type ModelStatus,
} from "@doomsday/llm";
import { MODE_LABEL, type GenerationMode } from "@doomsday/core";
import { useGame } from "../store/game.ts";

const KINDS: ProviderKind[] = [
  "ollama", "lmstudio", "vllm", "llamacpp", "openai-compat", "custom", "offline"
];

export function LlmPanel() {
  const llm = useGame((s) => s.llm);
  const setLlm = useGame((s) => s.setLlm);
  const testConnection = useGame((s) => s.testLlm);
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const generationMode = useGame((s) => s.generationMode);
  const setGenerationMode = useGame((s) => s.setGenerationMode);
  const planReport = useGame((s) => s.planReport);

  const errors = validateSettings(llm);
  const MODES: GenerationMode[] = ["off", "minor", "all"];

  async function probe() {
    setBusy(true);
    try {
      setStatus(await testConnection());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="proto-panel">
      <h2>设置 · 本地模型</h2>
      <p className="proto-sub">{describeSettings(llm)}</p>

      <label className="proto-chk proto-big">
        <input type="checkbox" checked={llm.enabled}
          onChange={(e) => setLlm({ enabled: e.target.checked })} />
        启用模型生成剧情（关闭则仅使用手写剧本）
      </label>

      <fieldset disabled={!llm.enabled}>
        <legend>后端</legend>
        <div className="proto-controls">
          {KINDS.map((k) => (
            <button key={k} className={llm.config.kind === k ? "proto-tab proto-active" : "proto-tab"}
              onClick={() => setLlm(applyPreset(llm, k))}>
              {PROVIDER_PRESETS[k].label}
            </button>
          ))}
        </div>

        <div className="proto-fieldrow">
          <label>端点
            <input type="text" value={llm.config.baseUrl} placeholder="http://127.0.0.1:11434"
              onChange={(e) => setLlm({ config: { ...llm.config, baseUrl: e.target.value } })} />
          </label>
          <label>模型
            <input type="text" value={llm.config.model} list="model-presets" placeholder="qwen2.5:14b"
              onChange={(e) => setLlm({ config: { ...llm.config, model: e.target.value } })} />
            <datalist id="model-presets">
              {PROVIDER_PRESETS[llm.config.kind].models.map((m) => <option key={m} value={m} />)}
            </datalist>
          </label>
          <label>超时 (ms)
            <input type="number" value={llm.config.timeoutMs ?? 120000}
              onChange={(e) => setLlm({ config: { ...llm.config, timeoutMs: Number(e.target.value) } })} />
          </label>
        </div>

        <div className="proto-controls">
          <button onClick={probe} disabled={busy}>{busy ? "探测中…" : "测试连接"}</button>
          {status && (
            <span className={status.available ? "proto-ok" : "proto-warn"}>
              {status.available
                ? `✓ 可用 · ${status.latencyMs}ms · 模型 ${status.models?.length ?? 0} 个`
                : `✗ 不可用：${status.error}`}
            </span>
          )}
        </div>
      </fieldset>

      <fieldset disabled={!llm.enabled}>
        <legend>生成参数</legend>
        <div className="proto-fieldrow">
          <label>temperature
            <input type="number" step="0.05" min="0" max="2" value={llm.generation.temperature ?? 0.85}
              onChange={(e) => setLlm({ generation: { ...llm.generation, temperature: Number(e.target.value) } })} />
          </label>
          <label>top_p
            <input type="number" step="0.01" min="0" max="1" value={llm.generation.topP ?? 0.92}
              onChange={(e) => setLlm({ generation: { ...llm.generation, topP: Number(e.target.value) } })} />
          </label>
          <label>max_tokens
            <input type="number" step="64" min="64" value={llm.generation.maxTokens ?? 1200}
              onChange={(e) => setLlm({ generation: { ...llm.generation, maxTokens: Number(e.target.value) } })} />
          </label>
        </div>
        <label className="proto-chk">
          <input type="checkbox" checked={llm.stream}
            onChange={(e) => setLlm({ stream: e.target.checked })} />
          流式输出
        </label>
      </fieldset>

      {errors.length > 0 && (
        <div className="proto-cheatlist">
          <h3>配置问题</h3>
          <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <h3>剧情生成范围</h3>
      <div className="proto-controls">
        {MODES.map((m) => (
          <button
            key={m}
            className={generationMode === m ? "proto-tab proto-active" : "proto-tab"}
            onClick={() => setGenerationMode(m)}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>
      {(() => {
        try {
          const rep = planReport();
          return (
            <p className="proto-sub">
              剧本分级：关键 {rep.byTier.critical}　重要 {rep.byTier.major}　
              日常 {rep.byTier.minor}　氛围 {rep.byTier.ambient}
              　·　将生成 {rep.willGenerate.length} 个 / 手写 {rep.scriptedOnly.length} 个
            </p>
          );
        } catch {
          return null;
        }
      })()}

      <p className="proto-hint">
        关键剧情（破处、怀孕、分娩、主线节点）永远使用手写剧本，模型不参与，
        以保证质量与一致性。日常与氛围场景可交给本地模型生成。
        模型不可用时自动降级到手写剧本，游戏不会中断。
        生成结果按输入缓存，重复场景不重复推理。
      </p>
    </section>
  );
}