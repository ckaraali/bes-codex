"use client";

export type SparklinePoint = { index: number; value: number };

export function ClientSparkline({ points }: { points: SparklinePoint[] }) {
  if (points.length === 0) {
    return <div style={{ width: "100%", height: "100%", background: "rgba(67, 97, 238, 0.1)", borderRadius: "12px" }} />;
  }

  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  const normalized = points.map((point, index) => ({
    x: (index / Math.max(points.length - 1, 1)) * 100,
    y: 100 - ((point.value - minValue) / range) * 100
  }));

  const pathD = normalized
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const lastPoint = normalized.at(-1);

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
      <path d={pathD} fill="none" stroke="var(--color-primary-light)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      {lastPoint && <circle cx={lastPoint.x} cy={lastPoint.y} r={3.2} fill="var(--color-primary-light)" />}
    </svg>
  );
}
