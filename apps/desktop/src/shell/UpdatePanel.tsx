/**
 * 自动更新面板（照 sillytavern-shell 移植）。
 *
 * 流程：检查 → 有新版本 → 下载（显示进度）→ 完成 → 重启安装
 * 全程由用户确认，不后台静默下载。
 */
import { useCallback, useEffect, useState } from "react";

/** 从 window.dh 取更新 API（Electron 环境才有） */
function getApi() {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { dh?: { update?: Record<string, unknown> } };
  return (w.dh && w.dh.update) ? w.dh.update as {
    version: () => Promise<string>;
    check: () => Promise<{ hasUpdate?: boolean; version?: string; current?: string; error?: string }>;
    download: () => Promise<{ success?: boolean; error?: string }>;
    install: () => Promise<{ success?: boolean }>;
    onProgress: (cb: (p: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void) => () => void;
    onDownloaded: (cb: () => void) => () => void;
    onError: (cb: (m: string) => void) => () => void;
  } : null;
}

type Phase = "idle" | "checking" | "found" | "downloading" | "ready" | "error";

export function UpdatePanel() {
  const api = getApi();
  const [current, setCurrent] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [latest, setLatest] = useState("");
  const [percent, setPercent] = useState(0);
  const [msg, setMsg] = useState("");

  // 读当前版本 + 订阅事件
  useEffect(() => {
    if (!api) return;
    void api.version().then(setCurrent).catch(() => { /* 忽略 */ });

    const offP = api.onProgress((p) => {
      setPhase("downloading");
      setPercent(Math.round(p.percent || 0));
    });
    const offD = api.onDownloaded(() => {
      setPhase("ready");
      setMsg("下载完成，点「重启并安装」即可更新。");
    });
    const offE = api.onError((m) => {
      setPhase("error");
      setMsg(m);
    });
    return () => { offP(); offD(); offE(); };
  }, [api]);

  const doCheck = useCallback(async () => {
    if (!api) return;
    setPhase("checking");
    setMsg("");
    const r = await api.check();
    if (r.error) { setPhase("error"); setMsg(r.error); return; }
    if (r.hasUpdate) {
      setLatest(r.version ?? "");
      setPhase("found");
      setMsg(`发现新版本 ${r.version}（当前 ${r.current}）`);
    } else {
      setPhase("idle");
      setMsg(`已是最新版本（${r.version ?? current}）`);
    }
  }, [api, current]);

  const doDownload = useCallback(async () => {
    if (!api) return;
    setPhase("downloading");
    setPercent(0);
    const r = await api.download();
    if (r.error) { setPhase("error"); setMsg(r.error); }
  }, [api]);

  const doInstall = useCallback(async () => {
    if (!api) return;
    await api.install();
  }, [api]);

  // 非 Electron 环境（浏览器预览）
  if (!api) {
    return (
      <div className="proto-growth-note">
        当前在浏览器中预览，自动更新仅在桌面版可用。
      </div>
    );
  }

  return (
    <>
      <h3>版本与更新</h3>
      <div className="proto-growth-note">
        当前版本 <b>{current || "…"}</b>
        {latest ? <>　最新 <b style={{ color: "var(--ok)" }}>{latest}</b></> : null}
        <br />
        更新从 GitHub Release 获取。检查后需你确认才会下载，不会后台静默更新。
      </div>

      {phase === "downloading" ? (
        <div className="proto-share-summary" style={{ display: "flex", alignItems: "center", gap: ".6em" }}>
          <div className="proto-tr" style={{ flex: 1, height: ".6em", background: "var(--panel2)", borderRadius: ".3em", overflow: "hidden" }}>
            <div style={{ width: percent + "%", height: "100%", background: "var(--accent-lt)", transition: "width .2s" }} />
          </div>
          <b>{percent}%</b>
        </div>
      ) : null}

      {msg ? (
        <div className="proto-growth-note" style={{ color: phase === "error" ? "var(--danger)" : "var(--sub)" }}>
          {msg}
        </div>
      ) : null}

      <div className="proto-rv-actions" style={{ display: "flex", gap: ".4em", marginTop: ".6em" }}>
        <button className="proto-mini" onClick={doCheck} disabled={phase === "checking" || phase === "downloading"}>
          {phase === "checking" ? "检查中…" : "检查更新"}
        </button>

        {phase === "found" ? (
          <button className="proto-mini" onClick={doDownload}>下载 v{latest}</button>
        ) : null}

        {phase === "ready" ? (
          <button className="proto-mini" onClick={doInstall} style={{ color: "var(--ok)" }}>重启并安装</button>
        ) : null}
      </div>
    </>
  );
}
