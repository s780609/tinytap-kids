import { ART_SIZE, type Rect } from "@/lib/dino/puzzle";
import type { FishId } from "@/lib/fish-puzzle/fishes";
import { Cheek, Eye } from "@/components/toddler/dino/DinoArt";

/*
 * 十二張魚類拼圖的圖（座標 0~300 的正方形，含海底背景）。
 * 跟恐龍圖一樣不用 gradient / clipPath 這類要 id 的東西，同一張圖切成很多塊也不會互相干擾。
 */

function Bubbles({ list }: { list: { x: number; y: number; r: number }[] }) {
  return (
    <g fill="none" stroke="white" strokeWidth={2} opacity={0.8}>
      {list.map((b) => (
        <circle key={`${b.x}-${b.y}`} cx={b.x} cy={b.y} r={b.r} />
      ))}
    </g>
  );
}

function Seaweed({ x, h, color }: { x: number; h: number; color: string }) {
  const seg = h / 4;
  return (
    <path
      d={`M${x},270 q-10,-${seg / 2} 0,-${seg} q10,-${seg / 2} 0,-${seg} q-10,-${seg / 2} 0,-${seg} q10,-${seg / 2} 0,-${seg}`}
      stroke={color}
      strokeWidth={8}
      fill="none"
      strokeLinecap="round"
    />
  );
}

/** 水面的波浪與光線、沙地 */
function Sea({ water, top, sand = "#FFE082" }: { water: string; top: string; sand?: string }) {
  return (
    <g>
      <rect width={300} height={300} fill={water} />
      <path d="M0,30 q25,-10 50,0 q25,10 50,0 q25,-10 50,0 q25,10 50,0 q25,-10 50,0 q25,10 50,0 L300,0 L0,0 Z" fill={top} />
      <polygon points="40,30 80,30 130,300 60,300" fill="white" opacity={0.1} />
      <polygon points="190,30 220,30 270,300 210,300" fill="white" opacity={0.1} />
      <path d="M0,262 Q75,250 150,262 Q225,274 300,260 L300,300 L0,300 Z" fill={sand} />
    </g>
  );
}

function Starfish({ x, y, color = "#FF8A65" }: { x: number; y: number; color?: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 11 : 5;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${x + Math.cos(a) * r},${y + Math.sin(a) * r}`;
  }).join(" ");
  return <polygon points={pts} fill={color} />;
}

const OUTLINE = "#263238";

function Clownfish() {
  const body = "#FF7043";
  const anemone = [30, 44, 58, 72, 86, 100];
  return (
    <g>
      <Sea water="#4FC3F7" top="#B3E5FC" />
      {/* 海葵 */}
      {anemone.map((x, i) => (
        <path
          key={x}
          d={`M${x},268 Q${x + (i % 2 ? 12 : -12)},235 ${x + (i % 2 ? -4 : 6)},${205 + (i % 3) * 8}`}
          stroke="#CE93D8"
          strokeWidth={9}
          fill="none"
          strokeLinecap="round"
        />
      ))}
      <ellipse cx={65} cy={268} rx={45} ry={10} fill="#AB47BC" />
      {/* 珊瑚 */}
      <path d="M250,265 L250,215 M250,235 L228,212 M250,228 L272,200 M262,215 L262,190" stroke="#FF8A80" strokeWidth={9} strokeLinecap="round" />
      <Starfish x={170} y={275} />
      <Bubbles list={[{ x: 238, y: 110, r: 6 }, { x: 250, y: 90, r: 4 }, { x: 244, y: 72, r: 3 }]} />

      {/* 尾巴、背鰭、胸鰭 */}
      <path d="M88,150 L42,112 Q34,150 42,188 Z" fill={body} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      <path d="M118,112 Q140,72 182,108 Z" fill={body} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      <path d="M120,188 Q130,216 152,192 Z" fill={body} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      {/* 身體與三條白紋 */}
      <ellipse cx={150} cy={150} rx={70} ry={42} fill={body} stroke={OUTLINE} strokeWidth={3} />
      <path d="M98,123 Q90,150 98,177 L110,182 Q102,150 110,117 Z" fill="white" stroke={OUTLINE} strokeWidth={2.5} />
      <path d="M140,109 Q130,150 140,191 L158,191 Q148,150 158,109 Z" fill="white" stroke={OUTLINE} strokeWidth={2.5} />
      <path d="M180,113 Q172,150 180,187 L193,182 Q186,150 193,118 Z" fill="white" stroke={OUTLINE} strokeWidth={2.5} />
      <path d="M168,160 Q178,178 196,170" fill={body} stroke={OUTLINE} strokeWidth={2.5} />
      <Eye x={204} y={138} r={10} />
      <path d="M206,164 Q214,170 222,162" stroke={OUTLINE} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Cheek x={200} y={158} />
    </g>
  );
}

function Pufferfish() {
  const spikes = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return `${150 + c * 64 - s * 7},${150 + s * 64 + c * 7} ${150 + c * 84},${150 + s * 84} ${150 + c * 64 + s * 7},${150 + s * 64 - c * 7}`;
  });
  return (
    <g>
      <Sea water="#80DEEA" top="#E0F7FA" />
      <Seaweed x={30} h={110} color="#66BB6A" />
      <Seaweed x={50} h={70} color="#43A047" />
      <path d="M262,268 Q258,236 270,220 Q284,236 280,268 Z" fill="#F48FB1" />
      <path d="M240,268 Q238,246 248,236 Q258,248 256,268 Z" fill="#CE93D8" />
      <Starfish x={110} y={280} color="#FFB74D" />
      <Bubbles list={[{ x: 60, y: 60, r: 5 }, { x: 72, y: 44, r: 3 }, { x: 250, y: 70, r: 6 }]} />

      {/* 小小的尾巴與鰭 */}
      <path d="M86,150 L58,128 L60,172 Z" fill="#FFB300" />
      {spikes.map((p) => (
        <polygon key={p} points={p} fill="#FFB300" />
      ))}
      <circle cx={150} cy={150} r={70} fill="#FFD54F" />
      <path d="M86,170 Q150,236 214,170 Q150,206 86,170 Z" fill="#FFF59D" />
      <circle cx={112} cy={118} r={6} fill="#FFB300" />
      <circle cx={192} cy={112} r={5} fill="#FFB300" />
      <circle cx={100} cy={150} r={4} fill="#FFB300" />
      <ellipse cx={212} cy={160} rx={16} ry={9} fill="#FFB300" transform="rotate(-30 212 160)" />
      <ellipse cx={88} cy={160} rx={16} ry={9} fill="#FFB300" transform="rotate(30 88 160)" />
      <Eye x={128} y={136} r={13} />
      <Eye x={172} y={136} r={13} />
      <ellipse cx={150} cy={170} rx={8} ry={6} fill="#F06292" />
      <ellipse cx={150} cy={170} rx={4} ry={3} fill="#AD1457" />
      <Cheek x={112} y={164} />
      <Cheek x={188} y={164} />
    </g>
  );
}

const SCHOOL = [
  { x: 60, y: 60 },
  { x: 82, y: 72 },
  { x: 58, y: 84 },
  { x: 236, y: 236 },
  { x: 258, y: 226 },
];

function Shark() {
  const body = "#78909C";
  return (
    <g>
      <Sea water="#0288D1" top="#4FC3F7" sand="#FFE0B2" />
      {SCHOOL.map((f) => (
        <g key={`${f.x}-${f.y}`}>
          <ellipse cx={f.x} cy={f.y} rx={10} ry={5} fill="#FFEE58" />
          <polygon points={`${f.x - 9},${f.y} ${f.x - 17},${f.y - 6} ${f.x - 17},${f.y + 6}`} fill="#FFEE58" />
          <circle cx={f.x + 5} cy={f.y - 1} r={1.5} fill={OUTLINE} />
        </g>
      ))}
      <Seaweed x={280} h={90} color="#26A69A" />
      <Bubbles list={[{ x: 120, y: 60, r: 5 }, { x: 132, y: 44, r: 3 }]} />

      {/* 尾巴、背鰭 */}
      <path d="M48,158 L10,104 Q26,158 10,214 Z" fill={body} />
      <path d="M124,122 L120,64 Q150,90 176,120 Z" fill={body} />
      {/* 身體 */}
      <path d="M36,160 Q96,104 200,116 Q264,126 286,160 Q264,192 200,198 Q96,214 36,160 Z" fill={body} />
      <path d="M70,170 Q140,210 260,176 Q230,194 196,198 Q110,210 70,170 Z" fill="#ECEFF1" />
      <path d="M168,186 L146,236 L196,192 Z" fill="#607D8B" />
      {/* 鰓 */}
      <path d="M206,140 q-6,14 0,28 M216,140 q-6,14 0,28 M226,142 q-6,12 0,24" stroke="#546E7A" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Eye x={244} y={146} r={7} />
      {/* 笑嘻嘻、有小牙齒的嘴 */}
      <path d="M232,174 Q256,186 278,166" stroke={OUTLINE} strokeWidth={3} fill="none" strokeLinecap="round" />
      <polygon points="242,178 245,186 249,180" fill="white" />
      <polygon points="254,180 257,187 260,179" fill="white" />
      <polygon points="265,176 268,182 271,173" fill="white" />
      <Cheek x={236} y={164} />
    </g>
  );
}

function Seahorse() {
  const body = "#FFB74D";
  const dark = "#FB8C00";
  return (
    <g>
      <Sea water="#B2EBF2" top="#E0F7FA" />
      <Seaweed x={28} h={190} color="#66BB6A" />
      <Seaweed x={48} h={130} color="#43A047" />
      <Seaweed x={270} h={170} color="#66BB6A" />
      <ellipse cx={210} cy={270} rx={14} ry={9} fill="#F8BBD0" />
      <Starfish x={90} y={278} color="#EF5350" />
      <Bubbles list={[{ x: 230, y: 70, r: 6 }, { x: 242, y: 52, r: 4 }, { x: 90, y: 110, r: 4 }]} />

      {/* 捲起來的尾巴 */}
      <path d="M158,212 Q152,256 122,254 Q100,250 106,230 Q114,216 128,226" stroke={body} strokeWidth={16} fill="none" strokeLinecap="round" />
      {/* 背鰭 */}
      <path d="M130,140 Q102,150 112,178 Q124,168 136,170 Z" fill="#FFE0B2" />
      {/* 身體、肚子的紋路 */}
      <path d="M150,96 Q118,140 140,192 Q152,220 176,202 Q194,160 176,108 Z" fill={body} />
      <path d="M170,124 q10,6 12,0 M172,144 q10,6 14,0 M172,164 q10,6 12,0 M166,184 q8,6 12,0" stroke={dark} strokeWidth={3} fill="none" strokeLinecap="round" />
      {/* 頭、長嘴、頭上的小冠 */}
      <ellipse cx={164} cy={86} rx={26} ry={22} fill={body} />
      <rect x={176} y={82} width={44} height={14} rx={7} fill={body} />
      <path d="M146,72 L150,52 L160,66 L166,48 L174,66" fill={dark} stroke={dark} strokeWidth={3} strokeLinejoin="round" />
      <Eye x={166} y={82} r={8} />
      <Cheek x={160} y={100} />
    </g>
  );
}

const PLANKTON = [
  { x: 30, y: 40 },
  { x: 90, y: 30 },
  { x: 270, y: 50 },
  { x: 250, y: 120 },
  { x: 40, y: 230 },
  { x: 120, y: 260 },
  { x: 220, y: 270 },
  { x: 280, y: 220 },
  { x: 20, y: 130 },
];

function Anglerfish() {
  const body = "#7E57C2";
  return (
    <g>
      <rect width={300} height={300} fill="#1A237E" />
      <path d="M0,270 Q75,258 150,270 Q225,282 300,266 L300,300 L0,300 Z" fill="#283593" />
      {PLANKTON.map((p) => (
        <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r={2.5} fill="#B2FF59" opacity={0.7} />
      ))}
      {/* 發光的小燈籠 */}
      <path d="M156,104 Q176,40 230,62" stroke="#B39DDB" strokeWidth={4} fill="none" strokeLinecap="round" />
      <circle cx={234} cy={68} r={26} fill="#FFF59D" opacity={0.18} />
      <circle cx={234} cy={68} r={16} fill="#FFF59D" opacity={0.35} />
      <circle cx={234} cy={68} r={9} fill="#FFFDE7" />

      {/* 尾巴、鰭 */}
      <path d="M70,170 L26,130 Q18,170 26,210 Z" fill="#673AB7" />
      <path d="M110,110 Q120,82 150,104 Z" fill="#673AB7" />
      <ellipse cx={140} cy={225} rx={22} ry={10} fill="#673AB7" transform="rotate(20 140 225)" />
      {/* 圓滾滾的身體 */}
      <ellipse cx={145} cy={170} rx={82} ry={66} fill={body} />
      <ellipse cx={150} cy={200} rx={56} ry={22} fill="#9575CD" />
      <circle cx={100} cy={150} r={6} fill="#673AB7" />
      <circle cx={120} cy={128} r={4} fill="#673AB7" />
      {/* 大嘴巴與小尖牙（笑笑的，不可怕） */}
      <path d="M168,182 Q204,222 242,178 Q204,204 168,182 Z" fill="#311B92" />
      <polygon points="178,186 182,196 186,190" fill="white" />
      <polygon points="194,193 198,203 202,196" fill="white" />
      <polygon points="212,195 216,204 220,196" fill="white" />
      <polygon points="228,188 232,197 236,186" fill="white" />
      <Eye x={182} y={142} r={13} />
      <Cheek x={168} y={170} />
    </g>
  );
}

const REEF = [
  { x: 40, y: 262, r: 18, c: "#FFD54F" },
  { x: 120, y: 268, r: 14, c: "#FF8A80" },
  { x: 250, y: 262, r: 20, c: "#CE93D8" },
];

function BlueTang() {
  const body = "#1E88E5";
  return (
    <g>
      <Sea water="#4DD0E1" top="#B2EBF2" sand="#FFECB3" />
      {/* 珊瑚礁 */}
      {REEF.map((r) => (
        <g key={r.x}>
          <circle cx={r.x} cy={r.y} r={r.r} fill={r.c} />
          <path d={`M${r.x - r.r * 0.6},${r.y} q${r.r * 0.3},-${r.r * 0.5} ${r.r * 0.6},0 q${r.r * 0.3},${r.r * 0.5} ${r.r * 0.6},0`} stroke="white" strokeWidth={2} fill="none" opacity={0.6} />
        </g>
      ))}
      <path d="M190,268 L190,226 M190,246 L172,224 M190,240 L208,214" stroke="#F06292" strokeWidth={8} strokeLinecap="round" />
      <Seaweed x={280} h={120} color="#26A69A" />
      <Bubbles list={[{ x: 250, y: 80, r: 6 }, { x: 262, y: 60, r: 4 }, { x: 60, y: 70, r: 4 }]} />

      {/* 黃色尾巴 */}
      <path d="M86,146 L40,108 Q50,146 40,184 Z" fill="#FFEB3B" stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      {/* 背鰭、腹鰭 */}
      <path d="M98,112 Q150,70 214,112 Z" fill={body} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      <path d="M104,178 Q150,214 196,180 Z" fill={body} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      {/* 身體與深藍色花紋 */}
      <ellipse cx={150} cy={146} rx={76} ry={50} fill={body} stroke={OUTLINE} strokeWidth={3} />
      <path d="M90,128 Q150,98 210,128 Q172,134 152,164 Q130,140 90,150 Z" fill="#0D47A1" />
      <path d="M96,166 Q120,176 150,170" stroke="#0D47A1" strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d="M176,152 Q186,172 204,162" fill="#FFEB3B" stroke={OUTLINE} strokeWidth={2.5} />
      <Eye x={204} y={134} r={11} />
      <path d="M212,160 Q219,165 226,158" stroke={OUTLINE} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Cheek x={200} y={154} />
    </g>
  );
}

function Jellyfish() {
  const bell = "#F48FB1";
  const tentacles = [112, 132, 152, 172, 192];
  return (
    <g>
      <Sea water="#5C6BC0" top="#9FA8DA" sand="#C5CAE9" />
      <Seaweed x={30} h={100} color="#26A69A" />
      <Seaweed x={270} h={130} color="#26A69A" />
      {/* 遠處的小水母 */}
      <path d="M56,92 Q66,70 76,92 Z" fill="#CE93D8" opacity={0.7} />
      <path d="M60,92 q-2,10 0,18 M66,92 q2,10 0,18 M72,92 q-2,10 0,18" stroke="#CE93D8" strokeWidth={2} fill="none" opacity={0.7} />
      <path d="M232,200 Q244,176 256,200 Z" fill="#80DEEA" opacity={0.7} />
      <Bubbles list={[{ x: 240, y: 80, r: 6 }, { x: 252, y: 62, r: 4 }, { x: 90, y: 200, r: 4 }]} />

      {/* 飄飄的觸手 */}
      {tentacles.map((x, i) => (
        <path
          key={x}
          d={`M${x},170 q${i % 2 ? 12 : -12},20 0,40 q${i % 2 ? -12 : 12},20 0,40`}
          stroke={i % 2 ? "#F8BBD0" : "#CE93D8"}
          strokeWidth={7}
          fill="none"
          strokeLinecap="round"
        />
      ))}
      {/* 圓圓的傘 */}
      <path d="M86,172 Q86,82 152,82 Q218,82 218,172 Q200,162 184,172 Q168,162 152,172 Q136,162 120,172 Q104,162 86,172 Z" fill={bell} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      <path d="M110,118 Q124,98 146,96" stroke="white" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.6} />
      <Eye x={130} y={134} r={11} />
      <Eye x={174} y={134} r={11} />
      <path d="M142,154 Q152,162 162,154" stroke={OUTLINE} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Cheek x={116} y={152} />
      <Cheek x={188} y={152} />
    </g>
  );
}

function SeaTurtle() {
  const skin = "#AED581";
  return (
    <g>
      <Sea water="#29B6F6" top="#81D4FA" />
      <Seaweed x={34} h={120} color="#43A047" />
      <path d="M250,268 L250,226 M250,246 L232,224 M250,240 L268,214" stroke="#FF8A65" strokeWidth={8} strokeLinecap="round" />
      <Starfish x={190} y={278} color="#FFD54F" />
      <Bubbles list={[{ x: 70, y: 70, r: 5 }, { x: 82, y: 54, r: 3 }, { x: 236, y: 90, r: 5 }]} />

      {/* 四隻鰭腳 */}
      <ellipse cx={104} cy={108} rx={34} ry={14} fill={skin} stroke={OUTLINE} strokeWidth={3} transform="rotate(-30 104 108)" />
      <ellipse cx={196} cy={108} rx={34} ry={14} fill={skin} stroke={OUTLINE} strokeWidth={3} transform="rotate(30 196 108)" />
      <ellipse cx={110} cy={200} rx={24} ry={11} fill={skin} stroke={OUTLINE} strokeWidth={3} transform="rotate(30 110 200)" />
      <ellipse cx={190} cy={200} rx={24} ry={11} fill={skin} stroke={OUTLINE} strokeWidth={3} transform="rotate(-30 190 200)" />
      {/* 頭 */}
      <ellipse cx={150} cy={80} rx={26} ry={24} fill={skin} stroke={OUTLINE} strokeWidth={3} />
      <Eye x={140} y={76} r={7} />
      <Eye x={162} y={76} r={7} />
      <path d="M142,92 Q151,98 160,92" stroke={OUTLINE} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      {/* 龜殼與花紋 */}
      <ellipse cx={150} cy={156} rx={60} ry={64} fill="#558B2F" stroke={OUTLINE} strokeWidth={3} />
      <polygon points="150,118 176,134 176,166 150,182 124,166 124,134" fill="#8BC34A" stroke="#33691E" strokeWidth={3} />
      <path d="M150,118 L150,96 M176,134 L198,122 M176,166 L198,180 M150,182 L150,214 M124,166 L102,180 M124,134 L102,122" stroke="#33691E" strokeWidth={3} strokeLinecap="round" />
      <Cheek x={134} y={88} />
      <Cheek x={168} y={88} />
    </g>
  );
}

function Stingray() {
  const body = "#90A4AE";
  return (
    <g>
      <Sea water="#4DD0E1" top="#B2EBF2" sand="#FFE082" />
      <Seaweed x={270} h={100} color="#26A69A" />
      <ellipse cx={60} cy={272} rx={20} ry={7} fill="#FFCA28" />
      <Starfish x={220} y={280} color="#FF8A65" />
      <Bubbles list={[{ x: 60, y: 70, r: 6 }, { x: 72, y: 52, r: 4 }, { x: 250, y: 70, r: 4 }]} />

      {/* 長長的尾巴 */}
      <path d="M150,196 Q160,240 200,262" stroke={body} strokeWidth={6} fill="none" strokeLinecap="round" />
      {/* 菱形的身體（像風箏） */}
      <path d="M150,82 Q196,104 262,140 Q206,168 150,204 Q94,168 38,140 Q104,104 150,82 Z" fill={body} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      <path d="M150,100 Q186,118 230,140 Q190,158 150,184 Q110,158 70,140 Q114,118 150,100 Z" fill="#B0BEC5" />
      <circle cx={104} cy={140} r={4} fill="#78909C" />
      <circle cx={196} cy={140} r={4} fill="#78909C" />
      <circle cx={122} cy={160} r={3} fill="#78909C" />
      <circle cx={178} cy={160} r={3} fill="#78909C" />
      <Eye x={134} y={122} r={9} />
      <Eye x={166} y={122} r={9} />
      <path d="M140,146 Q150,154 160,146" stroke={OUTLINE} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Cheek x={122} y={138} />
      <Cheek x={178} y={138} />
    </g>
  );
}

function Octopus() {
  const body = "#AB47BC";
  const legs = [96, 122, 150, 178, 204];
  return (
    <g>
      <Sea water="#26C6DA" top="#80DEEA" sand="#FFECB3" />
      <path d="M40,268 L40,224 M40,244 L22,222 M40,238 L58,212" stroke="#FF7043" strokeWidth={8} strokeLinecap="round" />
      <ellipse cx={262} cy={268} rx={22} ry={12} fill="#BCAAA4" />
      <Bubbles list={[{ x: 230, y: 70, r: 6 }, { x: 242, y: 52, r: 4 }, { x: 70, y: 90, r: 4 }]} />

      {/* 捲捲的腳 */}
      {legs.map((x, i) => (
        <path
          key={x}
          d={`M${x},180 Q${x + (i - 2) * 14},236 ${x + (i - 2) * 24 + (i % 2 ? 14 : -14)},244`}
          stroke={body}
          strokeWidth={16}
          fill="none"
          strokeLinecap="round"
        />
      ))}
      {legs.map((x, i) => (
        <circle key={`s${x}`} cx={x + (i - 2) * 10} cy={220} r={3.5} fill="#E1BEE7" />
      ))}
      {/* 圓圓的頭 */}
      <ellipse cx={150} cy={132} rx={66} ry={64} fill={body} stroke={OUTLINE} strokeWidth={3} />
      <circle cx={118} cy={96} r={7} fill="#CE93D8" />
      <circle cx={186} cy={92} r={5} fill="#CE93D8" />
      <circle cx={196} cy={112} r={4} fill="#CE93D8" />
      <Eye x={128} y={140} r={13} />
      <Eye x={172} y={140} r={13} />
      <path d="M138,166 Q150,176 162,166" stroke={OUTLINE} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Cheek x={110} y={164} />
      <Cheek x={190} y={164} />
    </g>
  );
}

function Swordfish() {
  const body = "#3949AB";
  return (
    <g>
      <Sea water="#0277BD" top="#4FC3F7" sand="#FFE0B2" />
      <Seaweed x={36} h={90} color="#26A69A" />
      <Seaweed x={260} h={110} color="#26A69A" />
      <Bubbles list={[{ x: 70, y: 70, r: 5 }, { x: 82, y: 54, r: 3 }, { x: 220, y: 230, r: 5 }]} />

      {/* 尾巴與高高的背鰭 */}
      <path d="M62,150 L22,106 Q36,150 22,194 Z" fill={body} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      <path d="M110,124 Q118,62 160,52 Q150,90 172,122 Z" fill={body} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      {/* 長長的劍 */}
      <path d="M220,144 L294,138 L222,154 Z" fill="#B0BEC5" stroke={OUTLINE} strokeWidth={2.5} strokeLinejoin="round" />
      {/* 身體 */}
      <path d="M54,150 Q100,108 170,116 Q214,122 230,148 Q214,174 170,182 Q100,190 54,150 Z" fill={body} stroke={OUTLINE} strokeWidth={3} />
      <path d="M78,160 Q130,186 222,156 Q206,172 170,180 Q110,188 78,160 Z" fill="#C5CAE9" />
      <path d="M140,170 L126,206 L162,174 Z" fill="#283593" />
      <Eye x={204} y={140} r={9} />
      <path d="M206,160 Q214,164 222,158" stroke={OUTLINE} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Cheek x={196} y={156} />
    </g>
  );
}

function Crab() {
  const shell = "#EF5350";
  return (
    <g>
      <Sea water="#81D4FA" top="#E1F5FE" sand="#FFE082" />
      <path d="M0,232 Q75,222 150,232 Q225,242 300,228 L300,300 L0,300 Z" fill="#FFE082" />
      <ellipse cx={50} cy={270} rx={18} ry={9} fill="#F8BBD0" />
      <Starfish x={250} y={262} color="#FFB74D" />
      <Seaweed x={280} h={80} color="#43A047" />
      <Bubbles list={[{ x: 70, y: 70, r: 6 }, { x: 82, y: 52, r: 4 }, { x: 236, y: 80, r: 5 }]} />

      {/* 腳 */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <path d={`M${110 - i * 4},${190 + i * 12} q-26,6 -36,${24 + i * 4}`} stroke={shell} strokeWidth={8} fill="none" strokeLinecap="round" />
          <path d={`M${190 + i * 4},${190 + i * 12} q26,6 36,${24 + i * 4}`} stroke={shell} strokeWidth={8} fill="none" strokeLinecap="round" />
        </g>
      ))}
      {/* 大鉗子 */}
      <path d="M104,170 Q76,150 70,120" stroke={shell} strokeWidth={10} fill="none" strokeLinecap="round" />
      <path d="M196,170 Q224,150 230,120" stroke={shell} strokeWidth={10} fill="none" strokeLinecap="round" />
      <path d="M70,124 Q46,110 54,82 Q62,96 74,94 Q72,80 84,70 Q96,100 70,124 Z" fill={shell} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      <path d="M230,124 Q254,110 246,82 Q238,96 226,94 Q228,80 216,70 Q204,100 230,124 Z" fill={shell} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      {/* 殼 */}
      <ellipse cx={150} cy={188} rx={62} ry={42} fill={shell} stroke={OUTLINE} strokeWidth={3} />
      <circle cx={120} cy={176} r={5} fill="#E57373" />
      <circle cx={182} cy={176} r={4} fill="#E57373" />
      {/* 站在上面的眼睛 */}
      <path d="M134,150 L132,124 M166,150 L168,124" stroke={shell} strokeWidth={6} strokeLinecap="round" />
      <Eye x={132} y={118} r={10} />
      <Eye x={168} y={118} r={10} />
      <path d="M138,198 Q150,208 162,198" stroke={OUTLINE} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Cheek x={116} y={196} />
      <Cheek x={184} y={196} />
    </g>
  );
}

const SCENES: Record<FishId, () => React.JSX.Element> = {
  clownfish: Clownfish,
  pufferfish: Pufferfish,
  shark: Shark,
  seahorse: Seahorse,
  anglerfish: Anglerfish,
  bluetang: BlueTang,
  jellyfish: Jellyfish,
  seaturtle: SeaTurtle,
  stingray: Stingray,
  octopus: Octopus,
  swordfish: Swordfish,
  crab: Crab,
};

/** 整張圖或其中一塊（view 是要裁出來的範圍，座標同 0~300 的原圖） */
export default function FishArt({
  id,
  view = { x: 0, y: 0, w: ART_SIZE, h: ART_SIZE },
  className,
  style,
}: {
  id: FishId;
  view?: Rect;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Scene = SCENES[id];
  return (
    <svg
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      preserveAspectRatio="none"
      className={className}
      style={style}
      aria-hidden
    >
      <Scene />
    </svg>
  );
}
