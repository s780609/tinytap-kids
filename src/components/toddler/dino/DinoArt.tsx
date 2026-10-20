import { ART_SIZE, type DinoId } from "@/lib/dino/puzzle";

/*
 * 六張恐龍拼圖的圖（座標 0~300 的正方形，含背景）。
 * 拼圖碎片是用不同的 viewBox 裁同一張圖，所以這裡不用 gradient / clipPath 這類要 id 的東西，
 * 同一張圖在畫面上出現很多次也不會互相干擾。
 */

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g fill="white" opacity={0.9}>
      <ellipse cx={x} cy={y} rx={22 * s} ry={13 * s} />
      <ellipse cx={x + 18 * s} cy={y - 8 * s} rx={16 * s} ry={13 * s} />
      <ellipse cx={x + 32 * s} cy={y} rx={18 * s} ry={11 * s} />
    </g>
  );
}

function Sun({ x, y, r = 22, color = "#FFD54F" }: { x: number; y: number; r?: number; color?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r + 8} fill={color} opacity={0.35} />
      <circle cx={x} cy={y} r={r} fill={color} />
    </g>
  );
}

function Grass({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <path
      d={`M${x - 8},${y} Q${x - 6},${y - 12} ${x - 2},${y} Q${x},${y - 16} ${x + 3},${y} Q${x + 6},${y - 11} ${x + 9},${y}`}
      fill={color}
    />
  );
}

function Eye({ x, y, r = 9 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="white" />
      <circle cx={x + r * 0.25} cy={y + r * 0.1} r={r * 0.55} fill="#263238" />
      <circle cx={x + r * 0.45} cy={y - r * 0.2} r={r * 0.2} fill="white" />
    </g>
  );
}

function Cheek({ x, y }: { x: number; y: number }) {
  return <ellipse cx={x} cy={y} rx={7} ry={4} fill="#F48FB1" opacity={0.75} />;
}

function TRex() {
  const body = "#66BB6A";
  const spot = "#43A047";
  return (
    <g>
      <rect width={300} height={300} fill="#B3E5FC" />
      <Sun x={45} y={45} />
      <Cloud x={110} y={45} />
      <polygon points="0,250 55,150 90,150 150,250" fill="#8D6E63" />
      <path d="M55,150 Q72,140 90,150 L84,162 Q72,154 61,162 Z" fill="#FF7043" />
      <ellipse cx={72} cy={125} rx={14} ry={10} fill="#BDBDBD" opacity={0.8} />
      <ellipse cx={82} cy={105} rx={11} ry={8} fill="#BDBDBD" opacity={0.6} />
      <rect y={245} width={300} height={55} fill="#A5D6A7" />
      <Grass x={250} y={275} color="#66BB6A" />
      <Grass x={40} y={285} color="#66BB6A" />

      {/* 尾巴、腳 */}
      <path d="M105,200 Q55,205 18,252 Q75,236 118,228 Z" fill={body} />
      <rect x={118} y={212} width={30} height={42} rx={12} fill={spot} />
      <rect x={160} y={212} width={30} height={42} rx={12} fill={body} />
      <ellipse cx={136} cy={254} rx={20} ry={8} fill={spot} />
      <ellipse cx={178} cy={254} rx={20} ry={8} fill={body} />
      {/* 身體、脖子、頭 */}
      <ellipse cx={145} cy={190} rx={55} ry={45} fill={body} />
      <ellipse cx={182} cy={145} rx={30} ry={38} fill={body} />
      <rect x={160} y={75} width={100} height={70} rx={32} fill={body} />
      <ellipse cx={162} cy={202} rx={28} ry={30} fill="#C5E1A5" />
      <circle cx={120} cy={165} r={7} fill={spot} />
      <circle cx={104} cy={190} r={5} fill={spot} />
      <circle cx={142} cy={155} r={5} fill={spot} />
      <circle cx={185} cy={88} r={5} fill={spot} />
      {/* 小手 */}
      <path d="M190,178 q16,2 18,16" stroke={body} strokeWidth={9} strokeLinecap="round" fill="none" />
      {/* 臉 */}
      <Eye x={202} y={102} r={11} />
      <circle cx={248} cy={95} r={2.5} fill="#2E7D32" />
      <path d="M200,126 Q228,142 255,120" stroke="#2E7D32" strokeWidth={3} fill="none" strokeLinecap="round" />
      <polygon points="212,131 216,139 220,133" fill="white" />
      <polygon points="226,134 230,142 234,135" fill="white" />
      <polygon points="240,131 244,138 247,128" fill="white" />
      <Cheek x={222} y={116} />
    </g>
  );
}

function Triceratops() {
  const body = "#FFA726";
  const horn = "#FFF8E1";
  const dots = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI * (0.55 + (i / 8) * 1.25);
    return { x: 210 + Math.cos(a) * 41, y: 145 + Math.sin(a) * 41 };
  });
  return (
    <g>
      <rect width={300} height={300} fill="#FFF9C4" />
      <Sun x={50} y={50} color="#FFB300" />
      <Cloud x={150} y={40} s={0.9} />
      <Cloud x={235} y={65} s={0.7} />
      <rect y={240} width={300} height={60} fill="#C5E1A5" />
      <Grass x={30} y={280} color="#8BC34A" />
      <Grass x={150} y={290} color="#8BC34A" />
      <ellipse cx={268} cy={268} rx={13} ry={16} fill="#FFFDE7" />
      <path d="M258,266 l5,-5 l5,5 l5,-5 l5,5" stroke="#FFB74D" strokeWidth={2} fill="none" />

      <path d="M75,170 Q35,175 16,212 Q60,202 85,192 Z" fill={body} />
      <rect x={85} y={195} width={26} height={50} rx={10} fill="#FB8C00" />
      <rect x={118} y={195} width={26} height={50} rx={10} fill={body} />
      <rect x={160} y={195} width={26} height={50} rx={10} fill="#FB8C00" />
      <rect x={190} y={195} width={26} height={50} rx={10} fill={body} />
      <ellipse cx={140} cy={178} rx={75} ry={45} fill={body} />
      <ellipse cx={140} cy={200} rx={55} ry={16} fill="#FFE0B2" />
      <circle cx={105} cy={160} r={7} fill="#FB8C00" />
      <circle cx={130} cy={150} r={5} fill="#FB8C00" />
      <circle cx={92} cy={185} r={5} fill="#FB8C00" />
      {/* 頸盾 */}
      <circle cx={210} cy={145} r={46} fill="#EF6C00" />
      <circle cx={210} cy={145} r={36} fill="#FFB74D" />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={4.5} fill="#FFE0B2" />
      ))}
      {/* 頭 */}
      <ellipse cx={232} cy={170} rx={38} ry={30} fill={body} />
      <polygon points="218,148 236,92 232,150" fill={horn} />
      <polygon points="240,148 262,98 252,152" fill={horn} />
      <polygon points="260,164 292,150 266,175" fill={horn} />
      <Eye x={236} y={160} r={8} />
      <path d="M246,186 Q258,194 270,182" stroke="#E65100" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Cheek x={226} y={180} />
    </g>
  );
}

function Stegosaurus() {
  const body = "#26A69A";
  const plate = "#FFCA28";
  // 背上的骨板：沿著身體橢圓的上緣
  const plates = [
    { x: 85, top: 149, h: 25 },
    { x: 110, top: 139, h: 35 },
    { x: 135, top: 135, h: 40 },
    { x: 160, top: 137, h: 35 },
    { x: 185, top: 144, h: 28 },
  ];
  return (
    <g>
      <rect width={300} height={300} fill="#FCE4EC" />
      <Sun x={250} y={50} color="#FFB74D" />
      <Cloud x={40} y={50} />
      <Cloud x={130} y={80} s={0.7} />
      <rect y={245} width={300} height={55} fill="#AED581" />
      <circle cx={40} cy={272} r={6} fill="#F06292" />
      <circle cx={40} cy={272} r={2.5} fill="#FFF59D" />
      <circle cx={260} cy={280} r={6} fill="#BA68C8" />
      <circle cx={260} cy={280} r={2.5} fill="#FFF59D" />
      <Grass x={150} y={285} color="#7CB342" />

      {plates.map((p) => (
        <polygon
          key={p.x}
          points={`${p.x - 14},${p.top + 10} ${p.x},${p.top - p.h} ${p.x + 14},${p.top + 10}`}
          fill={plate}
          stroke={plate}
          strokeWidth={6}
          strokeLinejoin="round"
        />
      ))}
      <path d="M75,178 Q35,178 16,146 Q40,202 85,198 Z" fill={body} />
      <polygon points="24,160 6,134 34,152" fill="#FFF8E1" />
      <polygon points="38,170 30,140 48,164" fill="#FFF8E1" />
      <rect x={88} y={198} width={24} height={48} rx={10} fill="#00897B" />
      <rect x={115} y={198} width={24} height={48} rx={10} fill={body} />
      <rect x={160} y={198} width={24} height={48} rx={10} fill="#00897B" />
      <rect x={186} y={198} width={24} height={48} rx={10} fill={body} />
      <ellipse cx={140} cy={180} rx={75} ry={45} fill={body} />
      <ellipse cx={145} cy={205} rx={50} ry={15} fill="#B2DFDB" />
      <circle cx={115} cy={175} r={6} fill="#00897B" />
      <circle cx={150} cy={165} r={8} fill="#00897B" />
      <circle cx={180} cy={182} r={5} fill="#00897B" />
      <ellipse cx={210} cy={196} rx={25} ry={16} fill={body} />
      <ellipse cx={240} cy={201} rx={27} ry={19} fill={body} />
      <Eye x={244} y={194} r={7} />
      <path d="M250,209 Q259,214 265,205" stroke="#00695C" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Cheek x={234} y={208} />
    </g>
  );
}

function Brachiosaurus() {
  const body = "#42A5F5";
  const spot = "#90CAF9";
  return (
    <g>
      <rect width={300} height={300} fill="#E0F7FA" />
      <Sun x={275} y={150} r={18} />
      <Cloud x={95} y={45} />
      <rect y={245} width={300} height={55} fill="#A5D6A7" />
      {/* 椰子樹 */}
      <path d="M38,250 Q30,195 46,140" stroke="#8D6E63" strokeWidth={10} fill="none" strokeLinecap="round" />
      <ellipse cx={26} cy={138} rx={26} ry={9} fill="#43A047" transform="rotate(20 26 138)" />
      <ellipse cx={68} cy={138} rx={26} ry={9} fill="#43A047" transform="rotate(-20 68 138)" />
      <ellipse cx={46} cy={126} rx={9} ry={24} fill="#66BB6A" />
      <circle cx={44} cy={146} r={5} fill="#795548" />
      <circle cx={52} cy={148} r={5} fill="#795548" />
      <Grass x={260} y={280} color="#66BB6A" />

      <path d="M70,195 Q30,205 10,242 Q55,224 82,215 Z" fill={body} />
      <rect x={85} y={210} width={26} height={45} rx={10} fill="#1E88E5" />
      <rect x={112} y={210} width={26} height={45} rx={10} fill={body} />
      <rect x={150} y={205} width={26} height={50} rx={10} fill="#1E88E5" />
      <rect x={176} y={205} width={26} height={50} rx={10} fill={body} />
      <ellipse cx={130} cy={195} rx={68} ry={42} fill={body} />
      <path d="M150,172 Q195,130 200,60 L242,60 Q238,140 190,205 Z" fill={body} />
      <ellipse cx={228} cy={55} rx={32} ry={22} fill={body} />
      <circle cx={214} cy={38} r={13} fill={body} />
      <ellipse cx={135} cy={213} rx={48} ry={13} fill="#BBDEFB" />
      <circle cx={100} cy={180} r={8} fill={spot} />
      <circle cx={130} cy={168} r={6} fill={spot} />
      <circle cx={160} cy={185} r={7} fill={spot} />
      <circle cx={212} cy={120} r={6} fill={spot} />
      <circle cx={220} cy={92} r={5} fill={spot} />
      <Eye x={232} y={48} r={8} />
      <path d="M240,64 Q250,71 258,61" stroke="#1565C0" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Cheek x={226} y={64} />
    </g>
  );
}

function Pteranodon() {
  const body = "#EC407A";
  const wing = "#F06292";
  return (
    <g>
      <rect width={300} height={300} fill="#81D4FA" />
      <Sun x={45} y={45} />
      <Cloud x={200} y={40} />
      <Cloud x={30} y={200} s={0.7} />
      <rect y={235} width={300} height={65} fill="#29B6F6" />
      <path d="M20,255 q10,-8 20,0 q10,8 20,0" stroke="white" strokeWidth={3} fill="none" opacity={0.8} />
      <path d="M150,272 q10,-8 20,0 q10,8 20,0" stroke="white" strokeWidth={3} fill="none" opacity={0.8} />
      <path d="M230,250 q10,-8 20,0 q10,8 20,0" stroke="white" strokeWidth={3} fill="none" opacity={0.8} />
      <ellipse cx={270} cy={240} rx={34} ry={10} fill="#FFE082" />

      <polygon points="150,140 25,105 55,175 135,180" fill={wing} stroke={wing} strokeWidth={6} strokeLinejoin="round" />
      <polygon points="150,140 275,105 245,175 165,180" fill={wing} stroke={wing} strokeWidth={6} strokeLinejoin="round" />
      <path d="M140,150 L50,118 M140,160 L62,160" stroke="#F8BBD0" strokeWidth={3} strokeLinecap="round" />
      <path d="M160,150 L250,118 M160,160 L238,160" stroke="#F8BBD0" strokeWidth={3} strokeLinecap="round" />
      <line x1={142} y1={198} x2={136} y2={218} stroke="#FFB300" strokeWidth={5} strokeLinecap="round" />
      <line x1={158} y1={198} x2={164} y2={218} stroke="#FFB300" strokeWidth={5} strokeLinecap="round" />
      <ellipse cx={150} cy={165} rx={24} ry={38} fill={body} />
      <ellipse cx={150} cy={174} rx={14} ry={24} fill="#FCE4EC" />
      <polygon points="140,106 96,82 150,96" fill={body} stroke={body} strokeWidth={4} strokeLinejoin="round" />
      <ellipse cx={152} cy={115} rx={22} ry={20} fill={body} />
      <polygon points="166,108 224,121 166,128" fill="#FFCA28" stroke="#FFCA28" strokeWidth={3} strokeLinejoin="round" />
      <Eye x={155} y={110} r={7} />
      <Cheek x={150} y={124} />
    </g>
  );
}

function Ankylosaurus() {
  const body = "#8D6E63";
  const armor = "#6D4C41";
  const bumps = [
    { x: 125, y: 134, r: 7 },
    { x: 150, y: 130, r: 7 },
    { x: 175, y: 134, r: 7 },
    { x: 100, y: 152, r: 9 },
    { x: 130, y: 152, r: 9 },
    { x: 160, y: 152, r: 9 },
    { x: 190, y: 152, r: 9 },
    { x: 80, y: 176, r: 8 },
    { x: 110, y: 176, r: 8 },
    { x: 140, y: 176, r: 8 },
    { x: 170, y: 176, r: 8 },
    { x: 200, y: 176, r: 8 },
    { x: 225, y: 178, r: 7 },
  ];
  return (
    <g>
      <rect width={300} height={300} fill="#FFE0B2" />
      <Sun x={240} y={70} r={30} color="#FF8A65" />
      <Cloud x={40} y={55} s={0.9} />
      <rect y={240} width={300} height={60} fill="#BCAAA4" />
      <ellipse cx={45} cy={268} rx={20} ry={11} fill="#A1887F" />
      <ellipse cx={265} cy={280} rx={14} ry={8} fill="#A1887F" />
      <Grass x={170} y={285} color="#8D6E63" />

      <path d="M75,192 Q42,192 36,172" stroke={body} strokeWidth={16} strokeLinecap="round" fill="none" />
      <polygon points="18,152 12,140 26,150" fill="#FFF8E1" />
      <polygon points="40,152 46,140 34,150" fill="#FFF8E1" />
      <ellipse cx={30} cy={162} rx={20} ry={15} fill={armor} />
      <rect x={85} y={200} width={24} height={40} rx={8} fill={armor} />
      <rect x={110} y={200} width={24} height={40} rx={8} fill={body} />
      <rect x={172} y={200} width={24} height={40} rx={8} fill={armor} />
      <rect x={198} y={200} width={24} height={40} rx={8} fill={body} />
      <path d="M60,205 Q60,120 150,120 Q240,120 240,205 Z" fill={body} />
      {[80, 115, 150, 185, 220].map((x) => (
        <polygon key={x} points={`${x - 9},200 ${x},212 ${x + 9},200`} fill="#FFF8E1" />
      ))}
      <rect x={60} y={193} width={180} height={12} rx={6} fill="#D7CCC8" />
      {bumps.map((b) => (
        <circle key={`${b.x}-${b.y}`} cx={b.x} cy={b.y} r={b.r} fill={armor} />
      ))}
      <polygon points="236,178 240,160 248,176" fill="#FFF8E1" />
      <ellipse cx={254} cy={192} rx={28} ry={20} fill={body} />
      <Eye x={258} y={185} r={7} />
      <path d="M262,200 Q270,205 277,197" stroke="#4E342E" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Cheek x={250} y={200} />
    </g>
  );
}

const SCENES: Record<DinoId, () => React.JSX.Element> = {
  trex: TRex,
  triceratops: Triceratops,
  stegosaurus: Stegosaurus,
  brachiosaurus: Brachiosaurus,
  pteranodon: Pteranodon,
  ankylosaurus: Ankylosaurus,
};

/** 整張圖或其中一塊（view 是要裁出來的範圍，座標同 0~300 的原圖） */
export default function DinoArt({
  id,
  view = { x: 0, y: 0, w: ART_SIZE, h: ART_SIZE },
  className,
  style,
}: {
  id: DinoId;
  view?: { x: number; y: number; w: number; h: number };
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
