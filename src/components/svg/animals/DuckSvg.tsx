export default function DuckSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Body */}
      <ellipse cx="50" cy="70" rx="28" ry="20" fill="#FFD54F" />
      {/* Wing */}
      <ellipse cx="65" cy="68" rx="14" ry="10" fill="#FFC107" transform="rotate(15 65 68)" />
      {/* Neck */}
      <ellipse cx="35" cy="52" rx="10" ry="16" fill="#FFD54F" />
      {/* Head */}
      <circle cx="32" cy="36" r="16" fill="#FFD54F" />
      {/* Eye */}
      <circle cx="27" cy="33" r="4" fill="white" />
      <circle cx="27.5" cy="33.5" r="2.5" fill="#333" />
      <circle cx="28" cy="32.5" r="1" fill="white" />
      {/* Beak */}
      <path d="M16,38 L10,42 L18,44 Z" fill="#FF9800" />
      <line x1="14" y1="41" x2="18" y2="41.5" stroke="#E65100" strokeWidth="0.8" />
      {/* Cheek */}
      <circle cx="30" cy="39" r="3" fill="#FFB74D" opacity="0.5" />
      {/* Feet */}
      <path d="M40,88 L36,95 L44,95 Z" fill="#FF9800" />
      <path d="M55,88 L51,95 L59,95 Z" fill="#FF9800" />
      {/* Tail */}
      <path d="M76,62 Q85,55 82,48" stroke="#FFC107" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
