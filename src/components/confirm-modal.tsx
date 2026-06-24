"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  dangerous?: boolean;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Voltar",
  onConfirm,
  onCancel,
  dangerous = true,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Detecta quando o componente monta no cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fecha com Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  if (!mounted) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal-card" ref={dialogRef} role="dialog" aria-modal>
        {/* Ícone */}
        <div
          style={{
            width: "3rem",
            height: "3rem",
            borderRadius: "50%",
            background: dangerous ? "var(--danger-bg)" : "var(--status-mine-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
            marginBottom: "1rem",
          }}
        >
          {dangerous ? "⚠️" : "ℹ️"}
        </div>

        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "0.5rem",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: "0.9rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginBottom: "1.5rem",
          }}
        >
          {description}
        </p>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={dangerous ? "btn btn-danger" : "btn btn-primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
