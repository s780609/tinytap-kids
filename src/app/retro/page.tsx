"use client";

import { useRouter } from "next/navigation";
import BigButton from "@/components/ui/BigButton";
import BackButton from "@/components/ui/BackButton";

export default function RetroModePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center h-screen overflow-y-auto p-6 pt-20 pb-10 gap-5 relative">
      <BackButton />

      <h1 className="text-3xl md:text-4xl font-black text-[#5C6BC0] animate-bounce-in">
        懷舊遊戲
      </h1>

      <div className="flex flex-col gap-4 w-full max-w-sm mt-2">
        <BigButton
          color="#8D6E63"
          onClick={() => router.push("/retro/tank")}
        >
          <span className="text-4xl mb-1">🧱</span>
          <span className="text-white">坦克大戰</span>
        </BigButton>
        <BigButton
          color="#1A237E"
          onClick={() => router.push("/retro/pacman")}
        >
          <span className="text-4xl mb-1">🟡</span>
          <span className="text-white">小精靈</span>
        </BigButton>
        <BigButton
          color="#C62828"
          onClick={() => router.push("/retro/raiden")}
        >
          <span className="text-4xl mb-1">✈️</span>
          <span className="text-white">復古雷電</span>
        </BigButton>
      </div>
    </div>
  );
}
