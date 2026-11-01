import { normalizePhone } from "./phone.ts";
const digits = (s: string) =>
  s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
export function matchesNote(record: object, query: string) {
  const needle = digits(query).trim().toLowerCase();
  if (!needle) return true;
  const values = Object.values(record)
    .filter((v) => typeof v === "string" || typeof v === "number")
    .map(String);
  if (digits(values.join(" ")).toLowerCase().includes(needle)) return true;
  const phone = normalizePhone(needle);
  return !!phone && values.some((v) => normalizePhone(v) === phone);
}
