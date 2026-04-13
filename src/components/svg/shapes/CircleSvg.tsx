export default function CircleSvg({
  color = "#FF69B4",
  size = 80,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill={color} />
      <circle cx="38" cy="38" r="10" fill="rgba(255,255,255,0.3)" />
    </svg>
  );
}
