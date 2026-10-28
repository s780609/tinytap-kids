import { useId } from "react";
import type { EggStyle } from "@/lib/hatch/hatch";

/**
 * 敲敲蛋的蛋（200×240）與鳥巢。蛋分上下兩半各畫一張，孵出來時上半飛走。
 */

const EGG = "M100 8 C152 8 188 92 188 148 C188 204 148 234 100 234 C52 234 12 204 12 148 C12 92 48 8 100 8Z";

/** 蛋殼裂開的鋸齒線（由左到右） */
const ZIG: [number, number][] = [
  [0, 118],
  [20, 106],
  [40, 128],
  [60, 104],
  [80, 130],
  [100, 106],
  [120, 130],
  [140, 104],
  [160, 128],
  [180, 106],
  [200, 118],
];

const pts = (p: [number, number][]) => p.map(([x, y]) => `${x},${y}`).join(" ");

const HALF: Record<"top" | "bottom", string> = {
  top: pts([[0, 0], [200, 0], ...[...ZIG].reverse()]),
  bottom: pts([...ZIG, [200, 240], [0, 240]]),
};

/** 第幾次裂：先裂中間，再往兩邊，最後整圈 */
const CRACK_RANGE: [number, number][] = [
  [0, 0],
  [4, 6],
  [2, 8],
  [0, 10],
];

/** 裂縫旁邊的小分岔 */
const BRANCHES: { at: number; d: string }[] = [
  { at: 1, d: "M100 106 L94 92 M120 130 L128 142" },
  { at: 2, d: "M60 104 L52 92 M160 128 L170 140" },
  { at: 3, d: "M20 106 L16 96 M180 106 L188 96" },
];

/** 用固定的「亂數」撒斑點，伺服器跟瀏覽器畫得一樣 */
const SPECKLES = Array.from({ length: 46 }, (_, i) => {
  const a = (i * 137.5 * Math.PI) / 180;
  const r = Math.sqrt((i + 0.5) / 46);
  return { x: 100 + Math.cos(a) * r * 88, y: 128 + Math.sin(a) * r * 108, r: 2 + ((i * 7) % 4) };
});

function Pattern({ style }: { style: EggStyle }) {
  const c = style.accent;
  switch (style.pattern) {
    case "spots":
      return (
        <g fill={c} opacity={0.75}>
          {[
            [70, 60, 14],
            [130, 46, 10],
            [150, 100, 18],
            [52, 128, 16],
            [110, 150, 12],
            [160, 180, 14],
            [70, 196, 18],
            [118, 214, 10],
          ].map(([x, y, r]) => (
            <circle key={`${x},${y}`} cx={x} cy={y} r={r} />
          ))}
        </g>
      );
    case "stripes":
      return (
        <g stroke={c} strokeWidth={12} fill="none" strokeLinecap="round" opacity={0.8}>
          {[64, 160, 204].map((y) => (
            <path key={y} d={`M0 ${y} Q25 ${y - 12} 50 ${y} T100 ${y} T150 ${y} T200 ${y}`} />
          ))}
        </g>
      );
    case "zigzag":
      return (
        <g stroke={c} strokeWidth={9} fill="none" strokeLinejoin="round" opacity={0.8}>
          {[62, 176].map((y) => (
            <polyline key={y} points={pts(Array.from({ length: 11 }, (_, i) => [i * 20, y + (i % 2 ? -12 : 12)]))} />
          ))}
          <g fill={c} stroke="none">
            {[40, 80, 120, 160].map((x) => (
              <circle key={x} cx={x} cy={210} r={5} />
            ))}
          </g>
        </g>
      );
    case "dots":
      return (
        <g fill={c} opacity={0.8}>
          {Array.from({ length: 9 }, (_, row) =>
            Array.from({ length: 7 }, (_, col) => (
              <circle key={`${row},${col}`} cx={18 + col * 28 + (row % 2) * 14} cy={30 + row * 26} r={5} />
            ))
          )}
        </g>
      );
    case "speckle":
      return (
        <g fill={c} opacity={0.6}>
          {SPECKLES.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} />
          ))}
        </g>
      );
    case "hearts":
      return (
        <g fill={c} opacity={0.75}>
          {[
            [72, 58, 0.9],
            [134, 80, 1.1],
            [56, 140, 1.2],
            [142, 160, 0.9],
            [96, 196, 1.2],
          ].map(([x, y, k]) => (
            <path
              key={`${x},${y}`}
              d="M0 10 C-14 1 -12 -10 -6 -10 C-3 -10 -1 -8 0 -5 C1 -8 3 -10 6 -10 C12 -10 14 1 0 10Z"
              transform={`translate(${x} ${y}) scale(${k})`}
            />
          ))}
        </g>
      );
  }
}

/** 蛋的上半或下半；兩半疊在一起就是一整顆蛋 */
export function EggHalf({
  style,
  cracks,
  part,
  className,
}: {
  style: EggStyle;
  cracks: number;
  part: "top" | "bottom";
  className?: string;
}) {
  // useId 可能帶冒號之類的字元，url(#…) 裡用不了
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const eggId = `egg-${uid}`;
  const halfId = `half-${uid}`;
  const [from, to] = CRACK_RANGE[Math.min(cracks, CRACK_RANGE.length - 1)];
  return (
    <svg viewBox="0 0 200 240" className={className} aria-hidden>
      <defs>
        <clipPath id={eggId}>
          <path d={EGG} />
        </clipPath>
        <clipPath id={halfId}>
          <polygon points={HALF[part]} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${halfId})`}>
        <path d={EGG} fill={style.base} />
        <g clipPath={`url(#${eggId})`}>
          <Pattern style={style} />
          {/* 下方一點陰影，看起來圓圓的 */}
          <ellipse cx={130} cy={190} rx={80} ry={60} fill="#000" opacity={0.06} />
          {cracks > 0 && (
            <g stroke="#5D4037" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={pts(ZIG.slice(from, to + 1))} />
              {BRANCHES.filter((b) => b.at <= cracks).map((b) => (
                <path key={b.at} d={b.d} strokeWidth={3} />
              ))}
            </g>
          )}
        </g>
        <ellipse cx={66} cy={74} rx={14} ry={28} fill="#fff" opacity={0.55} transform="rotate(-22 66 74)" />
        <path d={EGG} fill="none" stroke={style.accent} strokeOpacity={0.45} strokeWidth={3} />
        {/* 下半的裂口邊緣 */}
        {part === "bottom" && cracks >= 3 && (
          <polyline points={pts(ZIG)} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={2} />
        )}
      </g>
    </svg>
  );
}

export function Nest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 110" className={className} aria-hidden>
      <ellipse cx={150} cy={66} rx={146} ry={40} fill="#8D6E63" />
      <ellipse cx={150} cy={50} rx={128} ry={22} fill="#6D4C41" />
      <g fill="none" strokeLinecap="round">
        {Array.from({ length: 22 }, (_, i) => {
          const x = 14 + i * 13;
          const y = 52 + ((i * 5) % 4) * 9;
          const tilt = i % 2 ? 1 : -1;
          return (
            <path
              key={i}
              d={`M${x - 26} ${y + tilt * 6} Q${x} ${y - 14} ${x + 26} ${y - tilt * 6}`}
              stroke={i % 3 === 0 ? "#BCAAA4" : i % 3 === 1 ? "#A1887F" : "#D7CCC8"}
              strokeWidth={4}
            />
          );
        })}
        {Array.from({ length: 10 }, (_, i) => (
          <path
            key={`b${i}`}
            d={`M${20 + i * 28} ${86 - (i % 2) * 6} Q${34 + i * 28} ${74} ${48 + i * 28} ${88 - (i % 3) * 4}`}
            stroke="#5D4037"
            strokeWidth={3}
          />
        ))}
      </g>
    </svg>
  );
}
