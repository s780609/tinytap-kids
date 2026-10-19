import type { Dir } from "./constants.ts";

/** 十字鍵：手指相對中心的位移（y 往下為正）→ 主軸方向；死區 18% 半徑 */
export function dirFromPad(dx: number, dy: number, radius: number): Dir | null {
  if (Math.hypot(dx, dy) < radius * 0.18) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 1 : 3;
  return dy > 0 ? 2 : 0;
}

/** 鍵盤方向：最後按下且仍按著的優先 */
export class DirStack {
  private stack: Dir[] = [];

  press(dir: Dir): void {
    if (!this.stack.includes(dir)) this.stack.push(dir);
  }

  release(dir: Dir): void {
    this.stack = this.stack.filter((d) => d !== dir);
  }

  clear(): void {
    this.stack = [];
  }

  current(): Dir | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }
}
