import { Phone, MessageCircle } from "lucide-react";
import { contactLinks } from "@/lib/phone";
import type { TextKey } from "@/lib/i18n";
export function ContactActions({
  phone,
  t,
  compact = false,
}: {
  phone: string;
  t: (key: TextKey) => string;
  compact?: boolean;
}) {
  const links = contactLinks(phone);
  if (!links) return <span className="muted">{t("noPhone")}</span>;
  return (
    <div className="contact-actions" onClick={(e) => e.stopPropagation()}>
      <a
        className="contact-button"
        href={links.call}
        title={`${t("call")} ${phone}`}
        aria-label={`${t("call")} ${phone}`}
      >
        <Phone size={16} />
        {!compact && t("call")}
      </a>
      <a
        className="contact-button whatsapp"
        href={links.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        title={`${t("whatsapp")} ${phone}`}
        aria-label={`${t("whatsapp")} ${phone}`}
      >
        <MessageCircle size={17} />
        {!compact && t("whatsapp")}
      </a>
    </div>
  );
}
