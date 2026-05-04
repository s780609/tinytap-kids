/**
 * Traceable animal outline templates for the drawing board.
 * Each template contains draw commands that render a cute outline
 * on a normalized 0-400 x 0-400 coordinate space.
 */

export interface TraceTemplate {
  name: string;
  label: string;
  emoji: string;
  draw: (ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, scale: number) => void;
}

function drawPony(ctx: CanvasRenderingContext2D, ox: number, oy: number, s: number) {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);

  // Body (rounded oval)
  ctx.beginPath();
  ctx.ellipse(230, 220, 95, 65, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Head (large round)
  ctx.beginPath();
  ctx.ellipse(135, 130, 55, 50, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Muzzle (small oval at front of head)
  ctx.beginPath();
  ctx.ellipse(85, 148, 22, 16, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Mouth line on muzzle
  ctx.beginPath();
  ctx.moveTo(72, 156);
  ctx.lineTo(98, 156);
  ctx.stroke();
  // Nostril
  ctx.beginPath();
  ctx.arc(76, 145, 2.5, 0, Math.PI * 2);
  ctx.stroke();

  // Big round eye
  ctx.beginPath();
  ctx.arc(118, 125, 9, 0, Math.PI * 2);
  ctx.stroke();

  // Left ear (pointed)
  ctx.beginPath();
  ctx.moveTo(110, 88);
  ctx.lineTo(102, 60);
  ctx.lineTo(125, 82);
  ctx.closePath();
  ctx.stroke();

  // Right ear (pointed)
  ctx.beginPath();
  ctx.moveTo(155, 88);
  ctx.lineTo(170, 62);
  ctx.lineTo(165, 88);
  ctx.closePath();
  ctx.stroke();

  // Unicorn horn (between ears)
  ctx.beginPath();
  ctx.moveTo(132, 80);
  ctx.lineTo(140, 35);
  ctx.lineTo(148, 80);
  ctx.closePath();
  ctx.stroke();
  // Horn spiral
  ctx.beginPath();
  ctx.moveTo(135, 65);
  ctx.lineTo(146, 65);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(137, 52);
  ctx.lineTo(145, 52);
  ctx.stroke();

  // Forelock curl on forehead
  ctx.beginPath();
  ctx.arc(122, 95, 9, 0, Math.PI * 2);
  ctx.stroke();

  // Mane (wavy curls along the neck/back)
  ctx.beginPath();
  ctx.arc(170, 130, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(185, 158, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(180, 188, 12, 0, Math.PI * 2);
  ctx.stroke();

  // Front left leg
  ctx.beginPath();
  ctx.moveTo(160, 270);
  ctx.lineTo(160, 318);
  ctx.quadraticCurveTo(160, 328, 172, 328);
  ctx.quadraticCurveTo(184, 328, 184, 318);
  ctx.lineTo(184, 270);
  ctx.stroke();

  // Front right leg
  ctx.beginPath();
  ctx.moveTo(195, 275);
  ctx.lineTo(198, 320);
  ctx.quadraticCurveTo(198, 330, 210, 330);
  ctx.quadraticCurveTo(222, 330, 222, 320);
  ctx.lineTo(220, 275);
  ctx.stroke();

  // Back left leg
  ctx.beginPath();
  ctx.moveTo(255, 275);
  ctx.lineTo(255, 320);
  ctx.quadraticCurveTo(255, 330, 268, 330);
  ctx.quadraticCurveTo(280, 330, 280, 320);
  ctx.lineTo(280, 275);
  ctx.stroke();

  // Back right leg
  ctx.beginPath();
  ctx.moveTo(290, 270);
  ctx.lineTo(295, 318);
  ctx.quadraticCurveTo(295, 328, 306, 328);
  ctx.quadraticCurveTo(318, 328, 318, 318);
  ctx.lineTo(316, 268);
  ctx.stroke();

  // Wavy flowing tail (long strand)
  ctx.beginPath();
  ctx.moveTo(318, 195);
  ctx.bezierCurveTo(360, 180, 372, 230, 348, 258);
  ctx.bezierCurveTo(330, 282, 360, 305, 340, 322);
  ctx.stroke();
  // Tail second strand
  ctx.beginPath();
  ctx.moveTo(322, 215);
  ctx.bezierCurveTo(348, 222, 358, 258, 332, 290);
  ctx.stroke();

  ctx.restore();
}

function drawRabbit(ctx: CanvasRenderingContext2D, ox: number, oy: number, s: number) {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);

  // Body (sitting egg-shape, head leans left)
  ctx.beginPath();
  ctx.ellipse(210, 280, 90, 75, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Head (round, slightly left of body)
  ctx.beginPath();
  ctx.ellipse(180, 180, 60, 55, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Left ear (long upright)
  ctx.beginPath();
  ctx.ellipse(158, 90, 14, 56, -0.06, 0, Math.PI * 2);
  ctx.stroke();
  // Left ear inner
  ctx.beginPath();
  ctx.ellipse(158, 92, 7, 42, -0.06, 0, Math.PI * 2);
  ctx.stroke();

  // Right ear
  ctx.beginPath();
  ctx.ellipse(202, 88, 14, 58, 0.06, 0, Math.PI * 2);
  ctx.stroke();
  // Right ear inner
  ctx.beginPath();
  ctx.ellipse(202, 90, 7, 44, 0.06, 0, Math.PI * 2);
  ctx.stroke();

  // Big round eyes
  ctx.beginPath();
  ctx.arc(160, 178, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(205, 178, 10, 0, Math.PI * 2);
  ctx.stroke();

  // Small triangular nose
  ctx.beginPath();
  ctx.moveTo(177, 202);
  ctx.lineTo(193, 202);
  ctx.lineTo(185, 211);
  ctx.closePath();
  ctx.stroke();

  // Mouth (Y shape)
  ctx.beginPath();
  ctx.moveTo(185, 211);
  ctx.lineTo(185, 220);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(185, 220);
  ctx.quadraticCurveTo(176, 226, 170, 222);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(185, 220);
  ctx.quadraticCurveTo(194, 226, 200, 222);
  ctx.stroke();

  // Front paws (small ovals at the bottom-front of body)
  ctx.beginPath();
  ctx.ellipse(170, 335, 20, 14, -0.15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(220, 335, 20, 14, 0.15, 0, Math.PI * 2);
  ctx.stroke();

  // Fluffy tail at the back-right
  ctx.beginPath();
  ctx.arc(295, 285, 22, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawPigLeg(ctx: CanvasRenderingContext2D, cx: number, topY: number, h: number) {
  const w = 24;
  const left = cx - w / 2;
  const right = cx + w / 2;
  const bot = topY + h;

  // U-shape (open at top so it blends into body)
  ctx.beginPath();
  ctx.moveTo(left, topY);
  ctx.lineTo(left, bot - 5);
  ctx.quadraticCurveTo(left, bot + 5, cx, bot + 5);
  ctx.quadraticCurveTo(right, bot + 5, right, bot - 5);
  ctx.lineTo(right, topY);
  ctx.stroke();

  // Cloven hoof divider
  ctx.beginPath();
  ctx.moveTo(cx - 6, bot + 3);
  ctx.quadraticCurveTo(cx, bot - 4, cx + 6, bot + 3);
  ctx.stroke();
}

function drawMiniPig(ctx: CanvasRenderingContext2D, ox: number, oy: number, s: number) {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);

  // Body + head as one big rounded blob (chibi style)
  ctx.beginPath();
  ctx.ellipse(200, 195, 140, 118, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Left ear (floppy, bent over at the tip)
  ctx.beginPath();
  ctx.moveTo(108, 100);
  ctx.quadraticCurveTo(78, 55, 92, 30);
  ctx.quadraticCurveTo(120, 18, 142, 52);
  ctx.quadraticCurveTo(152, 75, 148, 92);
  ctx.stroke();
  // Left ear inner fold
  ctx.beginPath();
  ctx.moveTo(120, 75);
  ctx.quadraticCurveTo(115, 50, 130, 42);
  ctx.stroke();

  // Right ear (mirrored)
  ctx.beginPath();
  ctx.moveTo(292, 100);
  ctx.quadraticCurveTo(322, 55, 308, 30);
  ctx.quadraticCurveTo(280, 18, 258, 52);
  ctx.quadraticCurveTo(248, 75, 252, 92);
  ctx.stroke();
  // Right ear inner fold
  ctx.beginPath();
  ctx.moveTo(280, 75);
  ctx.quadraticCurveTo(285, 50, 270, 42);
  ctx.stroke();

  // Big round eyes
  ctx.beginPath();
  ctx.arc(155, 168, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(245, 168, 16, 0, Math.PI * 2);
  ctx.stroke();

  // Snout (rounded oval)
  ctx.beginPath();
  ctx.ellipse(200, 222, 38, 27, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Snout center divider
  ctx.beginPath();
  ctx.moveTo(200, 198);
  ctx.lineTo(200, 246);
  ctx.stroke();
  // Left nostril
  ctx.beginPath();
  ctx.ellipse(186, 222, 5, 9, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Right nostril
  ctx.beginPath();
  ctx.ellipse(214, 222, 5, 9, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Mouth (small smile)
  ctx.beginPath();
  ctx.arc(200, 260, 10, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  // Four stubby legs with cloven hooves
  drawPigLeg(ctx, 132, 290, 52);
  drawPigLeg(ctx, 178, 300, 52);
  drawPigLeg(ctx, 222, 300, 52);
  drawPigLeg(ctx, 268, 290, 52);

  // Curly tail (S-curve with twist on the right side)
  ctx.beginPath();
  ctx.moveTo(330, 220);
  ctx.bezierCurveTo(370, 208, 372, 248, 348, 252);
  ctx.bezierCurveTo(332, 256, 340, 282, 360, 278);
  ctx.stroke();

  ctx.restore();
}

export const TRACE_TEMPLATES: TraceTemplate[] = [
  { name: "pony", label: "小馬", emoji: "🐴", draw: drawPony },
  { name: "rabbit", label: "兔子", emoji: "🐰", draw: drawRabbit },
  { name: "pig", label: "迷你豬", emoji: "🐷", draw: drawMiniPig },
];
