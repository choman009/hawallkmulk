import { Star } from "lucide-react";
export function FavoriteButton({
  active,
  busy,
  label,
  onClick,
}: {
  active: boolean;
  busy: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`favorite-button ${active ? "selected" : ""}`}
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={busy}
      onKeyDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <Star size={18} fill={active ? "currentColor" : "none"} />
    </button>
  );
}
