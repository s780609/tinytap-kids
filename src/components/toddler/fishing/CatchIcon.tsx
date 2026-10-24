/**
 * 把 lib/fishing/catchArt.ts 自己畫的圖用在 canvas（池塘）與畫面上的小圖示。
 */
import type { CatchKind } from "@/lib/fishing/fishingLogic";
import { catchUrl } from "@/lib/fishing/catchArt";

const imgCache = new Map<CatchKind, HTMLImageElement>();

function catchImage(kind: CatchKind): HTMLImageElement {
  let img = imgCache.get(kind);
  if (!img) {
    img = new Image();
    img.src = catchUrl(kind);
    imgCache.set(kind, img);
  }
  return img;
}

/** 先把所有圖載入（避免第一次出現時閃一下） */
export function preloadCatchArt(kinds: CatchKind[]): void {
  for (const k of kinds) catchImage(k);
}

/** emoji 字級換成圖的邊長：圖多留了一點邊，放大一點看起來才一樣大 */
export const ART_SCALE = 1.2;

/** 在 canvas 上畫一隻（中心在 x,y；flip = 面朝右） */
export function drawCatch(
  ctx: CanvasRenderingContext2D,
  kind: CatchKind,
  x: number,
  y: number,
  size: number,
  flip: boolean,
  glow?: string
): void {
  const img = catchImage(kind);
  if (!img.complete || img.naturalWidth === 0) return;
  const s = size * ART_SCALE;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 22;
  }
  ctx.drawImage(img, -s / 2, -s / 2, s, s);
  ctx.restore();
}

/** 畫面上的小圖示（水桶、圖鑑、任務卡…） */
export function CatchIcon({
  kind,
  size,
  className,
  style,
  label,
}: {
  kind: CatchKind;
  size: number;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 自己畫的 SVG data URL，不需要 next/image 的最佳化
    <img
      src={catchUrl(kind)}
      width={size}
      height={size}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={`inline-block select-none ${className ?? ""}`}
      style={style}
    />
  );
}
