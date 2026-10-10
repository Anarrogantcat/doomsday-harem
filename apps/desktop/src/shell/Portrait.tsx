/**
 * 程序化角色头像。
 *
 * 无美术资源时用 SVG 剪影；接入真实立绘后只需替换本组件，
 * 其余布局不动。外观参数来自角色数据（身高、体型、性格、心情）。
 */

export interface PortraitProps {
  name: string;
  /** 心情 0-100，影响表情 */
  mood?: number;
  /** 是否怀孕，影响腹部轮廓 */
  pregnant?: boolean;
  /** 暴露度 0-100，影响衣着覆盖 */
  exposure?: number;
  /** 尺寸 */
  size?: number;
  /** 是否选中态 */
  active?: boolean;
}

/** 按名字散列出稳定色相 */
function hashHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function Portrait({
  name, mood = 60, pregnant = false, exposure = 10, size = 96, active = false
}: PortraitProps) {
  const hue = hashHue(name);
  const skin = `hsl(${hue}, 24%, 74%)`;
  const hair = `hsl(${(hue + 200) % 360}, 32%, 26%)`;
  // 暴露度越高，衣着越少
  const clothAlpha = Math.max(0.25, 1 - exposure / 130);
  const cloth = `hsl(${(hue + 40) % 360}, 42%, 44%)`;

  return (
    <svg viewBox="0 0 120 170" width={size} height={size * (170 / 120)} className="portrait-svg">
      <defs>
        <linearGradient id={`pb-${name}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={active ? "#3a2233" : "#241c2c"} />
          <stop offset="100%" stopColor="#14101a" />
        </linearGradient>
      </defs>
      <rect width="120" height="170" fill={`url(#pb-${name})`} />

      {/* 头 */}
      <ellipse cx="60" cy="42" rx="21" ry="25" fill={skin} />
      {/* 发 */}
      <path d="M39 42 Q58 10 81 42 Q83 26 74 17 Q60 5 46 17 Q37 26 39 42 Z" fill={hair} />
      {/* 颈 */}
      <rect x="54" y="62" width="12" height="10" fill={skin} />

      {/* 躯干 + 衣着 */}
      <path d="M60 72 Q42 76 38 100 L38 132 L82 132 L82 100 Q78 76 60 72 Z" fill={cloth} opacity={clothAlpha} />
      {/* 皮肤底色（衣着透明时透出） */}
      <path d="M60 72 Q42 76 38 100 L38 132 L82 132 L82 100 Q78 76 60 72 Z" fill={skin} opacity={0.35} />
      {/* 胸 */}
      <ellipse cx="50" cy="92" rx="10" ry="9" fill={cloth} opacity={clothAlpha} />
      <ellipse cx="70" cy="92" rx="10" ry="9" fill={cloth} opacity={clothAlpha} />

      {/* 怀孕隆起 */}
      {pregnant && <ellipse cx="60" cy="117" rx="21" ry="17" fill={cloth} opacity={clothAlpha * 0.95} />}

      {/* 腿 */}
      <rect x="44" y="132" width="12" height="30" fill={cloth} opacity={clothAlpha} />
      <rect x="64" y="132" width="12" height="30" fill={cloth} opacity={clothAlpha} />

      {/* 表情 */}
      <circle cx="52" cy="40" r="2.3" fill="#1a1420" />
      <circle cx="68" cy="40" r="2.3" fill="#1a1420" />
      <path
        d={mood > 65 ? "M53 50 Q60 56 67 50" : mood > 32 ? "M53 51 L67 51" : "M53 54 Q60 48 67 54"}
        stroke="#1a1420" strokeWidth="1.7" fill="none" strokeLinecap="round"
      />
      {/* 腮红（心情高或欲情高时） */}
      {mood > 70 && (
        <>
          <ellipse cx="46" cy="47" rx="4" ry="2.5" fill="#c8506e" opacity="0.28" />
          <ellipse cx="74" cy="47" rx="4" ry="2.5" fill="#c8506e" opacity="0.28" />
        </>
      )}
    </svg>
  );
}
