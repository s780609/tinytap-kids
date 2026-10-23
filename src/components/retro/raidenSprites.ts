/**
 * 復古雷電用的圖：Kenney「Pixel Shmup」素材（CC0，public/raiden/）。
 * ships.png：32×32、4 欄；tiles.png：16×16、12 欄。另外在載入後產生剪影（閃白、影子）與換色版本。
 */
import { MAP_COLS, MAP_ROWS, TILE, buildTilemap } from "@/lib/raiden/tilemap";

export interface Frame {
  img: CanvasImageSource;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface Sprites {
  ships: HTMLImageElement;
  tiles: HTMLImageElement;
  /** 每種地形預先拼好的整張地圖 */
  maps: (HTMLCanvasElement | null)[];
  cache: Map<string, HTMLCanvasElement>;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`無法載入 ${src}`));
    img.src = src;
  });
}

let pending: Promise<Sprites> | null = null;

export function loadSprites(): Promise<Sprites> {
  if (!pending) {
    pending = Promise.all([loadImage("/raiden/ships.png"), loadImage("/raiden/tiles.png")]).then(([ships, tiles]) => ({
      ships,
      tiles,
      maps: [null, null, null],
      cache: new Map(),
    }));
    pending.catch(() => {
      pending = null;
    });
  }
  return pending;
}

export function ship(sp: Sprites, n: number): Frame {
  return { img: sp.ships, sx: (n % 4) * 32, sy: Math.floor(n / 4) * 32, sw: 32, sh: 32 };
}

export function tile(sp: Sprites, n: number): Frame {
  return { img: sp.tiles, sx: (n % 12) * TILE, sy: Math.floor(n / 12) * TILE, sw: TILE, sh: TILE };
}

function canvasOf(f: Frame): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = f.sw;
  c.height = f.sh;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(f.img, f.sx, f.sy, f.sw, f.sh, 0, 0, f.sw, f.sh);
  return [c, ctx];
}

function asFrame(c: HTMLCanvasElement): Frame {
  return { img: c, sx: 0, sy: 0, sw: c.width, sh: c.height };
}

/** 單色剪影（閃白、影子、生氣變紅） */
export function silhouette(sp: Sprites, key: string, f: Frame, color: string): Frame {
  const k = `sil:${key}:${color}`;
  let c = sp.cache.get(k);
  if (!c) {
    const [cv, ctx] = canvasOf(f);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, cv.width, cv.height);
    c = cv;
    sp.cache.set(k, c);
  }
  return asFrame(c);
}

/** 把有顏色的像素換成指定色相（灰階、外框不動） */
export function tinted(sp: Sprites, key: string, f: Frame, hue: number): Frame {
  const k = `tint:${key}:${hue}`;
  let c = sp.cache.get(k);
  if (!c) {
    const [cv, ctx] = canvasOf(f);
    const data = ctx.getImageData(0, 0, cv.width, cv.height);
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255;
      const g = d[i + 1] / 255;
      const b = d[i + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;
      const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
      if (s < 0.35) continue;
      const [nr, ng, nb] = hslToRgb(hue, s, l);
      d[i] = nr;
      d[i + 1] = ng;
      d[i + 2] = nb;
    }
    ctx.putImageData(data, 0, 0);
    c = cv;
    sp.cache.set(k, c);
  }
  return asFrame(c);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** 整張地圖（240 × MAP_ROWS*16），第一次用到時才拼 */
export function mapCanvas(sp: Sprites, terrain: 0 | 1 | 2): HTMLCanvasElement {
  let c = sp.maps[terrain];
  if (!c) {
    const ids = buildTilemap(terrain);
    c = document.createElement("canvas");
    c.width = MAP_COLS * TILE;
    c.height = MAP_ROWS * TILE;
    const ctx = c.getContext("2d")!;
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const f = tile(sp, ids[r * MAP_COLS + col]);
        ctx.drawImage(f.img, f.sx, f.sy, f.sw, f.sh, col * TILE, r * TILE, TILE, TILE);
      }
    }
    sp.maps[terrain] = c;
  }
  return c;
}
