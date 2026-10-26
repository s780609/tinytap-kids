/**
 * 小小廚房：料理、配料與擺放規則（純函式，方便測試）。
 * 料理畫在 200×200 的座標裡，配料只能放在料理表面（一個橢圓）上。
 * 配料的圖在 components/toddler/kitchen/KitchenArt.tsx（id 對應）。
 */

export type ToppingId =
  // 甜點
  | "strawberry"
  | "blueberry"
  | "banana"
  | "kiwi"
  | "chocChip"
  | "sprinkles"
  | "cream"
  | "mint"
  | "butter"
  | "syrup"
  | "chocSauce"
  | "honey"
  | "cherry"
  | "heart"
  | "star"
  | "rosette"
  | "candlePink"
  | "candleBlue"
  | "candleYellow"
  | "candleGreen"
  // 披薩
  | "pepperoni"
  | "pepper"
  | "mushroom"
  | "pineapple"
  | "corn"
  | "olive"
  | "tomato"
  | "shrimp"
  | "cheese"
  | "ham"
  | "basil"
  | "onion";

export type ToppingSound = "pop" | "bubble" | "sand";

export interface Topping {
  id: ToppingId;
  name: string;
  /** 0 = 醬料、起司，鋪在最底下；1 = 一般配料 */
  layer: 0 | 1;
  /** 放上去時隨機轉個角度 */
  spin: boolean;
  sound: ToppingSound;
  candle?: boolean;
}

const t = (id: ToppingId, name: string, opts: Partial<Omit<Topping, "id" | "name">> = {}): Topping => ({
  id,
  name,
  layer: 1,
  spin: true,
  sound: "pop",
  ...opts,
});

export const TOPPINGS: Record<ToppingId, Topping> = {
  strawberry: t("strawberry", "草莓"),
  blueberry: t("blueberry", "藍莓"),
  banana: t("banana", "香蕉"),
  kiwi: t("kiwi", "奇異果"),
  chocChip: t("chocChip", "巧克力豆"),
  sprinkles: t("sprinkles", "彩色糖", { sound: "sand" }),
  cream: t("cream", "鮮奶油", { spin: false, sound: "bubble" }),
  mint: t("mint", "薄荷葉"),
  butter: t("butter", "奶油"),
  syrup: t("syrup", "楓糖漿", { layer: 0, sound: "bubble" }),
  chocSauce: t("chocSauce", "巧克力醬", { layer: 0, sound: "bubble" }),
  honey: t("honey", "蜂蜜", { layer: 0, sound: "bubble" }),
  cherry: t("cherry", "櫻桃", { spin: false }),
  heart: t("heart", "愛心糖"),
  star: t("star", "星星糖"),
  rosette: t("rosette", "奶油花", { spin: false, sound: "bubble" }),
  candlePink: t("candlePink", "粉紅蠟燭", { spin: false, candle: true }),
  candleBlue: t("candleBlue", "藍色蠟燭", { spin: false, candle: true }),
  candleYellow: t("candleYellow", "黃色蠟燭", { spin: false, candle: true }),
  candleGreen: t("candleGreen", "綠色蠟燭", { spin: false, candle: true }),
  pepperoni: t("pepperoni", "香腸"),
  pepper: t("pepper", "青椒"),
  mushroom: t("mushroom", "蘑菇"),
  pineapple: t("pineapple", "鳳梨"),
  corn: t("corn", "玉米"),
  olive: t("olive", "橄欖"),
  tomato: t("tomato", "番茄"),
  shrimp: t("shrimp", "蝦子"),
  cheese: t("cheese", "起司", { layer: 0, sound: "sand" }),
  ham: t("ham", "火腿"),
  basil: t("basil", "九層塔"),
  onion: t("onion", "洋蔥"),
};

/** 料理表面：配料只能放在這個橢圓裡 */
export interface Region {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export type DishId = "pancake" | "cake" | "pizza";

export interface Dish {
  id: DishId;
  title: string;
  color: string;
  region: Region;
  left: ToppingId[];
  right: ToppingId[];
  bottom: ToppingId[];
}

export const DISHES: Dish[] = [
  {
    id: "pancake",
    title: "鬆餅",
    color: "#FFB74D",
    region: { cx: 100, cy: 92, rx: 60, ry: 21 },
    left: ["strawberry", "blueberry", "banana", "kiwi"],
    right: ["chocChip", "sprinkles", "cream", "mint"],
    bottom: ["butter", "syrup", "chocSauce", "honey"],
  },
  {
    id: "cake",
    title: "生日蛋糕",
    color: "#F48FB1",
    region: { cx: 100, cy: 86, rx: 62, ry: 20 },
    left: ["candlePink", "candleBlue", "candleYellow", "candleGreen"],
    right: ["strawberry", "cherry", "heart", "star"],
    bottom: ["rosette", "cream", "sprinkles", "chocChip", "blueberry"],
  },
  {
    id: "pizza",
    title: "披薩",
    color: "#EF5350",
    region: { cx: 100, cy: 100, rx: 66, ry: 66 },
    left: ["pepperoni", "pepper", "mushroom", "pineapple"],
    right: ["corn", "olive", "tomato", "shrimp"],
    bottom: ["cheese", "ham", "basil", "onion"],
  },
];

export interface Placed {
  /** 流水號，當 React key */
  key: number;
  topping: ToppingId;
  x: number;
  y: number;
  rot: number;
  scale: number;
}

/** 一道料理最多幾個配料，超過就把最早放的拿掉（蠟燭不會被拿掉） */
export const MAX_ITEMS = 60;
export const MAX_CANDLES = 10;

/** 點到橢圓中心的「標準化距離」：1 剛好在邊上 */
function norm(r: Region, x: number, y: number): number {
  return Math.hypot((x - r.cx) / r.rx, (y - r.cy) / r.ry);
}

/** 拖到料理上（邊緣外一點點也算）才放得下去 */
export function acceptsDrop(r: Region, x: number, y: number, slack = 0.35): boolean {
  return norm(r, x, y) <= 1 + slack;
}

/** 把點拉回橢圓裡 */
export function clampToRegion(r: Region, x: number, y: number): { x: number; y: number } {
  const d = norm(r, x, y);
  if (d <= 1) return { x, y };
  return { x: r.cx + (x - r.cx) / d, y: r.cy + (y - r.cy) / d };
}

/** 橢圓裡均勻取一點 */
function randomInRegion(r: Region, rand: () => number): { x: number; y: number } {
  const a = rand() * Math.PI * 2;
  const d = Math.sqrt(rand());
  return { x: r.cx + Math.cos(a) * d * r.rx, y: r.cy + Math.sin(a) * d * r.ry };
}

/** 點一下配料：找一個離其他配料最遠的位置（試幾個隨機點挑最好的） */
export function pickSpot(
  r: Region,
  existing: { x: number; y: number }[],
  rand: () => number = Math.random,
  tries = 12
): { x: number; y: number } {
  let best = randomInRegion(r, rand);
  if (existing.length === 0) return best;
  let bestDist = -1;
  for (let i = 0; i < tries; i++) {
    const p = i === 0 ? best : randomInRegion(r, rand);
    // 橢圓扁，y 方向的距離放大回圓形再比
    const k = r.rx / r.ry;
    const dist = Math.min(...existing.map((e) => Math.hypot(e.x - p.x, (e.y - p.y) * k)));
    if (dist > bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  return best;
}

export function candleCount(items: Placed[]): number {
  return items.filter((p) => TOPPINGS[p.topping].candle).length;
}

/**
 * 放上一個配料，回傳新的陣列；蠟燭滿了回傳 null。
 * 配料太多時拿掉最早放的非蠟燭配料。
 */
export function addItem(items: Placed[], item: Placed): Placed[] | null {
  if (TOPPINGS[item.topping].candle && candleCount(items) >= MAX_CANDLES) return null;
  const next = [...items, item];
  if (next.length > MAX_ITEMS) {
    const idx = next.findIndex((p) => !TOPPINGS[p.topping].candle);
    if (idx >= 0) next.splice(idx, 1);
  }
  return next;
}

/** 畫的順序：醬料在最下面，其餘由後（y 小）往前（y 大）疊 */
export function drawOrder(items: Placed[]): Placed[] {
  return [...items].sort((a, b) => TOPPINGS[a.topping].layer - TOPPINGS[b.topping].layer || a.y - b.y);
}

/** 生日快樂歌（公版），3/4 拍，第一小節是弱起 */
export const HAPPY_BIRTHDAY = {
  bpm: 110,
  melody:
    "G4:0.75 G4:0.25 | A4 G4 C5 | B4:2 G4:0.75 G4:0.25 | A4 G4 D5 | C5:2 G4:0.75 G4:0.25 | " +
    "G5 E5 C5 | B4 A4 F5:0.75 F5:0.25 | E5 C5 D5 | C5:3",
};
