/** Badge de status de slot */
export function StatusBadge({
  variant,
  label,
}: {
  variant: "livre" | "ocupado" | "mine" | "past";
  label?: string;
}) {
  const classes: Record<string, string> = {
    livre: "badge badge-livre",
    ocupado: "badge badge-ocupado",
    mine: "badge badge-mine",
    past: "badge badge-past",
  };

  const defaultLabels: Record<string, string> = {
    livre: "Livre",
    ocupado: "Ocupado",
    mine: "★ Sua reserva",
    past: "Passado",
  };

  return (
    <span className={classes[variant]}>
      {label ?? defaultLabels[variant]}
    </span>
  );
}

/** Badge de ação de auditoria */
const ACTION_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  LOGIN:                        { label: "Login",             className: "badge badge-gray" },
  SLOT_CREATED:                 { label: "Slot criado",       className: "badge badge-blue" },
  SLOT_BATCH_CREATED:           { label: "Lote criado",       className: "badge badge-blue" },
  SLOT_UPDATED:                 { label: "Slot editado",      className: "badge badge-gray" },
  SLOT_DELETED:                 { label: "Slot excluído",     className: "badge badge-red" },
  RESERVATION_CREATED:          { label: "Reservou",          className: "badge badge-green" },
  RESERVATION_CANCELLED:        { label: "Cancelou",          className: "badge badge-red" },
  RESERVATION_FORCED_CANCEL:    { label: "Cancelado pelo prof.", className: "badge badge-orange" },
};

export function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_CONFIG[action];
  if (cfg) {
    return <span className={cfg.className}>{cfg.label}</span>;
  }
  return (
    <span className="badge badge-gray" style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
      {action}
    </span>
  );
}
