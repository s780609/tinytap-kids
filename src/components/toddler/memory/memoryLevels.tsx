import { ANIMALS } from "@/components/svg/animals";
import DinoArt from "@/components/toddler/dino/DinoArt";
import FishArt from "@/components/toddler/fish/FishArt";
import { CatchIcon } from "@/components/toddler/fishing/CatchIcon";
import { DINOS } from "@/lib/dino/puzzle";
import { FISHES } from "@/lib/fish-puzzle/fishes";
import { getCatchType, type CatchKind } from "@/lib/fishing/fishingLogic";

/** 記憶翻牌的一張圖：配對成功時唸 name */
export interface MemoryItem {
  id: string;
  name: string;
  render: (size: number) => React.ReactNode;
}

export interface MemoryLevel {
  id: string;
  title: string;
  emoji: string;
  color: string;
  /** 每局要配幾對 */
  pairs: number;
  /** 翻開後圖的大小（px）；有背景的圖鋪滿整張牌 */
  iconSize: number;
  items: MemoryItem[];
}

const animalItems = (group: "farm" | "zoo"): MemoryItem[] =>
  ANIMALS.filter((a) => a.group === group).map((a) => {
    const Comp = a.component;
    return { id: `animal-${a.name}`, name: a.label, render: (size) => <Comp size={size} /> };
  });

const dinoItems: MemoryItem[] = DINOS.map((d) => ({
  id: `dino-${d.id}`,
  name: d.name,
  render: (size) => <DinoArt id={d.id} className="rounded-xl" style={{ width: size, height: size }} />,
}));

const SEA_FRIENDS: CatchKind[] = ["shark", "whale", "octopus", "crab", "turtle", "puffer", "squid", "lobster", "penguin", "seal", "shrimp", "koi", "goldfish"];

const seaItems: MemoryItem[] = SEA_FRIENDS.map((k) => ({
  id: `sea-${k}`,
  name: getCatchType(k).label,
  render: (size) => <CatchIcon kind={k} size={size} />,
}));

const fishSceneItems: MemoryItem[] = FISHES.map((f) => ({
  id: `fish-${f.id}`,
  name: f.name,
  render: (size) => <FishArt id={f.id} className="rounded-xl" style={{ width: size, height: size }} />,
}));

export const MEMORY_LEVELS: MemoryLevel[] = [
  { id: "farm", title: "農場", emoji: "🐄", color: "#8BC34A", pairs: 6, iconSize: 56, items: animalItems("farm") },
  { id: "zoo", title: "動物園", emoji: "🦁", color: "#FFA726", pairs: 6, iconSize: 56, items: animalItems("zoo") },
  { id: "dino", title: "恐龍", emoji: "🦖", color: "#66BB6A", pairs: 6, iconSize: 68, items: dinoItems },
  { id: "sea", title: "海裡的朋友", emoji: "🐳", color: "#29B6F6", pairs: 6, iconSize: 60, items: seaItems },
  { id: "fish", title: "海底世界", emoji: "🐠", color: "#5C6BC0", pairs: 6, iconSize: 68, items: fishSceneItems },
  {
    id: "mix",
    title: "大集合",
    emoji: "🌈",
    color: "#EC407A",
    pairs: 8,
    iconSize: 54,
    items: [...animalItems("farm"), ...animalItems("zoo"), ...seaItems, ...dinoItems],
  },
];
