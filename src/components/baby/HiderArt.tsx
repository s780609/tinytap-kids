import { ANIMALS } from "@/components/svg/animals";
import { audioManager } from "@/lib/audio/AudioManager";
import type { Hider } from "@/lib/peekaboo/peekaboo";

/** 躲貓貓、擦窗戶裡的動物圖（跟記憶翻牌同一套） */
export function HiderArt({ hider, size }: { hider: Hider; size: number }) {
  const Comp = ANIMALS.find((a) => a.name === hider.name)?.component;
  return Comp ? <Comp size={size} /> : null;
}

/** 有叫聲就叫，沒有就唸名字 */
export function callHider(h: Hider): void {
  if (h.sound) audioManager.playFile(h.sound);
  else audioManager.speak(`${h.label}！`);
}
