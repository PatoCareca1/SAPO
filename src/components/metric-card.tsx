const DOT_COLORS: Record<string, string> = {
  blue:   "#3b82f6",
  green:  "#22c55e",
  amber:  "#f59e0b",
  purple: "#8b5cf6",
  red:    "#ef4444",
};

interface MetricCardProps {
  label: string;
  value: number | string;
  color?: keyof typeof DOT_COLORS;
}

export function MetricCard({ label, value, color = "blue" }: MetricCardProps) {
  return (
    <div
      className="card"
      style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span
          style={{
            width: "0.625rem",
            height: "0.625rem",
            borderRadius: "50%",
            background: DOT_COLORS[color],
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 500 }}>
          {label}
        </span>
      </div>
      <span
        style={{
          fontSize: "2.25rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}
