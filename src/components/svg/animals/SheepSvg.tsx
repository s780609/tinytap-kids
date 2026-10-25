export default function SheepSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Legs */}
      <rect x="36" y="82" width="6" height="14" rx="3" fill="#5D4037" />
      <rect x="58" y="82" width="6" height="14" rx="3" fill="#5D4037" />
      {/* Wool */}
      <circle cx="50" cy="46" r="30" fill="#E0E0E0" />
      <circle cx="28" cy="34" r="12" fill="#EEEEEE" />
      <circle cx="50" cy="22" r="13" fill="#EEEEEE" />
      <circle cx="72" cy="34" r="12" fill="#EEEEEE" />
      <circle cx="24" cy="56" r="12" fill="#EEEEEE" />
      <circle cx="76" cy="56" r="12" fill="#EEEEEE" />
      <circle cx="36" cy="74" r="12" fill="#EEEEEE" />
      <circle cx="64" cy="74" r="12" fill="#EEEEEE" />
      <circle cx="50" cy="78" r="11" fill="#EEEEEE" />
      {/* Ears */}
      <ellipse cx="29" cy="46" rx="9" ry="4.5" fill="#6D4C41" transform="rotate(-25 29 46)" />
      <ellipse cx="71" cy="46" rx="9" ry="4.5" fill="#6D4C41" transform="rotate(25 71 46)" />
      {/* Face */}
      <ellipse cx="50" cy="52" rx="15" ry="19" fill="#6D4C41" />
      {/* Fluff on top */}
      <circle cx="44" cy="33" r="6" fill="#FAFAFA" />
      <circle cx="51" cy="31" r="6.5" fill="#FAFAFA" />
      <circle cx="57" cy="34" r="5.5" fill="#FAFAFA" />
      {/* Eyes */}
      <circle cx="44" cy="48" r="3.8" fill="white" />
      <circle cx="56" cy="48" r="3.8" fill="white" />
      <circle cx="44.8" cy="48.8" r="2.3" fill="#333" />
      <circle cx="56.8" cy="48.8" r="2.3" fill="#333" />
      <circle cx="45.6" cy="47.4" r="1" fill="white" />
      <circle cx="57.6" cy="47.4" r="1" fill="white" />
      {/* Nose, mouth */}
      <ellipse cx="50" cy="60" rx="3.5" ry="2.2" fill="#3E2723" />
      <path d="M46,65 Q50,68 54,65" stroke="#FFCCBC" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
