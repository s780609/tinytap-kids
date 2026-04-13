export default function TriangleSvg({
  color = "#FFD54F",
  size = 80,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <polygon points="50,8 95,90 5,90" fill={color} strokeLinejoin="round" />
      <polygon points="40,30 55,55 28,55" fill="rgba(255,255,255,0.2)" />
    </svg>
  );
}
