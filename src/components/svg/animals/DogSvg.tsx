export default function DogSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Ears */}
      <ellipse cx="25" cy="40" rx="12" ry="20" fill="#8D6E63" transform="rotate(-15 25 40)" />
      <ellipse cx="75" cy="40" rx="12" ry="20" fill="#8D6E63" transform="rotate(15 75 40)" />
      {/* Head */}
      <ellipse cx="50" cy="48" rx="28" ry="26" fill="#A1887F" />
      {/* Face patch */}
      <ellipse cx="50" cy="55" rx="18" ry="16" fill="#D7CCC8" />
      {/* Eyes */}
      <circle cx="38" cy="44" r="5" fill="white" />
      <circle cx="62" cy="44" r="5" fill="white" />
      <circle cx="39" cy="45" r="3" fill="#333" />
      <circle cx="63" cy="45" r="3" fill="#333" />
      <circle cx="40" cy="43.5" r="1.2" fill="white" />
      <circle cx="64" cy="43.5" r="1.2" fill="white" />
      {/* Nose */}
      <ellipse cx="50" cy="54" rx="5" ry="4" fill="#333" />
      <ellipse cx="50" cy="53" rx="2" ry="1" fill="#666" />
      {/* Mouth */}
      <path d="M50,58 Q46,63 43,61" stroke="#333" strokeWidth="1.2" fill="none" />
      <path d="M50,58 Q54,63 57,61" stroke="#333" strokeWidth="1.2" fill="none" />
      {/* Tongue */}
      <ellipse cx="50" cy="64" rx="4" ry="5" fill="#EF9A9A" />
      {/* Body */}
      <ellipse cx="50" cy="86" rx="22" ry="13" fill="#A1887F" />
      {/* Tail */}
      <path d="M72,83 Q85,72 80,60" stroke="#A1887F" strokeWidth="5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
