"use client";

import { DEX_TYPES, dexCount, isDexComplete, type FishDex } from "@/lib/fishing/fishDex";
import type { CatchType } from "@/lib/fishing/fishingLogic";

interface FishDexDialogProps {
  dex: FishDex;
  onPick: (type: CatchType) => void;
  onClose: () => void;
}

/** 魚類圖鑑：沒釣過的是灰色剪影，釣到了才亮起來 */
export default function FishDexDialog({ dex, onPick, onClose }: FishDexDialogProps) {
  const count = dexCount(dex);
  const complete = isDexComplete(dex);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-5 shadow-2xl animate-bounce-in w-[360px] max-w-[92vw] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-black text-[#4FC3F7] text-center">📖 魚類圖鑑</h2>
        <p className="text-center font-bold text-[#FFB74D] mb-1">
          已收集 {count} / {DEX_TYPES.length}
        </p>
        <div className="h-3 rounded-full bg-gray-100 overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-[#4FC3F7] to-[#81C784] transition-all"
            style={{ width: `${(count / DEX_TYPES.length) * 100}%` }}
          />
        </div>
        {complete && (
          <div className="mb-3 rounded-2xl bg-[#FFF8E1] text-center py-2 font-black text-[#F9A825] animate-bounce-in">
            🏆 全部收集完成！你是釣魚高手！
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {DEX_TYPES.map((type) => {
            const n = dex.caught[type.kind] ?? 0;
            const found = n > 0;
            return (
              <button
                key={type.kind}
                type="button"
                disabled={!found}
                onClick={() => onPick(type)}
                className={`relative rounded-2xl p-2 flex flex-col items-center active:scale-95 transition-transform ${
                  found ? (type.isRare ? "bg-[#FFF8E1]" : "bg-[#E1F5FE]") : "bg-gray-100"
                }`}
              >
                {type.isRare && (
                  <span className="absolute top-1 right-1.5 text-xs" aria-label="稀有">
                    ⭐
                  </span>
                )}
                <span
                  className="text-4xl leading-none h-12 flex items-center"
                  style={found ? undefined : { filter: "brightness(0)", opacity: 0.18 }}
                >
                  {type.emoji}
                </span>
                <span className={`text-sm font-black ${found ? "text-gray-700" : "text-gray-300"}`}>
                  {found ? type.label : "？？？"}
                </span>
                <span className="text-xs font-bold text-[#FFB74D] h-4">{found ? `× ${n}` : ""}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-3 rounded-2xl bg-[#4FC3F7] text-white font-bold text-lg active:scale-95 transition-transform"
        >
          好
        </button>
      </div>
    </div>
  );
}
