import { normalizePhone } from "./phone.ts";
export type Locale = "ckb" | "en";
export type Role = "owner" | "admin" | "staff" | "freelancer";
export type Profile = {
  id: string;
  name: string;
  phone: string;
  role: Role;
  active: boolean;
  locale: Locale;
  theme: "light" | "dark";
  can_write: boolean;
};
export type Property = {
  id: string;
  ref: string;
  title: string;
  type: string;
  purpose: string;
  city: string;
  neighborhood: string;
  address: string;
  price: number | null;
  currency: string;
  area: number | null;
  bedrooms: number | null;
  description: string;
  status: string;
  contact_name: string;
  phone: string;
  phone_secondary?: string | null;
  source_contributor_id: string | null;
  source_office_id: string | null;
  created_by: string;
  created_at: string;
};
export type ClientRequest = {
  id: string;
  ref: string;
  client_name: string;
  phone: string;
  kind: string;
  type: string;
  city: string;
  neighborhood: string;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  area_min: number | null;
  area_max: number | null;
  bedrooms: number | null;
  notes: string;
  status: string;
  source_contributor_id: string | null;
  source_office_id: string | null;
  property_id: string | null;
  created_by: string;
  created_at: string;
};
export type PartnerOffice = {
  id: string;
  name: string;
  address: string;
  contact_name: string;
  phone: string;
  phone_secondary?: string | null;
  notes: string;
  created_at: string;
};
export type Assignment = {
  id: string;
  property_id: string | null;
  request_id: string | null;
  assignee_id: string;
  kind: string;
  instructions: string;
  status: string;
  due_date: string | null;
  assigned_by: string;
  created_at: string;
};
export type WorkUpdate = {
  id: string;
  assignment_id: string;
  author_id: string;
  note: string;
  created_at: string;
};
export type PropertyImage = {
  id: string;
  property_id: string;
  path: string;
  url?: string;
};
export type OfficeSettings = {
  id: number;
  name: string;
  phone: string;
  address: string;
};
export type RecordSource = {
  record_id: string;
  record_type: string;
  contributor_name: string | null;
  office_name: string | null;
  office_address: string | null;
  office_contact: string | null;
  office_phone: string | null;
  office_phone_secondary?: string | null;
};
export type WorkspaceData = {
  profiles: Profile[];
  properties: Property[];
  client_requests: ClientRequest[];
  partner_offices: PartnerOffice[];
  assignments: Assignment[];
  assignment_updates: WorkUpdate[];
  property_images: PropertyImage[];
  office_settings: OfficeSettings;
  record_sources?: RecordSource[];
};
export type RecordTable = "properties" | "client_requests" | "partner_offices";
type AccessProfile = Pick<Profile, "id" | "role" | "active">;
type Sourced = {
  id: string;
  source_contributor_id: string | null;
  created_by: string;
  status?: string;
};
export const isAdmin = (profile: AccessProfile) =>
  profile.active && ["owner", "admin"].includes(profile.role);
export function canSeeRecord(
  profile: AccessProfile,
  record: Sourced,
  assignments: Pick<
    Assignment,
    "property_id" | "request_id" | "assignee_id" | "status"
  >[],
) {
  if (!profile.active) return false;
  if (profile.role !== "freelancer") return true;
  return (
    record.source_contributor_id === profile.id ||
    assignments.some(
      (a) =>
        a.assignee_id === profile.id &&
        a.status !== "canceled" &&
        (a.property_id === record.id || a.request_id === record.id),
    )
  );
}
export function canEditRecord(
  profile: AccessProfile & { can_write?: boolean },
  record: Sourced,
) {
  if (!profile.active || profile.can_write === false) return false;
  if (record.status === "archived" && profile.role === "staff") return false;
  if (profile.role !== "freelancer") return true;
  return (
    record.source_contributor_id === profile.id &&
    ["available", "open"].includes(record.status ?? "")
  );
}
export function validateRecord(
  table: RecordTable,
  data: Record<string, unknown>,
): string[] {
  const errors: string[] = [];
  if (
    !String(
      data[
        table === "properties"
          ? "title"
          : table === "client_requests"
            ? "client_name"
            : "name"
      ] ?? "",
    ).trim()
  )
    errors.push("required");
  if (!normalizePhone(String(data.phone ?? ""))) errors.push("phone");
  if (table !== "client_requests") {
    const secondary = String(data.phone_secondary ?? "").trim();
    if (secondary && !normalizePhone(secondary)) errors.push("phone_secondary");
  }
  if (table !== "partner_offices") {
    if (!String(data.city ?? "").trim()) errors.push("city");
    if (data.currency !== "USD" && data.currency !== "IQD")
      errors.push("currency");
    if (
      !["house", "apartment", "land", "commercial", "other"].includes(
        String(data.type),
      )
    )
      errors.push("type");
    for (const key of [
      "price",
      "area",
      "bedrooms",
      "budget_min",
      "budget_max",
      "area_min",
      "area_max",
    ])
      if (
        data[key] != null &&
        (!Number.isFinite(Number(data[key])) || Number(data[key]) < 0)
      )
        errors.push(key);
    if (
      table === "properties" &&
      !["sale", "rent"].includes(String(data.purpose))
    )
      errors.push("purpose");
    if (table === "client_requests") {
      if (!["buy", "rent", "sell"].includes(String(data.kind)))
        errors.push("kind");
      if (
        data.budget_min != null &&
        data.budget_max != null &&
        Number(data.budget_min) > Number(data.budget_max)
      )
        errors.push("budget");
      if (
        data.area_min != null &&
        data.area_max != null &&
        Number(data.area_min) > Number(data.area_max)
      )
        errors.push("area");
    }
  }
  return [...new Set(errors)];
}
