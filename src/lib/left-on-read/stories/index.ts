/**
 * 27 種失敗劇情的總表。
 */

import type { Story } from "../storyTypes.ts";
import { FADE_STORIES } from "./fade.ts";
import { GHOST_STORIES } from "./ghost.ts";
import { PITCH_STORIES } from "./pitch.ts";
import { QUICK_STORIES } from "./quick.ts";

export const STORIES: readonly Story[] = [
  ...GHOST_STORIES,
  ...FADE_STORIES,
  ...PITCH_STORIES,
  ...QUICK_STORIES,
];

/** null 原型：查 "constructor"、"__proto__" 這類名稱不會判成存在 */
export const STORY_BY_ID: Record<string, Story> = Object.assign(
  Object.create(null) as Record<string, Story>,
  Object.fromEntries(STORIES.map((s) => [s.id, s]))
);
