/**
 * 釣魚遊戲裡每一種獵物自己畫的圖（SVG），不用 emoji：
 * 有些 emoji（海豹、輪胎…）在舊電腦上顯示不出來，鯊魚在不同系統上的樣子也很怪。
 * 每張都是 100×100、面朝左邊（往右游時再翻過來）。池塘 canvas 與畫面上的小圖示共用同一份。
 */
import type { CatchKind } from "./fishingLogic.ts";

// ---------- 小工具 ----------

const eye = (x: number, y: number, r: number) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>` +
  `<circle cx="${x - r * 0.18}" cy="${y + r * 0.1}" r="${r * 0.58}" fill="#263238"/>` +
  `<circle cx="${x - r * 0.38}" cy="${y - r * 0.25}" r="${r * 0.24}" fill="#fff"/>`;

const cheek = (x: number, y: number) => `<ellipse cx="${x}" cy="${y}" rx="4.5" ry="2.6" fill="#F48FB1" opacity="0.85"/>`;

const line = (d: string, color: string, w = 2) =>
  `<path d="${d}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

const shape = (d: string, fill: string, stroke: string, w = 2) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>`;

/** 四角小星星（閃亮亮） */
const star = (x: number, y: number, r: number, color = "#FFFFFF") =>
  `<path d="M${x},${y - r} L${x + r * 0.3},${y - r * 0.3} L${x + r},${y} L${x + r * 0.3},${y + r * 0.3} L${x},${y + r} L${x - r * 0.3},${y + r * 0.3} L${x - r},${y} L${x - r * 0.3},${y - r * 0.3} Z" fill="${color}"/>`;

function spikes(cx: number, cy: number, r: number, n: number, len: number, color: string): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const w = 4;
    const p = (rr: number, side: number) => `${(cx + c * rr - s * side).toFixed(1)},${(cy + s * rr + c * side).toFixed(1)}`;
    out += `<polygon points="${p(r - 2, -w)} ${p(r + len, 0)} ${p(r - 2, w)}" fill="${color}"/>`;
  }
  return out;
}

// ---------- 每一種的圖 ----------

export const ART: Record<CatchKind, string> = {
  shark:
    // 比較寫實的鯊魚：流線身體、背深肚白、小黑眼睛、尾鰭上長下短
    shape("M40,38 Q45,26 51,13 Q54,27 61,39 Z", "#546E7A", "#37474F", 1.5) +
    shape("M69,44 L73,36 L76,46 Z", "#546E7A", "#37474F", 1.5) +
    shape("M77,49 L98,24 Q95,40 87,51 L96,67 Q87,61 77,54 Z", "#546E7A", "#37474F", 1.5) +
    shape("M60,58 L64,65 L67,57 Z M70,55 L73,61 L75,54 Z", "#546E7A", "#37474F", 1.2) +
    shape("M2,50 Q8,42 22,39 Q44,34 64,40 Q74,44 80,49 Q74,56 64,58 Q44,64 22,60 Q8,57 2,50 Z", "#607D8B", "#37474F", 1.5) +
    `<path d="M4,52 Q12,58 24,59 Q44,62 64,57 Q72,55 79,51 Q60,54 44,55 Q24,55 4,52 Z" fill="#ECEFF1"/>` +
    shape("M30,56 Q37,68 51,77 Q45,64 43,57 Z", "#546E7A", "#37474F", 1.5) +
    line("M23,44 q-2,6 0,12 M26,44 q-2,6 0,12 M29,44 q-2,6 0,12 M32,45 q-2,5 0,10 M35,45 q-2,5 0,10", "#455A64", 1.1) +
    `<circle cx="13" cy="46" r="1.9" fill="#1C262B"/><circle cx="12.5" cy="45.4" r="0.6" fill="#fff"/>` +
    line("M5,54 Q12,57 20,55", "#37474F", 1.3) +
    `<circle cx="5" cy="48" r="0.6" fill="#37474F"/>`,

  koi:
    shape("M70,50 L94,31 Q86,50 94,69 Z", "#FF8A65", "#E64A19") +
    shape("M34,35 Q48,20 63,36 Z", "#FF8A65", "#E64A19") +
    `<ellipse cx="44" cy="51" rx="32" ry="18" fill="#FF7043" stroke="#E64A19" stroke-width="2"/>` +
    `<ellipse cx="50" cy="44" rx="11" ry="6" fill="#FFF3E0"/><ellipse cx="63" cy="56" rx="7" ry="5" fill="#FFF3E0"/>` +
    line("M38,52 q4,4 8,0 M46,58 q4,4 8,0 M30,58 q4,4 8,0", "#F4511E", 1.6) +
    shape("M38,60 Q33,73 47,66 Z", "#FF8A65", "#E64A19") +
    eye(24, 47, 4.5) +
    line("M13,55 q-5,3 -7,8", "#E64A19", 1.6) +
    line("M13,54 q4,3 8,1", "#BF360C") +
    cheek(27, 56),

  puffer:
    shape("M76,52 L94,40 L94,64 Z", "#FFB300", "#F57F17") +
    spikes(48, 52, 30, 16, 7, "#FFB300") +
    `<circle cx="48" cy="52" r="30" fill="#FFD54F" stroke="#F9A825" stroke-width="2"/>` +
    `<path d="M21,60 Q48,90 76,60 Q48,74 21,60 Z" fill="#FFF59D"/>` +
    `<circle cx="58" cy="35" r="3" fill="#F9A825"/><circle cx="67" cy="45" r="2.5" fill="#F9A825"/><circle cx="50" cy="29" r="2" fill="#F9A825"/>` +
    `<ellipse cx="60" cy="58" rx="7" ry="4" fill="#FFB300" transform="rotate(-20 60 58)"/>` +
    eye(35, 44, 7) +
    `<circle cx="22" cy="56" r="4" fill="#F06292"/><circle cx="22" cy="56" r="2" fill="#AD1457"/>` +
    cheek(39, 58),

  turtle:
    `<ellipse cx="30" cy="70" rx="8" ry="5" fill="#81C784" stroke="#388E3C" stroke-width="2"/>` +
    `<ellipse cx="74" cy="70" rx="8" ry="5" fill="#81C784" stroke="#388E3C" stroke-width="2"/>` +
    `<polygon points="88,61 97,64 88,67" fill="#81C784" stroke="#388E3C" stroke-width="1.5"/>` +
    shape("M26,56 Q8,59 7,48 Q7,37 19,37 Q30,39 33,52 Z", "#A5D6A7", "#388E3C") +
    shape("M22,62 Q24,26 56,26 Q88,26 90,62 Z", "#66BB6A", "#2E7D32", 2.5) +
    `<path d="M44,35 L56,31 L68,35 L68,47 L56,51 L44,47 Z" fill="#43A047"/>` +
    `<path d="M29,54 L37,40 L43,46 L43,56 Z" fill="#43A047"/><path d="M83,54 L75,40 L69,46 L69,56 Z" fill="#43A047"/>` +
    `<rect x="20" y="57" width="72" height="9" rx="4.5" fill="#AED581" stroke="#2E7D32" stroke-width="2"/>` +
    eye(16, 45, 4) +
    line("M9,51 q4,3 8,1", "#2E7D32") +
    cheek(21, 52),

  octopus:
    [28, 37, 46, 55, 64, 73]
      .map((x, i) => line(`M${x},55 Q${x + (i % 2 ? 9 : -9)},70 ${x + (i % 2 ? -3 : 3)},86`, "#BA68C8", 8))
      .join("") +
    [28, 37, 46, 55, 64, 73].map((x, i) => `<circle cx="${x + (i % 2 ? 3 : -3)}" cy="72" r="1.8" fill="#F3E5F5"/>`).join("") +
    `<ellipse cx="50" cy="40" rx="27" ry="25" fill="#BA68C8" stroke="#8E24AA" stroke-width="2"/>` +
    `<circle cx="38" cy="24" r="4" fill="#CE93D8"/><circle cx="62" cy="22" r="3" fill="#CE93D8"/><circle cx="70" cy="32" r="2.5" fill="#CE93D8"/>` +
    eye(41, 42, 6) +
    eye(59, 42, 6) +
    line("M44,53 q6,5 12,0", "#6A1B9A") +
    cheek(33, 51) +
    cheek(67, 51),

  crab: (() => {
    const claw =
      line("M30,55 Q20,48 17,38", "#C62828", 5) +
      shape("M6,30 Q8,15 21,19 Q14,25 19,31 Q12,37 6,30 Z", "#EF5350", "#C62828") +
      line("M31,63 L17,70 L12,80 M33,67 L22,78 L19,88 M37,70 L30,82 L30,90", "#C62828", 3.5);
    return (
      claw +
      `<g transform="translate(100,0) scale(-1,1)">${claw}</g>` +
      `<ellipse cx="50" cy="60" rx="24" ry="15" fill="#EF5350" stroke="#C62828" stroke-width="2"/>` +
      line("M43,48 L41,38 M57,48 L59,38", "#C62828", 3) +
      eye(41, 35, 5) +
      eye(59, 35, 5) +
      line("M44,63 q6,5 12,0", "#B71C1C") +
      cheek(36, 61) +
      cheek(64, 61)
    );
  })(),

  frog:
    `<ellipse cx="24" cy="75" rx="14" ry="8" fill="#4CAF50" stroke="#2E7D32" stroke-width="2"/>` +
    `<ellipse cx="76" cy="75" rx="14" ry="8" fill="#4CAF50" stroke="#2E7D32" stroke-width="2"/>` +
    `<ellipse cx="50" cy="62" rx="26" ry="22" fill="#66BB6A" stroke="#2E7D32" stroke-width="2"/>` +
    `<ellipse cx="50" cy="68" rx="16" ry="13" fill="#C5E1A5"/>` +
    `<ellipse cx="50" cy="45" rx="30" ry="18" fill="#66BB6A" stroke="#2E7D32" stroke-width="2"/>` +
    `<circle cx="36" cy="32" r="10" fill="#66BB6A" stroke="#2E7D32" stroke-width="2"/>` +
    `<circle cx="64" cy="32" r="10" fill="#66BB6A" stroke="#2E7D32" stroke-width="2"/>` +
    eye(36, 32, 6.5) +
    eye(64, 32, 6.5) +
    line("M34,49 Q50,59 66,49", "#2E7D32", 2.5) +
    cheek(29, 49) +
    cheek(71, 49) +
    `<ellipse cx="38" cy="83" rx="7" ry="4" fill="#4CAF50"/><ellipse cx="62" cy="83" rx="7" ry="4" fill="#4CAF50"/>`,

  shrimp:
    line("M18,40 Q5,22 3,8 M21,42 Q11,28 14,14", "#E64A19", 1.8) +
    line("M30,58 l-3,9 M40,58 l-2,10 M50,60 l-1,10 M60,64 l0,9", "#E64A19", 2) +
    `<polygon points="70,84 84,93 86,81" fill="#FF7043" stroke="#E64A19" stroke-width="1.5"/>` +
    [
      [76, 76, 7],
      [74, 65, 8],
      [66, 55, 9],
      [54, 49, 10],
      [40, 47, 11],
    ]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#FF8A65" stroke="#E64A19" stroke-width="2"/>`)
      .join("") +
    `<ellipse cx="25" cy="48" rx="14" ry="11" fill="#FF8A65" stroke="#E64A19" stroke-width="2"/>` +
    `<polygon points="12,44 1,40 12,51" fill="#FF8A65" stroke="#E64A19" stroke-width="1.5"/>` +
    eye(21, 45, 4) +
    cheek(27, 52),

  squid:
    [32, 40, 48, 56, 64]
      .map((x, i) => line(`M${x},60 Q${x + (i % 2 ? 6 : -6)},74 ${x + (i % 2 ? -2 : 2)},88`, "#FF8A80", 6))
      .join("") +
    line("M36,62 Q24,80 20,94 M64,62 Q76,80 80,94", "#FF8A80", 4) +
    shape("M30,22 L13,35 L30,40 Z", "#FF8A80", "#E53935") +
    shape("M70,22 L87,35 L70,40 Z", "#FF8A80", "#E53935") +
    shape("M50,6 L72,30 Q75,52 67,63 L33,63 Q25,52 28,30 Z", "#FF8A80", "#E53935") +
    `<circle cx="50" cy="24" r="3" fill="#FFCDD2"/><circle cx="42" cy="32" r="2" fill="#FFCDD2"/><circle cx="58" cy="32" r="2" fill="#FFCDD2"/>` +
    eye(41, 47, 6) +
    eye(59, 47, 6) +
    line("M44,57 q6,4 12,0", "#C62828") +
    cheek(34, 55) +
    cheek(66, 55),

  lobster:
    line("M16,44 Q-1,22 5,4 M18,46 Q5,30 15,10", "#BF360C", 1.8) +
    line("M30,42 Q22,32 20,29 M30,58 Q22,68 20,71", "#D84315", 5) +
    shape("M3,26 Q10,15 22,22 Q16,26 20,30 Q10,35 3,26 Z", "#E64A19", "#BF360C") +
    shape("M3,74 Q10,85 22,78 Q16,74 20,70 Q10,65 3,74 Z", "#E64A19", "#BF360C") +
    line("M40,58 l-2,10 M50,58 l-1,10 M60,58 l0,9", "#BF360C", 2) +
    shape("M84,50 L98,37 L95,50 L98,63 Z", "#E64A19", "#BF360C") +
    [
      [80, 6, 7],
      [71, 7, 8],
      [60, 8, 9],
      [48, 9, 10],
    ]
      .map(([x, rx, ry]) => `<ellipse cx="${x}" cy="50" rx="${rx}" ry="${ry}" fill="#E64A19" stroke="#BF360C" stroke-width="2"/>`)
      .join("") +
    `<ellipse cx="31" cy="50" rx="15" ry="12" fill="#D84315" stroke="#BF360C" stroke-width="2"/>` +
    eye(25, 46, 4.2) +
    cheek(31, 56),

  penguin:
    `<polygon points="85,55 97,50 95,62" fill="#FF9800" stroke="#E65100" stroke-width="1.5"/>` +
    `<ellipse cx="52" cy="52" rx="37" ry="20" fill="#37474F" stroke="#263238" stroke-width="2"/>` +
    `<ellipse cx="50" cy="58" rx="29" ry="12" fill="#FAFAFA"/>` +
    `<circle cx="21" cy="46" r="15" fill="#37474F" stroke="#263238" stroke-width="2"/>` +
    `<ellipse cx="17" cy="48" rx="9" ry="8" fill="#FAFAFA"/>` +
    `<polygon points="6,47 0,51 7,54" fill="#FF9800" stroke="#E65100" stroke-width="1.5"/>` +
    shape("M46,46 Q62,32 74,39 Q63,48 50,52 Z", "#263238", "#263238") +
    eye(15, 45, 3.6) +
    cheek(20, 53),

  seal:
    shape("M84,58 L98,47 L96,60 L98,72 Z", "#78909C", "#607D8B") +
    shape("M10,52 Q14,32 36,34 Q64,36 86,56 Q66,72 34,70 Q12,68 10,52 Z", "#90A4AE", "#607D8B") +
    `<path d="M14,58 Q30,70 62,66 Q76,63 82,58 Q60,62 40,60 Q22,60 14,58 Z" fill="#CFD8DC"/>` +
    `<circle cx="50" cy="44" r="3" fill="#78909C"/><circle cx="62" cy="48" r="2.5" fill="#78909C"/><circle cx="42" cy="40" r="2" fill="#78909C"/>` +
    `<ellipse cx="46" cy="67" rx="10" ry="4" fill="#78909C" transform="rotate(30 46 67)"/>` +
    eye(23, 45, 4.5) +
    `<ellipse cx="11" cy="51" rx="3.2" ry="2.4" fill="#37474F"/>` +
    line("M14,55 l-8,1 M14,57 l-7,4 M18,55 l8,-1", "#546E7A", 1.2) +
    line("M10,57 q4,3 8,0", "#37474F", 1.8) +
    cheek(24, 55),

  goldfish:
    shape("M64,50 Q82,25 98,30 Q88,43 92,50 Q88,58 98,72 Q82,77 64,53 Z", "#FFE082", "#FFA000") +
    shape("M32,36 Q46,17 57,36 Z", "#FFE082", "#FFA000") +
    `<ellipse cx="40" cy="52" rx="28" ry="20" fill="#FFC107" stroke="#FF8F00" stroke-width="2"/>` +
    `<ellipse cx="40" cy="61" rx="18" ry="7" fill="#FFF8E1"/>` +
    line("M40,46 q4,4 8,0 M48,52 q4,4 8,0 M36,40 q4,4 8,0", "#FFA000", 1.6) +
    eye(22, 48, 5.5) +
    `<circle cx="12" cy="55" r="2.6" fill="#F06292"/>` +
    cheek(27, 58) +
    star(62, 24, 7) +
    star(18, 28, 4),

  whale:
    // 大翅鯨（座頭鯨），維持原本的藍色：長胸鰭、頭上的小疙瘩、喉腹摺紋、小背鰭、寬尾鰭
    line("M20,37 Q17,26 13,20 M20,37 Q20,24 21,16 M20,37 Q23,26 27,20", "#B3E5FC", 1.8) +
    shape("M80,47 Q88,45 92,38 Q95,32 99,31 Q98,44 92,51 Q98,58 99,70 Q95,69 92,63 Q88,57 80,56 Z", "#1E88E5", "#1565C0", 1.5) +
    shape("M2,49 Q6,38 24,36 Q50,34 72,42 Q80,46 86,50 Q80,56 70,58 Q46,64 22,62 Q6,60 2,49 Z", "#42A5F5", "#1565C0", 1.5) +
    shape("M63,41 L68,36 L71,42 Z", "#1E88E5", "#1565C0", 1.2) +
    `<path d="M4,52 Q12,60 26,61 Q38,62 50,60 Q30,58 4,52 Z" fill="#BBDEFB"/>` +
    line("M8,55 Q20,60 34,60 M10,57 Q22,61 38,61 M14,59 Q24,62 42,61", "#90CAF9", 0.9) +
    // 頭上與下巴的小疙瘩
    `<circle cx="6" cy="45" r="1.2" fill="#1E88E5"/><circle cx="10" cy="42" r="1.2" fill="#1E88E5"/><circle cx="14" cy="40" r="1.2" fill="#1E88E5"/><circle cx="19" cy="39" r="1.1" fill="#1E88E5"/><circle cx="6" cy="52" r="1" fill="#1E88E5"/><circle cx="11" cy="54" r="1" fill="#1E88E5"/>` +
    `<circle cx="40" cy="44" r="2" fill="#64B5F6"/><circle cx="52" cy="46" r="1.5" fill="#64B5F6"/><circle cx="60" cy="49" r="1.7" fill="#64B5F6"/>` +
    // 大翅鯨招牌的長胸鰭，邊緣白白的
    shape("M30,58 Q40,70 58,77 Q61,75 57,72 Q43,64 37,57 Z", "#1E88E5", "#1565C0", 1.3) +
    line("M37,63 Q46,69 57,74", "#E3F2FD", 1.6) +
    `<circle cx="16" cy="50" r="1.8" fill="#0D2B4A"/><circle cx="15.5" cy="49.4" r="0.5" fill="#fff"/>` +
    line("M3,52 Q14,55 27,53", "#1565C0", 1.2),

  mermaid:
    shape("M86,66 L98,55 Q96,68 98,81 Z", "#4DB6AC", "#00897B") +
    shape("M40,52 Q64,44 78,58 Q84,65 88,67 L85,72 Q72,71 63,64 Q52,71 40,64 Z", "#26A69A", "#00897B") +
    line("M52,56 q3,3 6,0 M62,58 q3,3 6,0 M57,63 q3,3 6,0", "#80CBC4", 1.5) +
    shape("M22,24 Q40,8 53,28 Q57,46 48,55 Q42,42 40,34 Q32,46 24,53 Q15,40 22,24 Z", "#EC407A", "#C2185B", 1.5) +
    `<ellipse cx="40" cy="52" rx="9" ry="11" fill="#FFCC80"/>` +
    `<circle cx="36" cy="50" r="3.5" fill="#F48FB1"/><circle cx="44" cy="50" r="3.5" fill="#F48FB1"/>` +
    line("M35,47 L26,58", "#FFCC80", 4) +
    `<circle cx="36" cy="30" r="13" fill="#FFCC80"/>` +
    `<path d="M23,28 Q30,15 44,19 Q51,23 49,31 Q40,22 30,30 Z" fill="#EC407A"/>` +
    eye(31, 32, 3.4) +
    eye(41, 32, 3.4) +
    line("M33,38 q4,3 8,0", "#E65100", 1.6) +
    cheek(28, 37) +
    cheek(45, 37) +
    star(48, 19, 5, "#FFD54F"),

  treasure:
    `<rect x="16" y="44" width="68" height="40" rx="4" fill="#8D6E63" stroke="#5D4037" stroke-width="2"/>` +
    shape("M16,46 L16,34 Q50,14 84,34 L84,46 Z", "#A1887F", "#5D4037") +
    `<rect x="27" y="26" width="7" height="58" fill="#FFC107"/><rect x="66" y="26" width="7" height="58" fill="#FFC107"/>` +
    `<rect x="16" y="43" width="68" height="5" fill="#FFC107"/>` +
    `<rect x="44" y="47" width="12" height="14" rx="2" fill="#FFD54F" stroke="#F57F17" stroke-width="1.5"/>` +
    `<circle cx="50" cy="53" r="2" fill="#5D4037"/><rect x="49.2" y="53" width="1.6" height="4" fill="#5D4037"/>` +
    star(84, 20, 7, "#FFF59D") +
    star(14, 26, 5, "#FFF59D"),

  tire:
    `<circle cx="50" cy="52" r="36" fill="#37474F" stroke="#212121" stroke-width="2"/>` +
    Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * 360;
      return `<rect x="47" y="15" width="6" height="8" rx="1" fill="#263238" transform="rotate(${a} 50 52)"/>`;
    }).join("") +
    `<circle cx="50" cy="52" r="19" fill="#90A4AE" stroke="#546E7A" stroke-width="2"/>` +
    `<circle cx="50" cy="52" r="8" fill="#CFD8DC" stroke="#78909C" stroke-width="2"/>` +
    `<circle cx="44" cy="26" r="3" fill="#546E7A"/>`,

  boot:
    shape("M58,12 L82,12 L82,62 Q82,72 75,76 L20,76 Q9,76 9,66 Q9,57 22,55 L58,51 Z", "#8D6E63", "#5D4037") +
    `<rect x="55" y="10" width="30" height="9" rx="3" fill="#6D4C41" stroke="#5D4037" stroke-width="1.5"/>` +
    `<rect x="7" y="74" width="77" height="9" rx="3" fill="#4E342E"/>` +
    line("M58,28 L80,24 M58,36 L80,32 M58,44 L80,40", "#FFE0B2", 2) +
    `<ellipse cx="30" cy="64" rx="7" ry="3" fill="#A1887F"/>` +
    `<circle cx="70" cy="66" r="3" fill="#6D4C41"/>`,

  can:
    `<ellipse cx="50" cy="80" rx="22" ry="6" fill="#78909C"/>` +
    `<rect x="28" y="24" width="44" height="56" fill="#B0BEC5" stroke="#78909C" stroke-width="2"/>` +
    `<rect x="28" y="40" width="44" height="24" fill="#E53935"/>` +
    `<rect x="28" y="49" width="44" height="5" fill="#FFFFFF" opacity="0.8"/>` +
    `<ellipse cx="50" cy="24" rx="22" ry="6" fill="#CFD8DC" stroke="#78909C" stroke-width="2"/>` +
    `<ellipse cx="50" cy="24" rx="14" ry="3.5" fill="#B0BEC5"/>` +
    line("M34,30 L34,74", "#ECEFF1", 2.5) +
    line("M58,66 q4,4 8,2", "#78909C", 1.5),
};

/** 完整的 SVG 字串 */
export function catchSvg(kind: CatchKind): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" overflow="visible">${ART[kind]}</svg>`;
}

const urlCache = new Map<CatchKind, string>();

/** 給 <img> 或 canvas 用的 data URL */
export function catchUrl(kind: CatchKind): string {
  let url = urlCache.get(kind);
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(catchSvg(kind))}`;
    urlCache.set(kind, url);
  }
  return url;
}

