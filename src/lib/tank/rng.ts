/** 可重現亂數：LCG(1664525, 1013904223)，狀態存在 state.seed（32 位元無號整數） */
export function rand(state: { seed: number }): number {
  state.seed = (Math.imul(state.seed >>> 0, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

/** [min, max] 整數 */
export function randInt(state: { seed: number }, min: number, max: number): number {
  return min + Math.floor(rand(state) * (max - min + 1));
}
