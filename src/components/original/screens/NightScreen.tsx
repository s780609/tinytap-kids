"use client";

import { useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { NIGHT_DONE_LINES, NIGHT_LINES, dailyLine } from "@/lib/left-on-read/flavor";
import type { RunState } from "@/lib/left-on-read/game";
import { type Ctx } from "../pixel/draw";
import { drawRoom } from "../pixel/scenes";
import { COLOR, DialogBox, PixelButton, Scene, ScreenBody, StatusBar, Typewriter } from "../ui";

const drawSit = (ctx: Ctx, t: number) => drawRoom(ctx, t, { mode: "night", pose: "sigh" });
const drawPhone = (ctx: Ctx, t: number) => drawRoom(ctx, t, { mode: "night", pose: "phone" });
const drawSleep = (ctx: Ctx, t: number) => drawRoom(ctx, t, { mode: "night", pose: "sleep" });

const SLEEP_MS = 1400;

interface NightScreenProps {
  run: RunState;
  onMenu: () => void;
  onOpenApp: () => void;
  onSleep: () => void;
}

/** 深夜的租屋處。滑完或放棄之後，只剩下去睡覺 */
export function NightScreen({ run, onMenu, onOpenApp, onSleep }: NightScreenProps) {
  const [sleeping, setSleeping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = run.phase === "nightDone";
  const line = dailyLine(done ? NIGHT_DONE_LINES : NIGHT_LINES, run.dayIndex);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const goSleep = () => {
    audioManager.pop();
    setSleeping(true);
    timer.current = setTimeout(onSleep, SLEEP_MS);
  };

  return (
    <>
      <StatusBar run={run} onMenu={onMenu} />
      <Scene
        draw={sleeping ? drawSleep : done ? drawPhone : drawSit}
        label={sleeping ? "家豪睡著了" : "深夜的租屋處"}
      />
      <ScreenBody
        actions={
          <>
            {!done ? (
              <PixelButton color={COLOR.pink} disabled={sleeping} onClick={onOpenApp}>
                打開 Swipy
              </PixelButton>
            ) : null}
            <PixelButton color={COLOR.gray} disabled={sleeping} silent onClick={goSleep}>
              {sleeping ? "晚安" : "去睡覺"}
            </PixelButton>
          </>
        }
      >
        <DialogBox>
          <Typewriter key={line} text={line} />
        </DialogBox>
      </ScreenBody>
    </>
  );
}
