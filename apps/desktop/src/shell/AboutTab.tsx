import { useState } from "react";
import {
  ABOUT, ABOUT_INTRO, ABOUT_FEATURES, ABOUT_NOTICES, CHANGELOG,
  VERSION, checkUpdate, newUpdateResult, compareVersion,
  type UpdateCheckResult
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

/** 游戏介绍 */
function IntroSection() {
  return (
    <section className="proto-about-block">
      <h3>游戏介绍</h3>
      <div className="proto-about-intro">
        {ABOUT_INTRO.map((p, i) => (
          <p key={i} className={i === 0 || i === ABOUT_INTRO.length - 1 ? "proto-lead" : ""}>{p}</p>
        ))}
      </div>
    </section>
  );
}

/** 玩法要点 */
function FeaturesSection() {
  return (
    <section className="proto-about-block">
      <h3>玩法要点</h3>
      <div className="proto-feature-grid">
        {ABOUT_FEATURES.map((f) => (
          <div key={f.title} className="proto-feature-card">
            <div className="proto-feature-title">{f.title}</div>
            <div className="proto-feature-body">{f.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 统计 */
function StatsSection() {
  const session = useGame((s) => s.session);
  const version = VERSION;
  void version;

  const stats = [
    { label: "后宫角色", value: 21, unit: "位" },
    { label: "科技节点", value: 127, unit: "个" },
    { label: "基地设施", value: 45, unit: "座" },
    { label: "物品", value: 92, unit: "件" },
    { label: "服装", value: 46, unit: "件" },
    { label: "日常场景模板", value: 29, unit: "个" },
    { label: "手写剧本", value: session.registry.all().length, unit: "个" },
    { label: "游戏系统", value: 21, unit: "个" }
  ];

  return (
    <section className="proto-about-block">
      <h3>内容规模</h3>
      <div className="proto-stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="proto-stat-cell">
            <div className="proto-stat-value">{s.value}</div>
            <div className="proto-stat-label">{s.label}<span className="proto-stat-unit">{s.unit}</span></div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 更新 */
function UpdateSection() {
  const version = VERSION;
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [showLog, setShowLog] = useState(false);

  async function doCheck() {
    setBusy(true);
    try {
      const r = await checkUpdate(version, url.trim() || null);
      setResult(r);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="proto-about-block">
      <h3>版本与更新</h3>

      <div className="proto-version-row">
        <div>
          <div className="proto-version-cur">当前版本 <b>{version}</b></div>
          <div className="proto-sub">{ABOUT.engine}　构建于 {ABOUT.buildDate}</div>
        </div>
        <button onClick={doCheck} disabled={busy}>{busy ? "检查中…" : "检查更新"}</button>
      </div>

      <div className="proto-fieldrow">
        <label style={{ flex: 1 }}>
          更新源地址（可选）
          <input
            type="text"
            value={url}
            placeholder="留空则跳过联网检查"
            onChange={(e) => setUrl(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
      </div>
      <p className="proto-hint" style={{ marginTop: 0 }}>
        本作不内置联网。填写更新源后才会发起请求，期望返回
        <code>{" { version, notes[], url }"}</code>。
      </p>

      {result && (
        <div className={`proto-update-result ${result.hasUpdate ? "proto-has-update" : result.error ? "proto-has-error" : "proto-up-to-date"}`}>
          {result.error ? (
            <div>⚠ {result.error}</div>
          ) : result.hasUpdate ? (
            <>
              <div className="proto-update-title">发现新版本 {result.latestVersion}</div>
              {result.notes.length > 0 && (
                <ul className="proto-update-notes">
                  {result.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              )}
              {result.url && (
                <a className="proto-update-link" href={result.url} target="_blank" rel="noreferrer">前往下载</a>
              )}
            </>
          ) : (
            <div>✓ 已是最新版本（{result.currentVersion}）</div>
          )}
        </div>
      )}

      <div className="proto-controls" style={{ marginTop: 12 }}>
        <button onClick={() => setShowLog((v) => !v)}>
          {showLog ? "收起更新日志" : "查看更新日志"}
        </button>
      </div>

      {showLog && (
        <div className="proto-changelog">
          {CHANGELOG.map((c) => (
            <div key={c.version} className="proto-cl-entry">
              <div className="proto-cl-head">
                <b>v{c.version}</b>
                <span className="proto-sub">{c.date}</span>
                {compareVersion(c.version, version) === 0 && <span className="proto-cl-cur">当前</span>}
              </div>
              <ul className="proto-cl-items">
                {c.items.map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** 声明 */
function NoticesSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="proto-about-block">
      <h3>相关声明</h3>
      <div className="proto-notice-list">
        {ABOUT_NOTICES.map((n, i) => (
          <div key={n.title} className={`proto-notice-item ${open === i ? "proto-open" : ""}`}>
            <button className="proto-notice-head" onClick={() => setOpen(open === i ? null : i)}>
              <span className="proto-notice-title">{n.title}</span>
              <span className="proto-notice-arrow">{open === i ? "−" : "+"}</span>
            </button>
            {open === i && <div className="proto-notice-body">{n.body}</div>}
          </div>
        ))}
      </div>

      <div className="proto-notice-footer">
        <div className="proto-notice-age">18+</div>
        <p className="proto-sub">
          本作包含成人内容，仅面向成年玩家。所有角色均为虚构的成年人。
          请遵守所在地法律法规，个人非商业使用。
        </p>
      </div>
    </section>
  );
}

/** 素材致谢 */
function CreditsSection() {
  return (
    <section className="proto-about-block">
      <h3>素材与致谢</h3>
      <table className="proto-grid">
        <thead>
          <tr><th>素材</th><th>来源</th><th>授权</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>室内瓦片集</td>
            <td><a href="https://kenney.nl/assets/roguelike-indoors" target="_blank" rel="noreferrer">Kenney · Roguelike Indoors</a></td>
            <td>CC0 1.0</td>
          </tr>
          <tr>
            <td>地形与物件图集</td>
            <td><a href="https://kenney.nl/assets/roguelike-rpg-pack" target="_blank" rel="noreferrer">Kenney · Roguelike/RPG pack</a></td>
            <td>CC0 1.0</td>
          </tr>
          <tr>
            <td>角色头像</td>
            <td><a href="https://kenney.nl/assets/roguelike-characters" target="_blank" rel="noreferrer">Kenney · Roguelike Characters</a></td>
            <td>CC0 1.0</td>
          </tr>
        </tbody>
      </table>
      <p className="proto-hint">
        CC0 1.0 属公有领域授权，无需署名。此处致谢 Kenney.nl 的免费素材。
        角色立绘目前使用程序化 SVG 剪影，接入真实美术只需替换 Portrait 组件。
      </p>
    </section>
  );
}

export function AboutTab() {
  return (
    <div className="proto-about">
      <header className="proto-about-header">
        <div className="proto-about-logo">末日生存·后宫</div>
        <div className="proto-about-tagline">{ABOUT.tagline}　·　v{ABOUT.version}</div>
      </header>
      <IntroSection />
      <StatsSection />
      <FeaturesSection />
      <UpdateSection />
      <NoticesSection />
      <CreditsSection />
      <footer className="proto-about-footer">
        <span>个人非商业使用</span>
        <span>·</span>
        <span>不联网 · 不上传数据</span>
        <span>·</span>
        <span>本地模型驱动</span>
      </footer>
    </div>
  );
}
