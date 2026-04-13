"use client";

import { useEffect, useRef } from "react";
import { ParticleEngine } from "@/lib/particles/ParticleEngine";

interface ParticleCanvasProps {
  engineRef: React.MutableRefObject<ParticleEngine | null>;
}

export default function ParticleCanvas({ engineRef }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new ParticleEngine();
    engine.attach(canvas);
    engineRef.current = engine;

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      engine.destroy();
      engineRef.current = null;
    };
  }, [engineRef]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 pointer-events-none"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
