"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { INTRO_MELODY, INTRO_SHOTS, introShotAt, typewriterCount } from "@/lib/left-on-read/intro";
import { midiToFreq } from "@/lib/rhythm/music";
import PixelCanvas from "../PixelCanvas";
import { dither, rect, type Ctx } from "../pixel/draw";
import { INTRO_SCENES } from "../pixel/introScenes";
import { SCENE_H, SCENE_W } from "../pixel/scenes";
import { PixelButton } from "../ui";

const CAPTION_CPS = 13;
const MUSIC_GAIN = 0.55;
/** 每個分鏡前後用抖色淡入淡出 */
const FADE_MS = 280;

export default function IntroScreen({ onDone }: { onDone: () => void }) {
  const [caption, setCaption] = useState({ index: 0, chars: 0 });
  const finished = useRef(false);

  const draw = useCallback(
    (ctx: Ctx, t: number) => {
      const { index, localMs, done } = introShotAt(t);
      const shot = INTRO_SHOTS[index];
      INTRO_SCENES[shot.id](ctx, localMs);
      const fade = Math.min(localMs, shot.durationMs - localMs);
      if (fade < FADE_MS) {
        if (fade < FADE_MS / 2) rect(ctx, "#000000", 0, 0, SCENE_W, SCENE_H);
        else dither(ctx, "#000000", 0, 0, SCENE_W, SCENE_H);
      }
      const chars = typewriterCount(shot.caption, localMs, CAPTION_CPS);
      setCaption((prev) => (prev.index === index && prev.chars === chars ? prev : { index, chars }));
      if (done && !finished.current) {
        finished.current = true;
        onDone();
      }
    },
    [onDone]
  );

  // 憂傷的旋律：跳過、結束或離開頁面時，disconnect 一次靜音所有排程的音
  useEffect(() => {
    let cancelled = false;
    let bus: GainNode | null = null;
    void audioManager.resume().then((ctx) => {
      if (cancelled || !ctx) return;
      bus = audioManager.createMusicBus();
      if (!bus) return;
      bus.gain.value = MUSIC_GAIN;
      const start = ctx.currentTime + 0.1;
      for (const n of INTRO_MELODY) {
        audioManager.scheduleNote(bus, midiToFreq(n.midi), start + n.time, n.duration);
      }
    });
    return () => {
      cancelled = true;
      bus?.disconnect();
    };
  }, []);

  const text = INTRO_SHOTS[caption.index].caption;

  return (
    <div className="flex h-full flex-col bg-black">
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <PixelCanvas
          width={SCENE_W}
          height={SCENE_H}
          draw={draw}
          animate
          label="開場影片"
          className="block h-auto min-h-0 w-full shrink object-contain"
        />
        <div className="shrink-0 px-5 py-4">
          <p className="min-h-[3.2em] text-[15px] leading-relaxed" aria-live="polite" aria-label={text}>
            <span aria-hidden>{text.slice(0, caption.chars)}</span>
            <span aria-hidden className="opacity-0">
              {text.slice(caption.chars)}
            </span>
          </p>
        </div>
      </div>
      <div className="shrink-0 px-5 pb-4">
        <PixelButton onClick={onDone} className="py-1.5 text-sm">
          跳過
        </PixelButton>
      </div>
    </div>
  );
}
