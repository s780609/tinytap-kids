import type { ReactNode } from "react";

export interface SceneSprite {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  label?: string;
  reaction?: string;
  bounce?: boolean;
  filter?: string;
}

export interface StoryPage {
  text: string;
  bgClass: string;
  decoration?: ReactNode;
  sprites: SceneSprite[];
}

export interface Story {
  id: string;
  title: string;
  emoji: string;
  coverClass: string;
  description: string;
  pages: StoryPage[];
}
