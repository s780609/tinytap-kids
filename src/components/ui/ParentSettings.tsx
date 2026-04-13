"use client";

import { useSettings } from "@/lib/settings/SettingsContext";
import { audioManager } from "@/lib/audio/AudioManager";

interface ParentSettingsProps {
  onClose: () => void;
}

export default function ParentSettings({ onClose }: ParentSettingsProps) {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#4A4A4A]">家長設定</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xl active:scale-90 transition-transform"
          >
            &times;
          </button>
        </div>

        {/* Default Mode */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            預設模式
          </label>
          <div className="flex flex-col gap-2">
            {(["ask", "baby", "toddler"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => updateSettings({ defaultMode: mode })}
                className={`px-4 py-3 rounded-xl text-left font-medium transition-colors ${
                  settings.defaultMode === mode
                    ? "bg-[#FF69B4] text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {mode === "ask"
                  ? "每次詢問"
                  : mode === "baby"
                    ? "寶寶模式（1歲）"
                    : "幼兒模式（3歲）"}
              </button>
            ))}
          </div>
        </div>

        {/* Volume */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            音量：{Math.round(settings.volume * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              updateSettings({ volume: v });
              audioManager.setVolume(v);
            }}
            className="w-full h-3 rounded-full appearance-none cursor-pointer accent-[#FF69B4]"
            style={{
              background: `linear-gradient(to right, #FF69B4 ${settings.volume * 100}%, #E0E0E0 ${settings.volume * 100}%)`,
            }}
          />
        </div>

        {/* Timer */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-600">
              遊玩計時提醒
            </label>
            <button
              onClick={() =>
                updateSettings({ timerEnabled: !settings.timerEnabled })
              }
              className={`w-14 h-8 rounded-full transition-colors ${
                settings.timerEnabled ? "bg-[#FF69B4]" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow transition-transform mx-1 ${
                  settings.timerEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          {settings.timerEnabled && (
            <div className="flex gap-2 mt-2">
              {[10, 15, 20, 30].map((min) => (
                <button
                  key={min}
                  onClick={() => updateSettings({ timerMinutes: min })}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    settings.timerMinutes === min
                      ? "bg-[#4FC3F7] text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {min}分鐘
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
