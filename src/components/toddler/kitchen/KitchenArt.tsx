/**
 * 小小廚房的圖：料理底座（200×200 座標）與每種配料（以 0,0 為中心、半徑約 10）。
 * 全部用 SVG 畫，不靠 emoji，所有裝置看起來都一樣。
 */

import type { DishId, Placed, ToppingId } from "@/lib/kitchen/kitchen";

// ---------- 小工具 ----------

function starPath(outer: number, inner: number, points = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join(" L")}Z`;
}

/** 花邊圓：奶油花 */
function scallopPath(r: number, bump: number, n: number): string {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a0 = (Math.PI * 2 * i) / n;
    const a1 = (Math.PI * 2 * (i + 1)) / n;
    const am = (a0 + a1) / 2;
    const p0 = [Math.cos(a0) * r, Math.sin(a0) * r];
    const c = [Math.cos(am) * (r + bump), Math.sin(am) * (r + bump)];
    const p1 = [Math.cos(a1) * r, Math.sin(a1) * r];
    if (i === 0) d += `M${p0[0].toFixed(2)} ${p0[1].toFixed(2)}`;
    d += ` Q${c[0].toFixed(2)} ${c[1].toFixed(2)} ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`;
  }
  return d + "Z";
}

const SAUCE_COLORS: Partial<Record<ToppingId, string>> = {
  syrup: "#C67C1E",
  chocSauce: "#5D4037",
  honey: "#FFB300",
};

/** 淋在料理上的醬：一小灘加來回淋的線 */
function Drizzle({ color }: { color: string }) {
  return (
    <g>
      <ellipse rx={9} ry={5} fill={color} opacity={0.8} />
      <path
        d="M-15 -3 Q-11 5 -7 -3 T1 -3 T9 -3 T15 -2"
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M-5 -2 Q-1 -3.5 3 -2.5" stroke="#fff" strokeOpacity={0.45} strokeWidth={1.2} strokeLinecap="round" fill="none" />
    </g>
  );
}

/** 配料按鈕上的醬料瓶 */
function SauceBottle({ color }: { color: string }) {
  return (
    <g>
      <path d="M-1.2 -10.5 L0 -13.5 L1.2 -10.5Z" fill="#ECEFF1" stroke="#B0BEC5" strokeWidth={0.6} />
      <rect x={-2.8} y={-10.5} width={5.6} height={4} rx={1} fill="#ECEFF1" stroke="#B0BEC5" strokeWidth={0.6} />
      <path d="M-6.5 -2 Q-6.5 -7 -2.5 -7 L2.5 -7 Q6.5 -7 6.5 -2 L6.5 9 Q6.5 12 3.5 12 L-3.5 12 Q-6.5 12 -6.5 9Z" fill={color} />
      <rect x={-4.6} y={0} width={9.2} height={7} rx={1.5} fill="#fff" opacity={0.9} />
      <path d="M0 1.2 C1.6 3 2 4 2 4.6 A2 2 0 0 1 -2 4.6 C-2 4 -1.6 3 0 1.2Z" fill={color} />
      <path d="M-4.8 -3 L-4.8 -1" stroke="#fff" strokeOpacity={0.5} strokeWidth={1.2} strokeLinecap="round" />
    </g>
  );
}

function Leaf({ fill, vein }: { fill: string; vein: string }) {
  return (
    <g>
      <path d="M-9 5 C-7 -5 3 -8 9 -6 C7 2 -1 6 -9 5Z" fill={fill} />
      <path d="M-8 4 Q0 -1 7 -5" stroke={vein} strokeWidth={1} fill="none" strokeLinecap="round" />
    </g>
  );
}

const CANDLE_COLORS: Partial<Record<ToppingId, string>> = {
  candlePink: "#F06292",
  candleBlue: "#4FC3F7",
  candleYellow: "#FFD54F",
  candleGreen: "#81C784",
};

function Candle({ color, lit }: { color: string; lit: boolean }) {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={4.5} ry={1.6} fill="#000" opacity={0.15} />
      <rect x={-3} y={-30} width={6} height={30} rx={1.5} fill={color} />
      {[-26, -18, -10].map((y) => (
        <path key={y} d={`M-3 ${y + 2} L3 ${y - 1} L3 ${y + 1.5} L-3 ${y + 4.5}Z`} fill="#fff" opacity={0.65} />
      ))}
      <line x1={0} y1={-30} x2={0} y2={-34} stroke="#5D4037" strokeWidth={1.2} strokeLinecap="round" />
      {lit && (
        <g className="kitchen-flame">
          <path d="M0 -47 C5 -41 5 -36 0 -34 C-5 -36 -5 -41 0 -47Z" fill="#FFA000" />
          <path d="M0 -42 C2.5 -39 2.5 -36.5 0 -35.5 C-2.5 -36.5 -2.5 -39 0 -42Z" fill="#FFF59D" />
        </g>
      )}
      {/* 點火焰的感應範圍：小手指點不準也沒關係 */}
      {lit && <rect x={-11} y={-54} width={22} height={58} fill="transparent" />}
    </g>
  );
}

// ---------- 配料 ----------

export function ToppingArt({ id, lit = false }: { id: ToppingId; lit?: boolean }) {
  const candle = CANDLE_COLORS[id];
  if (candle) return <Candle color={candle} lit={lit} />;

  switch (id) {
    case "strawberry":
      return (
        <g>
          <path d="M0 10 C-9 4 -10 -4 -7 -7 C-4 -9 -1 -8 0 -7 C1 -8 4 -9 7 -7 C10 -4 9 4 0 10Z" fill="#E53935" />
          {[
            [-3.5, -2],
            [3.5, -2],
            [0, 1.5],
            [-4, 3],
            [4, 3],
            [0, -4.5],
            [0, 6],
          ].map(([x, y]) => (
            <ellipse key={`${x},${y}`} cx={x} cy={y} rx={0.7} ry={1} fill="#FFEB3B" />
          ))}
          <path d="M-6 -7 L-3.5 -11 L0 -8 L3.5 -11 L6 -7 Q0 -5 -6 -7Z" fill="#43A047" />
          <ellipse cx={-4.5} cy={-3} rx={1.3} ry={2.4} fill="#fff" opacity={0.35} />
        </g>
      );
    case "blueberry":
      return (
        <g>
          <circle r={7} fill="#3F51B5" />
          <circle r={7} fill="none" stroke="#283593" strokeWidth={1} />
          <path d={starPath(3, 1.3)} fill="#1A237E" transform="translate(0 -1.5)" />
          <ellipse cx={-3.2} cy={-3.2} rx={1.6} ry={1.1} fill="#fff" opacity={0.5} />
        </g>
      );
    case "banana":
      return (
        <g>
          <circle r={8} fill="#FFF59D" stroke="#F0D86A" strokeWidth={1.6} />
          <circle r={3.5} fill="#FFF9C4" />
          {[0, 1, 2].map((i) => {
            const a = (Math.PI * 2 * i) / 3 - Math.PI / 2;
            return <ellipse key={i} cx={Math.cos(a) * 2.2} cy={Math.sin(a) * 2.2} rx={0.7} ry={1} fill="#8D6E63" />;
          })}
        </g>
      );
    case "kiwi":
      return (
        <g>
          <circle r={8.5} fill="#8D6E63" />
          <circle r={7.4} fill="#7CB342" />
          <circle r={5} fill="#9CCC65" />
          <circle r={2.4} fill="#F1F8E9" />
          {Array.from({ length: 10 }, (_, i) => {
            const a = (Math.PI * 2 * i) / 10;
            return (
              <ellipse
                key={i}
                cx={Math.cos(a) * 3.8}
                cy={Math.sin(a) * 3.8}
                rx={0.5}
                ry={1}
                fill="#212121"
                transform={`rotate(${(a * 180) / Math.PI + 90} ${Math.cos(a) * 3.8} ${Math.sin(a) * 3.8})`}
              />
            );
          })}
        </g>
      );
    case "chocChip":
      return (
        <g>
          <path d="M0 -7 C2 -3 6 1 6 4 C6 7 3 8 0 8 C-3 8 -6 7 -6 4 C-6 1 -2 -3 0 -7Z" fill="#5D4037" />
          <path d="M-3 3 Q-3 0 -1 -2" stroke="#fff" strokeOpacity={0.35} strokeWidth={1.2} fill="none" strokeLinecap="round" />
        </g>
      );
    case "sprinkles":
      return (
        <g>
          {[
            [-6, -4, 30, "#F06292"],
            [0, -6, -40, "#4FC3F7"],
            [6, -3, 70, "#FFD54F"],
            [-4, 3, -70, "#81C784"],
            [3, 4, 20, "#BA68C8"],
            [8, 4, -20, "#FF8A65"],
            [-9, 2, 80, "#4FC3F7"],
          ].map(([x, y, r, c]) => (
            <rect
              key={`${x},${y}`}
              x={-1.2}
              y={-3}
              width={2.4}
              height={6}
              rx={1.2}
              fill={c as string}
              transform={`translate(${x} ${y}) rotate(${r})`}
            />
          ))}
        </g>
      );
    case "cream":
      return (
        <g>
          <path
            d="M-10 6 Q-11 0 -5 -1 Q-8 -6 -2 -8 Q0 -13 3 -8 Q8 -6 5 -1 Q11 0 10 6 Q0 10 -10 6Z"
            fill="#FFFDF7"
            stroke="#E6D9C3"
            strokeWidth={1}
          />
          <path d="M-6 3 Q0 5 6 3 M-3 -3 Q1 -2 3 -4" stroke="#E6D9C3" strokeWidth={0.9} fill="none" strokeLinecap="round" />
        </g>
      );
    case "mint":
      return <Leaf fill="#66BB6A" vein="#2E7D32" />;
    case "basil":
      return (
        <g transform="rotate(-20)">
          <Leaf fill="#2E7D32" vein="#81C784" />
        </g>
      );
    case "butter":
      return (
        <g>
          <ellipse cx={0} cy={4} rx={11} ry={4.5} fill="#FFD54F" opacity={0.7} />
          <rect x={-7.5} y={-6} width={15} height={11} rx={2} fill="#FFE082" stroke="#F9C74F" strokeWidth={0.8} />
          <rect x={-7.5} y={-6} width={15} height={4} rx={2} fill="#FFF3C4" />
        </g>
      );
    case "syrup":
    case "chocSauce":
    case "honey":
      return <Drizzle color={SAUCE_COLORS[id]!} />;
    case "cherry":
      return (
        <g>
          <path d="M0 -1 Q1 -8 5 -11" stroke="#6D4C41" strokeWidth={1.5} fill="none" strokeLinecap="round" />
          <path d="M3.5 -10 Q8 -12 9 -8 Q5 -7 3.5 -10Z" fill="#66BB6A" />
          <circle cx={0} cy={3} r={6.5} fill="#D32F2F" />
          <ellipse cx={-2.5} cy={0.5} rx={1.6} ry={2.2} fill="#fff" opacity={0.45} />
        </g>
      );
    case "heart":
      return (
        <g>
          <path
            d="M0 7 C-9 1 -8 -6 -4 -6 C-2 -6 -1 -5 0 -3 C1 -5 2 -6 4 -6 C8 -6 9 1 0 7Z"
            fill="#F06292"
            stroke="#EC407A"
            strokeWidth={1}
          />
          <ellipse cx={-3.5} cy={-3} rx={1.4} ry={1} fill="#fff" opacity={0.6} />
        </g>
      );
    case "star":
      return (
        <g>
          <path d={starPath(8.5, 3.8)} fill="#FFD54F" stroke="#FFA000" strokeWidth={1} strokeLinejoin="round" />
          <circle cx={-1.5} cy={-2.5} r={1} fill="#fff" opacity={0.7} />
        </g>
      );
    case "rosette":
      return (
        <g>
          <path d={scallopPath(7, 3, 8)} fill="#F8BBD0" stroke="#F48FB1" strokeWidth={0.8} />
          <path d={scallopPath(3.8, 1.8, 6)} fill="#F48FB1" />
          <circle r={1.4} fill="#FCE4EC" />
        </g>
      );
    case "pepperoni":
      return (
        <g>
          <circle r={8} fill="#C62828" />
          <circle r={7} fill="none" stroke="#E57373" strokeOpacity={0.5} strokeWidth={0.8} />
          {[
            [-3, -3, 1.3],
            [3, -2, 1],
            [-1, 3, 1.2],
            [4, 3.5, 0.9],
            [-4.5, 2, 0.8],
          ].map(([x, y, r]) => (
            <circle key={`${x},${y}`} cx={x} cy={y} r={r} fill="#8E1B1B" />
          ))}
        </g>
      );
    case "pepper":
      return (
        <path
          d="M0 -7 C4 -9 8 -5 7 -1 C8 3 5 8 0 7 C-5 8 -8 3 -7 -1 C-8 -5 -4 -9 0 -7Z"
          fill="none"
          stroke="#43A047"
          strokeWidth={2.6}
          strokeLinejoin="round"
        />
      );
    case "mushroom":
      return (
        <g>
          <path
            d="M-8 -1 C-8 -7 -4 -9 0 -9 C4 -9 8 -7 8 -1 C8 1 5 1 3 1 L3 7 C3 9 -3 9 -3 7 L-3 1 C-5 1 -8 1 -8 -1Z"
            fill="#F5E6D3"
            stroke="#A1887F"
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
          <path d="M-6 -1.5 Q0 -3 6 -1.5" stroke="#BCAAA4" strokeWidth={1} fill="none" />
        </g>
      );
    case "pineapple":
      return (
        <g>
          <path d="M-7 6 L0 -8 L7 6 Q0 8.5 -7 6Z" fill="#FFD54F" stroke="#F9A825" strokeWidth={1} strokeLinejoin="round" />
          <path d="M-3 0 L3 0 M-5 4 L5 4" stroke="#F9A825" strokeWidth={0.8} />
        </g>
      );
    case "corn":
      return (
        <g>
          {[
            [-4, 2.5],
            [4, 2.5],
            [0, -3.5],
          ].map(([x, y]) => (
            <g key={`${x},${y}`}>
              <ellipse cx={x} cy={y} rx={3.2} ry={3.7} fill="#FFD54F" stroke="#F9A825" strokeWidth={0.8} />
              <ellipse cx={x - 1} cy={y - 1.2} rx={0.9} ry={1.2} fill="#fff" opacity={0.6} />
            </g>
          ))}
        </g>
      );
    case "olive":
      return (
        <g>
          <circle r={5.5} fill="none" stroke="#37474F" strokeWidth={3.4} />
          <path d="M-4 -3 A5 5 0 0 1 1 -5.2" stroke="#90A4AE" strokeWidth={1} fill="none" strokeLinecap="round" />
        </g>
      );
    case "tomato":
      return (
        <g>
          <circle r={8.5} fill="#E53935" />
          <circle r={6.8} fill="#EF5350" />
          {[0, 1, 2].map((i) => {
            const a = (Math.PI * 2 * i) / 3 - Math.PI / 2;
            const x = Math.cos(a) * 3.6;
            const y = Math.sin(a) * 3.6;
            return (
              <g key={i}>
                <ellipse cx={x} cy={y} rx={2.4} ry={1.7} fill="#FF8A80" transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`} />
                <circle cx={x} cy={y} r={0.7} fill="#FFF59D" />
              </g>
            );
          })}
          <circle r={1.4} fill="#FFCDD2" />
        </g>
      );
    case "shrimp":
      return (
        <g>
          <path d="M6 -4 C2 -9 -7 -6 -7 1 C-7 6 -2 8 2 6" stroke="#FF8A65" strokeWidth={5} fill="none" strokeLinecap="round" />
          <path d="M-5 -4 L-2.5 -2 M-7 1 L-4 1 M-5 5.5 L-2.5 3.5" stroke="#FFCCBC" strokeWidth={1} strokeLinecap="round" />
          <path d="M2 6 L7 9 L5.5 3.5Z" fill="#FF7043" />
          <circle cx={6} cy={-4.5} r={0.9} fill="#3E2723" />
        </g>
      );
    case "cheese":
      return (
        <g>
          {[
            [-7, -3, 30],
            [-1, -6, -20],
            [6, -3, 60],
            [-4, 3, -50],
            [3, 4, 10],
            [9, 3, -30],
            [-9, 4, 70],
            [1, -1, 90],
          ].map(([x, y, r]) => (
            <rect
              key={`${x},${y}`}
              x={-1.4}
              y={-4}
              width={2.8}
              height={8}
              rx={1.4}
              fill="#FFE082"
              stroke="#FFCA28"
              strokeWidth={0.5}
              transform={`translate(${x} ${y}) rotate(${r})`}
            />
          ))}
        </g>
      );
    case "ham":
      return (
        <g>
          <rect x={-7} y={-7} width={14} height={14} rx={3} fill="#F48FB1" stroke="#FCE4EC" strokeWidth={1.6} />
          <path d="M-3 -2 Q0 -4 3 -1" stroke="#F8BBD0" strokeWidth={1} fill="none" />
        </g>
      );
    case "onion":
      return (
        <g>
          <ellipse rx={7.5} ry={5.5} fill="none" stroke="#BA68C8" strokeWidth={2} />
          <ellipse rx={4.2} ry={2.8} fill="none" stroke="#E1BEE7" strokeWidth={1.6} />
        </g>
      );
    default:
      return null;
  }
}

/** 配料按鈕：蠟燭比較長；醬料畫成一瓶 */
export function ToppingIcon({ id, size }: { id: ToppingId; size: number | string }) {
  const sauce = SAUCE_COLORS[id];
  return (
    <svg viewBox={CANDLE_COLORS[id] ? "-12 -50 24 54" : "-12 -12 24 24"} width={size} height={size} aria-hidden>
      {sauce ? <SauceBottle color={sauce} /> : <ToppingArt id={id} lit={!!CANDLE_COLORS[id]} />}
    </svg>
  );
}

// ---------- 料理底座 ----------

function Plate({ cy }: { cy: number }) {
  return (
    <g>
      <ellipse cx={100} cy={cy + 4} rx={94} ry={28} fill="#000" opacity={0.08} />
      <ellipse cx={100} cy={cy} rx={94} ry={28} fill="#FFFFFF" stroke="#E0E0E0" strokeWidth={2} />
      <ellipse cx={100} cy={cy} rx={72} ry={19} fill="none" stroke="#EEEEEE" strokeWidth={2} />
    </g>
  );
}

function Pancakes() {
  const rx = 70;
  const ry = 26;
  const h = 14;
  return (
    <g>
      <Plate cy={158} />
      {[120, 106, 92].map((cy) => (
        <g key={cy}>
          <path
            d={`M${100 - rx} ${cy} A${rx} ${ry} 0 0 0 ${100 + rx} ${cy} L${100 + rx} ${cy + h} A${rx} ${ry} 0 0 1 ${100 - rx} ${cy + h}Z`}
            fill="#C97A34"
          />
          <path
            d={`M${100 - rx + 2} ${cy + 7} A${rx - 2} ${ry} 0 0 0 ${100 + rx - 2} ${cy + 7}`}
            fill="none"
            stroke="#E0A458"
            strokeWidth={2}
            opacity={0.7}
          />
          <ellipse cx={100} cy={cy} rx={rx} ry={ry} fill="#E9A54E" />
          <ellipse cx={100} cy={cy - 1} rx={rx - 8} ry={ry - 4} fill="#F2BC66" />
        </g>
      ))}
      <ellipse cx={82} cy={86} rx={14} ry={4} fill="#fff" opacity={0.18} />
    </g>
  );
}

/** 蛋糕頂端的白色奶油，沿著前緣往下滴 */
function dripPath(cx: number, cy: number, rx: number, ry: number): string {
  const drips: [number, number][] = [
    [-58, 9],
    [-40, 14],
    [-22, 7],
    [-6, 15],
    [12, 9],
    [30, 13],
    [48, 8],
    [62, 11],
  ];
  const pts: string[] = [];
  for (let x = -rx; x <= rx + 0.01; x += 2) {
    const u = Math.max(-1, Math.min(1, x / rx));
    const edge = ry * Math.sqrt(1 - u * u);
    let d = 3;
    for (const [p, a] of drips) d += a * Math.exp(-(((x - p) / 3.4) ** 2));
    // 越靠兩側越短，免得從側邊滴出去
    d *= Math.sqrt(1 - u * u);
    pts.push(`${(cx + x).toFixed(1)} ${(cy + edge + d).toFixed(1)}`);
  }
  return `M${cx - rx} ${cy} L${pts.join(" L")} L${cx + rx} ${cy} A${rx} ${ry} 0 0 0 ${cx - rx} ${cy}Z`;
}

function Cake() {
  const cx = 100;
  const cy = 86;
  const rx = 74;
  const ry = 26;
  const h = 56;
  const beads = Array.from({ length: 15 }, (_, i) => {
    const x = cx - rx + 6 + i * ((rx * 2 - 12) / 14);
    const u = (x - cx) / rx;
    return { x, y: cy + h + ry * Math.sqrt(1 - u * u) };
  });
  return (
    <g>
      <Plate cy={152} />
      <path
        d={`M${cx - rx} ${cy} L${cx - rx} ${cy + h} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy + h} L${cx + rx} ${cy}Z`}
        fill="#F8BBD0"
      />
      <path
        d={`M${cx - rx} ${cy + 32} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy + 32}`}
        fill="none"
        stroke="#EC407A"
        strokeWidth={3}
        opacity={0.6}
      />
      <path d={`M${cx - rx + 8} ${cy + 10} L${cx - rx + 8} ${cy + h - 4}`} stroke="#fff" strokeOpacity={0.35} strokeWidth={5} strokeLinecap="round" />
      <path d={dripPath(cx, cy, rx, ry)} fill="#FFFDF7" />
      <ellipse cx={cx} cy={cy} rx={rx - 6} ry={ry - 4} fill="#FFF8EC" />
      {beads.map((b) => (
        <circle key={b.x} cx={b.x} cy={b.y} r={4} fill="#FFFDF7" stroke="#F3E5D8" strokeWidth={0.8} />
      ))}
    </g>
  );
}

function PizzaBase() {
  return (
    <g>
      <circle cx={100} cy={104} r={96} fill="#000" opacity={0.07} />
      <circle cx={100} cy={100} r={96} fill="#D7A86E" />
      <circle cx={100} cy={100} r={92} fill="#E3B57F" />
      <circle cx={100} cy={100} r={84} fill="#E8A65A" />
      <circle cx={100} cy={100} r={84} fill="none" stroke="#C98A3E" strokeWidth={2} />
      <circle cx={100} cy={100} r={74} fill="#E2502A" />
      <circle cx={100} cy={100} r={74} fill="none" stroke="#C43C1C" strokeWidth={2} />
      {[
        [70, 70],
        [130, 80],
        [90, 130],
        [140, 125],
        [60, 115],
      ].map(([x, y]) => (
        <circle key={`${x},${y}`} cx={x} cy={y} r={6} fill="#EF6C45" opacity={0.6} />
      ))}
    </g>
  );
}

/** 每道料理實際畫到的範圍，裁掉空白讓料理大一點（蛋糕上方留給蠟燭） */
export const DISH_VIEWBOX: Record<DishId, string> = {
  pancake: "0 48 200 146",
  cake: "0 14 200 174",
  pizza: "0 0 200 204",
};

export function DishBase({ id }: { id: DishId }) {
  if (id === "pancake") return <Pancakes />;
  if (id === "cake") return <Cake />;
  return <PizzaBase />;
}

// ---------- 料理上的配料 ----------

export function PlacedArt({
  p,
  lit = false,
  blown = false,
  animate = true,
  onBlow,
}: {
  p: Placed;
  lit?: boolean;
  blown?: boolean;
  animate?: boolean;
  onBlow?: () => void;
}) {
  return (
    <g
      transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.rot.toFixed(0)}) scale(${p.scale.toFixed(2)})`}
      onPointerDown={lit ? onBlow : undefined}
      style={lit ? { cursor: "pointer" } : undefined}
    >
      <g className={animate ? "kitchen-drop" : undefined}>
        <ToppingArt id={p.topping} lit={lit} />
      </g>
      {blown && (
        <g className="kitchen-smoke">
          <circle cx={0} cy={-38} r={3} fill="#B0BEC5" />
          <circle cx={2} cy={-44} r={2.4} fill="#CFD8DC" />
          <circle cx={-1} cy={-49} r={1.8} fill="#ECEFF1" />
        </g>
      )}
    </g>
  );
}
