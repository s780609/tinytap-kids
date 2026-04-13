export default function ElephantSvg({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Ears */}
      <ellipse cx="20" cy="42" rx="16" ry="20" fill="#90A4AE" />
      <ellipse cx="80" cy="42" rx="16" ry="20" fill="#90A4AE" />
      <ellipse cx="20" cy="42" rx="10" ry="14" fill="#B0BEC5" />
      <ellipse cx="80" cy="42" rx="10" ry="14" fill="#B0BEC5" />
      {/* Head */}
      <ellipse cx="50" cy="45" rx="26" ry="25" fill="#90A4AE" />
      {/* Eyes */}
      <circle cx="38" cy="40" r="4.5" fill="white" />
      <circle cx="62" cy="40" r="4.5" fill="white" />
      <circle cx="39" cy="41" r="2.8" fill="#333" />
      <circle cx="63" cy="41" r="2.8" fill="#333" />
      <circle cx="40" cy="39.5" r="1" fill="white" />
      <circle cx="64" cy="39.5" r="1" fill="white" />
      {/* Trunk */}
      <path
        d="M50,55 Q50,65 45,72 Q42,78 44,84 Q46,88 50,86"
        stroke="#90A4AE"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      />
      {/* Cheeks */}
      <circle cx="36" cy="50" r="4" fill="#CE93D8" opacity="0.3" />
      <circle cx="64" cy="50" r="4" fill="#CE93D8" opacity="0.3" />
      {/* Tusks */}
      <path d="M40,58 Q36,68 38,72" stroke="#F5F5F5" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M60,58 Q64,68 62,72" stroke="#F5F5F5" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
