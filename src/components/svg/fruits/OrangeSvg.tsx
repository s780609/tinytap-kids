export default function OrangeSvg({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Stem */}
      <rect x="47" y="8" width="6" height="8" rx="2" fill="#8D6E63" />
      {/* Leaf */}
      <ellipse cx="58" cy="12" rx="9" ry="4" fill="#81C784" transform="rotate(20 58 12)" />
      {/* Body */}
      <circle cx="50" cy="52" r="34" fill="#FFB74D" />
      {/* Texture dots */}
      <circle cx="38" cy="42" r="1.5" fill="#FF9800" opacity="0.3" />
      <circle cx="55" cy="38" r="1.5" fill="#FF9800" opacity="0.3" />
      <circle cx="45" cy="58" r="1.5" fill="#FF9800" opacity="0.3" />
      <circle cx="62" cy="55" r="1.5" fill="#FF9800" opacity="0.3" />
      <circle cx="40" cy="65" r="1.5" fill="#FF9800" opacity="0.3" />
      {/* Shine */}
      <ellipse cx="38" cy="40" rx="8" ry="11" fill="rgba(255,255,255,0.25)" transform="rotate(-15 38 40)" />
    </svg>
  );
}
