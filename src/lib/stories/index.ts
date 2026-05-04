import type { Story } from "./types";
import { uglyDucklingStory } from "./uglyDuckling";

export const STORIES: Story[] = [uglyDucklingStory];

export const STORY_BY_ID: Record<string, Story> = STORIES.reduce(
  (acc, story) => {
    acc[story.id] = story;
    return acc;
  },
  {} as Record<string, Story>
);

export type { Story, StoryPage, SceneSprite } from "./types";
