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
          color="#FFD54F"
          onClick={() => router.push("/toddler/shapes")}
        >
          <span className="text-4xl mb-1">🔷</span>
          <span className="text-[#4A4A4A]">Shape Match</span>
        </BigButton>

        <BigButton
          color="#81C784"
          onClick={() => router.push("/toddler/animals")}
        >
          <span className="text-4xl mb-1">🐾</span>
          <span className="text-[#4A4A4A]">Animal Sounds</span>
        </BigButton>

        <BigButton
          color="#CE93D8"
          onClick={() => router.push("/toddler/bubbles")}
        >
          <span className="text-4xl mb-1">🫧</span>
          <span className="text-[#4A4A4A]">Bubble Shapes</span>
        </BigButton>
      </div>
    </div>
  );
}
