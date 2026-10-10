import { useState } from "react";
import {
  SETTINGS_TAB_LABEL, SETTINGS_TAB_ICON,
  RENDER_STYLE_LABEL, RENDER_STYLE_DESC, INTENSITY_LABEL, INTENSITY_DESC,
  TIME_SCALE_LABEL, MODE_LABEL, CHANNEL_LABEL, LOCALE_LABEL,
  type SettingsTab, type RenderStyle, type ContentIntensity, type TimeScale,
  type GenerationMode, type AudioChannel, type Locale, type DetailLevel,
  BONUS_CATEGORY_LABEL, BONUS_CATEGORY_DESC, SHARE_RATIO,
  type BonusCategory
} from "@doomsday/core";
import { useGame } from "../store/game.ts";
import { AboutTab } from "./AboutTab.tsx";
import { CheatPanel } from "../panels/CheatPanel.tsx";

const TABS: SettingsTab[] = ["display", "gameplay", "content", "sharing", "audio", "lang", "cheat", "about"];

const RENDER_STYLES: RenderStyle[] = ["text", "pixel", "illustration", "live2d"];
const INTENSITIES: ContentIntensity[] = ["tasteful", "explicit", "unrestrained"];
const TIME_SCALES: TimeScale[] = ["slow", "normal", "fast"];
const MODES: GenerationMode[] = ["off", "minor", "all"];
const LOCALES: Locale[] = ["zh-CN", "en-US", "ja-JP"];
const CHANNELS: AudioChannel[] = ["bgm", "ambient", "sfx", "voice"];
const BONUS_CATS: BonusCategory[] = ["survival", "combat", "facility", "comfort", "special"];
const DETAILS: DetailLevel[] = ["brief", "standard", "detailed", "exhaustive"];
const DETAIL_LABEL: Record<DetailLevel, string> = {
  brief: "简洁", standard: "标准", detailed: "详细", exhaustive: "极详"
};

/** 一行设置项 */
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="setrow">
      <div className="setrow-label">
        <span>{label}</span>
        {hint && <span className="setrow-hint">{hint}</span>}
      </div>
      <div className="setrow-ctl">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value, options, labels, onChange, disabled
}: {
  value: T;
  options: T[];
  labels: Record<T, string>;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o}
          className={value === o ? "seg active" : "seg"}
          onClick={() => onChange(o)}
          disabled={disabled}
        >
          {labels[o]}
        </button>
      ))}
    </div>
  );
}

function Slider({ value, min, max, step, onChange, format }: {
  value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div className="slider-row">
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="slider-value">{format ? format(value) : value}</span>
    </div>
  );
}

/** 加成共享面板：玩家决定哪些加成惠及后宫 */
function SharingPanel() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const toggleShare = useGame((s) => s.toggleShare);
  const setCategoryShare = useGame((s) => s.setCategoryShare);
  void version;

  const stats = session.shareStats();
  const comparison = session.bonusComparison();

  return (
    <section className="setgroup">
      <h3>加成共享</h3>
      <div className="growth-note">
        主角获得 100% 加成；后宫默认只享受 {(SHARE_RATIO * 100).toFixed(0)}%，
        且需要你逐项授权。主角专属项（研究、制作）无法共享。
      </div>

      <div className="share-summary">
        已授权 <b>{stats.shared}</b> / {stats.total} 项
      </div>

      {BONUS_CATS.map((cat) => {
        const catStats = stats.byCategory[cat];
        const list = session.bonusesByCategory(cat);
        const allOn = catStats.shared === catStats.total;
        return (
          <div key={cat} className="share-cat">
            <div className="share-cat-head">
              <span className="share-cat-name">{BONUS_CATEGORY_LABEL[cat]}</span>
              <span className="share-cat-desc">{BONUS_CATEGORY_DESC[cat]}</span>
              <span className="share-cat-count">
                {catStats.shared}/{catStats.total}
              </span>
              <button
                className="mini"
                onClick={() => setCategoryShare(cat, !allOn)}
              >
                {allOn ? "全部取消" : "全部授权"}
              </button>
            </div>

            <div className="share-list">
              {list.map((b) => {
                const shared = session.isSharedWithHarem(b.key);
                const locked = b.appliesTo === "none";
                const cmp = comparison.find((x) => x.key === b.key);
                return (
                  <label
                    key={b.key}
                    className={`share-row ${locked ? "locked" : ""} ${shared ? "on" : ""}`}
                    title={locked ? "主角专属，无法共享" : b.description}
                  >
                    <input
                      type="checkbox"
                      checked={shared}
                      disabled={locked}
                      onChange={() => toggleShare(b.key)}
                    />
                    <span className="share-label">{b.label}</span>
                    <span className="share-values">
                      {locked ? (
                        <span className="share-locked">主角专属</span>
                      ) : cmp ? (
                        <>
                          <span className="share-hero">主角 {Math.round(cmp.heroValue)}</span>
                          <span className="share-harem">后宫 {Math.round(cmp.haremValue)}</span>
                        </>
                      ) : (
                        <span className="share-dim">未建成</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="hint">
        授权是可选的 —— 你可以让后宫只享受生存与舒适类加成，
        而把战斗与特殊类留给自己。已授权状态随存档保存。
      </p>
    </section>
  );
}

export function SettingsPanel() {
  const [tab, setTab] = useState<SettingsTab>("display");
  const settings = useGame((s) => s.settings);
  const patchDisplay = useGame((s) => s.patchDisplay);
  const patchGameplay = useGame((s) => s.patchGameplay);
  const patchContent = useGame((s) => s.patchContent);
  const patchAudio = useGame((s) => s.patchAudio);
  const patchLang = useGame((s) => s.patchLang);
  const setGenerationMode = useGame((s) => s.setGenerationMode);
  const stockStats = useGame((s) => s.stockStats);
  const resetSettings = useGame((s) => s.resetSettings);
  const exportSettings = useGame((s) => s.exportSettings);
  const importSettings = useGame((s) => s.importSettings);

  const stock = (() => { try { return stockStats(); } catch { return null; } })();

  return (
    <div className="settings">
      <nav className="settings-nav">
        {TABS.map((t) => (
          <button
            key={t}
            className={tab === t ? "settab active" : "settab"}
            onClick={() => setTab(t)}
          >
            <span className="settab-icon">{SETTINGS_TAB_ICON[t]}</span>
            <span>{SETTINGS_TAB_LABEL[t]}</span>
          </button>
        ))}
      </nav>

      <div className="settings-body">
        {tab === "display" && (
          <section className="setgroup">
            <h3>画面风格</h3>
            <Row label="渲染方式" hint={RENDER_STYLE_DESC[settings.display.renderStyle]}>
              <Segmented
                value={settings.display.renderStyle}
                options={RENDER_STYLES}
                labels={RENDER_STYLE_LABEL}
                onChange={(v) => patchDisplay({ renderStyle: v })}
              />
            </Row>
            <Row label="文字详细度" hint="影响场景渲染的节拍数量">
              <Segmented
                value={settings.display.detail}
                options={DETAILS}
                labels={DETAIL_LABEL}
                onChange={(v) => patchDisplay({ detail: v })}
              />
            </Row>
            <Row label="字号">
              <Slider value={settings.display.fontSize} min={12} max={20} step={1}
                onChange={(v) => patchDisplay({ fontSize: v })} format={(v) => `${v}px`} />
            </Row>

            <h3>界面元素</h3>
            <Row label="显示角色头像">
              <input type="checkbox" checked={settings.display.showPortrait}
                onChange={(e) => patchDisplay({ showPortrait: e.target.checked })} />
            </Row>
            <Row label="显示底部状态条">
              <input type="checkbox" checked={settings.display.showStatusBar}
                onChange={(e) => patchDisplay({ showStatusBar: e.target.checked })} />
            </Row>
            <Row label="显示层次标签" hint="在叙事文本前标注动作/感官/心理/对白">
              <input type="checkbox" checked={settings.display.showLayerTags}
                onChange={(e) => patchDisplay({ showLayerTags: e.target.checked })} />
            </Row>
            <Row label="界面动画">
              <input type="checkbox" checked={settings.display.animation}
                onChange={(e) => patchDisplay({ animation: e.target.checked })} />
            </Row>
          </section>
        )}

        {tab === "gameplay" && (
          <section className="setgroup">
            <h3>时间</h3>
            <Row label="时间流速" hint="影响每次行动推进的游戏时间">
              <Segmented value={settings.gameplay.timeScale} options={TIME_SCALES}
                labels={TIME_SCALE_LABEL} onChange={(v) => patchGameplay({ timeScale: v })} />
            </Row>

            <h3>存档</h3>
            <Row label="自动存档">
              <input type="checkbox" checked={settings.gameplay.autoSave}
                onChange={(e) => patchGameplay({ autoSave: e.target.checked })} />
            </Row>
            <Row label="自动存档间隔">
              <Slider value={settings.gameplay.autoSaveIntervalDays} min={1} max={10} step={1}
                onChange={(v) => patchGameplay({ autoSaveIntervalDays: v })}
                format={(v) => `每 ${v} 天`} />
            </Row>

            <h3>交互</h3>
            <Row label="危险操作二次确认">
              <input type="checkbox" checked={settings.gameplay.confirmDangerous}
                onChange={(e) => patchGameplay({ confirmDangerous: e.target.checked })} />
            </Row>
            <Row label="显示按钮提示">
              <input type="checkbox" checked={settings.gameplay.showTooltips}
                onChange={(e) => patchGameplay({ showTooltips: e.target.checked })} />
            </Row>
            <Row label="名册紧凑模式" hint="左栏角色卡片改用更小的头像">
              <input type="checkbox" checked={settings.gameplay.compactRoster}
                onChange={(e) => patchGameplay({ compactRoster: e.target.checked })} />
            </Row>
          </section>
        )}

        {tab === "content" && (
          <section className="setgroup">
            <h3>成人内容</h3>
            <Row label="启用成人内容" hint="关闭后场景只保留情节推进">
              <input type="checkbox" checked={settings.content.adultEnabled}
                onChange={(e) => patchContent({ adultEnabled: e.target.checked })} />
            </Row>
            <Row label="描写强度" hint={INTENSITY_DESC[settings.content.intensity]}>
              <Segmented value={settings.content.intensity} options={INTENSITIES}
                labels={INTENSITY_LABEL} onChange={(v) => patchContent({ intensity: v })}
                disabled={!settings.content.adultEnabled} />
            </Row>
            <Row label="怀孕相关提示">
              <input type="checkbox" checked={settings.content.pregnancyHints}
                onChange={(e) => patchContent({ pregnancyHints: e.target.checked })}
                disabled={!settings.content.adultEnabled} />
            </Row>

            <h3>场景生成</h3>
            <Row label="生成范围" hint="关键剧情永远手写，不受此设置影响">
              <Segmented value={settings.content.generationMode} options={MODES}
                labels={MODE_LABEL} onChange={(v) => setGenerationMode(v)} />
            </Row>
            <Row label="显示生成按钮" hint="在可生成的场景底部显示「用本地模型续写」">
              <input type="checkbox" checked={settings.content.showGenerateButton}
                onChange={(e) => patchContent({ showGenerateButton: e.target.checked })} />
            </Row>
            <Row label="后宫互交场景" hint="同伴之间的互动场景">
              <input type="checkbox" checked={settings.content.haremInteraction}
                onChange={(e) => patchContent({ haremInteraction: e.target.checked })}
                disabled={!settings.content.adultEnabled} />
            </Row>

            {stock && stock.total > 0 && (
              <p className="hint">
                预生成文本库存：{stock.total} 条 / {stock.totalChars.toLocaleString()} 字
                （命中库存的场景直接取用，省去推理）
              </p>
            )}
          </section>
        )}

        {tab === "sharing" && <SharingPanel />}

        {tab === "audio" && (
          <section className="setgroup">
            <h3>总音量</h3>
            <Row label="主音量">
              <Slider value={settings.audio.master} min={0} max={1} step={0.05}
                onChange={(v) => patchAudio({ master: v })}
                format={(v) => `${Math.round(v * 100)}%`} />
            </Row>

            <h3>通道</h3>
            {CHANNELS.map((ch) => (
              <Row key={ch} label={CHANNEL_LABEL[ch]}>
                <div className="audio-ctl">
                  <Slider
                    value={settings.audio.channels[ch]} min={0} max={1} step={0.05}
                    onChange={(v) => patchAudio({
                      channels: { ...settings.audio.channels, [ch]: v }
                    })}
                    format={(v) => `${Math.round(v * 100)}%`}
                  />
                  <label className="chk">
                    <input type="checkbox" checked={settings.audio.muted[ch]}
                      onChange={(e) => patchAudio({
                        muted: { ...settings.audio.muted, [ch]: e.target.checked }
                      })} />
                    静音
                  </label>
                </div>
              </Row>
            ))}

            <Row label="淡入淡出时长">
              <Slider value={settings.audio.crossfadeMs} min={0} max={2000} step={100}
                onChange={(v) => patchAudio({ crossfadeMs: v })}
                format={(v) => `${v}ms`} />
            </Row>

            <p className="hint">
              音频系统已就绪（24 条音轨 / 4 个通道），当前缺实际音源文件。
              接入音频后此设置立即生效。
            </p>
          </section>
        )}

        {tab === "lang" && (
          <section className="setgroup">
            <h3>界面语言</h3>
            <Row label="语言">
              <Segmented value={settings.lang.locale} options={LOCALES}
                labels={LOCALE_LABEL} onChange={(v) => patchLang({ locale: v })} />
            </Row>
            <p className="hint">
              三种语言的 UI 文案已完整（各 70+ 条）。剧本文本目前以中文为主，
              模型生成会跟随提示词语言。
            </p>
          </section>
        )}

        {tab === "cheat" && <CheatPanel />}

        {tab === "about" && <AboutTab />}
      </div>

      <footer className="settings-foot">
        <button onClick={exportSettings}>导出设置</button>
        <button onClick={importSettings}>导入设置</button>
        <button className="danger" onClick={resetSettings}>恢复默认</button>
      </footer>
    </div>
  );
}