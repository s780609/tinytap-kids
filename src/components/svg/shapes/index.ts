export { default as CircleSvg } from "./CircleSvg";
export { default as SquareSvg } from "./SquareSvg";
export { default as TriangleSvg } from "./TriangleSvg";
export { default as StarSvg } from "./StarSvg";
export { default as HeartSvg } from "./HeartSvg";

import CircleSvg from "./CircleSvg";
import SquareSvg from "./SquareSvg";
import TriangleSvg from "./TriangleSvg";
import StarSvg from "./StarSvg";
import HeartSvg from "./HeartSvg";
import type { ComponentType } from "react";

export interface ShapeInfo {
  name: string;
  label: string;
  voiceFile: string;
  component: ComponentType<{ color?: string; size?: number }>;
  defaultColor: string;
}

export const SHAPES: ShapeInfo[] = [
  { name: "circle", label: "圓形", voiceFile: "/sounds/voices/this-is-circle.mp3", component: CircleSvg, defaultColor: "#FF69B4" },
  { name: "square", label: "正方形", voiceFile: "/sounds/voices/this-is-square.mp3", component: SquareSvg, defaultColor: "#4FC3F7" },
  { name: "triangle", label: "三角形", voiceFile: "/sounds/voices/this-is-triangle.mp3", component: TriangleSvg, defaultColor: "#FFD54F" },
  { name: "star", label: "星星", voiceFile: "/sounds/voices/this-is-star.mp3", component: StarSvg, defaultColor: "#FFB74D" },
  { name: "heart", label: "愛心", voiceFile: "/sounds/voices/this-is-heart.mp3", component: HeartSvg, defaultColor: "#EF5350" },
];
