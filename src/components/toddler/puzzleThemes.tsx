import { audioManager } from "@/lib/audio/AudioManager";
import { DINOS, type DinoId } from "@/lib/dino/puzzle";
import { FISHES, type FishId } from "@/lib/fish-puzzle/fishes";
import DinoArt from "@/components/toddler/dino/DinoArt";
import FishArt from "@/components/toddler/fish/FishArt";
import type { PuzzleTheme } from "@/components/toddler/PuzzleGame";

/** 恐龍叫聲：獅子吼放慢 */
const ROAR = "/sounds/animals/lion.mp3";

export const DINO_THEME: PuzzleTheme = {
  title: "🦖 恐龍拼圖",
  items: DINOS,
  Art: ({ id, ...rest }) => <DinoArt id={id as DinoId} {...rest} />,
  bg: "#F1F8E9",
  accent: "#8BC34A",
  accentText: "#689F38",
  switchLabel: "🦕 換一隻",
  nextLabel: "下一隻 ➡️",
  preload: [ROAR],
  cheer: () => audioManager.playFile(ROAR, 0.6),
};

export const FISH_THEME: PuzzleTheme = {
  title: "🐠 魚類拼圖",
  items: FISHES,
  Art: ({ id, ...rest }) => <FishArt id={id as FishId} {...rest} />,
  bg: "#E1F5FE",
  accent: "#29B6F6",
  accentText: "#0288D1",
  levelIcons: ["🐟", "🐠", "🐡"],
  switchLabel: "🐟 換一條",
  nextLabel: "下一條 ➡️",
  // 咕嚕咕嚕冒一串泡泡
  cheer: () => {
    for (let i = 0; i < 6; i++) setTimeout(() => audioManager.bubble(), i * 110);
  },
};
