export default function ChickenSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Tail feathers */}
      <ellipse cx="80" cy="58" rx="8" ry="16" fill="#6D4C41" transform="rotate(25 80 58)" />
      {/* Body */}
      <ellipse cx="54" cy="68" rx="28" ry="22" fill="#A1887F" />
      <ellipse cx="44" cy="72" rx="15" ry="14" fill="#D7CCC8" />
      {/* Wing */}
      <ellipse cx="62" cy="68" rx="13" ry="9" fill="#8D6E63" transform="rotate(-15 62 68)" />
      {/* Legs */}
      <path d="M46,88 L44,97 M58,88 L60,97" stroke="#FF9800" strokeWidth="3" strokeLinecap="round" />
      {/* Head */}
      <circle cx="38" cy="38" r="15" fill="#A1887F" />
      {/* Comb */}
      <circle cx="32" cy="22" r="5" fill="#E53935" />
      <circle cx="39" cy="20" r="5.5" fill="#E53935" />
      <circle cx="46" cy="23" r="4.5" fill="#E53935" />
      {/* Eye */}
      <circle cx="34" cy="36" r="4" fill="white" />
      <circle cx="33.5" cy="36.5" r="2.5" fill="#333" />
      <circle cx="33" cy="35.5" r="1" fill="white" />
      {/* Beak, wattle */}
      <path d="M24,40 L15,43 L24,46 Z" fill="#FF9800" />
      <ellipse cx="26" cy="50" rx="3" ry="5" fill="#E53935" />
      <ellipse cx="38" cy="45" rx="4" ry="2.5" fill="#F48FB1" opacity="0.6" />
    </svg>
  );
}
