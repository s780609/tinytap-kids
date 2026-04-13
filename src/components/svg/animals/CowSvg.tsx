export default function CowSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Horns */}
      <path d="M30,28 Q25,12 18,15" stroke="#FFB74D" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M70,28 Q75,12 82,15" stroke="#FFB74D" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* Ears */}
      <ellipse cx="22" cy="38" rx="8" ry="5" fill="#F5F5F5" transform="rotate(-20 22 38)" />
      <ellipse cx="78" cy="38" rx="8" ry="5" fill="#F5F5F5" transform="rotate(20 78 38)" />
      {/* Head */}
      <ellipse cx="50" cy="48" rx="28" ry="24" fill="#F5F5F5" />
      {/* Spots */}
      <ellipse cx="38" cy="38" rx="8" ry="6" fill="#333" />
      <ellipse cx="65" cy="42" rx="6" ry="5" fill="#333" />
      {/* Eyes */}
      <circle cx="38" cy="44" r="4.5" fill="white" />
      <circle cx="62" cy="44" r="4.5" fill="white" />
      <circle cx="39" cy="45" r="2.5" fill="#333" />
      <circle cx="63" cy="45" r="2.5" fill="#333" />
      {/* Muzzle */}
      <ellipse cx="50" cy="60" rx="14" ry="10" fill="#FFE0B2" />
      {/* Nostrils */}
      <ellipse cx="44" cy="59" rx="3" ry="2" fill="#8D6E63" />
      <ellipse cx="56" cy="59" rx="3" ry="2" fill="#8D6E63" />
      {/* Mouth */}
      <path d="M44,64 Q50,68 56,64" stroke="#8D6E63" strokeWidth="1.5" fill="none" />
      {/* Body */}
      <ellipse cx="50" cy="86" rx="24" ry="13" fill="#F5F5F5" />
      <ellipse cx="42" cy="84" rx="7" ry="5" fill="#333" />
    </svg>
  );
}
