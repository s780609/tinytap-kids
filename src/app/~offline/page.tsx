"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FFF0F5] p-8 text-center">
      <div className="text-8xl mb-6">🎈</div>
      <h1 className="text-3xl font-bold text-[#FF69B4] mb-4">
        哎呀！沒有網路
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        別擔心！從主畫面開啟 App 就可以離線遊玩囉。
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-full bg-[#FF69B4] px-8 py-4 text-xl font-bold text-white shadow-lg active:scale-95 transition-transform"
      >
        再試一次
      </button>
    </div>
  );
}
