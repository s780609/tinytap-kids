export default function PandaSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Body */}
      <ellipse cx="50" cy="87" rx="22" ry="12" fill="#37474F" />
      <ellipse cx="50" cy="88" rx="13" ry="8" fill="#FAFAFA" />
      {/* Ears */}
      <circle cx="24" cy="24" r="11" fill="#263238" />
      <circle cx="76" cy="24" r="11" fill="#263238" />
      {/* Head */}
      <ellipse cx="50" cy="50" rx="31" ry="28" fill="#FAFAFA" stroke="#BDBDBD" strokeWidth="1.5" />
      {/* Eye patches */}
      <ellipse cx="37" cy="47" rx="9" ry="11" fill="#263238" transform="rotate(25 37 47)" />
      <ellipse cx="63" cy="47" rx="9" ry="11" fill="#263238" transform="rotate(-25 63 47)" />
      {/* Eyes */}
      <circle cx="38" cy="46" r="3.6" fill="white" />
      <circle cx="62" cy="46" r="3.6" fill="white" />
      <circle cx="38.6" cy="46.6" r="2.2" fill="#333" />
      <circle cx="62.6" cy="46.6" r="2.2" fill="#333" />
      <circle cx="39.2" cy="45.4" r="0.8" fill="white" />
      <circle cx="63.2" cy="45.4" r="0.8" fill="white" />
      {/* Nose, mouth */}
      <ellipse cx="50" cy="59" rx="4.5" ry="3" fill="#263238" />
      <path d="M50,62 Q46,67 42,65" stroke="#333" strokeWidth="1.2" fill="none" />
      <path d="M50,62 Q54,67 58,65" stroke="#333" strokeWidth="1.2" fill="none" />
      <ellipse cx="30" cy="62" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
      <ellipse cx="70" cy="62" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
    </svg>
  );
}
