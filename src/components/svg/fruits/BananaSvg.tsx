export default function BananaSvg({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Banana body */}
      <path
        d="M30,75 Q15,50 25,25 Q35,10 50,12 Q40,20 35,35 Q30,55 42,72 Z"
        fill="#FFD54F"
      />
      {/* Darker edge */}
      <path
        d="M30,75 Q25,70 42,72"
        stroke="#F9A825"
        strokeWidth="2"
        fill="none"
      />
      {/* Tip */}
      <circle cx="27" cy="77" r="3" fill="#8D6E63" />
      {/* Top */}
      <path d="M50,12 Q55,10 58,14" stroke="#8D6E63" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Shine */}
      <path
        d="M35,25 Q32,40 36,55"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
