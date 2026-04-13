export default function StarSvg({
  color = "#FFB74D",
  size = 80,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <polygon
        points="50,5 63,35 95,38 70,60 78,92 50,76 22,92 30,60 5,38 37,35"
        fill={color}
      />
      <polygon
        points="42,25 48,38 38,40 44,48"
        fill="rgba(255,255,255,0.25)"
      />
    </svg>
  );
}
