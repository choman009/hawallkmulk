export function normalizePhone(input: string): string | null {
  let value = input
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
  if (!/^[+\d\s().-]+$/.test(value)) return null;
  value = value.replace(/[\s().-]/g, "");
  if (value.startsWith("00")) value = "+" + value.slice(2);
  if (/^07\d{9}$/.test(value)) value = "+964" + value.slice(1);
  else if (/^7\d{9}$/.test(value)) value = "+964" + value;
  else if (/^9647\d{9}$/.test(value)) value = "+" + value;
  return /^\+[1-9]\d{7,14}$/.test(value) ? value : null;
}
export function contactLinks(value: string) {
  const phone = normalizePhone(value);
  return phone
    ? { call: `tel:${phone}`, whatsapp: `https://wa.me/${phone.slice(1)}` }
    : null;
}
