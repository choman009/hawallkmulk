"use client";
import { useState, type FormEvent } from "react";
import { Plus, ArrowUpRight, Check, Clock3, Trash2 } from "lucide-react";
import { mutationErrorKey } from "@/lib/mutation-errors";
import type { WorkspaceData, Profile, Assignment } from "@/lib/domain";
import { isAdmin } from "@/lib/domain";
import type { TextKey } from "@/lib/i18n";
import { FavoriteButton } from "./favorite-button";
import type { useFavorites } from "@/lib/use-favorites";
import { Modal } from "./modal";
export function AssignmentForm({
  data,
  t,
  onSave,
  onClose,
  target,
}: {
  data: WorkspaceData;
  t: (k: TextKey) => string;
  onSave: (v: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  target?: { type: "properties" | "client_requests"; id: string };
}) {
  const [kind, setKind] = useState(target?.type ?? "client_requests"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await onSave({
        property_id: kind === "properties" ? fd.get("record") : null,
        request_id: kind === "client_requests" ? fd.get("record") : null,
        assignee_id: fd.get("assignee_id"),
        kind: fd.get("kind"),
        instructions: fd.get("instructions"),
        due_date: fd.get("due_date") || null,
        status: "assigned",
      });
    } catch (error) {
      setError(t(mutationErrorKey(error)));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <p className="muted">{t("assignHint")}</p>
      <div className="form-grid">
        <label>
          <span>{t("record")}</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value="client_requests">{t("request")}</option>
            <option value="properties">{t("property")}</option>
          </select>
        </label>
        <label>
          <span>{t("assignmentType")}</span>
          <select name="kind">
            {["find", "sell", "follow_up"].map((k) => (
              <option key={k} value={k}>
                {t(k as TextKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          <span>{t("record")}</span>
          <select
            key={kind}
            name="record"
            required
            defaultValue={target?.type === kind ? target.id : ""}
          >
            <option value="" disabled>
              {t("nothingSelected")}
            </option>
            {(kind === "properties" ? data.properties : data.client_requests)
              .filter(
                (r) =>
                  ![
                    "archived",
                    "closed",
                    "sold",
                    "rented",
                    "withdrawn",
                  ].includes(r.status),
              )
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.ref} · {"title" in r ? r.title : r.client_name}
                </option>
              ))}
          </select>
        </label>
        <label>
          <span>{t("assignee_id")}</span>
          <select name="assignee_id" required>
            <option value="">{t("nothingSelected")}</option>
            {data.profiles
              .filter((p) => p.active)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {t(p.role)}
                </option>
              ))}
          </select>
        </label>
        <label>
          <span>{t("due_date")}</span>
          <input name="due_date" type="date" />
        </label>
        <label className="wide">
          <span>{t("instructions")}</span>
          <textarea name="instructions" rows={4} maxLength={5000} />
        </label>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onClose}>
          {t("cancel")}
        </button>
        <button className="button primary" disabled={busy}>
          {t(busy ? "saving" : "addAssignment")}
        </button>
      </div>
    </form>
  );
}
export function AssignmentPanel({
  favorites,
  data,
  profile,
  t,
  onProgress,
  onUpdate,
  onOpen,
  onAdd,
  onDelete,
}: {
  data: WorkspaceData;
  profile: Profile;
  t: (k: TextKey) => string;
  onProgress: (id: string, status: string) => Promise<void>;
  onUpdate: (id: string, note: string) => Promise<void>;
  onOpen: (type: "properties" | "client_requests", id: string) => void;
  onAdd: () => void;
  onDelete: (id: string, name: string) => void;
  favorites: ReturnType<typeof useFavorites>;
}) {
  const [selected, setSelected] = useState<Assignment | null>(null),
    [filter, setFilter] = useState("all"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const current = selected
    ? data.assignments.find((a) => a.id === selected.id)
    : null;
  const items = data.assignments
    .filter((a) => !onlyFavorites || favorites.has("assignments", a.id))
    .sort(
      (a, b) =>
        Number(favorites.has("assignments", b.id)) -
        Number(favorites.has("assignments", a.id)),
    )
    .filter(
      (a) => profile.role !== "freelancer" || a.assignee_id === profile.id,
    )
    .filter((a) => filter === "all" || a.status === filter);
  async function progress(a: Assignment, status: string) {
    setBusy(true);
    setError("");
    try {
      await onProgress(a.id, status);
    } catch (error) {
      setError(t(mutationErrorKey(error)));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="list-toolbar">
        <button
          className={`button ${onlyFavorites ? "primary" : "secondary"}`}
          aria-pressed={onlyFavorites}
          onClick={() => setOnlyFavorites(!onlyFavorites)}
        >
          {t("favorites")}
        </button>
        <div className="tabs">
          {["all", "assigned", "in_progress", "completed", "canceled"].map(
            (k) => (
              <button
                key={k}
                className={filter === k ? "active" : ""}
                onClick={() => setFilter(k)}
              >
                {t(k as TextKey)}
              </button>
            ),
          )}
        </div>
        {isAdmin(profile) && (
          <button className="button primary" onClick={onAdd}>
            <Plus size={17} />
            {t("addAssignment")}
          </button>
        )}
      </div>
      <div className="assignment-grid">
        {items.map((a) => {
          const record = a.property_id
            ? data.properties.find((p) => p.id === a.property_id)
            : data.client_requests.find((r) => r.id === a.request_id);
          return (
            <article className={`assignment-card ${a.status}`} key={a.id}>
              <div className="card-top">
                <FavoriteButton
                  active={favorites.has("assignments", a.id)}
                  busy={favorites.busy}
                  label={t(
                    favorites.has("assignments", a.id)
                      ? "removeFavorite"
                      : "addFavorite",
                  )}
                  onClick={() => void favorites.toggle("assignments", a.id)}
                />
                <span className={`status ${a.status}`}>
                  {t(a.status as TextKey)}
                </span>
                <span className="small muted">
                  {a.property_id ? t("property") : t("request")}
                </span>
              </div>
              <h3>{t(a.kind as TextKey)}</h3>
              {isAdmin(profile) && profile.can_write && (
                <button
                  className="text-button danger"
                  onClick={() =>
                    onDelete(
                      a.id,
                      record
                        ? `${record.ref} · ${t(a.kind as TextKey)}`
                        : t(a.kind as TextKey),
                    )
                  }
                >
                  <Trash2 size={16} />
                  {t("deleteRecord")}
                </button>
              )}
              <button
                className="record-link"
                disabled={!record}
                onClick={() =>
                  onOpen(
                    a.property_id ? "properties" : "client_requests",
                    (a.property_id ?? a.request_id)!,
                  )
                }
              >
                {record
                  ? `${record.ref} · ${"title" in record ? record.title : record.client_name}`
                  : t("assignedRecord")}
                <ArrowUpRight size={15} />
              </button>
              <p>{a.instructions || "—"}</p>
              <div className="assignment-footer">
                <span className="avatar small-avatar">
                  {(
                    data.profiles.find((p) => p.id === a.assignee_id)?.name ??
                    "?"
                  ).slice(0, 1)}
                </span>
                <span>
                  {data.profiles.find((p) => p.id === a.assignee_id)?.name ??
                    t("assignee_id")}
                </span>
                {a.due_date && (
                  <span className="due-date">
                    <Clock3 size={13} />
                    <bdi>{a.due_date}</bdi>
                  </span>
                )}
              </div>
              <button
                className="button secondary full"
                onClick={() => {
                  setSelected(a);
                  setError("");
                }}
              >
                {t("workUpdates")}{" "}
                <span className="count">
                  {
                    data.assignment_updates.filter(
                      (u) => u.assignment_id === a.id,
                    ).length
                  }
                </span>
              </button>
            </article>
          );
        })}
      </div>
      {!items.length && (
        <div className="empty">
          <Check size={30} />
          <h3>{t("noTasks")}</h3>
          <p>{t("noTasksSub")}</p>
        </div>
      )}
      {current && (
        <Modal
          title={t("workUpdates")}
          closeLabel={t("close")}
          onClose={() => setSelected(null)}
        >
          <span className={`status ${current.status}`}>
            {t(current.status as TextKey)}
          </span>
          <p>{current.instructions}</p>
          {current.status !== "canceled" &&
            (isAdmin(profile) || current.assignee_id === profile.id) && (
              <label>
                <span>{t("progress")}</span>
                <select
                  disabled={busy}
                  value={current.status}
                  onChange={(e) => progress(current, e.target.value)}
                >
                  {[
                    "assigned",
                    "in_progress",
                    "completed",
                    ...(isAdmin(profile) ? ["canceled"] : []),
                  ].map((s) => (
                    <option key={s} value={s}>
                      {t(s as TextKey)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          <div className="timeline">
            {data.assignment_updates
              .filter((u) => u.assignment_id === current.id)
              .map((u) => (
                <div key={u.id}>
                  <span className="timeline-dot" />
                  <strong>
                    {data.profiles.find((p) => p.id === u.author_id)?.name ??
                      t("admin")}
                  </strong>
                  <p>{u.note}</p>
                  <small className="muted">
                    {new Date(u.created_at).toLocaleString("en-GB")}
                  </small>
                </div>
              ))}
          </div>
          {!data.assignment_updates.some(
            (u) => u.assignment_id === current.id,
          ) && <p className="muted">{t("noUpdates")}</p>}
          {current.status !== "canceled" &&
            (isAdmin(profile) || current.assignee_id === profile.id) && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget,
                    note = String(new FormData(form).get("note")).trim();
                  if (!note) return;
                  setBusy(true);
                  setError("");
                  try {
                    await onUpdate(current.id, note);
                    form.reset();
                  } catch (error) {
                    setError(t(mutationErrorKey(error)));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  <span>{t("addUpdate")}</span>
                  <textarea
                    name="note"
                    required
                    maxLength={5000}
                    placeholder={t("updatePlaceholder")}
                  />
                </label>
                <button className="button primary" disabled={busy}>
                  {t(busy ? "saving" : "addUpdate")}
                </button>
              </form>
            )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
