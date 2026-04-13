import AppleSvg from "./AppleSvg";
import BananaSvg from "./BananaSvg";
import GrapeSvg from "./GrapeSvg";
import OrangeSvg from "./OrangeSvg";
import StrawberrySvg from "./StrawberrySvg";
import type { ComponentType } from "react";

export { AppleSvg, BananaSvg, GrapeSvg, OrangeSvg, StrawberrySvg };

export interface FruitInfo {
  name: string;
  label: string;
  component: ComponentType<{ size?: number }>;
  color: string;
}

export const FRUITS: FruitInfo[] = [
  { name: "apple", label: "Apple", component: AppleSvg, color: "#EF5350" },
  { name: "banana", label: "Banana", component: BananaSvg, color: "#FFD54F" },
  { name: "grape", label: "Grape", component: GrapeSvg, color: "#CE93D8" },
  { name: "orange", label: "Orange", component: OrangeSvg, color: "#FFB74D" },
  { name: "strawberry", label: "Strawberry", component: StrawberrySvg, color: "#EF5350" },
];
