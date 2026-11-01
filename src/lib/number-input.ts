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
// Group the stored number's decimal representation without imposing a precision limit.
export function formatDisplayNumber(value: number): string {
  const [coefficient, exponent] = Math.abs(value).toString().split("e");
  let decimal = coefficient;
  if (exponent !== undefined) {
    const [whole, fraction = ""] = coefficient.split("."),
      digits = whole + fraction,
      point = whole.length + Number(exponent);
    decimal =
      point <= 0
        ? "0." + "0".repeat(-point) + digits
        : point >= digits.length
          ? digits + "0".repeat(point - digits.length)
          : digits.slice(0, point) + "." + digits.slice(point);
  }
  return formatNumericInput((value < 0 ? "-" : "") + decimal);
}
