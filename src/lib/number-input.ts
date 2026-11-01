export function formatNumericInput(value: string) {
  const raw = value
    .replaceAll(",", "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
  if (!/^-?\d*(\.\d*)?$/.test(raw)) return raw;
  const [whole, fraction] = raw.split(".");
  return (
    whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
    (fraction === undefined ? "" : "." + fraction)
  );
}
export function parseNumericInput(value: string) {
  return Number(value.replaceAll(",", ""));
}
