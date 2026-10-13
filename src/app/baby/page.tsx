"use client";

import { useRouter } from "next/navigation";
import BigButton from "@/components/ui/BigButton";
import BackButton from "@/components/ui/BackButton";

export default function BabyModePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center h-screen overflow-y-auto p-6 pt-20 pb-10 gap-5 relative">
      <BackButton />

      <h1 className="text-3xl md:text-4xl font-black text-[#FF69B4] animate-bounce-in">
        寶寶模式
      </h1>

      <div className="flex flex-col gap-4 w-full max-w-sm mt-2">
        <BigButton
          color="#FF69B4"
          onClick={() => router.push("/baby/balloons")}
        >
          <span className="text-4xl mb-1">🎈</span>
          <span className="text-white">氣球點點樂</span>
        </BigButton>

        <BigButton
          color="#EF5350"
          onClick={() => router.push("/baby/piano")}
        >
          <span className="text-4xl mb-1">🎹</span>
          <span className="text-white">寶寶鋼琴</span>
        </BigButton>

        <BigButton
          color="#8D6E63"
          onClick={() => router.push("/baby/animals")}
        >
          <span className="text-4xl mb-1">🐮</span>
          <span className="text-white">動物鍵盤</span>
        </BigButton>
      </div>
    </div>
  );
}
