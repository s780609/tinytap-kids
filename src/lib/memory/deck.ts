/**
 * 記憶翻牌：從這一關的圖裡挑幾種、每種兩張、洗牌。
 */
export function buildDeck(ids: readonly string[], pairs: number, rand: () => number = Math.random): string[] {
  const pool = shuffle([...new Set(ids)], rand).slice(0, Math.min(pairs, ids.length));
  return shuffle([...pool, ...pool], rand);
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

