"use client";

import { useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import { STORIES } from "@/lib/stories";

export default function StoryListPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center min-h-screen p-6 gap-5 relative overflow-y-auto">
      <BackButton />

      <h1 className="text-3xl md:text-4xl font-black text-[#FF69B4] animate-bounce-in mt-4">
        📖 故事書
      </h1>
      <p className="text-sm text-[#4A4A4A] -mt-3">點一本來聽故事</p>

      <div className="flex flex-col gap-4 w-full max-w-sm mt-2 pb-8">
        {STORIES.map((story) => (
          <button
            key={story.id}
            type="button"
            onClick={() => router.push(`/toddler/story/${story.id}`)}
            className={`relative rounded-[2rem] p-6 shadow-lg active:scale-95 transition-transform select-none cursor-pointer min-h-[160px] flex flex-col items-start text-left ${story.coverClass}`}
          >
            <span className="text-6xl mb-2 drop-shadow-md">{story.emoji}</span>
            <span className="text-2xl font-black text-white drop-shadow-md">
              {story.title}
            </span>
            <span className="text-sm font-medium text-white/90 mt-1 drop-shadow">
              {story.description}
            </span>
            <span className="absolute bottom-4 right-5 bg-white/90 rounded-full px-3 py-1 text-xs font-bold text-[#FF69B4]">
              {story.pages.length} 頁
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
