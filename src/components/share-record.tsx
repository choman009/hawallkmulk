import { Share2 } from "lucide-react";
import type { Property, ClientRequest } from "@/lib/domain";
import type { TextKey } from "@/lib/i18n";
import { recordShareLink } from "@/lib/record-share";
export function ShareRecord({
  record,
  t,
  compact = false,
}: {
  record: Property | ClientRequest;
  t: (k: TextKey) => string;
  compact?: boolean;
}) {
  return (
    <a
      className="contact-button share-record"
      href={recordShareLink(record, t)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${t("shareWhatsApp")} · ${"title" in record ? record.title : record.client_name}`}
      title={t("shareWhatsApp")}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Share2 size={16} />
      {!compact && t("shareWhatsApp")}
    </a>
  );
}
