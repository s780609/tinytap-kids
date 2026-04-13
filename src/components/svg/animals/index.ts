import CatSvg from "./CatSvg";
import DogSvg from "./DogSvg";
import CowSvg from "./CowSvg";
import DuckSvg from "./DuckSvg";
import LionSvg from "./LionSvg";
import ElephantSvg from "./ElephantSvg";
import type { ComponentType } from "react";

export { CatSvg, DogSvg, CowSvg, DuckSvg, LionSvg, ElephantSvg };

export interface AnimalInfo {
  name: string;
  label: string;
  soundFile: string;
  component: ComponentType<{ size?: number }>;
  color: string;
}

export const ANIMALS: AnimalInfo[] = [
  { name: "cat", label: "Cat", soundFile: "/sounds/animals/cat.mp3", component: CatSvg, color: "#FFB74D" },
  { name: "dog", label: "Dog", soundFile: "/sounds/animals/dog.mp3", component: DogSvg, color: "#A1887F" },
  { name: "cow", label: "Cow", soundFile: "/sounds/animals/cow.mp3", component: CowSvg, color: "#F5F5F5" },
  { name: "duck", label: "Duck", soundFile: "/sounds/animals/duck.mp3", component: DuckSvg, color: "#FFD54F" },
  { name: "lion", label: "Lion", soundFile: "/sounds/animals/lion.mp3", component: LionSvg, color: "#FFB74D" },
  { name: "elephant", label: "Elephant", soundFile: "/sounds/animals/elephant.mp3", component: ElephantSvg, color: "#90A4AE" },
];
