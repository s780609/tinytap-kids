export default function TurkeySvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Fan tail */}
      <ellipse cx="50" cy="50" rx="46" ry="40" fill="#E64A19" />
      <ellipse cx="50" cy="52" rx="38" ry="32" fill="#FFA000" />
      <ellipse cx="50" cy="54" rx="30" ry="25" fill="#8D6E63" />
      {/* Body */}
      <ellipse cx="50" cy="72" rx="20" ry="18" fill="#6D4C41" />
      {/* Head */}
      <circle cx="50" cy="42" r="16" fill="#A1887F" />
      {/* Eyes */}
      <circle cx="44" cy="38" r="3.8" fill="white" />
      <circle cx="56" cy="38" r="3.8" fill="white" />
      <circle cx="44.8" cy="38.8" r="2.3" fill="#333" />
      <circle cx="56.8" cy="38.8" r="2.3" fill="#333" />
      <circle cx="45.6" cy="37.4" r="1" fill="white" />
      <circle cx="57.6" cy="37.4" r="1" fill="white" />
      {/* Beak and red wattle */}
      <polygon points="46,46 54,46 50,53" fill="#FFB300" />
      <path d="M52,50 Q58,58 53,64 Q49,60 50,52 Z" fill="#E53935" />
      {/* Feet */}
      <path d="M43,88 L41,96 M43,88 L45,96 M57,88 L55,96 M57,88 L59,96" stroke="#FFB300" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="38" cy="46" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
      <ellipse cx="62" cy="46" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
    </svg>
  );
}
