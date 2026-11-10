"use client";

import { useEffect, useRef } from "react";

// <dialog> nativo: se abre al montarse y avisa al cerrarse (botón, Escape o clic fuera).
export default function Modal({
  labelledBy,
  onClose,
  children,
  onOpen,
}: {
  labelledBy: string;
  onClose: () => void;
  children: React.ReactNode;
  onOpen?: (d: HTMLDialogElement) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) d.showModal();
    onOpen?.(d);
    const onCloseEv = () => closeRef.current();
    d.addEventListener("close", onCloseEv);
    return () => {
      d.removeEventListener("close", onCloseEv);
      if (d.open) d.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClick={(ev) => {
        if (ev.target === ref.current) ref.current?.close();
      }}
    >
      {children}
    </dialog>
  );
}

export function closeDialog(el: Element | null) {
  el?.closest("dialog")?.close();
}
