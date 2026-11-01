"use client";
import { useState, type FormEvent } from "react";
import { NumberInput } from "./number-input";
import { parseNumericInput } from "@/lib/number-input";
import { useModalClose } from "./modal";
import { Save } from "lucide-react";
import type { TextKey } from "@/lib/i18n";
import type { Profile, WorkspaceData, RecordTable } from "@/lib/domain";
import { validateRecord, isAdmin } from "@/lib/domain";
import { normalizePhone } from "@/lib/phone";
import { mutationErrorKey } from "@/lib/mutation-errors";
type Field = {
  key: string;
  type?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  wide?: boolean;
};
export function RecordForm({
  table,
  initial,
  profile,
  data,
  t,
  onSave,
  onClose,
}: {
  table: RecordTable;
  initial?: Record<string, unknown>;
  profile: Profile;
  data: WorkspaceData;
  t: (k: TextKey) => string;
  onSave: (values: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const closeForm = useModalClose(onClose);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const opts = (keys: string[]) =>
    keys.map((value) => ({ value, label: t(value as TextKey) }));
  const propertyFields: Field[] = [
    { key: "title", required: true, wide: true },
    {
      key: "type",
      options: opts(["house", "apartment", "land", "commercial", "other"]),
      required: true,
    },
    { key: "purpose", options: opts(["sale", "rent"]), required: true },
    { key: "city", required: true },
    { key: "neighborhood" },
    { key: "address", wide: true },
    { key: "price", type: "number" },
    { key: "currency", options: opts(["USD", "IQD"]) },
    { key: "area", type: "number" },
    { key: "bedrooms", type: "number" },
    { key: "contact_name", required: true },
    { key: "phone", type: "tel", required: true },
    { key: "phone_secondary", type: "tel" },
    { key: "description", type: "textarea", wide: true },
  ];
  const requestFields: Field[] = [
    { key: "client_name", required: true },
    { key: "phone", type: "tel", required: true },
    { key: "phone_secondary", type: "tel" },
    { key: "kind", options: opts(["buy", "rent", "sell"]), required: true },
    {
      key: "type",
      options: opts(["house", "apartment", "land", "commercial", "other"]),
      required: true,
    },
    { key: "city", required: true },
    { key: "neighborhood" },
    { key: "budget_min", type: "number" },
    { key: "budget_max", type: "number" },
    { key: "currency", options: opts(["USD", "IQD"]) },
    { key: "bedrooms", type: "number" },
    { key: "area_min", type: "number" },
    { key: "area_max", type: "number" },
    {
      key: "property_id",
      options: [
        { value: "", label: t("optional") },
        ...data.properties.map((p) => ({
          value: p.id,
          label: `${p.ref} · ${p.title}`,
        })),
      ],
      wide: true,
    },
    { key: "notes", type: "textarea", wide: true },
  ];
  const officeFields: Field[] = [
    { key: "name", required: true, wide: true },
    { key: "contact_name", required: true },
    { key: "phone", type: "tel", required: true },
    { key: "phone_secondary", type: "tel" },
    { key: "address", wide: true },
    { key: "notes", type: "textarea", wide: true },
  ];
  const fields =
    table === "properties"
      ? propertyFields
      : table === "client_requests"
        ? requestFields
        : officeFields;
  if (table !== "partner_offices" && profile.role !== "freelancer") {
    fields.push(
      {
        key: "source_contributor_id",
        options: data.profiles.map((p) => ({ value: p.id, label: p.name })),
        required: true,
      },
      {
        key: "source_office_id",
        options: [
          { value: "", label: t("noOffice") },
          ...data.partner_offices.map((p) => ({ value: p.id, label: p.name })),
        ],
      },
    );
    if (initial)
      fields.push({
        key: "status",
        options: [
          {
            value:
              initial.status === "archived"
                ? table === "properties"
                  ? "available"
                  : "open"
                : String(initial.status),
            label: t("all"),
          },
          ...(isAdmin(profile)
            ? [{ value: "archived", label: t("archived") }]
            : []),
        ],
      });
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const values: Record<string, unknown> = {};
    for (const f of fields) {
      const value = String(fd.get(f.key) ?? "").trim();
      values[f.key] =
        f.type === "number"
          ? value === ""
            ? null
            : parseNumericInput(value)
          : ["property_id", "source_office_id"].includes(f.key)
            ? value || null
            : value;
    }
    values.phone = normalizePhone(String(values.phone)) ?? String(values.phone);
    {
      const secondary = String(values.phone_secondary ?? "").trim();
      if (secondary)
        values.phone_secondary = normalizePhone(secondary) ?? secondary;
      else if (initial?.phone_secondary) values.phone_secondary = null;
      // Omit a never-set blank value so one-phone saves still work during rollout.
      else delete values.phone_secondary;
    }
    if (table !== "partner_offices") {
      if (!initial) {
        values.created_by = profile.id;
        values.status = table === "properties" ? "available" : "open";
      }
      if (profile.role === "freelancer" && !initial) {
        values.source_contributor_id = profile.id;
        values.source_office_id = null;
      }
    }
    if (validateRecord(table, values).length) {
      setError(t("validationError"));
      return;
    }
    setBusy(true);
    try {
      await onSave(values);
    } catch (error) {
      setError(t(mutationErrorKey(error)));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        {fields.map((f) => (
          <label key={f.key} className={f.wide ? "wide" : ""}>
            <span>
              {t(f.key as TextKey)}{" "}
              {f.key === "phone_secondary" && (
                <small className="muted">({t("optional")})</small>
              )}
              {f.required && <span className="required">*</span>}
            </span>
            {f.options ? (
              <select
                name={f.key}
                defaultValue={String(
                  initial?.[f.key] ??
                    (f.key === "source_contributor_id"
                      ? profile.id
                      : f.key === "currency"
                        ? "USD"
                        : (f.options[0]?.value ?? "")),
                )}
                required={f.required}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                name={f.key}
                rows={3}
                defaultValue={String(initial?.[f.key] ?? "")}
              />
            ) : f.type === "number" ? (
              <NumberInput
                name={f.key}
                defaultValue={initial?.[f.key]}
                min={f.key.startsWith("area") ? 1 : 0}
                integer={f.key === "bedrooms"}
                required={f.required}
              />
            ) : (
              <input
                name={f.key}
                type={f.type ?? "text"}
                min={
                  f.type === "number"
                    ? f.key.startsWith("area")
                      ? 1
                      : 0
                    : undefined
                }
                step={
                  f.key === "bedrooms"
                    ? 1
                    : f.type === "number"
                      ? "any"
                      : undefined
                }
                maxLength={f.type === "number" ? undefined : 500}
                required={f.required}
                dir={f.type === "tel" ? "ltr" : undefined}
                placeholder={
                  f.type === "tel"
                    ? t("phoneHint")
                    : f.key === "price"
                      ? t("priceOnRequest")
                      : undefined
                }
                defaultValue={String(initial?.[f.key] ?? "")}
              />
            )}
          </label>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="button secondary"
          onClick={closeForm}
          disabled={busy}
        >
          {t("cancel")}
        </button>
        <button className="button primary" disabled={busy}>
          <Save size={16} />
          {t(busy ? "saving" : "save")}
        </button>
      </div>
    </form>
  );
}
