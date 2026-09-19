"use client";

import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  children: ReactNode;
  onClose?: () => void;
  title?: string;
};

export default function Modal({
  open,
  children,
  onClose,
  title,
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="sg-modal-overlay"
      role="dialog"
      aria-modal="true"
    >
      <div className="sg-modal">
        <div className="sg-modal-header">
          {title && (
            <h2>{title}</h2>
          )}

          {onClose && (
            <button
              type="button"
              className="sg-modal-close"
              onClick={onClose}
              aria-label="Cerrar"
            >
              ×
            </button>
          )}
        </div>

        <div className="sg-modal-content">
          {children}
        </div>
      </div>
    </div>
  );
}
