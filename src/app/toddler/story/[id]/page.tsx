"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import StoryReader from "@/components/toddler/StoryReader";
import BackButton from "@/components/ui/BackButton";
import { STORY_BY_ID } from "@/lib/stories";

export default function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const story = STORY_BY_ID[id];

  if (!story) {
    notFound();
  }

  return (
    <>
      <StoryReader story={story} />
      <BackButton />
    </>
  );
}
