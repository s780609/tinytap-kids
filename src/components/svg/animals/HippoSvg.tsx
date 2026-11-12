export default function HippoSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Ears */}
      <ellipse cx="28" cy="20" rx="7" ry="6" fill="#9575CD" />
      <ellipse cx="72" cy="20" rx="7" ry="6" fill="#9575CD" />
      <ellipse cx="28" cy="20" rx="3.5" ry="3" fill="#F8BBD0" />
      <ellipse cx="72" cy="20" rx="3.5" ry="3" fill="#F8BBD0" />
      {/* Head */}
      <ellipse cx="50" cy="38" rx="26" ry="20" fill="#B39DDB" />
      {/* Big snout */}
      <ellipse cx="50" cy="66" rx="36" ry="24" fill="#B39DDB" />
      <ellipse cx="50" cy="70" rx="30" ry="17" fill="#D1C4E9" />
      {/* Eyes */}
      <circle cx="40" cy="34" r="4.5" fill="white" />
      <circle cx="60" cy="34" r="4.5" fill="white" />
      <circle cx="40.8" cy="34.8" r="2.7" fill="#333" />
      <circle cx="60.8" cy="34.8" r="2.7" fill="#333" />
      <circle cx="41.6" cy="33.4" r="1" fill="white" />
      <circle cx="61.6" cy="33.4" r="1" fill="white" />
      {/* Nostrils, mouth, teeth */}
      <ellipse cx="38" cy="58" rx="3.4" ry="2.4" fill="#7E57C2" />
      <ellipse cx="62" cy="58" rx="3.4" ry="2.4" fill="#7E57C2" />
      <path d="M30,74 Q50,86 70,74" stroke="#7E57C2" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <rect x="38" y="76" width="5" height="6" rx="1.5" fill="white" />
      <rect x="57" y="76" width="5" height="6" rx="1.5" fill="white" />
      <ellipse cx="24" cy="64" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
      <ellipse cx="76" cy="64" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
    </svg>
  );
}
