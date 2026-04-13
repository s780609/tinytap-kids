export default function HeartSvg({
  color = "#EF5350",
  size = 80,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path
        d="M50 88 C25 65 5 50 5 32 C5 15 18 5 32 5 C40 5 47 10 50 16 C53 10 60 5 68 5 C82 5 95 15 95 32 C95 50 75 65 50 88Z"
        fill={color}
      />
      <ellipse cx="32" cy="28" rx="8" ry="10" fill="rgba(255,255,255,0.3)" transform="rotate(-15 32 28)" />
    </svg>
  );
}
