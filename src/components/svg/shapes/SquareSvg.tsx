export default function SquareSvg({
  color = "#4FC3F7",
  size = 80,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="8" y="8" width="84" height="84" rx="8" fill={color} />
      <rect x="18" y="18" width="20" height="20" rx="4" fill="rgba(255,255,255,0.3)" />
    </svg>
  );
}
