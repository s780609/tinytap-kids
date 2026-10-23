"use client";

import PuzzleGame from "@/components/toddler/PuzzleGame";
import { FISH_THEME } from "@/components/toddler/puzzleThemes";
import BackButton from "@/components/ui/BackButton";

export default function FishPuzzlePage() {
  return (
    <>
      <PuzzleGame theme={FISH_THEME} />
      <BackButton />
    </>
  );
}
