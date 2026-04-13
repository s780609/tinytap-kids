export default function AppleSvg({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Stem */}
      <path d="M50,15 Q52,5 55,8" stroke="#8D6E63" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Leaf */}
      <ellipse cx="58" cy="12" rx="8" ry="4" fill="#81C784" transform="rotate(25 58 12)" />
      {/* Body */}
      <ellipse cx="50" cy="55" rx="32" ry="35" fill="#EF5350" />
      {/* Top indent */}
      <path d="M38,22 Q50,30 62,22" stroke="#EF5350" strokeWidth="6" fill="#FFF0F5" />
      {/* Shine */}
      <ellipse cx="36" cy="42" rx="8" ry="12" fill="rgba(255,255,255,0.3)" transform="rotate(-10 36 42)" />
    </svg>
  );
}
