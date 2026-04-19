"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

type AppModalProps = {
  children: React.ReactNode;
  description?: string;
  eyebrow?: string;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function AppModal({
  children,
  description,
  eyebrow = "Быстрое действие",
  onClose,
  open,
  title,
}: AppModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-describedby={description ? "modal-description" : undefined}
        aria-labelledby="modal-title"
        aria-modal="true"
        className="modal-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div aria-hidden="true" className="modal-handle" />
        <div className="modal-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h3 id="modal-title">{title}</h3>
            {description ? (
              <p className="muted-copy" id="modal-description">
                {description}
              </p>
            ) : null}
          </div>
          <button
            aria-label="Закрыть"
            className="button button-ghost icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
