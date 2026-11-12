export default function KoalaSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Body */}
      <ellipse cx="50" cy="88" rx="20" ry="11" fill="#90A4AE" />
      {/* Fluffy ears */}
      <circle cx="18" cy="34" r="17" fill="#90A4AE" />
      <circle cx="82" cy="34" r="17" fill="#90A4AE" />
      <circle cx="18" cy="34" r="10" fill="#ECEFF1" />
      <circle cx="82" cy="34" r="10" fill="#ECEFF1" />
      {/* Head */}
      <ellipse cx="50" cy="50" rx="28" ry="26" fill="#B0BEC5" />
      {/* Eyes */}
      <circle cx="38" cy="46" r="4" fill="white" />
      <circle cx="62" cy="46" r="4" fill="white" />
      <circle cx="38.8" cy="46.8" r="2.4" fill="#333" />
      <circle cx="62.8" cy="46.8" r="2.4" fill="#333" />
      <circle cx="39.6" cy="45.4" r="1" fill="white" />
      <circle cx="63.6" cy="45.4" r="1" fill="white" />
      {/* Big nose */}
      <ellipse cx="50" cy="58" rx="8" ry="11" fill="#37474F" />
      <ellipse cx="47.5" cy="53" rx="2" ry="3" fill="#78909C" />
      <path d="M44,71 Q50,75 56,71" stroke="#37474F" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="31" cy="60" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
      <ellipse cx="69" cy="60" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
    </svg>
  );
}
