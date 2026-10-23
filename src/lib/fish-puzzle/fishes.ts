/** 魚類拼圖的魚（切片、版面配置與恐龍拼圖共用 src/lib/dino/puzzle.ts） */
export type FishId = "clownfish" | "pufferfish" | "shark" | "seahorse" | "anglerfish" | "bluetang";

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
];
