/**
 * 小任務卡：「釣 3 隻螃蟹」、「撿 2 個垃圾」，順便練習數數。
 */

import { CATCH_TYPES, getCatchType, type CatchKind, type CatchType } from "./fishingLogic.ts";

/** 任務目標：某一種魚，或任何垃圾 */
export type TaskTarget = CatchKind | "junk";

export interface FishingTask {
  target: TaskTarget;
  need: number;
  got: number;
}

const NUMBER_WORDS = ["零", "一", "兩", "三", "四", "五"];

/** 可以當任務目標的魚：一般魚（稀有的太難遇到） */
export const TASK_FISH: CatchKind[] = CATCH_TYPES.filter((c) => !c.isJunk && !c.isRare).map(
  (c) => c.kind
);

/**
 * 出一個新任務。pondKinds 是池裡現在有的種類，優先從裡面挑，保證釣得到；
 * available 是這個天氣會出現的魚（給了就只出這些），不會跟上一個任務一樣。
 */
export function createTask(
  pondKinds: CatchKind[],
  rand: () => number = Math.random,
  previous?: TaskTarget,
  available?: readonly CatchKind[]
): FishingTask {
  const possible = available ? TASK_FISH.filter((k) => available.includes(k)) : TASK_FISH;
  const inPond = possible.filter((k) => pondKinds.includes(k));
  const fishPool = inPond.length > 0 ? inPond : possible;
  const targets = ([...fishPool, "junk"] as TaskTarget[]).filter((t) => t !== previous);
  const target = targets[Math.min(targets.length - 1, Math.floor(rand() * targets.length))];
  // 要捲很多圈的大魚最多只要兩條，不然太累
  const maxNeed = target !== "junk" && getCatchType(target).reelTurns >= 5 ? 2 : 3;
  const need = 1 + Math.floor(rand() * maxNeed);
  return { target, need, got: 0 };
}

export function taskMatches(target: TaskTarget, kind: CatchKind): boolean {
  return target === "junk" ? getCatchType(kind).isJunk : target === kind;
}

/** 釣到一隻：符合任務就 +1（不超過 need） */
export function applyCatch(task: FishingTask, kind: CatchKind): FishingTask {
  if (!taskMatches(task.target, kind) || task.got >= task.need) return task;
  return { ...task, got: task.got + 1 };
}

/** 換天氣後這個任務還做得到嗎（要的魚在新天氣會出現，或是撿垃圾） */
export function taskPossible(task: FishingTask, available: readonly CatchKind[]): boolean {
  return task.target === "junk" || available.includes(task.target);
}

export function isTaskDone(task: FishingTask): boolean {
  return task.got >= task.need;
}

/** 任務目標的圖示：魚就是牠的 emoji，垃圾用 🗑️ */
export function taskEmoji(target: TaskTarget): string {
  return target === "junk" ? "🗑️" : getCatchType(target).emoji;
}

/** 生成時偏好任務要的種類 */
export function taskFavor(task: FishingTask | null): ((c: CatchType) => boolean) | undefined {
  if (!task || isTaskDone(task)) return undefined;
  return (c) => (task.target === "junk" ? c.isJunk : c.kind === task.target);
}

/** 任務的說法，例如「釣兩隻螃蟹」、「撿一個垃圾」 */
export function taskText(task: FishingTask): string {
  const n = NUMBER_WORDS[task.need] ?? String(task.need);
  if (task.target === "junk") return `撿${n}個垃圾`;
  const type = getCatchType(task.target);
  return `釣${n}${type.unit}${type.label}`;
}
