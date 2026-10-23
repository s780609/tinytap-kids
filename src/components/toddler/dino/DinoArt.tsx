import { ART_SIZE, type DinoId } from "@/lib/dino/puzzle";

/*
 * 十二張恐龍拼圖的圖（座標 0~300 的正方形，含背景）。
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

export function Eye({ x, y, r = 9 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="white" />
      <circle cx={x + r * 0.25} cy={y + r * 0.1} r={r * 0.55} fill="#263238" />
      <circle cx={x + r * 0.45} cy={y - r * 0.2} r={r * 0.2} fill="white" />
    </g>
  );
}

export function Cheek({ x, y }: { x: number; y: number }) {
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

function Velociraptor() {
  const body = "#7E57C2";
  const dark = "#5E35B1";
  const feather = "#FFB74D";
  return (
    <g>
      <rect width={300} height={300} fill="#FFF3E0" />
      <Sun x={250} y={48} color="#FFA726" />
      <Cloud x={40} y={55} s={0.8} />
      <polygon points="0,215 50,150 95,205 150,160 210,215 255,170 300,210 300,240 0,240" fill="#D1C4E9" />
      <rect y={235} width={300} height={65} fill="#FFCC80" />
      <ellipse cx={40} cy={262} rx={18} ry={9} fill="#BCAAA4" />
      <ellipse cx={268} cy={278} rx={14} ry={7} fill="#BCAAA4" />
      <Grass x={200} y={285} color="#8BC34A" />
      <Grass x={90} y={290} color="#8BC34A" />

      {/* 尾巴、遠的那隻腳 */}
      <path d="M112,150 Q60,128 10,112 Q55,150 112,180 Z" fill={body} />
      <path d="M165,180 L188,220 L176,250" stroke={dark} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <ellipse cx={186} cy={252} rx={15} ry={6} fill={dark} />
      {/* 身體與條紋 */}
      <ellipse cx={150} cy={160} rx={52} ry={30} fill={body} transform="rotate(-12 150 160)" />
      <ellipse cx={160} cy={174} rx={32} ry={13} fill="#D1C4E9" transform="rotate(-12 160 174)" />
      <path d="M120,150 q6,10 2,22 M140,142 q6,12 2,24 M160,136 q6,12 2,24" stroke={dark} strokeWidth={5} strokeLinecap="round" fill="none" />
      {/* 近的那隻腳，有一根大爪子 */}
      <path d="M138,182 L120,222 L134,250" stroke={body} strokeWidth={15} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <ellipse cx={130} cy={252} rx={17} ry={7} fill={body} />
      <polygon points="118,248 110,236 124,243" fill="white" />
      {/* 脖子、頭、羽毛 */}
      <path d="M178,150 Q196,124 204,100 L230,108 Q222,138 196,168 Z" fill={body} />
      <ellipse cx={230} cy={98} rx={36} ry={19} fill={body} />
      <path d="M200,86 L186,64 L208,78 L206,54 L222,80 Z" fill={feather} stroke={feather} strokeWidth={4} strokeLinejoin="round" />
      <path d="M196,160 q16,6 14,22" stroke={dark} strokeWidth={8} strokeLinecap="round" fill="none" />
      <Eye x={232} y={92} r={8} />
      <circle cx={260} cy={92} r={2.2} fill={dark} />
      <path d="M232,110 Q250,116 264,104" stroke={dark} strokeWidth={3} fill="none" strokeLinecap="round" />
      <polygon points="240,112 243,119 246,113" fill="white" />
      <polygon points="252,111 255,117 258,109" fill="white" />
      <Cheek x={222} y={108} />
    </g>
  );
}

function Spinosaurus() {
  const body = "#EF5350";
  const dark = "#C62828";
  const ribs = [100, 122, 146, 170, 192];
  return (
    <g>
      <rect width={300} height={300} fill="#DCEDC8" />
      <Sun x={255} y={45} />
      <Cloud x={120} y={40} s={0.8} />
      {/* 岸邊的蕨類樹 */}
      <path d="M30,220 Q22,170 36,120" stroke="#795548" strokeWidth={9} fill="none" strokeLinecap="round" />
      <ellipse cx={18} cy={118} rx={24} ry={8} fill="#43A047" transform="rotate(25 18 118)" />
      <ellipse cx={56} cy={116} rx={24} ry={8} fill="#43A047" transform="rotate(-25 56 116)" />
      <ellipse cx={36} cy={104} rx={8} ry={22} fill="#66BB6A" />
      <rect y={200} width={300} height={30} fill="#AED581" />

      {/* 背上的大帆 */}
      <path d="M82,168 Q86,62 146,56 Q206,62 210,168 Z" fill="#FFD54F" />
      {ribs.map((x) => (
        <line key={x} x1={x} y1={165} x2={146 + (x - 146) * 0.55} y2={70} stroke="#FFA000" strokeWidth={3} strokeLinecap="round" />
      ))}
      <path d="M88,180 Q40,170 6,196 Q46,212 96,206 Z" fill={body} />
      <rect x={100} y={196} width={28} height={50} rx={12} fill={dark} />
      <rect x={160} y={196} width={28} height={50} rx={12} fill={body} />
      <ellipse cx={146} cy={180} rx={66} ry={36} fill={body} />
      <ellipse cx={154} cy={198} rx={44} ry={13} fill="#FFCDD2" />
      <circle cx={118} cy={172} r={6} fill={dark} />
      <circle cx={140} cy={162} r={5} fill={dark} />
      <path d="M198,180 q14,8 10,24" stroke={dark} strokeWidth={9} strokeLinecap="round" fill="none" />
      {/* 像鱷魚一樣長的嘴巴，叼著一條魚 */}
      <path d="M190,170 Q200,140 214,128 L230,140 Q216,160 206,178 Z" fill={body} />
      <ellipse cx={220} cy={128} rx={22} ry={17} fill={body} />
      <rect x={220} y={124} width={66} height={20} rx={10} fill={body} />
      <ellipse cx={262} cy={153} rx={16} ry={8} fill="#29B6F6" />
      <polygon points="248,153 234,144 234,162" fill="#29B6F6" />
      <circle cx={270} cy={151} r={2} fill="#263238" />
      <Eye x={220} y={120} r={8} />
      <circle cx={280} cy={129} r={2.2} fill={dark} />
      <path d="M228,140 L282,140" stroke={dark} strokeWidth={2.5} strokeLinecap="round" />
      <Cheek x={212} y={138} />

      {/* 河水蓋住腳的下半部 */}
      <rect y={226} width={300} height={74} fill="#4FC3F7" opacity={0.92} />
      <ellipse cx={144} cy={228} rx={70} ry={6} fill="white" opacity={0.5} />
      <path d="M20,252 q10,-7 20,0 q10,7 20,0" stroke="white" strokeWidth={3} fill="none" opacity={0.8} />
      <path d="M130,272 q10,-7 20,0 q10,7 20,0" stroke="white" strokeWidth={3} fill="none" opacity={0.8} />
      <path d="M220,250 q10,-7 20,0 q10,7 20,0" stroke="white" strokeWidth={3} fill="none" opacity={0.8} />
    </g>
  );
}

const MEADOW_FLOWERS = [
  { x: 30, y: 272, c: "#F06292" },
  { x: 70, y: 288, c: "#BA68C8" },
  { x: 250, y: 282, c: "#F06292" },
  { x: 282, y: 266, c: "#FF8A65" },
];

function Parasaurolophus() {
  const body = "#FFD54F";
  const dark = "#FFB300";
  return (
    <g>
      <rect width={300} height={300} fill="#E1F5FE" />
      <Sun x={45} y={48} color="#FFCA28" />
      <Cloud x={190} y={40} />
      <ellipse cx={60} cy={252} rx={110} ry={45} fill="#C5E1A5" />
      <ellipse cx={250} cy={256} rx={100} ry={40} fill="#AED581" />
      <rect y={250} width={300} height={50} fill="#9CCC65" />
      {MEADOW_FLOWERS.map((f) => (
        <g key={f.x}>
          <circle cx={f.x} cy={f.y} r={6} fill={f.c} />
          <circle cx={f.x} cy={f.y} r={2.5} fill="#FFF59D" />
        </g>
      ))}

      <path d="M82,178 Q40,170 12,196 Q52,206 90,204 Z" fill={body} />
      <rect x={92} y={196} width={26} height={54} rx={11} fill={dark} />
      <rect x={122} y={196} width={26} height={54} rx={11} fill={body} />
      <rect x={168} y={200} width={20} height={44} rx={9} fill={dark} />
      <rect x={190} y={200} width={20} height={44} rx={9} fill={body} />
      <ellipse cx={145} cy={180} rx={68} ry={40} fill={body} />
      <ellipse cx={150} cy={200} rx={48} ry={13} fill="#FFF8E1" />
      <path d="M95,160 q8,-8 16,0 M125,148 q8,-8 16,0 M155,146 q8,-8 16,0" stroke={dark} strokeWidth={5} fill="none" strokeLinecap="round" />
      {/* 脖子、往後長的長長頭冠、鴨子嘴 */}
      <path d="M180,168 Q205,138 214,112 L238,118 Q228,150 200,186 Z" fill={body} />
      <path d="M222,102 Q196,66 150,52" stroke="#EF6C00" strokeWidth={15} strokeLinecap="round" fill="none" />
      <path d="M216,96 Q194,72 160,60" stroke="#FFAB91" strokeWidth={4} strokeLinecap="round" fill="none" />
      <ellipse cx={230} cy={108} rx={26} ry={20} fill={body} />
      <ellipse cx={256} cy={118} rx={17} ry={10} fill="#FFE082" />
      <Eye x={232} y={102} r={8} />
      <path d="M244,126 Q256,130 268,122" stroke="#E65100" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Cheek x={224} y={120} />
    </g>
  );
}

const DOME_KNOBS = [
  { x: 200, y: 101 },
  { x: 209, y: 107 },
  { x: 252, y: 103 },
  { x: 258, y: 94 },
  { x: 230, y: 69 },
  { x: 214, y: 74 },
];

function Pachycephalosaurus() {
  const body = "#5C6BC0";
  const dark = "#3949AB";
  return (
    <g>
      <rect width={300} height={300} fill="#F3E5F5" />
      <Sun x={250} y={50} color="#FFB74D" />
      <Cloud x={50} y={45} s={0.9} />
      <path d="M0,240 L0,170 Q40,130 80,175 Q110,140 140,180 L140,240 Z" fill="#CE93D8" opacity={0.6} />
      <rect y={238} width={300} height={62} fill="#C5E1A5" />
      <ellipse cx={258} cy={262} rx={26} ry={13} fill="#B0BEC5" />
      <ellipse cx={248} cy={254} rx={12} ry={7} fill="#CFD8DC" />
      <Grass x={40} y={282} color="#7CB342" />
      <Grass x={160} y={290} color="#7CB342" />

      <path d="M100,178 Q50,180 14,214 Q66,206 108,204 Z" fill={body} />
      <path d="M150,198 L140,236 L152,250" stroke={dark} strokeWidth={15} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M170,198 L178,236 L190,250" stroke={body} strokeWidth={15} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <ellipse cx={154} cy={252} rx={16} ry={6} fill={dark} />
      <ellipse cx={192} cy={252} rx={16} ry={6} fill={body} />
      <ellipse cx={155} cy={175} rx={55} ry={38} fill={body} />
      <ellipse cx={168} cy={192} rx={32} ry={18} fill="#C5CAE9" />
      <circle cx={125} cy={165} r={6} fill={dark} />
      <circle cx={148} cy={155} r={5} fill={dark} />
      <path d="M200,170 q14,4 14,18" stroke={dark} strokeWidth={8} strokeLinecap="round" fill="none" />
      {/* 脖子、頭、厚厚硬硬的頭頂 */}
      <path d="M180,150 Q196,128 200,110 L228,112 Q224,140 204,170 Z" fill={body} />
      <ellipse cx={226} cy={110} rx={30} ry={24} fill={body} />
      <path d="M198,104 Q202,64 232,64 Q262,68 256,104 Z" fill="#FFAB91" />
      <path d="M212,78 Q226,70 242,76" stroke="#FFCCBC" strokeWidth={4} fill="none" strokeLinecap="round" />
      {DOME_KNOBS.map((k) => (
        <circle key={`${k.x}-${k.y}`} cx={k.x} cy={k.y} r={3.5} fill="#FFF3E0" />
      ))}
      <Eye x={232} y={112} r={8} />
      <path d="M236,128 Q246,134 256,124" stroke={dark} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Cheek x={222} y={126} />
    </g>
  );
}

const SEA_BUBBLES = [
  { x: 240, y: 112, r: 6 },
  { x: 252, y: 92, r: 4 },
  { x: 245, y: 75, r: 3 },
  { x: 66, y: 150, r: 5 },
  { x: 74, y: 132, r: 3 },
];

function Plesiosaurus() {
  const body = "#80CBC4";
  const dark = "#4DB6AC";
  return (
    <g>
      <rect width={300} height={300} fill="#0288D1" />
      <rect width={300} height={62} fill="#29B6F6" />
      <path d="M0,60 q25,-10 50,0 q25,10 50,0 q25,-10 50,0 q25,10 50,0 q25,-10 50,0 q25,10 50,0 L300,0 L0,0 Z" fill="#81D4FA" />
      {/* 照進水裡的陽光 */}
      <polygon points="40,60 80,60 130,300 60,300" fill="white" opacity={0.08} />
      <polygon points="180,60 210,60 260,300 200,300" fill="white" opacity={0.08} />
      <rect y={262} width={300} height={38} fill="#FFE082" />
      {/* 海草 */}
      <path d="M30,265 q-10,-20 0,-40 q10,-20 0,-40" stroke="#66BB6A" strokeWidth={8} fill="none" strokeLinecap="round" />
      <path d="M48,265 q10,-16 0,-32 q-10,-16 0,-32" stroke="#43A047" strokeWidth={7} fill="none" strokeLinecap="round" />
      <path d="M268,265 q-10,-18 0,-36 q10,-18 0,-36 q-10,-14 0,-28" stroke="#66BB6A" strokeWidth={8} fill="none" strokeLinecap="round" />
      {/* 海星、貝殼、小魚、泡泡 */}
      <polygon points="150,270 154,280 165,280 156,286 160,296 150,290 140,296 144,286 135,280 146,280" fill="#FF8A65" />
      <ellipse cx={215} cy={284} rx={10} ry={7} fill="#FFCCBC" />
      <ellipse cx={92} cy={92} rx={12} ry={6} fill="#FFCA28" />
      <polygon points="80,92 70,85 70,99" fill="#FFCA28" />
      <circle cx={98} cy={90} r={1.8} fill="#263238" />
      {SEA_BUBBLES.map((b) => (
        <circle key={`${b.x}-${b.y}`} cx={b.x} cy={b.y} r={b.r} fill="none" stroke="white" strokeWidth={2} opacity={0.8} />
      ))}

      {/* 遠的鰭、尾巴、身體、近的鰭 */}
      <ellipse cx={102} cy={202} rx={28} ry={9} fill={dark} transform="rotate(30 102 202)" />
      <ellipse cx={176} cy={204} rx={28} ry={9} fill={dark} transform="rotate(-30 176 204)" />
      <path d="M82,180 Q50,182 28,202 Q58,202 86,196 Z" fill={body} />
      <ellipse cx={135} cy={182} rx={60} ry={30} fill={body} />
      <ellipse cx={140} cy={196} rx={40} ry={10} fill="#E0F2F1" />
      <circle cx={112} cy={172} r={6} fill={dark} />
      <circle cx={140} cy={166} r={5} fill={dark} />
      <ellipse cx={96} cy={196} rx={28} ry={9} fill={body} transform="rotate(-35 96 196)" />
      <ellipse cx={170} cy={200} rx={28} ry={9} fill={body} transform="rotate(35 170 200)" />
      {/* 長長的脖子 */}
      <path d="M170,172 Q215,150 222,98" stroke={body} strokeWidth={24} strokeLinecap="round" fill="none" />
      <ellipse cx={232} cy={86} rx={25} ry={17} fill={body} />
      <Eye x={236} y={80} r={7} />
      <path d="M240,96 Q250,100 257,92" stroke="#00796B" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Cheek x={226} y={96} />
    </g>
  );
}

const RAINBOW = ["#EF9A9A", "#FFE082", "#A5D6A7", "#90CAF9"];
const SPARKLES = [
  { x: 60, y: 118 },
  { x: 246, y: 104 },
  { x: 262, y: 152 },
];

function BabyDino() {
  const body = "#81C784";
  const shell = "#FFF8E1";
  const spot = "#FFCC80";
  return (
    <g>
      <rect width={300} height={300} fill="#FFF3E0" />
      {RAINBOW.map((c, i) => (
        <path
          key={c}
          d={`M${20 + i * 14},205 A${130 - i * 14},${130 - i * 14} 0 0 1 ${280 - i * 14},205`}
          stroke={c}
          strokeWidth={14}
          fill="none"
        />
      ))}
      <Cloud x={8} y={200} s={0.9} />
      <Cloud x={246} y={200} s={0.9} />
      {SPARKLES.map((p) => (
        <polygon
          key={p.x}
          points={`${p.x},${p.y - 9} ${p.x + 3},${p.y - 3} ${p.x + 9},${p.y} ${p.x + 3},${p.y + 3} ${p.x},${p.y + 9} ${p.x - 3},${p.y + 3} ${p.x - 9},${p.y} ${p.x - 3},${p.y - 3}`}
          fill="#FFD54F"
        />
      ))}
      <rect y={240} width={300} height={60} fill="#C5E1A5" />
      <Grass x={34} y={284} color="#7CB342" />
      <Grass x={272} y={290} color="#7CB342" />
      {/* 鳥巢 */}
      <ellipse cx={150} cy={256} rx={94} ry={24} fill="#A1887F" />
      <path d="M66,250 Q150,236 234,252 M72,262 Q150,250 228,264 M86,272 Q150,262 214,274" stroke="#8D6E63" strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d="M80,244 L98,256 M200,246 L220,258 M120,268 L136,258" stroke="#D7CCC8" strokeWidth={3} strokeLinecap="round" />
      {/* 旁邊還沒孵出來的蛋 */}
      <ellipse cx={238} cy={232} rx={20} ry={26} fill={shell} />
      <circle cx={232} cy={224} r={4} fill={spot} />
      <circle cx={245} cy={240} r={3} fill={spot} />

      {/* 恐龍寶寶：頭上還頂著一片蛋殼 */}
      <ellipse cx={150} cy={172} rx={34} ry={28} fill={body} />
      <circle cx={150} cy={130} r={44} fill={body} />
      <path
        d="M110,106 L118,98 L126,106 L134,96 L142,106 L150,94 L158,106 L166,96 L174,106 L182,98 L190,106 Q184,74 150,72 Q116,74 110,106 Z"
        fill={shell}
      />
      <circle cx={134} cy={86} r={4} fill={spot} />
      <circle cx={164} cy={82} r={3} fill={spot} />
      <Eye x={134} y={130} r={11} />
      <Eye x={166} y={130} r={11} />
      <path d="M136,152 Q150,164 164,152" stroke="#2E7D32" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Cheek x={120} y={150} />
      <Cheek x={180} y={150} />
      {/* 蛋殼下半，小手扶在破口上 */}
      <path
        d="M92,190 L104,177 L116,192 L130,176 L144,192 L158,177 L172,192 L186,176 L198,190 L208,190 Q210,258 150,262 Q90,258 92,190 Z"
        fill={shell}
      />
      <circle cx={120} cy={226} r={6} fill={spot} />
      <circle cx={178} cy={214} r={5} fill={spot} />
      <circle cx={160} cy={244} r={4} fill={spot} />
      <ellipse cx={110} cy={186} rx={12} ry={8} fill={body} />
      <ellipse cx={190} cy={186} rx={12} ry={8} fill={body} />
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
  velociraptor: Velociraptor,
  spinosaurus: Spinosaurus,
  parasaurolophus: Parasaurolophus,
  pachycephalosaurus: Pachycephalosaurus,
  plesiosaurus: Plesiosaurus,
  baby: BabyDino,
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
