"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  className?: string;
}

export default function BackButton({ className = "" }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/")}
      className={`
        fixed top-4 left-4 z-40
        w-14 h-14 rounded-full
        bg-white/80 backdrop-blur
        flex items-center justify-center
        shadow-md active:scale-90 transition-transform
        select-none cursor-pointer
        ${className}
      `}
      aria-label="返回主畫面"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#4A4A4A"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}
