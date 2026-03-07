import { memo } from "react";

const DEFAULT_RADIUS = 14;

const TYPE_STYLES = {
  macro: { bg: "var(--brand-accent)", color: "var(--primary-foreground)", border: "var(--text-heading)" },
  session: { bg: "var(--surface-card)", color: "var(--text-heading)", border: "var(--chart-bar)" },
  step: { bg: "var(--surface-card)", color: "var(--text-body)", border: "var(--border-subtle)" },
  paradox: { bg: "var(--error)", color: "var(--primary-foreground)", border: "var(--error)" },
  refactor: { bg: "var(--warning)", color: "var(--bg-primary)", border: "var(--warning)" },
};

function VitacoreNode({ data, selected }) {
  const radius = data.radius ?? DEFAULT_RADIUS;
  const type = data.type || "step";
  const style = TYPE_STYLES[type] || TYPE_STYLES.step;
  const label = data.labelDisplay ?? data.label ?? data.id ?? "";
  const isSession = type === "session";
  const isBadge = type === "paradox" || type === "refactor";

  const baseBox = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    border: `2px solid ${selected ? "var(--brand-accent)" : style.border}`,
    background: style.bg,
    color: style.color,
    overflow: "hidden",
    padding: "2px 6px",
  };

  if (isSession) {
    return (
      <div
        className={`vitacore-node vitacore-node--session ${selected ? "selected" : ""}`}
        style={{
          ...baseBox,
          minWidth: 100,
          maxWidth: 160,
          height: 32,
          borderRadius: 6,
          fontSize: "0.7rem",
          fontWeight: 600,
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
        title={data.summary || data.label || label}
      >
        {label}
      </div>
    );
  }

  if (isBadge) {
    return (
      <div
        className={`vitacore-node vitacore-node--badge ${selected ? "selected" : ""}`}
        style={{
          ...baseBox,
          width: "auto",
          minWidth: radius * 2,
          height: radius * 2,
          borderRadius: 6,
          fontSize: "0.6rem",
        }}
        title={data.summary || data.label || label}
      >
        {label}
      </div>
    );
  }

  const circleText = type === "macro" ? "M" : (label.length > 10 ? label.slice(0, 8) + "…" : label);
  return (
    <div
      className={`vitacore-node vitacore-node--circle ${selected ? "selected" : ""}`}
      style={{
        ...baseBox,
        width: radius * 2,
        height: radius * 2,
        borderRadius: "50%",
        fontSize: radius > 20 ? "0.7rem" : "0.6rem",
      }}
      title={data.summary || data.label || label}
    >
      <span style={{ textAlign: "center", lineHeight: 1.1 }}>{circleText}</span>
    </div>
  );
}

export default memo(VitacoreNode);
