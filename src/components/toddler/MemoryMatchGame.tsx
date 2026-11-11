"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { MEMORY_DIFFICULTIES, bestGrid, buildDeck, pairsFor, type MemoryDifficulty } from "@/lib/memory/deck";
import { ParticleEngine } from "@/lib/particles/ParticleEngine";
import ParticleCanvas from "@/components/baby/ParticleCanvas";
import { MEMORY_LEVELS, type MemoryItem, type MemoryLevel } from "@/components/toddler/memory/memoryLevels";

interface Card {
  id: number;
  item: MemoryItem;
  flipped: boolean;
  matched: boolean;
}

function dealCards(level: MemoryLevel, pairs: number): Card[] {
  const byId = new Map(level.items.map((it) => [it.id, it]));
  return buildDeck(
    level.items.map((it) => it.id),
    pairs
  ).map((itemId, idx) => ({ id: idx, item: byId.get(itemId)!, flipped: false, matched: false }));
}

/** 記住上次選的難度（只是方便，讀不到就用簡單） */
const DIFFICULTY_KEY = "tinytap-memory-difficulty";
/** 牌與牌的間距（px） */
const GAP = 8;

export default function MemoryMatchGame() {
  const { settings } = useSettings();
  /** null = 選關卡 */
  const [levelIdx, setLevelIdx] = useState<number | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  /** 這次玩過關的「關卡:難度」，選單上打星星 */
  const [cleared, setCleared] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<MemoryDifficulty>("easy");
  /** 牌桌可用的空間，用來決定排幾欄、每張多大 */
  const [area, setArea] = useState({ w: 0, h: 0 });
  const lockRef = useRef(false);
  const engineRef = useRef<ParticleEngine | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const diff = MEMORY_DIFFICULTIES.find((d) => d.id === difficulty)!;
  const level = levelIdx === null ? null : MEMORY_LEVELS[levelIdx];
  const totalPairs = level ? pairsFor(level.items.length, diff) : 0;

  const startLevel = useCallback(
    (i: number) => {
      setLevelIdx(i);
      setCards(dealCards(MEMORY_LEVELS[i], diff.pairs));
      setFlippedIds([]);
      setMatchCount(0);
      setGameComplete(false);
      lockRef.current = false;
    },
    [diff.pairs]
  );

  const chooseDifficulty = (d: MemoryDifficulty) => {
    audioManager.pop();
    setDifficulty(d);
    try {
      localStorage.setItem(DIFFICULTY_KEY, d);
    } catch {
      // 無痕模式等存不了就算了
    }
  };

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const saved = localStorage.getItem(DIFFICULTY_KEY);
        if (MEMORY_DIFFICULTIES.some((d) => d.id === saved)) setDifficulty(saved as MemoryDifficulty);
      } catch {
        // 讀不到就用預設
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // 量牌桌的大小：轉橫轉直、換關卡時重新排
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setArea({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [levelIdx]);

  const toMenu = () => {
    audioManager.pop();
    setLevelIdx(null);
    setGameComplete(false);
  };

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  const handleCardTap = useCallback(
    (id: number, e: React.PointerEvent) => {
      if (lockRef.current || !level) return;

      const card = cards.find((c) => c.id === id);
      if (!card || card.flipped || card.matched) return;

      audioManager.pop();

      const newFlipped = [...flippedIds, id];
      setFlippedIds(newFlipped);
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, flipped: true } : c)));

      if (newFlipped.length === 2) {
        lockRef.current = true;
        const [firstId, secondId] = newFlipped;
        const first = cards.find((c) => c.id === firstId)!;
        const second = cards.find((c) => c.id === secondId)!;

        if (first.item.id === second.item.id) {
          // 配對成功：唸出名字
          setTimeout(() => {
            engineRef.current?.confetti(e.clientX, e.clientY, 25);
            audioManager.success();
            audioManager.speak(first.item.name);
            setCards((prev) =>
              prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, matched: true } : c))
            );
            setFlippedIds([]);
            lockRef.current = false;

            const newCount = matchCount + 1;
            setMatchCount(newCount);

            if (newCount >= totalPairs) {
              const key = `${level.id}:${difficulty}`;
              setCleared((prev) => (prev.includes(key) ? prev : [...prev, key]));
              setTimeout(() => {
                setGameComplete(true);
                audioManager.chime();
                audioManager.playFile("/sounds/voices/great-job.mp3");
              }, 900);
            }
          }, 400);
        } else {
          setTimeout(() => {
            audioManager.wrong();
            setCards((prev) =>
              prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, flipped: false } : c))
            );
            setFlippedIds([]);
            lockRef.current = false;
          }, diff.peekMs);
        }
      }
    },
    [cards, flippedIds, matchCount, level, totalPairs, difficulty, diff.peekMs]
  );

  // ---------- 選關卡 ----------
  if (!level || levelIdx === null) {
    return (
      <div className="flex flex-col items-center h-screen overflow-y-auto p-6 pt-20 pb-10 gap-4 select-none">
        <h1 className="text-3xl md:text-4xl font-black text-[#4FC3F7] animate-bounce-in">🃏 記憶翻牌</h1>
        <p className="text-lg font-bold text-[#4A4A4A]">選一關，找出一樣的配對！</p>
        <div className="flex gap-2 rounded-full bg-white/80 p-1.5 shadow">
          {MEMORY_DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => chooseDifficulty(d.id)}
              className={`px-4 py-2 rounded-full text-base font-black transition-colors active:scale-95 ${
                d.id === difficulty ? "bg-[#4FC3F7] text-white shadow" : "text-[#0288D1]"
              }`}
            >
              {d.emoji} {d.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl">
          {MEMORY_LEVELS.map((lv, i) => (
            <button
              key={lv.id}
              type="button"
              onClick={() => {
                audioManager.pop();
                startLevel(i);
              }}
              className="relative flex flex-col items-center rounded-3xl p-3 shadow-lg active:scale-95 transition-transform"
              style={{ backgroundColor: lv.color }}
            >
              <span className="text-sm font-black text-white/80">第 {i + 1} 關</span>
              <span className="text-5xl leading-none my-1">{lv.emoji}</span>
              <span className="text-xl font-black text-white">{lv.title}</span>
              {/* 這一關會出現的圖，先看三個 */}
              <span className="mt-2 flex gap-1 rounded-2xl bg-white/90 p-1.5">
                {lv.items.slice(0, 3).map((it) => (
                  <span key={it.id} className="w-9 h-9 flex items-center justify-center overflow-hidden rounded-lg">
                    {it.render(36)}
                  </span>
                ))}
              </span>
              <span className="mt-1 text-xs font-bold text-white/90">{pairsFor(lv.items.length, diff)} 對</span>
              {cleared.includes(`${lv.id}:${difficulty}`) && (
                <span className="absolute top-1 right-2 text-3xl drop-shadow animate-bounce-in">⭐</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------- 翻牌 ----------
  const next = levelIdx + 1 < MEMORY_LEVELS.length ? levelIdx + 1 : null;
  const grid = bestGrid(cards.length, area.w, area.h, GAP);

  return (
    <div className="flex flex-col items-center h-dvh p-3 pt-4 gap-2 relative overflow-hidden">
      <ParticleCanvas engineRef={engineRef} />

      <div className="z-10 flex w-full max-w-3xl items-center justify-between gap-2 pl-16">
        <p className="text-xl md:text-2xl font-black" style={{ color: level.color }}>
          {level.emoji} {level.title}
          <span className="ml-2 text-base text-[#FF69B4]">
            {matchCount} / {totalPairs} 對
          </span>
        </p>
        <button
          type="button"
          onClick={toMenu}
          className="px-4 py-2 rounded-full bg-white text-base font-bold text-[#0288D1] shadow active:scale-95"
        >
          🗂️ 換關卡
        </button>
      </div>

      <div ref={areaRef} className="z-10 flex-1 min-h-0 w-full flex items-center justify-center">
        <div
          className="grid"
          style={{ gap: GAP, gridTemplateColumns: `repeat(${grid.cols}, ${grid.size}px)`, gridAutoRows: `${grid.size}px` }}
        >
          {cards.map((card) => {
            const isFlipped = card.flipped || card.matched;
            return (
              <button
                key={card.id}
                className={`
                  aspect-square rounded-2xl transition-all duration-300 select-none overflow-hidden
                  flex items-center justify-center
                  ${card.matched ? "opacity-70 scale-95" : "active:scale-95 cursor-pointer"}
                  ${!isFlipped ? "shadow-lg" : "bg-white shadow-md"}
                `}
                style={isFlipped ? undefined : { backgroundColor: level.color }}
                onPointerDown={(e) => handleCardTap(card.id, e)}
                disabled={card.matched}
              >
                {isFlipped ? (
                  <div className="animate-bounce-in flex items-center justify-center">
                    {card.item.render(Math.round(grid.size * level.iconScale))}
                  </div>
                ) : (
                  <span className="select-none" style={{ fontSize: grid.size * 0.36 }}>
                    ❓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {gameComplete && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl animate-celebrate mx-4">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-black text-[#FF69B4] mb-2">太厲害了！</h2>
            <p className="text-xl text-gray-500 mb-6">
              {level.title}全部配對成功！
            </p>
            <div className="flex flex-col gap-3">
              {next !== null && (
                <button
                  onClick={() => {
                    audioManager.pop();
                    startLevel(next);
                  }}
                  className="px-8 py-4 rounded-2xl text-white font-bold text-xl active:scale-95 transition-transform"
                  style={{ backgroundColor: MEMORY_LEVELS[next].color }}
                >
                  下一關：{MEMORY_LEVELS[next].emoji} {MEMORY_LEVELS[next].title} ➡️
                </button>
              )}
              <button
                onClick={() => startLevel(levelIdx)}
                className="px-8 py-4 rounded-2xl bg-[#4FC3F7] text-white font-bold text-xl active:scale-95 transition-transform"
              >
                🔁 再玩一次
              </button>
              <button
                onClick={toMenu}
                className="px-8 py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold text-lg active:scale-95 transition-transform"
              >
                🗂️ 選關卡
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
