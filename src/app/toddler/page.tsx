"use client";

import { useRouter } from "next/navigation";
import BigButton from "@/components/ui/BigButton";
import BackButton from "@/components/ui/BackButton";

export default function ToddlerModePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-5 relative">
      <BackButton />

      <h1 className="text-3xl md:text-4xl font-black text-[#4FC3F7] animate-bounce-in">
        幼兒模式
      </h1>

      <div className="flex flex-col gap-4 w-full max-w-sm mt-2">
        <BigButton
          color="#FF69B4"
          onClick={() => router.push("/toddler/drawing")}
        >
          <span className="text-4xl mb-1">🎨</span>
          <span className="text-white">畫畫板</span>
        </BigButton>

        <BigButton
          color="#81C784"
          onClick={() => router.push("/toddler/memory")}
        >
          <span className="text-4xl mb-1">🃏</span>
          <span className="text-white">記憶翻牌</span>
        </BigButton>

        <BigButton
          color="#FFB74D"
          onClick={() => router.push("/toddler/counting")}
        >
          <span className="text-4xl mb-1">🔢</span>
          <span className="text-white">數一數</span>
        </BigButton>

        <BigButton
          color="#EF5350"
          onClick={() => router.push("/toddler/racing")}
        >
          <span className="text-4xl mb-1">🏎️</span>
          <span className="text-white">賽車</span>
        </BigButton>

        <BigButton
          color="#9575CD"
          onClick={() => router.push("/toddler/story")}
        >
          <span className="text-4xl mb-1">📖</span>
          <span className="text-white">故事書</span>
        </BigButton>
      </div>
    </div>
  );
}
