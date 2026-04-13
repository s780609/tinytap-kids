export default function StrawberrySvg({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Leaves */}
      <ellipse cx="38" cy="18" rx="10" ry="5" fill="#81C784" transform="rotate(-30 38 18)" />
      <ellipse cx="50" cy="14" rx="8" ry="5" fill="#81C784" />
      <ellipse cx="62" cy="18" rx="10" ry="5" fill="#81C784" transform="rotate(30 62 18)" />
      {/* Body */}
      <path
        d="M50,20 Q75,35 68,65 Q60,88 50,90 Q40,88 32,65 Q25,35 50,20Z"
        fill="#EF5350"
      />
      {/* Seeds */}
      <ellipse cx="42" cy="40" rx="2" ry="2.5" fill="#FFD54F" />
      <ellipse cx="56" cy="38" rx="2" ry="2.5" fill="#FFD54F" />
      <ellipse cx="38" cy="55" rx="2" ry="2.5" fill="#FFD54F" />
      <ellipse cx="50" cy="52" rx="2" ry="2.5" fill="#FFD54F" />
      <ellipse cx="62" cy="53" rx="2" ry="2.5" fill="#FFD54F" />
      <ellipse cx="44" cy="68" rx="2" ry="2.5" fill="#FFD54F" />
      <ellipse cx="56" cy="67" rx="2" ry="2.5" fill="#FFD54F" />
      <ellipse cx="50" cy="78" rx="1.5" ry="2" fill="#FFD54F" />
      {/* Shine */}
      <ellipse cx="40" cy="35" rx="5" ry="8" fill="rgba(255,255,255,0.25)" transform="rotate(-10 40 35)" />
    </svg>
  );
}
