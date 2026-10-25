export default function RabbitSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Body */}
      <ellipse cx="50" cy="87" rx="21" ry="12" fill="#D7CCC8" />
      {/* Ears */}
      <ellipse cx="38" cy="22" rx="7" ry="20" fill="#D7CCC8" transform="rotate(-8 38 22)" />
      <ellipse cx="62" cy="22" rx="7" ry="20" fill="#D7CCC8" transform="rotate(8 62 22)" />
      <ellipse cx="38" cy="23" rx="3.5" ry="15" fill="#F8BBD0" transform="rotate(-8 38 23)" />
      <ellipse cx="62" cy="23" rx="3.5" ry="15" fill="#F8BBD0" transform="rotate(8 62 23)" />
      {/* Head */}
      <circle cx="50" cy="56" r="25" fill="#D7CCC8" />
      {/* Eyes */}
      <circle cx="40" cy="51" r="4.5" fill="white" />
      <circle cx="60" cy="51" r="4.5" fill="white" />
      <circle cx="40.8" cy="51.8" r="2.7" fill="#333" />
      <circle cx="60.8" cy="51.8" r="2.7" fill="#333" />
      <circle cx="41.6" cy="50.4" r="1" fill="white" />
      <circle cx="61.6" cy="50.4" r="1" fill="white" />
      {/* Nose, mouth, teeth */}
      <ellipse cx="50" cy="61" rx="3" ry="2.2" fill="#F06292" />
      <path d="M50,63 Q46,68 42,66" stroke="#333" strokeWidth="1.2" fill="none" />
      <path d="M50,63 Q54,68 58,66" stroke="#333" strokeWidth="1.2" fill="none" />
      <rect x="47.5" y="64.5" width="5" height="5" rx="1" fill="white" />
      {/* Whiskers */}
      <line x1="26" y1="60" x2="40" y2="62" stroke="#8D6E63" strokeWidth="1" />
      <line x1="74" y1="60" x2="60" y2="62" stroke="#8D6E63" strokeWidth="1" />
      <ellipse cx="34" cy="62" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
      <ellipse cx="66" cy="62" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
    </svg>
  );
}
