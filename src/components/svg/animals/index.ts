import CatSvg from "./CatSvg";
import DogSvg from "./DogSvg";
import CowSvg from "./CowSvg";
import DuckSvg from "./DuckSvg";
import LionSvg from "./LionSvg";
import ElephantSvg from "./ElephantSvg";
import PigSvg from "./PigSvg";
import RabbitSvg from "./RabbitSvg";
import ChickenSvg from "./ChickenSvg";
import SheepSvg from "./SheepSvg";
import MonkeySvg from "./MonkeySvg";
import PandaSvg from "./PandaSvg";
import GiraffeSvg from "./GiraffeSvg";
import ZebraSvg from "./ZebraSvg";
import TigerSvg from "./TigerSvg";
import BearSvg from "./BearSvg";
import type { ComponentType } from "react";

export { CatSvg, DogSvg, CowSvg, DuckSvg, LionSvg, ElephantSvg };

export interface AnimalInfo {
  name: string;
  label: string;
  /** 叫聲音檔（有的動物沒有） */
  soundFile?: string;
  component: ComponentType<{ size?: number }>;
  color: string;
  /** 農場動物或動物園的動物（記憶翻牌分關卡用） */
  group: "farm" | "zoo";
}

export const ANIMALS: AnimalInfo[] = [
  { name: "cat", label: "貓咪", soundFile: "/sounds/animals/cat.mp3", component: CatSvg, color: "#FFB74D", group: "farm" },
  { name: "dog", label: "小狗", soundFile: "/sounds/animals/dog.mp3", component: DogSvg, color: "#A1887F", group: "farm" },
  { name: "cow", label: "乳牛", soundFile: "/sounds/animals/cow.mp3", component: CowSvg, color: "#F5F5F5", group: "farm" },
  { name: "duck", label: "鴨子", soundFile: "/sounds/animals/duck.mp3", component: DuckSvg, color: "#FFD54F", group: "farm" },
  { name: "lion", label: "獅子", soundFile: "/sounds/animals/lion.mp3", component: LionSvg, color: "#FFB74D", group: "zoo" },
  { name: "elephant", label: "大象", soundFile: "/sounds/animals/elephant.mp3", component: ElephantSvg, color: "#90A4AE", group: "zoo" },
  { name: "pig", label: "小豬", component: PigSvg, color: "#F8BBD0", group: "farm" },
  { name: "rabbit", label: "兔子", component: RabbitSvg, color: "#D7CCC8", group: "farm" },
  { name: "chicken", label: "母雞", component: ChickenSvg, color: "#A1887F", group: "farm" },
  { name: "sheep", label: "綿羊", component: SheepSvg, color: "#EEEEEE", group: "farm" },
  { name: "monkey", label: "猴子", component: MonkeySvg, color: "#8D6E63", group: "zoo" },
  { name: "panda", label: "熊貓", component: PandaSvg, color: "#FAFAFA", group: "zoo" },
  { name: "giraffe", label: "長頸鹿", component: GiraffeSvg, color: "#FFCA28", group: "zoo" },
  { name: "zebra", label: "斑馬", component: ZebraSvg, color: "#FAFAFA", group: "zoo" },
  { name: "tiger", label: "老虎", component: TigerSvg, color: "#FF9800", group: "zoo" },
  { name: "bear", label: "熊", component: BearSvg, color: "#795548", group: "zoo" },
];
