export default function HorseSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Body */}
      <ellipse cx="50" cy="88" rx="22" ry="12" fill="#A1887F" />
      {/* Ears */}
      <polygon points="30,26 30,6 42,20" fill="#8D6E63" />
      <polygon points="70,26 70,6 58,20" fill="#8D6E63" />
      {/* Long face */}
      <ellipse cx="50" cy="44" rx="23" ry="26" fill="#A1887F" />
      <ellipse cx="50" cy="66" rx="18" ry="13" fill="#D7CCC8" />
      {/* Mane */}
      <path d="M38,20 Q44,10 50,18 Q56,8 62,20 Q58,30 50,28 Q42,30 38,20 Z" fill="#5D4037" />
      <path d="M26,40 Q20,52 24,64" stroke="#5D4037" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M74,40 Q80,52 76,64" stroke="#5D4037" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* Eyes */}
      <circle cx="39" cy="42" r="4.5" fill="white" />
      <circle cx="61" cy="42" r="4.5" fill="white" />
      <circle cx="39.8" cy="42.8" r="2.7" fill="#333" />
      <circle cx="61.8" cy="42.8" r="2.7" fill="#333" />
      <circle cx="40.6" cy="41.4" r="1" fill="white" />
      <circle cx="62.6" cy="41.4" r="1" fill="white" />
      {/* Nostrils, mouth */}
      <ellipse cx="44" cy="64" rx="2.4" ry="3" fill="#6D4C41" />
      <ellipse cx="56" cy="64" rx="2.4" ry="3" fill="#6D4C41" />
      <path d="M43,73 Q50,77 57,73" stroke="#6D4C41" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="31" cy="54" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
      <ellipse cx="69" cy="54" rx="5" ry="3" fill="#F48FB1" opacity="0.6" />
    </svg>
  );
}
