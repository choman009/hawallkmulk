"use client";
import { useState, type FormEvent } from "react";
import {
  UserPlus,
  ShieldCheck,
  UserRound,
  Building2,
  Save,
} from "lucide-react";
import type { Profile, WorkspaceData, Locale } from "@/lib/domain";
import { isAdmin } from "@/lib/domain";
import type { TextKey } from "@/lib/i18n";
import { Modal } from "./modal";
import { ContactActions } from "./contact-actions";
import { normalizePhone } from "@/lib/phone";
export function TeamPanel({
  data,
  profile,
  t,
  onInvite,
  onMember,
}: {
  data: WorkspaceData;
  profile: Profile;
  t: (k: TextKey) => string;
  onInvite: (v: {
    name: string;
    email: string;
    role: string;
    phone: string;
  }) => Promise<void>;
  onMember: (id: string, v: Record<string, unknown>) => Promise<void>;
}) {
  const [invite, setInvite] = useState(false),
    [member, setMember] = useState<Profile | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!isAdmin(profile)) return <p>{t("noAccess")}</p>;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const rawPhone = String(fd.get("phone") ?? "").trim();
    const phone = rawPhone ? normalizePhone(rawPhone) : "";
    if (phone === null) {
      setError(t("validationError"));
      setBusy(false);
      return;
    }
    try {
      if (member)
        await onMember(member.id, {
          name: String(fd.get("name")).trim(),
          phone,
          role: fd.get("role"),
          active: fd.has("active"),
          can_write: fd.has("can_write"),
        });
      else
        await onInvite({
          name: String(fd.get("name")),
          email: String(fd.get("email")),
          role: String(fd.get("role")),
          phone,
        });
      setMember(null);
      setInvite(false);
    } catch {
      setError(t("genericError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="list-toolbar">
        <p className="muted">{t("teamNote")}</p>
        <button
          className="button primary"
          onClick={() => {
            setInvite(true);
            setError("");
          }}
        >
          <UserPlus size={17} />
          {t("addMember")}
        </button>
      </div>
      <div className="team-grid">
        {data.profiles.map((p) => (
          <article className="panel member-card" key={p.id}>
            <div className="card-top">
              <span className="avatar large-avatar">{p.name.slice(0, 1)}</span>
              <span
                className={`status ${p.active ? "available" : "withdrawn"}`}
              >
                {p.active ? t("active") : t("inactiveAccount")}
              </span>
            </div>
            <h3>{p.name}</h3>
            <span className="role-label">
              <ShieldCheck size={14} />
              {t(p.role)}
            </span>
            <p className="muted">
              {t(p.role === "freelancer" ? "freelancerScope" : "fullScope")}
            </p>
            <div className="member-permission">
              <span className={`tiny-dot ${p.can_write ? "green" : ""}`} />
              {t(p.can_write ? "writeAccess" : "readOnly")}
            </div>
            {p.phone && <ContactActions phone={p.phone} t={t} />}
            <button
              className="button secondary full"
              disabled={
                p.role === "owner" ||
                (profile.role === "admin" && p.role === "admin")
              }
              onClick={() => {
                setMember(p);
                setError("");
              }}
            >
              {t("edit")}
            </button>
          </article>
        ))}
      </div>
      {(invite || member) && (
        <Modal
          title={t(member ? "team" : "addMember")}
          closeLabel={t("close")}
          onClose={() => {
            setInvite(false);
            setMember(null);
          }}
        >
          <form onSubmit={submit}>
            {!member && (
              <>
                <p className="muted">{t("inviteHint")}</p>
                <label>
                  <span>{t("email")}</span>
                  <input name="email" type="email" required dir="ltr" />
                </label>
              </>
            )}
            <label>
              <span>{t("name")}</span>
              <input
                name="name"
                required
                maxLength={120}
                defaultValue={member?.name ?? ""}
              />
            </label>
            <label>
              <span>{t("phone")}</span>
              <input
                name="phone"
                type="tel"
                dir="ltr"
                placeholder={t("phoneHint")}
                defaultValue={member?.phone ?? ""}
              />
            </label>
            <label>
              <span>{t("role")}</span>
              <select name="role" defaultValue={member?.role ?? "freelancer"}>
                {[
                  "freelancer",
                  "staff",
                  ...(profile.role === "owner" ? ["admin"] : []),
                ].map((r) => (
                  <option key={r} value={r}>
                    {t(r as TextKey)}
                  </option>
                ))}
              </select>
            </label>
            {member && (
              <>
                <label className="check-label">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={member.active}
                  />
                  <span>{t("active")}</span>
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    name="can_write"
                    defaultChecked={member.can_write}
                  />
                  <span>{t("can_write")}</span>
                </label>
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button className="button primary" disabled={busy}>
                {t(busy ? "saving" : member ? "save" : "addMember")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
export function SettingsPanel({
  page,
  data,
  profile,
  t,
  locale,
  theme,
  onLocale,
  onTheme,
  onSave,
  onPassword,
}: {
  page: "profile" | "settings";
  data: WorkspaceData;
  profile: Profile;
  t: (k: TextKey) => string;
  locale: Locale;
  theme: "light" | "dark";
  onLocale: (l: Locale) => void;
  onTheme: (v: "light" | "dark") => void;
  onSave: (
    table: "profiles" | "office_settings",
    id: string | number,
    values: Record<string, unknown>,
  ) => Promise<void>;
  onPassword: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const isProfile = page === "profile";
  if (!isProfile && !isAdmin(profile)) return <p>{t("noAccess")}</p>;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const raw = String(fd.get("phone") ?? "").trim();
    const phone = raw ? normalizePhone(raw) : "";
    if (raw && !phone) {
      setError(t("validationError"));
      setBusy(false);
      return;
    }
    try {
      await onSave(
        isProfile ? "profiles" : "office_settings",
        isProfile ? profile.id : 1,
        {
          name: fd.get("name"),
          phone,
          ...(isProfile ? { locale, theme } : { address: fd.get("address") }),
        },
      );
    } catch {
      setError(t("genericError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-grid">
      <section className="panel settings-card">
        <div className="section-heading">
          <span className="section-icon">
            {isProfile ? <UserRound size={20} /> : <Building2 size={20} />}
          </span>
          <div>
            <h2>{t(page)}</h2>
            <p>{t(isProfile ? "profileSub" : "officeSettingsSub")}</p>
          </div>
        </div>
        <form onSubmit={submit} key={page}>
          <label>
            <span>{t(isProfile ? "name" : "officeName")}</span>
            <input
              required
              name="name"
              maxLength={120}
              defaultValue={
                isProfile ? profile.name : data.office_settings.name
              }
            />
          </label>
          <label>
            <span>{t(isProfile ? "phone" : "officePhone")}</span>
            <input
              type="tel"
              name="phone"
              dir="ltr"
              placeholder={t("phoneHint")}
              defaultValue={
                isProfile ? profile.phone : data.office_settings.phone
              }
            />
          </label>
          {!isProfile && (
            <label>
              <span>{t("officeAddress")}</span>
              <textarea
                name="address"
                defaultValue={data.office_settings.address}
              />
            </label>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button className="button primary" disabled={busy}>
              <Save size={16} />
              {t(busy ? "saving" : "save")}
            </button>
          </div>
        </form>
      </section>
      <div>
        <section className="panel settings-card">
          <h2>{t("preferences")}</h2>
          <label>
            <span>{t("language")}</span>
            <select
              value={locale}
              onChange={(e) => onLocale(e.target.value as Locale)}
            >
              <option value="ckb">کوردی سۆرانی</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>
            <span>{t("theme")}</span>
            <select
              value={theme}
              onChange={(e) => onTheme(e.target.value as "light" | "dark")}
            >
              <option value="light">{t("light")}</option>
              <option value="dark">{t("dark")}</option>
            </select>
          </label>
        </section>
        {isProfile && (
          <section className="panel settings-card">
            <h2>{t("password")}</h2>
            <button className="button secondary" onClick={onPassword}>
              {t("changePassword")}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
