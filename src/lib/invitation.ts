import { normalizePhone } from "./phone.ts";
export function parseInvitation(
  input: unknown,
  actor: { role: string; active: boolean },
): {
  name: string;
  email: string;
  phone: string;
  role: "admin" | "staff" | "freelancer";
} | null {
  if (
    !actor.active ||
    !["owner", "admin"].includes(actor.role) ||
    !input ||
    typeof input !== "object"
  )
    return null;
  const v = input as Record<string, unknown>;
  if (
    typeof v.name !== "string" ||
    !v.name.trim() ||
    v.name.length > 120 ||
    typeof v.email !== "string" ||
    v.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email) ||
    !["admin", "staff", "freelancer"].includes(String(v.role)) ||
    (v.role === "admin" && actor.role !== "owner")
  )
    return null;
  const phone =
    v.phone == null || v.phone === ""
      ? ""
      : typeof v.phone === "string"
        ? normalizePhone(v.phone)
        : null;
  if (phone === null) return null;
  return {
    name: v.name.trim(),
    email: v.email,
    phone,
    role: v.role as "admin" | "staff" | "freelancer",
  };
}
