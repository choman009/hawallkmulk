"use client";
import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import {
  Search,
  Plus,
  Pencil,
  ArrowUpRight,
  Pin,
  Check,
  Building2,
  X,
} from "lucide-react";
import type {
  WorkspaceData,
  Profile,
  RecordTable,
  Property,
  ClientRequest,
  PartnerOffice,
} from "@/lib/domain";
import { matchesNote } from "@/lib/note-search";
import { canEditRecord } from "@/lib/domain";
import type { TextKey } from "@/lib/i18n";
import { normalizePhone } from "@/lib/phone";
import { mutationErrorKey } from "@/lib/mutation-errors";
import { ContactActions } from "./contact-actions";
type Note = Property | ClientRequest | PartnerOffice;
export function Notebook({
  compact = false,
  data,
  profile,
  table,
  t,
  onSave,
  onOpen,
  favorite,
  isFavorite,
}: {
  compact?: boolean;
  data: WorkspaceData;
  profile: Profile;
  table: RecordTable;
  t: (k: TextKey) => string;
  onSave: (
    table: string,
    values: Record<string, unknown>,
    id?: string,
  ) => Promise<void>;
  onOpen: (table: RecordTable, id: string) => void;
  favorite: (table: string, id: string) => ReactNode;
  isFavorite: (table: string, id: string) => boolean;
}) {
  const [composerOpen, setComposerOpen] = useState(!compact);
  useEffect(() => setComposerOpen(!compact), [compact]);
  const [query, setQuery] = useState(""),
    [pinned, setPinned] = useState(false),
    [editing, setEditing] = useState<Note | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [offer, setOffer] = useState("all");
  const office = table === "partner_offices",
    request = table === "client_requests";
  const rows = data[table]
    .filter(
      (r) =>
        !("status" in r) ||
        (offer === "archived"
          ? r.status === "archived"
          : r.status !== "archived"),
    )
    .filter((r) => !pinned || isFavorite(table, r.id))
    .filter(
      (r) =>
        offer === "all" ||
        offer === "archived" ||
        ("purpose" in r
          ? r.purpose === offer
          : "kind" in r
            ? r.kind === offer
            : true),
    )
    .filter((r) => matchesNote(r, query))
    .sort(
      (a, b) =>
        Number(isFavorite(table, b.id)) - Number(isFavorite(table, a.id)),
    );
  const heading = office
    ? "partner_offices"
    : request
      ? "client_requests"
      : "properties";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      fd = new FormData(form);
    setError("");
    const phone = normalizePhone(String(fd.get("phone") || "")),
      second = String(fd.get("phone_secondary") || "").trim();
    if (!phone || (second && !normalizePhone(second))) {
      setError(t("validationError"));
      return;
    }
    const name = String(fd.get("name") || "").trim(),
      address = String(fd.get("address") || "").trim(),
      raw = String(fd.get("price") || "");
    const values: Record<string, unknown> = { phone };
    if (!request) {
      if (second) values.phone_secondary = normalizePhone(second);
      else if (
        editing &&
        "phone_secondary" in editing &&
        editing.phone_secondary
      )
        values.phone_secondary = null;
    }
    if (office) Object.assign(values, { name, address });
    else {
      Object.assign(values, {
        [request ? "client_name" : "title"]: name,
        city: editing && "city" in editing ? editing.city : address,
        currency: fd.get("currency"),
        type: fd.get("type"),
        [request ? "kind" : "purpose"]: fd.get("purpose"),
      });
      if (request)
        Object.assign(values, {
          city: address,
          neighborhood: String(fd.get("neighborhood") || "").trim(),
          budget_max: raw ? Number(raw) : null,
        });
      else
        Object.assign(values, {
          address,
          price: raw ? Number(raw) : null,
          area: String(fd.get("area") || "").trim()
            ? Number(fd.get("area"))
            : null,
          description: String(fd.get("description") || "").trim(),
        });
      if (!editing)
        Object.assign(values, {
          source_contributor_id: profile.id,
          source_office_id: null,
          created_by: profile.id,
          status: request ? "open" : "available",
        });
    }
    setBusy(true);
    try {
      await onSave(table, values, editing?.id);
      setEditing(null);
      if (compact) setComposerOpen(false);
      form.reset();
    } catch (err) {
      setError(t(mutationErrorKey(err)));
    } finally {
      setBusy(false);
    }
  }
  const title = (r: Note) =>
    "title" in r ? r.title : "client_name" in r ? r.client_name : r.name;
  const address = (r: Note) =>
    "address" in r
      ? r.address ||
        ("city" in r
          ? [r.city, r.neighborhood].filter(Boolean).join(" · ")
          : "")
      : [r.city, r.neighborhood].filter(Boolean).join(" · ");
  const price = (r: Note) =>
    "price" in r ? r.price : "budget_max" in r ? r.budget_max : null;
  return (
    <div className="notebook">
      <header className="notebook-heading">
        <div>
          <span className="notebook-kicker">Hawall mulk / {t("notebook")}</span>
          <h1>
            {t(heading)}
            <span>{rows.length}</span>
          </h1>
        </div>
        <div className="notebook-tip">{t("notebookHint")}</div>
      </header>
      <div className="notebook-tools">
        <label className="notebook-search">
          <Search size={19} />
          <input
            aria-label={t("search")}
            placeholder={t("noteSearch")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button aria-label={t("clearFilters")} onClick={() => setQuery("")}>
              <X size={16} />
            </button>
          )}
        </label>
        <button
          className={`note-filter ${pinned ? "active" : ""}`}
          aria-pressed={pinned}
          onClick={() => setPinned(!pinned)}
        >
          <Pin size={16} />
          {t("favorites")}
        </button>
        {!office && (
          <select
            aria-label={t("filters")}
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
          >
            {[
              "all",
              ...(request ? ["buy", "rent", "sell"] : ["sale", "rent"]),
              "archived",
            ].map((v) => (
              <option key={v} value={v}>
                {t(v as TextKey)}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="notebook-layout">
        {profile.can_write && (
          <details
            className="note-composer"
            open={composerOpen}
            onToggle={(e) => setComposerOpen(e.currentTarget.open)}
          >
            <summary className="composer-heading">
              <Plus size={19} />
              <h2>
                {t(
                  editing
                    ? "edit"
                    : office
                      ? "addOffice"
                      : request
                        ? "addRequest"
                        : "addProperty",
                )}
              </h2>
              {editing && (
                <button
                  className="icon-button"
                  aria-label={t("cancel")}
                  onClick={() => setEditing(null)}
                >
                  <X size={18} />
                </button>
              )}
            </summary>
            <form key={editing?.id ?? `new-${table}`} onSubmit={submit}>
              <label>
                <span>
                  {t(office ? "name" : request ? "client_name" : "title")}
                </span>
                <input
                  name="name"
                  required
                  autoComplete="off"
                  defaultValue={editing ? title(editing) : ""}
                />
              </label>
              {!office && (
                <div className="note-field-pair">
                  <label>
                    <span>{t(request ? "budget" : "price")}</span>
                    <input
                      name="price"
                      type="number"
                      min="0"
                      step="any"
                      dir="ltr"
                      defaultValue={editing ? (price(editing) ?? "") : ""}
                    />
                  </label>
                  <label>
                    <span>{t("currency")}</span>
                    <select
                      name="currency"
                      defaultValue={
                        editing && "currency" in editing
                          ? editing.currency
                          : "USD"
                      }
                    >
                      <option>USD</option>
                      <option>IQD</option>
                    </select>
                  </label>
                </div>
              )}
              <label>
                <span>{t(request ? "city" : "address")}</span>
                <input
                  name="address"
                  required={!office}
                  defaultValue={
                    editing
                      ? request && "city" in editing
                        ? editing.city
                        : address(editing)
                      : ""
                  }
                />
              </label>
              {!office && !request && (
                <>
                  <label>
                    <span>{t("area")}</span>
                    <input
                      name="area"
                      type="number"
                      min="0.01"
                      step="any"
                      dir="ltr"
                      defaultValue={
                        editing && "area" in editing ? (editing.area ?? "") : ""
                      }
                    />
                  </label>
                  <label>
                    <span>{t("notes")}</span>
                    <textarea
                      name="description"
                      rows={2}
                      defaultValue={
                        editing && "description" in editing
                          ? editing.description
                          : ""
                      }
                    />
                  </label>
                </>
              )}
              {request && (
                <label>
                  <span>{t("neighborhood")}</span>
                  <input
                    name="neighborhood"
                    defaultValue={
                      editing && "neighborhood" in editing
                        ? editing.neighborhood
                        : ""
                    }
                  />
                </label>
              )}
              <label>
                <span>{t("phone")}</span>
                <input
                  name="phone"
                  type="tel"
                  required
                  dir="ltr"
                  placeholder="07xx xxx xxxx"
                  defaultValue={editing?.phone ?? ""}
                />
              </label>
              {!request && (
                <label>
                  <span>
                    {t("phone_secondary")} <small>({t("optional")})</small>
                  </span>
                  <input
                    name="phone_secondary"
                    type="tel"
                    dir="ltr"
                    defaultValue={
                      editing && "phone_secondary" in editing
                        ? (editing.phone_secondary ?? "")
                        : ""
                    }
                  />
                </label>
              )}
              {!office && (
                <div className="note-field-pair">
                  <label>
                    <span>{t(request ? "kind" : "purpose")}</span>
                    <select
                      name="purpose"
                      defaultValue={
                        editing
                          ? "purpose" in editing
                            ? editing.purpose
                            : "kind" in editing
                              ? editing.kind
                              : "sale"
                          : request
                            ? "buy"
                            : "sale"
                      }
                    >
                      {(request
                        ? ["buy", "rent", "sell"]
                        : ["sale", "rent"]
                      ).map((v) => (
                        <option key={v} value={v}>
                          {t(v as TextKey)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{t("type")}</span>
                    <select
                      name="type"
                      defaultValue={
                        editing && "type" in editing ? editing.type : "other"
                      }
                    >
                      {[
                        "house",
                        "apartment",
                        "land",
                        "commercial",
                        "other",
                      ].map((v) => (
                        <option key={v} value={v}>
                          {t(v as TextKey)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="note-save" disabled={busy}>
                <Check size={18} />
                {t(busy ? "saving" : "save")}
              </button>
            </form>
          </details>
        )}
        <section className="note-board" aria-label={t(heading)}>
          {rows.map((r, i) => (
            <article
              className={`paper-note paper-${i % 4} ${isFavorite(table, r.id) ? "is-pinned" : ""}`}
              key={r.id}
            >
              <span className="paper-spine" aria-hidden="true">
                <Building2 size={22} />
              </span>
              <div className="paper-meta">
                <span>{"ref" in r ? r.ref : t("partner_offices")}</span>
                <div>
                  {favorite(table, r.id)}
                  {profile.can_write &&
                    (!("source_contributor_id" in r) ||
                      canEditRecord(profile, r)) && (
                      <button
                        className="paper-icon"
                        aria-label={`${t("edit")} ${title(r)}`}
                        onClick={() => {
                          setEditing(r);
                          setComposerOpen(true);
                          document
                            .querySelector(".note-composer")
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "nearest",
                            });
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                </div>
              </div>
              <h2>{title(r)}</h2>
              {"status" in r && !["available", "open"].includes(r.status) && (
                <small className="paper-state">{t(r.status as TextKey)}</small>
              )}
              {!office && (
                <div className="paper-price">
                  <bdi>
                    {price(r) == null
                      ? t("priceOnRequest")
                      : new Intl.NumberFormat("en-US").format(price(r)!)}{" "}
                    {"currency" in r ? r.currency : ""}
                  </bdi>
                  <span>
                    {t(
                      ("purpose" in r
                        ? r.purpose
                        : "kind" in r
                          ? r.kind
                          : "sale") as TextKey,
                    )}
                  </span>
                </div>
              )}
              {"area" in r && r.area != null && (
                <span className="paper-area">
                  <bdi>{r.area} m²</bdi>
                </span>
              )}
              <p className="paper-address">{address(r) || "—"}</p>
              {"description" in r && r.description && (
                <p className="paper-description">{r.description}</p>
              )}
              {"notes" in r && r.notes && (
                <p className="paper-description">{r.notes}</p>
              )}
              <div className="paper-contact">
                <span dir="ltr">{r.phone}</span>
                <ContactActions phone={r.phone} t={t} compact />
              </div>
              {"phone_secondary" in r && r.phone_secondary && (
                <div className="paper-contact">
                  <span dir="ltr">{r.phone_secondary}</span>
                  <ContactActions phone={r.phone_secondary} t={t} compact />
                </div>
              )}
              <button
                className="paper-more"
                onClick={() => onOpen(table, r.id)}
              >
                {t("details")}
                <ArrowUpRight size={15} />
              </button>
            </article>
          ))}
          {!rows.length && <div className="notebook-empty">{t("noNotes")}</div>}
        </section>
      </div>
    </div>
  );
}
