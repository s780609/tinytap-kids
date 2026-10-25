"use client";

import PuzzleGame from "@/components/toddler/PuzzleGame";
import { DINO_THEME, FISH_THEME } from "@/components/toddler/puzzleThemes";
import BackButton from "@/components/ui/BackButton";

const THEMES = [DINO_THEME, FISH_THEME];

export default function PuzzlePage() {
  return (
    <>
      <PuzzleGame themes={THEMES} />
      <BackButton />
    </>
  );
}
