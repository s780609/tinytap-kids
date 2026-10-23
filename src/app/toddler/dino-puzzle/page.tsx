"use client";

import PuzzleGame from "@/components/toddler/PuzzleGame";
import { DINO_THEME } from "@/components/toddler/puzzleThemes";
import BackButton from "@/components/ui/BackButton";

export default function DinoPuzzlePage() {
  return (
    <>
      <PuzzleGame theme={DINO_THEME} />
      <BackButton />
    </>
  );
}
