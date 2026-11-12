/** 魚類拼圖的魚（切片、版面配置與恐龍拼圖共用 src/lib/dino/puzzle.ts） */
export type FishId =
  | "clownfish"
  | "pufferfish"
  | "shark"
  | "seahorse"
  | "anglerfish"
  | "bluetang"
  | "jellyfish"
  | "seaturtle"
  | "stingray"
  | "octopus"
  | "swordfish"
  | "crab";

export interface Fish {
  id: FishId;
  name: string;
  color: string;
}

export const FISHES: Fish[] = [
  { id: "clownfish", name: "小丑魚", color: "#FF7043" },
  { id: "pufferfish", name: "河豚", color: "#FFB300" },
  { id: "shark", name: "鯊魚", color: "#607D8B" },
  { id: "seahorse", name: "海馬", color: "#EC407A" },
  { id: "anglerfish", name: "鮟鱇魚", color: "#5E35B1" },
  { id: "bluetang", name: "藍倒吊", color: "#1E88E5" },
  { id: "jellyfish", name: "水母", color: "#F48FB1" },
  { id: "seaturtle", name: "海龜", color: "#558B2F" },
  { id: "stingray", name: "魟魚", color: "#78909C" },
  { id: "octopus", name: "章魚", color: "#AB47BC" },
  { id: "swordfish", name: "劍旗魚", color: "#3949AB" },
  { id: "crab", name: "螃蟹", color: "#EF5350" },
];
