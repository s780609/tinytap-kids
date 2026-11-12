export default function MouseSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Body */}
      <ellipse cx="50" cy="88" rx="18" ry="10" fill="#B0BEC5" />
      {/* Tail */}
      <path d="M68,90 Q86,92 88,78" stroke="#F48FB1" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Big round ears */}
      <circle cx="22" cy="28" r="18" fill="#B0BEC5" />
      <circle cx="78" cy="28" r="18" fill="#B0BEC5" />
      <circle cx="22" cy="28" r="11" fill="#F8BBD0" />
      <circle cx="78" cy="28" r="11" fill="#F8BBD0" />
      {/* Head */}
      <ellipse cx="50" cy="54" rx="26" ry="24" fill="#CFD8DC" />
      {/* Eyes */}
      <circle cx="40" cy="50" r="4.5" fill="white" />
      <circle cx="60" cy="50" r="4.5" fill="white" />
      <circle cx="40.8" cy="50.8" r="2.7" fill="#333" />
      <circle cx="60.8" cy="50.8" r="2.7" fill="#333" />
      <circle cx="41.6" cy="49.4" r="1" fill="white" />
      <circle cx="61.6" cy="49.4" r="1" fill="white" />
      {/* Nose, whiskers, teeth */}
      <circle cx="50" cy="62" r="3.5" fill="#EC407A" />
      <path d="M30,60 L18,57 M30,64 L18,66 M70,60 L82,57 M70,64 L82,66" stroke="#78909C" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M44,68 Q50,72 56,68" stroke="#546E7A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <rect x="47.5" y="69" width="5" height="5" rx="1" fill="white" stroke="#B0BEC5" strokeWidth="0.8" />
      <ellipse cx="33" cy="63" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
      <ellipse cx="67" cy="63" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
    </svg>
  );
}
