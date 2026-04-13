"use client";

import { type ReactNode } from "react";

interface BigButtonProps {
  children: ReactNode;
  onClick?: () => void;
  color: string;
  className?: string;
}

export default function BigButton({
  children,
  onClick,
  color,
  className = "",
}: BigButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center
        rounded-[2rem] p-6 md:p-8
        text-white font-bold text-2xl md:text-3xl
        shadow-lg active:scale-95 transition-transform duration-150
        select-none cursor-pointer
        min-h-[140px] md:min-h-[180px]
        w-full
        ${className}
      `}
      style={{ backgroundColor: color }}
    >
      {children}
    </button>
  );
}
