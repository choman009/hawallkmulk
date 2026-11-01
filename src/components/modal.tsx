"use client";
import {
  useEffect,
  useRef,
  useId,
  useState,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { dictionary } from "@/lib/i18n";
const CloseContext = createContext<(() => void) | null>(null);
export function useModalClose(fallback: () => void) {
  return useContext(CloseContext) ?? fallback;
}
function snapshot(dialog: HTMLDialogElement) {
  return JSON.stringify(
    Array.from(dialog.querySelectorAll("form")).map((form) =>
      Array.from(new FormData(form).entries()).map(([k, v]) => [
        k,
        typeof v === "string"
          ? v
          : { name: v.name, size: v.size, lastModified: v.lastModified },
      ]),
    ),
  );
}
export function Modal({
  title,
  onClose,
  children,
  closeLabel,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeLabel: string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    baseline = useRef(""),
    id = useId(),
    keepRef = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);
  const t = dictionary(
    typeof document !== "undefined" && document.documentElement.lang === "ckb"
      ? "ckb"
      : "en",
  );
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    baseline.current = snapshot(dialog);
    return () => dialog.close();
  }, []);
  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);
  function requestClose() {
    if (ref.current && snapshot(ref.current) !== baseline.current)
      setConfirming(true);
    else onClose();
  }
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClickCapture={(e) => {
        const button =
          e.target instanceof Element ? e.target.closest("button") : null;
        if (
          button?.type === "button" &&
          button.closest("form") &&
          button.textContent?.trim() === t.cancel
        ) {
          e.preventDefault();
          e.stopPropagation();
          requestClose();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        if (confirming) setConfirming(false);
        else requestClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !confirming) requestClose();
      }}
    >
      <div className="dialog-header" inert={confirming}>
        <h2 id={id}>{title}</h2>
        <button
          className="icon-button"
          onClick={requestClose}
          aria-label={closeLabel}
        >
          <X size={20} />
        </button>
      </div>
      <CloseContext.Provider value={requestClose}>
        <div className="dialog-body" inert={confirming}>
          {children}
        </div>
      </CloseContext.Provider>
      {confirming && (
        <div className="discard-overlay">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${id}-discard`}
            className="discard-prompt"
          >
            <h3 id={`${id}-discard`}>{t.discardTitle}</h3>
            <p>{t.discardMessage}</p>
            <div className="button-row">
              <button
                ref={keepRef}
                className="button primary"
                onClick={() => setConfirming(false)}
              >
                {t.keepEditing}
              </button>
              <button className="button secondary danger" onClick={onClose}>
                {t.discardChanges}
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
