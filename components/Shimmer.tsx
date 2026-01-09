export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer ${className}`}
    />
  );
}

export function ShimmerText({
  width = "w-full",
  height = "h-4",
  className = "",
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return <Shimmer className={`${width} ${height} rounded ${className}`} />;
}

export function ShimmerCircle({ size = "h-12 w-12" }: { size?: string }) {
  return <Shimmer className={`${size} rounded-full`} />;
}
