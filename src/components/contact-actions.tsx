import { Phone, MessageCircle } from "lucide-react";
import { contactLinks } from "@/lib/phone";
import type { TextKey } from "@/lib/i18n";
export function ContactActions({
  phone,
  secondaryPhone,
  t,
  compact = false,
}: {
  phone: string;
  secondaryPhone?: string | null;
  t: (key: TextKey) => string;
  compact?: boolean;
}) {
  const numbers = [phone, secondaryPhone].filter(
    (value): value is string => !!value,
  );
  return (
    <div className="contact-actions-list">
      {numbers.map((number, index) => {
        const links = contactLinks(number);
        if (!links)
          return (
            <span key={index} className="muted">
              {t("noPhone")}
            </span>
          );
        return (
          <div
            key={index}
            className="contact-actions"
            onClick={(e) => e.stopPropagation()}
          >
            {numbers.length > 1 && (
              <small
                className="muted"
                title={t(index === 0 ? "phone" : "phone_secondary")}
              >
                {index + 1}
              </small>
            )}
            <a
              className="contact-button"
              href={links.call}
              title={`${t("call")} ${number}`}
              aria-label={`${t("call")} ${number}`}
            >
              <Phone size={16} />
              {!compact && t("call")}
            </a>
            <a
              className="contact-button whatsapp"
              href={links.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              title={`${t("whatsapp")} ${number}`}
              aria-label={`${t("whatsapp")} ${number}`}
            >
              <MessageCircle size={17} />
              {!compact && t("whatsapp")}
            </a>
          </div>
        );
      })}
    </div>
  );
}
