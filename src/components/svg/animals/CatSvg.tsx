export default function CatSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Ears */}
      <polygon points="22,35 30,8 40,30" fill="#FFB74D" />
      <polygon points="78,35 70,8 60,30" fill="#FFB74D" />
      <polygon points="26,33 32,14 38,30" fill="#FFE0B2" />
      <polygon points="74,33 68,14 62,30" fill="#FFE0B2" />
      {/* Head */}
      <ellipse cx="50" cy="52" rx="32" ry="28" fill="#FFB74D" />
      {/* Eyes */}
      <ellipse cx="38" cy="48" rx="5" ry="6" fill="white" />
      <ellipse cx="62" cy="48" rx="5" ry="6" fill="white" />
      <ellipse cx="39" cy="49" rx="3" ry="4" fill="#333" />
      <ellipse cx="63" cy="49" rx="3" ry="4" fill="#333" />
      <circle cx="40" cy="47" r="1.2" fill="white" />
      <circle cx="64" cy="47" r="1.2" fill="white" />
      {/* Nose */}
      <ellipse cx="50" cy="57" rx="3" ry="2.5" fill="#F48FB1" />
      {/* Mouth */}
      <path d="M50,59 Q46,64 42,62" stroke="#333" strokeWidth="1.2" fill="none" />
      <path d="M50,59 Q54,64 58,62" stroke="#333" strokeWidth="1.2" fill="none" />
      {/* Whiskers */}
      <line x1="20" y1="54" x2="35" y2="56" stroke="#333" strokeWidth="1" />
      <line x1="20" y1="58" x2="35" y2="58" stroke="#333" strokeWidth="1" />
      <line x1="80" y1="54" x2="65" y2="56" stroke="#333" strokeWidth="1" />
      <line x1="80" y1="58" x2="65" y2="58" stroke="#333" strokeWidth="1" />
      {/* Body */}
      <ellipse cx="50" cy="85" rx="22" ry="14" fill="#FFB74D" />
      {/* Tail */}
      <path d="M72,82 Q88,70 82,55" stroke="#FFB74D" strokeWidth="5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
