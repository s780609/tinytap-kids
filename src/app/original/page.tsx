"use client";

import { useRouter } from "next/navigation";
import BigButton from "@/components/ui/BigButton";
import BackButton from "@/components/ui/BackButton";

export default function OriginalModePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center h-screen overflow-y-auto p-6 pt-20 pb-10 gap-5 relative">
      <BackButton />

      <h1 className="text-3xl md:text-4xl font-black text-[#37474F] animate-bounce-in">
        自創遊戲
      </h1>

      <div className="flex flex-col gap-4 w-full max-w-sm mt-2">
        <BigButton
          color="#3A2C4E"
          onClick={() => router.push("/original/left-on-read")}
        >
          <span className="text-4xl mb-1">📱</span>
          <span className="text-white">已讀不回</span>
          <span className="text-base font-normal text-white opacity-80">大人向</span>
        </BigButton>
      </div>
    </div>
  );
}
