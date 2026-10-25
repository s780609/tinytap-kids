export default function GiraffeSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Neck */}
      <rect x="42" y="56" width="16" height="40" rx="6" fill="#FFCA28" />
      <circle cx="47" cy="72" r="3.5" fill="#A1887F" />
      <circle cx="54" cy="84" r="4" fill="#A1887F" />
      {/* Horns */}
      <line x1="40" y1="22" x2="38" y2="9" stroke="#A1887F" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="60" y1="22" x2="62" y2="9" stroke="#A1887F" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="38" cy="8" r="4" fill="#8D6E63" />
      <circle cx="62" cy="8" r="4" fill="#8D6E63" />
      {/* Ears */}
      <ellipse cx="24" cy="32" rx="10" ry="4.5" fill="#FFCA28" transform="rotate(-25 24 32)" />
      <ellipse cx="76" cy="32" rx="10" ry="4.5" fill="#FFCA28" transform="rotate(25 76 32)" />
      {/* Head */}
      <ellipse cx="50" cy="40" rx="22" ry="21" fill="#FFCA28" />
      <circle cx="36" cy="28" r="3.5" fill="#A1887F" />
      <circle cx="63" cy="26" r="3" fill="#A1887F" />
      {/* Muzzle */}
      <ellipse cx="50" cy="54" rx="16" ry="11" fill="#FFE082" />
      <ellipse cx="45" cy="53" rx="1.8" ry="1.4" fill="#6D4C41" />
      <ellipse cx="55" cy="53" rx="1.8" ry="1.4" fill="#6D4C41" />
      <path d="M44,59 Q50,63 56,59" stroke="#6D4C41" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* Eyes */}
      <circle cx="41" cy="38" r="4.2" fill="white" />
      <circle cx="59" cy="38" r="4.2" fill="white" />
      <circle cx="41.8" cy="38.8" r="2.5" fill="#333" />
      <circle cx="59.8" cy="38.8" r="2.5" fill="#333" />
      <circle cx="42.6" cy="37.4" r="1" fill="white" />
      <circle cx="60.6" cy="37.4" r="1" fill="white" />
      <ellipse cx="32" cy="46" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
      <ellipse cx="68" cy="46" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
    </svg>
  );
}
