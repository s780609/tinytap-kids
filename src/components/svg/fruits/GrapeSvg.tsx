export default function GrapeSvg({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Stem */}
      <path d="M50,18 Q50,8 48,5" stroke="#8D6E63" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Leaf */}
      <ellipse cx="55" cy="12" rx="9" ry="5" fill="#81C784" transform="rotate(15 55 12)" />
      {/* Grapes - top row */}
      <circle cx="42" cy="32" r="10" fill="#CE93D8" />
      <circle cx="58" cy="32" r="10" fill="#CE93D8" />
      {/* Middle row */}
      <circle cx="34" cy="48" r="10" fill="#CE93D8" />
      <circle cx="50" cy="48" r="10" fill="#CE93D8" />
      <circle cx="66" cy="48" r="10" fill="#CE93D8" />
      {/* Bottom row */}
      <circle cx="42" cy="64" r="10" fill="#CE93D8" />
      <circle cx="58" cy="64" r="10" fill="#CE93D8" />
      {/* Bottom */}
      <circle cx="50" cy="78" r="9" fill="#CE93D8" />
      {/* Shines */}
      <circle cx="39" cy="29" r="3" fill="rgba(255,255,255,0.3)" />
      <circle cx="55" cy="29" r="3" fill="rgba(255,255,255,0.3)" />
      <circle cx="47" cy="45" r="3" fill="rgba(255,255,255,0.3)" />
    </svg>
  );
}
