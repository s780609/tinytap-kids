"use client";

import { useSettings } from "@/lib/settings/SettingsContext";
import { audioManager } from "@/lib/audio/AudioManager";

interface VolumeSliderProps {
  onClose: () => void;
}

export default function VolumeSlider({ onClose }: VolumeSliderProps) {
  const { settings, updateSettings } = useSettings();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    updateSettings({ volume: v });
    audioManager.setVolume(v);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="#FF69B4"
          >
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.volume}
            onChange={handleChange}
            className="flex-1 h-3 rounded-full appearance-none cursor-pointer accent-[#FF69B4]"
            style={{
              background: `linear-gradient(to right, #FF69B4 ${settings.volume * 100}%, #E0E0E0 ${settings.volume * 100}%)`,
            }}
          />
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="#FF69B4"
          >
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
