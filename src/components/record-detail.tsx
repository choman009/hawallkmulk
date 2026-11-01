"use client";
import { formatDisplayNumber } from "@/lib/number-input";

import { mutationErrorKey } from "@/lib/mutation-errors";
import { useEffect, useState, useRef } from "react";
import {
  Pencil,
  Plus,
  Archive,
  ImagePlus,
  MapPin,
  BedDouble,
  Scan,
  Building2,
  Trash2,
} from "lucide-react";
import type {
  WorkspaceData,
  Profile,
  Property,
  ClientRequest,
  PartnerOffice,
  RecordTable,
  PropertyImage,
} from "@/lib/domain";
import { canEditRecord, isAdmin } from "@/lib/domain";
import { matchingProperties } from "@/lib/matching";
import { photoUrls, uploadPhoto } from "@/lib/repository";
import { getBrowserClient } from "@/lib/supabase/client";
import type { TextKey } from "@/lib/i18n";
import { ShareRecord } from "./share-record";
import { ContactActions } from "./contact-actions";
import { Modal } from "./modal";
export function RecordDetail({
  table,
  record,
  data,
  profile,
  t,
  demo,
  onClose,
  onEdit,
  onAssign,
  onArchive,
  onStatusChange,
  onDelete,
  onRefresh,
  onOpen,
}: {
  table: RecordTable;
  record: Property | ClientRequest | PartnerOffice;
  data: WorkspaceData;
  profile: Profile;
  t: (k: TextKey) => string;
  demo: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAssign: () => void;
  onArchive: () => Promise<void>;
  onStatusChange: (status: string) => Promise<void>;
  onDelete: () => void;
  onRefresh: () => Promise<void>;
  onOpen: (id: string) => void;
}) {
  const [images, setImages] = useState<PropertyImage[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const property = table === "properties" ? (record as Property) : null,
    request = table === "client_requests" ? (record as ClientRequest) : null,
    office = table === "partner_offices" ? (record as PartnerOffice) : null;
  const editable = office
    ? profile.role !== "freelancer" && profile.can_write
    : canEditRecord(profile, record as Property | ClientRequest);
  useEffect(() => {
    let alive = true;
    if (property && !demo)
      photoUrls(
        data.property_images.filter((i) => i.property_id === property.id),
      )
        .then((v) => {
          if (alive) setImages(v);
        })
        .catch(() => {
          if (alive) setError(t("photoError"));
        });
    return () => {
      alive = false;
    };
  }, [property?.id, data.property_images, demo, t]);
  const title = property?.title ?? request?.client_name ?? office?.name ?? "";
  const amount = (n: number | null, currency: string) =>
    n == null ? t("priceOnRequest") : `${formatDisplayNumber(n)} ${currency}`;
  const projection = data.record_sources?.find(
    (s) => s.record_id === record.id && s.record_type === table,
  );
  const source =
    ("source_contributor_id" in record
      ? data.profiles.find((p) => p.id === record.source_contributor_id)?.name
      : undefined) ?? projection?.contributor_name;
  const sourceOffice =
    "source_office_id" in record
      ? data.partner_offices.find((o) => o.id === record.source_office_id)
      : null;
  const officeContact = sourceOffice
    ? {
        name: sourceOffice.name,
        address: sourceOffice.address,
        contact: sourceOffice.contact_name,
        phone: sourceOffice.phone,
        secondaryPhone: sourceOffice.phone_secondary,
      }
    : projection?.office_name
      ? {
          name: projection.office_name,
          address: projection.office_address,
          contact: projection.office_contact,
          phone: projection.office_phone,
          secondaryPhone: projection.office_phone_secondary,
        }
      : null;
  const matches = request ? matchingProperties(request, data.properties) : [];
  return (
    <Modal title={title} closeLabel={t("close")} onClose={onClose}>
      <div className="detail-actions">
        <div className="badge-row">
          {"ref" in record && (
            <span className="reference" dir="ltr">
              {record.ref}
            </span>
          )}
          {"status" in record && (
            <span className={`status ${record.status}`}>
              {t(record.status === "archived" ? "archived" : "all")}
            </span>
          )}
        </div>
        {(property || request) && editable && profile.role !== "freelancer" && (
          <label className="detail-status-control">
            <span>{t("status")}</span>
            <select
              aria-label={t("status")}
              value={
                record && "status" in record && record.status === "archived"
                  ? "archived"
                  : property
                    ? "available"
                    : "open"
              }
              disabled={busy}
              onChange={async (event) => {
                const status = event.target.value;
                if ("status" in record && status === record.status) return;
                setBusy(true);
                setError("");
                try {
                  await onStatusChange(status);
                } catch (error) {
                  setError(t(mutationErrorKey(error)));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {[
                property ? "available" : "open",
                ...(isAdmin(profile) ? ["archived"] : []),
              ].map((status) => (
                <option key={status} value={status}>
                  {t(status === "archived" ? "archived" : "all")}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="button-row">
          {(property || request) && (
            <ShareRecord record={(property || request)!} t={t} />
          )}
          {editable && (
            <button className="button secondary small-button" onClick={onEdit}>
              <Pencil size={14} />
              {t("edit")}
            </button>
          )}
          {!office && isAdmin(profile) && (
            <button className="button primary small-button" onClick={onAssign}>
              <Plus size={14} />
              {t("addAssignment")}
            </button>
          )}
        </div>
      </div>
      {property && (
        <>
          <div className={`property-visual ${property.type}`}>
            <Building2 size={32} strokeWidth={1.5} />
            <span>{t(property.type as TextKey)}</span>
            <span className="offer-badge">
              {t(property.purpose as TextKey)}
            </span>
            <b>
              <small>{t("price")}</small>
              <bdi>{amount(property.price, property.currency)}</bdi>
            </b>
          </div>
          <div className="detail-facts">
            <span>
              <MapPin size={17} />
              {property.city} · {property.neighborhood}
            </span>
            <span>
              <Scan size={17} /> {t("area")}:<bdi>{property.area ?? "—"}</bdi>
            </span>
            <span>
              <BedDouble size={17} /> {t("bedrooms")}:
              <bdi>{property.bedrooms ?? "—"}</bdi>
            </span>
          </div>
          {property.address && <p>{property.address}</p>}
          {property.description && (
            <p className="detail-description">{property.description}</p>
          )}
        </>
      )}
      {request && (
        <>
          <div className="request-summary">
            <span className="section-icon">
              <Building2 size={26} />
            </span>
            <div>
              <h3>
                <span className="offer-badge">
                  {t(request.kind as TextKey)}
                </span>{" "}
                {t(request.type as TextKey)}
              </h3>
              <p>
                {request.city} · {request.neighborhood}
              </p>
            </div>
          </div>
          <div className="info-grid">
            <div>
              <small>{t("budget")}</small>
              <strong>
                <bdi>
                  {amount(request.budget_min, request.currency)} —{" "}
                  {amount(request.budget_max, request.currency)}
                </bdi>
              </strong>
            </div>
            <div>
              <small>{t("area")}</small>
              <strong>
                <bdi>
                  {request.area_min ?? "—"} — {request.area_max ?? "—"}
                </bdi>
              </strong>
            </div>
            <div>
              <small>{t("bedrooms")}</small>
              <strong>{request.bedrooms ?? "—"}</strong>
            </div>
          </div>
          {request.notes && (
            <p className="detail-description">{request.notes}</p>
          )}
          {request.property_id && (
            <p>
              {t("property_id")}:{" "}
              {data.properties.find((p) => p.id === request.property_id)?.ref ??
                "—"}
            </p>
          )}
        </>
      )}
      {office && (
        <p>
          {office.address}
          <br />
          {office.notes}
        </p>
      )}
      <section className="contact-section">
        <div>
          <small className="muted">
            {t(property ? "ownerContact" : "contact")}
          </small>
          <h3>
            {property?.contact_name ??
              office?.contact_name ??
              request?.client_name}
          </h3>
          <span className="phone-text" dir="ltr">
            {record.phone}
          </span>
          {(property?.phone_secondary ??
            request?.phone_secondary ??
            office?.phone_secondary) && (
            <div>
              <small className="muted">{t("phone_secondary")}</small>
              <p className="phone-text" dir="ltr">
                {property?.phone_secondary ?? office?.phone_secondary}
              </p>
            </div>
          )}
        </div>
        <ContactActions
          phone={record.phone}
          secondaryPhone={property?.phone_secondary ?? office?.phone_secondary}
          t={t}
        />
      </section>
      {!office && (
        <div className="info-grid">
          <div>
            <small>{t("source")}</small>
            <strong>{source ?? t("source")}</strong>
          </div>
          <div>
            <small>{t("created")}</small>
            <strong>
              {new Date(record.created_at).toLocaleDateString("en-GB")}
            </strong>
          </div>
        </div>
      )}
      {!office && officeContact && (
        <section className="contact-section">
          <div>
            <small className="muted">{t("source_office_id")}</small>
            <h3>{officeContact.name}</h3>
            <p className="muted small">
              {officeContact.address} · {officeContact.contact}
            </p>
            <span className="phone-text" dir="ltr">
              {officeContact.phone}
            </span>
          </div>
          {officeContact.phone && (
            <div>
              {officeContact.secondaryPhone && (
                <p className="phone-text" dir="ltr">
                  {officeContact.secondaryPhone}
                </p>
              )}
              <ContactActions
                phone={officeContact.phone}
                secondaryPhone={officeContact.secondaryPhone}
                t={t}
              />
            </div>
          )}
        </section>
      )}
      {property && (
        <section className="detail-section">
          <div className="section-heading">
            <h3>{t("uploadPhoto")}</h3>
            {editable && (
              <button
                className="button secondary small-button"
                disabled={busy || demo}
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus size={16} />
                {t(busy ? "uploading" : "uploadPhoto")}
              </button>
            )}
          </div>
          <p className="muted small">{t(demo ? "demoPhotos" : "imageHint")}</p>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={async (e) => {
              const files = [...(e.target.files ?? [])];
              setBusy(true);
              setError("");
              try {
                for (const file of files) await uploadPhoto(property.id, file);
                await onRefresh();
              } catch {
                setError(t("photoError"));
              } finally {
                setBusy(false);
                if (fileRef.current) fileRef.current.value = "";
              }
            }}
          />
          <div className="photo-grid">
            {images.map((img) => (
              <div key={img.id}>
                <a href={img.url} target="_blank" rel="noopener noreferrer">
                  <img src={img.url} alt={property.title} />
                </a>
                {editable && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const client = getBrowserClient()!;
                        const { error: storageError } = await client.storage
                          .from("property-images")
                          .remove([img.path]);
                        if (storageError) throw storageError;
                        const { error } = await client
                          .from("property_images")
                          .delete()
                          .eq("id", img.id);
                        if (error) throw error;
                        await onRefresh();
                      } catch {
                        setError(t("photoError"));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {t("photoRemove")}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      {request && request.kind !== "sell" && (
        <section className="detail-section">
          <h3>
            {t("matches")} <span className="count">{matches.length}</span>
          </h3>
          <p className="muted small">{t("matchExplanation")}</p>
          {matches.map((p) => (
            <button
              className="match-row"
              key={p.id}
              onClick={() => onOpen(p.id)}
            >
              <span>
                {p.title}
                <small>
                  {p.city} · {p.neighborhood}
                </small>
              </span>
              <strong dir="ltr">{amount(p.price, p.currency)}</strong>
            </button>
          ))}
          {!matches.length && <p className="muted">{t("noMatches")}</p>}
        </section>
      )}
      {!office &&
        isAdmin(profile) &&
        "status" in record &&
        record.status !== "archived" && (
          <div className="form-actions">
            <button
              className="text-button danger"
              disabled={busy}
              onClick={async () => {
                if (!confirm(t("archiveConfirm"))) return;
                setBusy(true);
                try {
                  await onArchive();
                  onClose();
                } catch (error) {
                  setError(t(mutationErrorKey(error)));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Archive size={16} />
              {t("archive")}
            </button>
          </div>
        )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {isAdmin(profile) && profile.can_write && (
        <div className="form-actions">
          <button
            className="text-button danger"
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 size={16} />
            {t("deleteRecord")}
          </button>
        </div>
      )}
    </Modal>
  );
}
