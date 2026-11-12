export default function FoxSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Body */}
      <ellipse cx="50" cy="88" rx="20" ry="11" fill="#FF7043" />
      {/* Pointy ears */}
      <polygon points="20,40 22,6 44,26" fill="#FF7043" />
      <polygon points="80,40 78,6 56,26" fill="#FF7043" />
      <polygon points="25,32 26,15 38,26" fill="#4E342E" />
      <polygon points="75,32 74,15 62,26" fill="#4E342E" />
      {/* Head (wide cheeks, pointed chin) */}
      <path d="M16,42 Q20,22 50,22 Q80,22 84,42 Q86,54 74,62 L50,80 L26,62 Q14,54 16,42 Z" fill="#FF7043" />
      {/* White cheeks */}
      <path d="M18,48 Q30,52 40,62 L50,80 L28,64 Q18,56 18,48 Z" fill="white" />
      <path d="M82,48 Q70,52 60,62 L50,80 L72,64 Q82,56 82,48 Z" fill="white" />
      {/* Eyes */}
      <circle cx="38" cy="44" r="4.5" fill="white" />
      <circle cx="62" cy="44" r="4.5" fill="white" />
      <circle cx="38.8" cy="44.8" r="2.7" fill="#333" />
      <circle cx="62.8" cy="44.8" r="2.7" fill="#333" />
      <circle cx="39.6" cy="43.4" r="1" fill="white" />
      <circle cx="63.6" cy="43.4" r="1" fill="white" />
      {/* Nose, mouth */}
      <ellipse cx="50" cy="72" rx="4" ry="3" fill="#3E2723" />
      <path d="M50,75 L50,77 M46,78 Q50,80 54,78" stroke="#3E2723" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <ellipse cx="30" cy="56" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
      <ellipse cx="70" cy="56" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
    </svg>
  );
}
