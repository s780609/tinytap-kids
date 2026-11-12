export default function GoatSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Body */}
      <ellipse cx="50" cy="88" rx="22" ry="11" fill="#F5F5F5" />
      {/* Horns */}
      <path d="M38,24 Q30,8 20,12" stroke="#BCAAA4" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M62,24 Q70,8 80,12" stroke="#BCAAA4" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* Floppy ears */}
      <ellipse cx="18" cy="40" rx="13" ry="6" fill="#E0E0E0" transform="rotate(20 18 40)" />
      <ellipse cx="82" cy="40" rx="13" ry="6" fill="#E0E0E0" transform="rotate(-20 82 40)" />
      {/* Head */}
      <ellipse cx="50" cy="46" rx="24" ry="26" fill="#FAFAFA" stroke="#E0E0E0" strokeWidth="1.5" />
      {/* Beard */}
      <path d="M44,70 L50,86 L56,70 Z" fill="#E0E0E0" />
      {/* Eyes */}
      <circle cx="39" cy="42" r="4.5" fill="white" />
      <circle cx="61" cy="42" r="4.5" fill="white" />
      <circle cx="39.8" cy="42.8" r="2.7" fill="#333" />
      <circle cx="61.8" cy="42.8" r="2.7" fill="#333" />
      <circle cx="40.6" cy="41.4" r="1" fill="white" />
      <circle cx="62.6" cy="41.4" r="1" fill="white" />
      {/* Nose, mouth */}
      <ellipse cx="50" cy="58" rx="6" ry="4" fill="#F8BBD0" />
      <path d="M45,65 Q50,68 55,65" stroke="#8D6E63" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="32" cy="54" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
      <ellipse cx="68" cy="54" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
    </svg>
  );
}
