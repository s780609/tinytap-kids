"use client";

import { useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { midiToFreq } from "@/lib/rhythm/music";
import { SONGS, type Song } from "@/lib/rhythm/songs";
import {
  KEYBOARD_HIGH,
  KEYBOARD_LOW,
  buildKeys,
  demoNotes,
  songsInRange,
} from "@/lib/piano/keyboard";
import { useGlissando } from "./useGlissando";

const KEYS = buildKeys(KEYBOARD_LOW, KEYBOARD_HIGH);
const WHITE_COUNT = KEYS.filter((k) => !k.black).length;
const WHITE_PCT = 100 / WHITE_COUNT;
const BLACK_PCT = WHITE_PCT * 0.6;
const DEMO_SONGS = songsInRange(SONGS, KEYBOARD_LOW, KEYBOARD_HIGH);
const NOTE_SYMBOLS = ["♪", "♫", "♩", "♬"];
/** 自動彈奏比排程時間晚一點開始，讓第一個音也排得進去 */
const DEMO_LEAD = 0.15;

interface FloatingNote {
  id: number;
  x: number;
  color: string;
  symbol: string;
}

/** 鍵的水平中心（佔鍵盤寬度的百分比） */
const keyCenter = (midi: number) => {
  const key = KEYS.find((k) => k.midi === midi);
  if (!key) return 50;
  return key.black ? (key.whiteIndex + 1) * WHITE_PCT : (key.whiteIndex + 0.5) * WHITE_PCT;
};

export default function PianoGame() {
  const { settings } = useSettings();
  const [lit, setLit] = useState<Set<number>>(new Set());
  const [floats, setFloats] = useState<FloatingNote[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const tokensRef = useRef<Record<number, number>>({});
  const floatIdRef = useRef(0);
  const keyBusRef = useRef<GainNode | null>(null);
  const demoBusRef = useRef<GainNode | null>(null);
  const demoTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  // 離開頁面時停掉自動彈奏
  useEffect(() => {
    const timers = demoTimersRef;
    const bus = demoBusRef;
    return () => {
      timers.current.forEach(clearTimeout);
      bus.current?.disconnect();
    };
  }, []);

  /** 鍵亮一下；連續按同一鍵時以最後一次為準 */
  const lightKey = (midi: number, ms: number) => {
    const token = (tokensRef.current[midi] ?? 0) + 1;
    tokensRef.current[midi] = token;
    setLit((prev) => new Set(prev).add(midi));
    setTimeout(() => {
      if (tokensRef.current[midi] !== token) return;
      setLit((prev) => {
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
    }, ms);
  };

  /** 鍵上方飄出一個音符 */
  const spawnNote = (midi: number) => {
    const key = KEYS.find((k) => k.midi === midi);
    const id = floatIdRef.current++;
    setFloats((prev) => [
      ...prev,
      {
        id,
        x: keyCenter(midi),
        color: key?.color ?? "#546E7A",
        symbol: NOTE_SYMBOLS[id % NOTE_SYMBOLS.length],
      },
    ]);
    setTimeout(() => setFloats((prev) => prev.filter((f) => f.id !== id)), 900);
  };

  const playKey = async (midi: number) => {
    lightKey(midi, 250);
    spawnNote(midi);
    const ctx = await audioManager.resume();
    if (!ctx) return;
    if (!keyBusRef.current) keyBusRef.current = audioManager.createMusicBus();
    if (keyBusRef.current) {
      audioManager.scheduleNote(keyBusRef.current, midiToFreq(midi), ctx.currentTime, 0.6);
    }
  };

  const stopDemo = () => {
    demoTimersRef.current.forEach(clearTimeout);
    demoTimersRef.current = [];
    demoBusRef.current?.disconnect();
    demoBusRef.current = null;
    setPlayingId(null);
  };

  const startDemo = async (song: Song) => {
    const wasPlaying = playingId === song.id;
    stopDemo();
    if (wasPlaying) return;

    const ctx = await audioManager.resume();
    const bus = audioManager.createMusicBus();
    if (!ctx || !bus) return;
    demoBusRef.current = bus;
    setPlayingId(song.id);

    const start = ctx.currentTime + DEMO_LEAD;
    const notes = demoNotes(song);
    for (const n of notes) {
      audioManager.scheduleNote(bus, midiToFreq(n.midi), start + n.time, n.duration * 0.9);
      demoTimersRef.current.push(
        setTimeout(() => {
          lightKey(n.midi, n.duration * 800);
          spawnNote(n.midi);
        }, (n.time + DEMO_LEAD) * 1000)
      );
    }
    const last = notes[notes.length - 1];
    const endMs = last ? (last.time + last.duration + DEMO_LEAD) * 1000 + 300 : 0;
    demoTimersRef.current.push(setTimeout(stopDemo, endMs));
    audioManager.pop();
  };

  const glissando = useGlissando((key) => playKey(Number(key)));

  return (
    <div
      className="fixed inset-0 flex flex-col bg-gradient-to-b from-[#FFF8E1] to-[#FCE4EC] select-none overflow-hidden"
      style={{ touchAction: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <h1 className="pt-6 pl-20 pr-6 text-3xl font-black text-[#EC407A] text-center animate-bounce-in">
        🎹 寶寶鋼琴
      </h1>

      {/* 自動彈兒歌 */}
      <div className="mt-5 px-4 flex flex-wrap justify-center gap-3">
        {DEMO_SONGS.map((song) => {
          const playing = playingId === song.id;
          return (
            <button
              key={song.id}
              type="button"
              onClick={() => startDemo(song)}
              className={`flex items-center gap-2 rounded-full px-5 py-3 text-xl font-black shadow-md active:scale-95 transition-transform ${
                playing ? "bg-[#FFD54F] text-[#5D4037] animate-pulse" : "bg-white text-[#5D4037]"
              }`}
            >
              <span className="text-3xl leading-none">{playing ? "⏹" : song.emoji}</span>
              <span>{song.title}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* 玩具鋼琴本體 */}
      <div className="mx-2 mb-4 rounded-[2rem] bg-[#E53935] p-3 pt-4 shadow-2xl h-[56%] flex flex-col">
        <div className="flex items-center justify-between px-3 pb-3">
          <span className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-3 h-3 rounded-full bg-[#B71C1C] block" />
            ))}
          </span>
          <span className="text-white font-black text-lg tracking-widest">♪ DO RE MI ♪</span>
          <span className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-3 h-3 rounded-full bg-[#B71C1C] block" />
            ))}
          </span>
        </div>

        <div className="relative flex-1 flex" {...glissando}>
          {KEYS.filter((k) => !k.black).map((k) => {
            const down = lit.has(k.midi);
            return (
              <div
                key={k.midi}
                data-key={k.midi}
                className="flex-1 mx-[2px] rounded-b-2xl rounded-t-md flex items-end justify-center pb-4 transition-transform duration-75"
                style={{
                  backgroundColor: k.color,
                  transform: down ? "translateY(6px)" : "none",
                  filter: down ? "brightness(1.2)" : "none",
                  boxShadow: down
                    ? "inset 0 -2px 0 rgba(0,0,0,0.2)"
                    : "inset 0 -10px 0 rgba(0,0,0,0.18)",
                }}
              >
                <span className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-xs font-black text-[#5D4037] pointer-events-none">
                  {k.label}
                </span>
              </div>
            );
          })}

          {KEYS.filter((k) => k.black).map((k) => {
            const down = lit.has(k.midi);
            return (
              <div
                key={k.midi}
                data-key={k.midi}
                className="absolute top-0 h-[58%] rounded-b-xl z-10 transition-transform duration-75"
                style={{
                  left: `${(k.whiteIndex + 1) * WHITE_PCT - BLACK_PCT / 2}%`,
                  width: `${BLACK_PCT}%`,
                  backgroundColor: down ? "#546E7A" : "#263238",
                  transform: down ? "translateY(4px)" : "none",
                  boxShadow: "inset 0 -8px 0 rgba(255,255,255,0.12)",
                }}
              />
            );
          })}

          {/* 飄出來的音符 */}
          {floats.map((f) => (
            <span
              key={f.id}
              className="absolute top-0 text-5xl font-black pointer-events-none animate-float-up z-20"
              style={{ left: `${f.x}%`, color: f.color, textShadow: "0 2px 0 #fff" }}
            >
              {f.symbol}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
