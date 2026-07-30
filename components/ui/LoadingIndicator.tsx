const DOT_COUNT = 12;

export function LoadingIndicator({ size = 64 }: { size?: number }) {
  const dotSize = size * 0.11;

  return (
    <div
      className="relative animate-spin"
      style={{ width: size, height: size, animationDuration: "1.2s" }}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: DOT_COUNT }).map((_, i) => {
        const angle = (360 / DOT_COUNT) * i;
        const opacity = 0.15 + (i / DOT_COUNT) * 0.85;

        return (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full bg-loader-dot"
            style={{
              width: dotSize,
              height: dotSize,
              marginLeft: -(dotSize / 2),
              marginTop: -(dotSize / 2),
              opacity,
              transform: `rotate(${angle}deg) translate(${size / 2}px) rotate(${-angle}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}
