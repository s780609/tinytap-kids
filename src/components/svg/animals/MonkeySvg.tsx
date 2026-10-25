export default function MonkeySvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Body */}
      <ellipse cx="50" cy="87" rx="20" ry="12" fill="#8D6E63" />
      {/* Ears */}
      <circle cx="18" cy="48" r="11" fill="#8D6E63" />
      <circle cx="82" cy="48" r="11" fill="#8D6E63" />
      <circle cx="18" cy="48" r="6.5" fill="#FFCCBC" />
      <circle cx="82" cy="48" r="6.5" fill="#FFCCBC" />
      {/* Head */}
      <circle cx="50" cy="48" r="29" fill="#8D6E63" />
      {/* Face */}
      <path d="M50,40 Q40,28 30,36 Q22,46 30,58 Q36,74 50,74 Q64,74 70,58 Q78,46 70,36 Q60,28 50,40 Z" fill="#FFCCBC" />
      {/* Hair tuft */}
      <path d="M46,20 Q50,12 54,20" stroke="#6D4C41" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Eyes */}
      <circle cx="40" cy="46" r="4.5" fill="white" />
      <circle cx="60" cy="46" r="4.5" fill="white" />
      <circle cx="40.8" cy="46.8" r="2.7" fill="#333" />
      <circle cx="60.8" cy="46.8" r="2.7" fill="#333" />
      <circle cx="41.6" cy="45.4" r="1" fill="white" />
      <circle cx="61.6" cy="45.4" r="1" fill="white" />
      {/* Nose, mouth */}
      <ellipse cx="47" cy="57" rx="1.5" ry="1.2" fill="#6D4C41" />
      <ellipse cx="53" cy="57" rx="1.5" ry="1.2" fill="#6D4C41" />
      <path d="M40,63 Q50,71 60,63" stroke="#6D4C41" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="33" cy="60" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
      <ellipse cx="67" cy="60" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
    </svg>
  );
}
