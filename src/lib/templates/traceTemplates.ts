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

  // Body (oval)
  ctx.beginPath();
  ctx.ellipse(200, 240, 110, 70, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Neck
  ctx.beginPath();
  ctx.moveTo(140, 200);
  ctx.quadraticCurveTo(120, 150, 130, 110);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(175, 195);
  ctx.quadraticCurveTo(165, 150, 170, 115);
  ctx.stroke();

  // Head (circle)
  ctx.beginPath();
  ctx.ellipse(140, 85, 42, 35, -0.2, 0, Math.PI * 2);
  ctx.stroke();

  // Muzzle
  ctx.beginPath();
  ctx.ellipse(105, 100, 20, 15, -0.1, 0, Math.PI * 2);
  ctx.stroke();

  // Eye
  ctx.beginPath();
  ctx.arc(148, 78, 5, 0, Math.PI * 2);
  ctx.stroke();

  // Ear left
  ctx.beginPath();
  ctx.moveTo(125, 55);
  ctx.quadraticCurveTo(118, 30, 130, 38);
  ctx.stroke();

  // Ear right
  ctx.beginPath();
  ctx.moveTo(155, 52);
  ctx.quadraticCurveTo(160, 28, 168, 40);
  ctx.stroke();

  // Mane (wavy along neck)
  ctx.beginPath();
  ctx.moveTo(160, 55);
  ctx.quadraticCurveTo(185, 75, 175, 100);
  ctx.quadraticCurveTo(195, 120, 185, 145);
  ctx.quadraticCurveTo(200, 165, 190, 190);
  ctx.stroke();

  // Front left leg
  ctx.beginPath();
  ctx.moveTo(150, 295);
  ctx.lineTo(145, 360);
  ctx.lineTo(155, 365);
  ctx.lineTo(160, 360);
  ctx.lineTo(165, 295);
  ctx.stroke();

  // Front right leg
  ctx.beginPath();
  ctx.moveTo(175, 298);
  ctx.lineTo(180, 355);
  ctx.lineTo(190, 358);
  ctx.lineTo(195, 353);
  ctx.lineTo(195, 295);
  ctx.stroke();

  // Back left leg
  ctx.beginPath();
  ctx.moveTo(240, 295);
  ctx.lineTo(235, 360);
  ctx.lineTo(245, 365);
  ctx.lineTo(255, 360);
  ctx.lineTo(258, 295);
  ctx.stroke();

  // Back right leg
  ctx.beginPath();
  ctx.moveTo(270, 290);
  ctx.lineTo(275, 350);
  ctx.lineTo(285, 355);
  ctx.lineTo(295, 348);
  ctx.lineTo(290, 285);
  ctx.stroke();

  // Tail (wavy)
  ctx.beginPath();
  ctx.moveTo(305, 210);
  ctx.quadraticCurveTo(340, 195, 335, 225);
  ctx.quadraticCurveTo(360, 230, 350, 260);
  ctx.quadraticCurveTo(370, 265, 355, 285);
  ctx.stroke();

  // Nostril
  ctx.beginPath();
  ctx.arc(98, 98, 3, 0, Math.PI * 2);
  ctx.stroke();

  // Mouth smile
  ctx.beginPath();
  ctx.arc(100, 108, 8, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.restore();
}

function drawRabbit(ctx: CanvasRenderingContext2D, ox: number, oy: number, s: number) {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);

  // Body (oval)
  ctx.beginPath();
  ctx.ellipse(200, 270, 75, 90, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Head (circle)
  ctx.beginPath();
  ctx.ellipse(200, 145, 55, 50, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Left ear (tall oval)
  ctx.beginPath();
  ctx.ellipse(170, 55, 16, 55, -0.15, 0, Math.PI * 2);
  ctx.stroke();

  // Left ear inner
  ctx.beginPath();
  ctx.ellipse(170, 55, 8, 38, -0.15, 0, Math.PI * 2);
  ctx.stroke();

  // Right ear (tall oval, slightly tilted)
  ctx.beginPath();
  ctx.ellipse(230, 50, 16, 58, 0.15, 0, Math.PI * 2);
  ctx.stroke();

  // Right ear inner
  ctx.beginPath();
  ctx.ellipse(230, 50, 8, 40, 0.15, 0, Math.PI * 2);
  ctx.stroke();

  // Left eye
  ctx.beginPath();
  ctx.ellipse(180, 138, 8, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(182, 136, 3, 0, Math.PI * 2);
  ctx.stroke();

  // Right eye
  ctx.beginPath();
  ctx.ellipse(220, 138, 8, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(222, 136, 3, 0, Math.PI * 2);
  ctx.stroke();

  // Nose (triangle-ish)
  ctx.beginPath();
  ctx.moveTo(196, 158);
  ctx.lineTo(204, 158);
  ctx.lineTo(200, 165);
  ctx.closePath();
  ctx.stroke();

  // Mouth (Y shape)
  ctx.beginPath();
  ctx.moveTo(200, 165);
  ctx.lineTo(200, 175);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(200, 175);
  ctx.quadraticCurveTo(190, 182, 185, 178);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(200, 175);
  ctx.quadraticCurveTo(210, 182, 215, 178);
  ctx.stroke();

  // Whiskers left
  ctx.beginPath();
  ctx.moveTo(165, 160);
  ctx.lineTo(140, 155);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(165, 168);
  ctx.lineTo(138, 168);
  ctx.stroke();

  // Whiskers right
  ctx.beginPath();
  ctx.moveTo(235, 160);
  ctx.lineTo(260, 155);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(235, 168);
  ctx.lineTo(262, 168);
  ctx.stroke();

  // Cheeks
  ctx.beginPath();
  ctx.ellipse(162, 168, 12, 8, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(238, 168, 12, 8, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Front paws
  ctx.beginPath();
  ctx.ellipse(165, 345, 18, 12, -0.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(235, 345, 18, 12, 0.2, 0, Math.PI * 2);
  ctx.stroke();

  // Belly circle
  ctx.beginPath();
  ctx.ellipse(200, 290, 40, 45, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Tail (small circle)
  ctx.beginPath();
  ctx.arc(265, 310, 18, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawMiniPig(ctx: CanvasRenderingContext2D, ox: number, oy: number, s: number) {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);

  // Body (fat oval)
  ctx.beginPath();
  ctx.ellipse(200, 240, 115, 85, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Head (circle)
  ctx.beginPath();
  ctx.ellipse(200, 120, 62, 55, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Snout (oval)
  ctx.beginPath();
  ctx.ellipse(200, 148, 30, 20, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Nostrils
  ctx.beginPath();
  ctx.ellipse(190, 148, 6, 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(210, 148, 6, 5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Left eye
  ctx.beginPath();
  ctx.ellipse(175, 108, 8, 9, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(177, 106, 3, 0, Math.PI * 2);
  ctx.stroke();

  // Right eye
  ctx.beginPath();
  ctx.ellipse(225, 108, 8, 9, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(227, 106, 3, 0, Math.PI * 2);
  ctx.stroke();

  // Left ear (floppy triangle)
  ctx.beginPath();
  ctx.moveTo(148, 82);
  ctx.quadraticCurveTo(120, 55, 132, 40);
  ctx.quadraticCurveTo(148, 38, 155, 68);
  ctx.stroke();

  // Right ear
  ctx.beginPath();
  ctx.moveTo(252, 82);
  ctx.quadraticCurveTo(280, 55, 268, 40);
  ctx.quadraticCurveTo(252, 38, 245, 68);
  ctx.stroke();

  // Mouth (smile)
  ctx.beginPath();
  ctx.arc(200, 158, 12, 0.3, Math.PI - 0.3);
  ctx.stroke();

  // Front left leg
  ctx.beginPath();
  ctx.moveTo(140, 305);
  ctx.lineTo(135, 355);
  ctx.quadraticCurveTo(135, 368, 150, 368);
  ctx.quadraticCurveTo(165, 368, 165, 355);
  ctx.lineTo(160, 305);
  ctx.stroke();

  // Hoof line front left
  ctx.beginPath();
  ctx.moveTo(145, 360);
  ctx.lineTo(155, 360);
  ctx.stroke();

  // Front right leg
  ctx.beginPath();
  ctx.moveTo(240, 305);
  ctx.lineTo(235, 355);
  ctx.quadraticCurveTo(235, 368, 250, 368);
  ctx.quadraticCurveTo(265, 368, 265, 355);
  ctx.lineTo(260, 305);
  ctx.stroke();

  // Hoof line front right
  ctx.beginPath();
  ctx.moveTo(245, 360);
  ctx.lineTo(255, 360);
  ctx.stroke();

  // Back left leg (behind body, shorter visible)
  ctx.beginPath();
  ctx.moveTo(115, 295);
  ctx.lineTo(108, 350);
  ctx.quadraticCurveTo(108, 362, 120, 362);
  ctx.quadraticCurveTo(132, 362, 132, 350);
  ctx.lineTo(130, 300);
  ctx.stroke();

  // Back right leg
  ctx.beginPath();
  ctx.moveTo(285, 295);
  ctx.lineTo(288, 350);
  ctx.quadraticCurveTo(288, 362, 278, 362);
  ctx.quadraticCurveTo(268, 362, 268, 350);
  ctx.lineTo(270, 300);
  ctx.stroke();

  // Curly tail
  ctx.beginPath();
  ctx.moveTo(312, 215);
  ctx.quadraticCurveTo(340, 200, 335, 215);
  ctx.quadraticCurveTo(330, 230, 345, 225);
  ctx.quadraticCurveTo(360, 218, 350, 205);
  ctx.stroke();

  // Belly
  ctx.beginPath();
  ctx.ellipse(200, 265, 55, 40, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

export const TRACE_TEMPLATES: TraceTemplate[] = [
  { name: "pony", label: "小馬", emoji: "🐴", draw: drawPony },
  { name: "rabbit", label: "兔子", emoji: "🐰", draw: drawRabbit },
  { name: "pig", label: "迷你豬", emoji: "🐷", draw: drawMiniPig },
];
