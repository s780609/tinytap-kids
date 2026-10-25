export default function BearSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Body */}
      <ellipse cx="50" cy="87" rx="22" ry="12" fill="#795548" />
      {/* Ears */}
      <circle cx="24" cy="26" r="11" fill="#795548" />
      <circle cx="76" cy="26" r="11" fill="#795548" />
      <circle cx="24" cy="26" r="6" fill="#BCAAA4" />
      <circle cx="76" cy="26" r="6" fill="#BCAAA4" />
      {/* Head */}
      <circle cx="50" cy="50" r="30" fill="#795548" />
      {/* Muzzle */}
      <ellipse cx="50" cy="61" rx="14" ry="11" fill="#BCAAA4" />
      <ellipse cx="50" cy="56" rx="5" ry="3.5" fill="#3E2723" />
      <path d="M50,60 Q46,66 42,64" stroke="#3E2723" strokeWidth="1.3" fill="none" />
      <path d="M50,60 Q54,66 58,64" stroke="#3E2723" strokeWidth="1.3" fill="none" />
      {/* Eyes */}
      <circle cx="38" cy="45" r="4.5" fill="white" />
      <circle cx="62" cy="45" r="4.5" fill="white" />
      <circle cx="38.8" cy="45.8" r="2.7" fill="#333" />
      <circle cx="62.8" cy="45.8" r="2.7" fill="#333" />
      <circle cx="39.6" cy="44.4" r="1" fill="white" />
      <circle cx="63.6" cy="44.4" r="1" fill="white" />
      <ellipse cx="30" cy="58" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
      <ellipse cx="70" cy="58" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
    </svg>
  );
}
