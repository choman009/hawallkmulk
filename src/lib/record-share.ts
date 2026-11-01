import { formatDisplayNumber } from "./number-input";
import type { Property, ClientRequest } from "./domain";
import type { TextKey } from "./i18n";
export function recordShareText(
  record: Property | ClientRequest,
  t: (k: TextKey) => string,
) {
  const property = "title" in record;
  const lines = [
    "Hawall mulk",
    `${t(property ? "property" : "request")}: ${property ? record.title : record.client_name}`,
    `${t(property ? "purpose" : "kind")}: ${t((property ? record.purpose : record.kind) as TextKey)}`,
    `${t("type")}: ${t(record.type as TextKey)}`,
  ];
  const money = (n: number | null) =>
    n == null ? "—" : `${formatDisplayNumber(n)} ${record.currency}`;
  if (property) lines.push(`${t("price")}: ${money(record.price)}`);
  else
    lines.push(
      `${t("budget")}: ${money(record.budget_min)} – ${money(record.budget_max)}`,
    );
  lines.push(
    `${t("address")}: ${[record.city, record.neighborhood, property ? record.address : ""].filter((v, i, a) => v && a.indexOf(v) === i).join(" · ")}`,
  );
  if (property && record.area != null)
    lines.push(`${t("area")}: ${formatDisplayNumber(record.area)}`);
  if (!property && (record.area_min != null || record.area_max != null))
    lines.push(
      `${t("area")}: ${record.area_min ?? "—"} – ${record.area_max ?? "—"}`,
    );
  if (record.bedrooms != null)
    lines.push(`${t("bedrooms")}: ${record.bedrooms}`);
  lines.push(`${t("phone")}: ${record.phone}`);
  if (record.phone_secondary)
    lines.push(`${t("phone_secondary")}: ${record.phone_secondary}`);
  const notes = property ? record.description : record.notes;
  if (notes) lines.push(`${t("notes")}: ${notes}`);
  return lines.join("\n");
}
export function recordShareLink(
  record: Property | ClientRequest,
  t: (k: TextKey) => string,
) {
  return `https://wa.me/?text=${encodeURIComponent(recordShareText(record, t))}`;
}
