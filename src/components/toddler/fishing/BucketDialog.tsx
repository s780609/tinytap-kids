"use client";

import { CATCH_TYPES, type CatchKind } from "@/lib/fishing/fishingLogic";

interface BucketDialogProps {
  bucket: CatchKind[];
  onRelease: (kind: CatchKind) => void;
  onAquarium: () => void;
  onClose: () => void;
}

/** 水桶清單：可以把魚放回池塘，或打開水族箱看牠們游 */
export default function BucketDialog({ bucket, onRelease, onAquarium, onClose }: BucketDialogProps) {
  const summary = CATCH_TYPES.map((c) => ({
    type: c,
    count: bucket.filter((k) => k === c.kind).length,
  })).filter((x) => x.count > 0);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 shadow-2xl animate-bounce-in w-[340px] max-w-[92vw] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-black text-[#4FC3F7] text-center mb-3">🪣 水桶裡有什麼？</h2>
        {summary.length === 0 ? (
          <p className="text-center text-gray-400 font-bold py-6">水桶還是空的，快去釣魚吧！</p>
        ) : (
          <div className="flex flex-col gap-2">
            {summary.map(({ type, count }) => (
              <div
                key={type.kind}
                className={`rounded-2xl p-2 pl-3 flex items-center gap-3 ${
                  type.isRare ? "bg-[#FFF8E1]" : "bg-[#E1F5FE]"
                }`}
              >
                <span className="text-4xl leading-none">{type.emoji}</span>
                <div className="flex-1">
                  <div className="font-black text-gray-700">{type.label}</div>
                  <div className="text-sm font-bold text-[#FFB74D]">× {count}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onRelease(type.kind)}
                  className="px-3 py-2 rounded-xl bg-white text-[#0288D1] font-black shadow active:scale-95 transition-transform"
                >
                  🌊 放生
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          disabled={bucket.length === 0}
          onClick={onAquarium}
          className="mt-4 w-full py-3 rounded-2xl bg-[#81C784] text-white font-bold text-lg active:scale-95 transition-transform disabled:opacity-40"
        >
          🐠 去水族箱看看
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full py-3 rounded-2xl bg-[#4FC3F7] text-white font-bold text-lg active:scale-95 transition-transform"
        >
          好
        </button>
      </div>
    </div>
  );
}
