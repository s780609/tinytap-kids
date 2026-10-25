export default function ZebraSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Body */}
      <ellipse cx="50" cy="88" rx="20" ry="11" fill="#FAFAFA" stroke="#BDBDBD" strokeWidth="1.5" />
      {/* Mane */}
      <path d="M38,14 L42,6 L46,13 L50,5 L54,13 L58,6 L62,14 Z" fill="#263238" />
      {/* Ears */}
      <ellipse cx="30" cy="22" rx="5" ry="11" fill="#FAFAFA" stroke="#BDBDBD" strokeWidth="1.5" transform="rotate(-20 30 22)" />
      <ellipse cx="70" cy="22" rx="5" ry="11" fill="#FAFAFA" stroke="#BDBDBD" strokeWidth="1.5" transform="rotate(20 70 22)" />
      {/* Head */}
      <ellipse cx="50" cy="46" rx="24" ry="30" fill="#FAFAFA" stroke="#BDBDBD" strokeWidth="1.5" />
      {/* Stripes */}
      <path d="M27,36 Q36,38 38,32 M26,48 Q35,50 37,44 M73,36 Q64,38 62,32 M74,48 Q65,50 63,44 M42,18 Q46,26 50,20 Q54,26 58,18" stroke="#263238" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* Muzzle */}
      <ellipse cx="50" cy="64" rx="15" ry="11" fill="#78909C" />
      <ellipse cx="45" cy="63" rx="2.2" ry="1.8" fill="#263238" />
      <ellipse cx="55" cy="63" rx="2.2" ry="1.8" fill="#263238" />
      <path d="M44,70 Q50,73 56,70" stroke="#263238" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* Eyes */}
      <circle cx="40" cy="42" r="4.2" fill="white" />
      <circle cx="60" cy="42" r="4.2" fill="white" />
      <circle cx="40.8" cy="42.8" r="2.5" fill="#333" />
      <circle cx="60.8" cy="42.8" r="2.5" fill="#333" />
      <circle cx="41.6" cy="41.4" r="1" fill="white" />
      <circle cx="61.6" cy="41.4" r="1" fill="white" />
    </svg>
  );
}
