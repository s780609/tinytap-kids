export default function LionSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Mane */}
      <circle cx="50" cy="45" r="35" fill="#FF8F00" />
      {/* Mane tufts */}
      <circle cx="22" cy="30" r="8" fill="#F57C00" />
      <circle cx="78" cy="30" r="8" fill="#F57C00" />
      <circle cx="18" cy="48" r="7" fill="#F57C00" />
      <circle cx="82" cy="48" r="7" fill="#F57C00" />
      <circle cx="30" cy="18" r="7" fill="#F57C00" />
      <circle cx="70" cy="18" r="7" fill="#F57C00" />
      <circle cx="50" cy="12" r="7" fill="#F57C00" />
      {/* Face */}
      <circle cx="50" cy="48" r="24" fill="#FFB74D" />
      {/* Ears */}
      <circle cx="30" cy="30" r="6" fill="#FFB74D" />
      <circle cx="70" cy="30" r="6" fill="#FFB74D" />
      <circle cx="30" cy="30" r="3.5" fill="#F48FB1" />
      <circle cx="70" cy="30" r="3.5" fill="#F48FB1" />
      {/* Eyes */}
      <circle cx="40" cy="44" r="4.5" fill="white" />
      <circle cx="60" cy="44" r="4.5" fill="white" />
      <circle cx="41" cy="45" r="2.8" fill="#333" />
      <circle cx="61" cy="45" r="2.8" fill="#333" />
      <circle cx="42" cy="43.5" r="1" fill="white" />
      <circle cx="62" cy="43.5" r="1" fill="white" />
      {/* Nose */}
      <ellipse cx="50" cy="53" rx="4" ry="3" fill="#333" />
      {/* Mouth */}
      <path d="M50,56 Q46,60 43,58" stroke="#333" strokeWidth="1.2" fill="none" />
      <path d="M50,56 Q54,60 57,58" stroke="#333" strokeWidth="1.2" fill="none" />
      {/* Body */}
      <ellipse cx="50" cy="86" rx="20" ry="12" fill="#FFB74D" />
    </svg>
  );
}
