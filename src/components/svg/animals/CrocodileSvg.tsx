export default function CrocodileSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Long snout */}
      <rect x="22" y="48" width="56" height="44" rx="18" fill="#66BB6A" />
      <rect x="26" y="70" width="48" height="18" rx="9" fill="#A5D6A7" />
      {/* Teeth */}
      <polygon points="30,70 33,77 36,70" fill="white" />
      <polygon points="42,70 45,77 48,70" fill="white" />
      <polygon points="52,70 55,77 58,70" fill="white" />
      <polygon points="64,70 67,77 70,70" fill="white" />
      {/* Head and bumpy eyes on top */}
      <ellipse cx="50" cy="42" rx="28" ry="18" fill="#66BB6A" />
      <circle cx="36" cy="26" r="11" fill="#66BB6A" />
      <circle cx="64" cy="26" r="11" fill="#66BB6A" />
      {/* Eyes */}
      <circle cx="36" cy="26" r="5.5" fill="white" />
      <circle cx="64" cy="26" r="5.5" fill="white" />
      <circle cx="36.8" cy="26.8" r="3.3" fill="#333" />
      <circle cx="64.8" cy="26.8" r="3.3" fill="#333" />
      <circle cx="37.6" cy="25.4" r="1" fill="white" />
      <circle cx="65.6" cy="25.4" r="1" fill="white" />
      {/* Back bumps */}
      <circle cx="42" cy="44" r="2.5" fill="#43A047" />
      <circle cx="58" cy="44" r="2.5" fill="#43A047" />
      <circle cx="50" cy="50" r="2.5" fill="#43A047" />
      {/* Nostrils */}
      <ellipse cx="42" cy="58" rx="2.5" ry="2" fill="#2E7D32" />
      <ellipse cx="58" cy="58" rx="2.5" ry="2" fill="#2E7D32" />
      <ellipse cx="26" cy="62" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
      <ellipse cx="74" cy="62" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
    </svg>
  );
}
