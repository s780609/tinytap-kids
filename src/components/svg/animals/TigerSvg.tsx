export default function TigerSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Body */}
      <ellipse cx="50" cy="87" rx="22" ry="12" fill="#FF9800" />
      {/* Ears */}
      <circle cx="25" cy="26" r="10" fill="#FF9800" />
      <circle cx="75" cy="26" r="10" fill="#FF9800" />
      <circle cx="25" cy="26" r="5.5" fill="#FFE0B2" />
      <circle cx="75" cy="26" r="5.5" fill="#FFE0B2" />
      {/* Head */}
      <ellipse cx="50" cy="50" rx="32" ry="28" fill="#FF9800" />
      {/* Stripes */}
      <path d="M44,24 L46,34 M50,22 L50,34 M56,24 L54,34 M19,46 L29,48 M18,56 L28,56 M81,46 L71,48 M82,56 L72,56" stroke="#3E2723" strokeWidth="3" strokeLinecap="round" />
      {/* Muzzle */}
      <ellipse cx="41" cy="61" rx="11" ry="9" fill="#FFF3E0" />
      <ellipse cx="59" cy="61" rx="11" ry="9" fill="#FFF3E0" />
      <ellipse cx="50" cy="56" rx="4.5" ry="3.2" fill="#F06292" />
      <path d="M50,59 Q46,65 42,63" stroke="#333" strokeWidth="1.2" fill="none" />
      <path d="M50,59 Q54,65 58,63" stroke="#333" strokeWidth="1.2" fill="none" />
      {/* Eyes */}
      <circle cx="38" cy="44" r="4.5" fill="white" />
      <circle cx="62" cy="44" r="4.5" fill="white" />
      <circle cx="38.8" cy="44.8" r="2.7" fill="#333" />
      <circle cx="62.8" cy="44.8" r="2.7" fill="#333" />
      <circle cx="39.6" cy="43.4" r="1" fill="white" />
      <circle cx="63.6" cy="43.4" r="1" fill="white" />
    </svg>
  );
}
