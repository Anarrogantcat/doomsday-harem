import { useState } from "react";
import {
  PROVIDER_PRESETS, applyPreset, validateSettings, describeSettings,
  type ProviderKind, type ModelStatus,
} from "@doomsday/llm";
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

  const errors = validateSettings(llm);

  async function probe() {
    setBusy(true);
    try {
      setStatus(await testConnection());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>设置 · 本地模型</h2>
      <p className="sub">{describeSettings(llm)}</p>

      <label className="chk big">
        <input type="checkbox" checked={llm.enabled}
          onChange={(e) => setLlm({ enabled: e.target.checked })} />
        启用模型生成剧情（关闭则仅使用手写剧本）
      </label>

      <fieldset disabled={!llm.enabled}>
        <legend>后端</legend>
        <div className="controls">
          {KINDS.map((k) => (
            <button key={k} className={llm.config.kind === k ? "tab active" : "tab"}
              onClick={() => setLlm(applyPreset(llm, k))}>
              {PROVIDER_PRESETS[k].label}
            </button>
          ))}
        </div>

        <div className="fieldrow">
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

        <div className="controls">
          <button onClick={probe} disabled={busy}>{busy ? "探测中…" : "测试连接"}</button>
          {status && (
            <span className={status.available ? "ok" : "warn"}>
              {status.available
                ? `✓ 可用 · ${status.latencyMs}ms · 模型 ${status.models?.length ?? 0} 个`
                : `✗ 不可用：${status.error}`}
            </span>
          )}
        </div>
      </fieldset>

      <fieldset disabled={!llm.enabled}>
        <legend>生成参数</legend>
        <div className="fieldrow">
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
        <label className="chk">
          <input type="checkbox" checked={llm.stream}
            onChange={(e) => setLlm({ stream: e.target.checked })} />
          流式输出
        </label>
      </fieldset>

      {errors.length > 0 && (
        <div className="cheatlist">
          <h3>配置问题</h3>
          <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <p className="hint">
        模型不可用时会自动降级到手写剧本，游戏不会中断。生成结果按输入缓存，重复场景不重复推理。
      </p>
    </section>
  );
}
