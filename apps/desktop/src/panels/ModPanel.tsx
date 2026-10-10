import { useCallback, useEffect, useState } from "react";
import {
  getDataLayout, listMods, setModEnabled, listModFiles, openModsDir,
  capabilities,
  type DataLayout, type ModEntry, type ModFile
} from "../save/bridge.ts";
import { useGame } from "../store/game.ts";

/** 数据目录信息 */
function DataDirSection() {
  const [layout, setLayout] = useState<DataLayout | null>(null);
  const [msg, setMsg] = useState("");
  const caps = capabilities();

  useEffect(() => {
    void getDataLayout().then(setLayout);
  }, []);

  if (!caps.dataDir) {
    return (
      <div className="mod-note">
        当前为浏览器预览环境，数据目录不可用。
        桌面版会把存档与 Mod 放在游戏安装目录的 data/ 下。
      </div>
    );
  }

  return (
    <div className="mod-section">
      <h3>数据目录</h3>
      {layout && (
        <>
          <div className="dir-badge">
            {layout.portable
              ? "便携模式（数据与游戏在一起）"
              : "回退模式（安装目录不可写）"}
          </div>
          <table className="grid">
            <tbody>
              <tr><td className="sub">根目录</td><td className="mono">{layout.root}</td></tr>
              <tr><td className="sub">存档</td><td className="mono">{layout.saves}</td></tr>
              <tr><td className="sub">配置</td><td className="mono">{layout.config}</td></tr>
              <tr><td className="sub">Mod</td><td className="mono">{layout.mods}</td></tr>
              <tr><td className="sub">日志</td><td className="mono">{layout.logs}</td></tr>
            </tbody>
          </table>
          <div className="controls">
            <button onClick={() => {
              void openModsDir().then((p) => setMsg(p ? `Mod 目录：${p}` : "无法打开"));
            }}>
              打开 Mod 目录
            </button>
          </div>
        </>
      )}
      {msg && <p className="ok">{msg}</p>}
      <p className="hint">
        安装时若选择了自定义位置，游戏会安装在你指定的根目录文件夹内，
        并在其下自动创建 data/（存档、配置、Mod、日志）。
        卸载时会询问是否保留 data/。
      </p>
    </div>
  );
}

/** Mod 列表 */
function ModList() {
  const [mods, setMods] = useState<ModEntry[]>([]);
  const [files, setFiles] = useState<Record<string, ModFile[]>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const pushLog = useGame((s) => s.pushLog);
  const caps = capabilities();

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const list = await listMods();
      setMods(list);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggle(m: ModEntry) {
    const ok = await setModEnabled(m.id, !m.enabled);
    if (ok) {
      pushLog(`Mod ${m.id} ${m.enabled ? "已停用" : "已启用"}`);
      await refresh();
    } else {
      setMsg("操作失败");
    }
  }

  async function showFiles(m: ModEntry) {
    if (files[m.id]) {
      setFiles((f) => {
        const next = { ...f };
        delete next[m.id];
        return next;
      });
      return;
    }
    const list = await listModFiles(m.id);
    setFiles((f) => ({ ...f, [m.id]: list }));
  }

  if (!caps.mods) {
    return (
      <div className="mod-note">
        浏览器预览环境不支持 Mod 加载。桌面版可从游戏安装目录的 data/mods/ 读取。
      </div>
    );
  }

  const enabled = mods.filter((m) => m.enabled).length;

  return (
    <div className="mod-section">
      <h3>
        Mod（{mods.length} 个，已启用 {enabled}）
        {busy && <span className="sub">　扫描中…</span>}
      </h3>

      <div className="controls">
        <button onClick={refresh} disabled={busy}>重新扫描</button>
        <button onClick={() => { void openModsDir(); }}>打开目录</button>
      </div>

      {mods.length === 0 && (
        <div className="mod-note">
          尚未安装任何 Mod。把 Mod 目录放到 data/mods/ 下即可被识别。
          <br />
          结构：<code>mods/你的Mod名/mod.json</code> +
          <code>scripts/*.dsl</code> + <code>data/*.json</code> + <code>assets/</code>
        </div>
      )}

      {mods.map((m) => {
        const name = (m.manifest?.name as string) ?? m.id;
        const version = (m.manifest?.version as string) ?? "—";
        const author = (m.manifest?.author as string) ?? "—";
        const desc = (m.manifest?.description as string) ?? "";
        const fileList = files[m.id];

        return (
          <div key={m.id} className={`mod-card ${m.enabled ? "on" : "off"}`}>
            <div className="mod-head">
              <label className="chk">
                <input type="checkbox" checked={m.enabled} onChange={() => { void toggle(m); }} />
                <span className="mod-name">{name}</span>
              </label>
              <span className="mod-ver">v{version}</span>
              <span className="mod-author sub">{author}</span>
            </div>

            {desc && <div className="mod-desc">{desc}</div>}

            <div className="mod-contents">
              <span className="mod-chip">剧本 {m.contents.scripts}</span>
              <span className="mod-chip">数据 {m.contents.data}</span>
              <span className="mod-chip">素材 {m.contents.assets}</span>
            </div>

            {m.error && <div className="mod-error">⚠ {m.error}</div>}

            <div className="controls">
              <button className="mini" onClick={() => { void showFiles(m); }}>
                {fileList ? "收起文件" : "查看文件"}
              </button>
              <span className="sub mono">{m.path}</span>
            </div>

            {fileList && (
              <div className="mod-files">
                {fileList.map((f) => (
                  <div key={f.path} className="mod-file">
                    <span className="mono">{f.path}</span>
                    <span className="sub">{Math.round(f.size / 1024 * 10) / 10} KB</span>
                  </div>
                ))}
                {fileList.length === 0 && <p className="sub">（空目录）</p>}
              </div>
            )}
          </div>
        );
      })}

      {msg && <p className="warn">{msg}</p>}

      <p className="hint">
        Mod 可提供剧本（.dsl）、数据覆盖（.json）与素材。
        停用 Mod 会在其目录写入 .disabled 标记，不删除文件。
      </p>
    </div>
  );
}

export function ModPanel() {
  return (
    <div className="mod-root">
      <DataDirSection />
      <ModList />
    </div>
  );
}
