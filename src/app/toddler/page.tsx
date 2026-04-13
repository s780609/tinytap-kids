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
        Toddler Mode
      </h1>

      <div className="flex flex-col gap-4 w-full max-w-sm mt-2">
        <BigButton
          color="#FF69B4"
          onClick={() => router.push("/toddler/drawing")}
        >
          <span className="text-4xl mb-1">🎨</span>
          <span className="text-white">Drawing Board</span>
        </BigButton>

        <BigButton
          color="#81C784"
          onClick={() => router.push("/toddler/memory")}
        >
          <span className="text-4xl mb-1">🃏</span>
          <span className="text-white">Memory Match</span>
        </BigButton>

        <BigButton
          color="#FFB74D"
          onClick={() => router.push("/toddler/counting")}
        >
          <span className="text-4xl mb-1">🔢</span>
          <span className="text-white">Counting</span>
        </BigButton>

        <BigButton
          color="#EF5350"
          onClick={() => router.push("/toddler/racing")}
        >
          <span className="text-4xl mb-1">🏎️</span>
          <span className="text-white">Racing</span>
        </BigButton>
      </div>
    </div>
  );
}
