export default function PigSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Body */}
      <ellipse cx="50" cy="86" rx="24" ry="13" fill="#F8BBD0" />
      {/* Ears */}
      <polygon points="22,32 26,10 42,24" fill="#F48FB1" />
      <polygon points="78,32 74,10 58,24" fill="#F48FB1" />
      {/* Head */}
      <ellipse cx="50" cy="48" rx="31" ry="27" fill="#F8BBD0" />
      {/* Eyes */}
      <circle cx="37" cy="42" r="4.5" fill="white" />
      <circle cx="63" cy="42" r="4.5" fill="white" />
      <circle cx="37.8" cy="42.8" r="2.7" fill="#333" />
      <circle cx="63.8" cy="42.8" r="2.7" fill="#333" />
      <circle cx="38.6" cy="41.4" r="1" fill="white" />
      <circle cx="64.6" cy="41.4" r="1" fill="white" />
      {/* Snout */}
      <ellipse cx="50" cy="58" rx="13" ry="9" fill="#F48FB1" />
      <ellipse cx="45.5" cy="58" rx="2.6" ry="3.4" fill="#AD1457" />
      <ellipse cx="54.5" cy="58" rx="2.6" ry="3.4" fill="#AD1457" />
      {/* Mouth */}
      <path d="M44,69 Q50,73 56,69" stroke="#AD1457" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <ellipse cx="28" cy="56" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
      <ellipse cx="72" cy="56" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
    </svg>
  );
}
