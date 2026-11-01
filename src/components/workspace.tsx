"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Building2,
  LayoutDashboard,
  House,
  ClipboardList,
  Network,
  UsersRound,
  Settings2,
  UserRound,
  Search,
  Plus,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Moon,
  Sun,
  Languages,
  Menu,
  X,
  LogOut,
  ChevronDown,
  SlidersHorizontal,
  LayoutGrid,
  List,
  MapPin,
  BedDouble,
  Scan,
  CheckCheck,
  Clock3,
  BriefcaseBusiness,
  Sparkles,
  ArrowDownToLine,
  RotateCcw,
  Check,
  AlertCircle,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  WorkspaceData,
  Profile,
  Locale,
  Property,
  ClientRequest,
  PartnerOffice,
  RecordTable,
} from "@/lib/domain";
import { canSeeRecord, isAdmin } from "@/lib/domain";
import { dictionary, type TextKey } from "@/lib/i18n";
import { demoProfiles, initialDemo } from "@/lib/demo";
import { isConfigured, getBrowserClient } from "@/lib/supabase/client";
import {
  readDemo,
  storeDemo,
  loadWorkspace,
  persist,
  deleteRecord,
  DEMO_KEY,
} from "@/lib/repository";
import { ContactActions } from "./contact-actions";
import { useFavorites } from "@/lib/use-favorites";
import { FavoriteButton } from "./favorite-button";
import { Notebook } from "./notebook";
import { BrandLogo } from "./brand-logo";
import { deleteDemoRecord, type DeletableTable } from "@/lib/delete-record";
import { mutationErrorKey } from "@/lib/mutation-errors";
import { Modal } from "./modal";
import { RecordForm } from "./record-form";
import { RecordDetail } from "./record-detail";
import { AuthPanel } from "./auth-panel";
import { AssignmentForm, AssignmentPanel } from "./assignment-panel";
import { TeamPanel, SettingsPanel } from "./settings-panel";
type Page =
  "dashboard" | RecordTable | "assignments" | "team" | "profile" | "settings";
type Selection = { table: RecordTable; id: string };
type FormState = { table: RecordTable; id?: string };
const navItems: { id: Page; icon: LucideIcon }[] = [
  { id: "properties", icon: House },
  { id: "client_requests", icon: ClipboardList },
  { id: "assignments", icon: BriefcaseBusiness },
  { id: "partner_offices", icon: Network },
];
export default function Workspace({
  passwordSetup = false,
}: {
  passwordSetup?: boolean;
}) {
  const [narrow, setNarrow] = useState(false);
  const closeMenuRef = useRef<HTMLButtonElement>(null),
    menuRef = useRef<HTMLButtonElement>(null),
    wasOpen = useRef(false);
  const [locale, setLocale] = useState<Locale>("ckb"),
    [theme, setTheme] = useState<"light" | "dark">("light");
  const [data, setData] = useState<WorkspaceData | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [loading, setLoading] = useState(true),
    [loggedOut, setLoggedOut] = useState(false),
    [loadError, setLoadError] = useState("");
  const [page, setPage] = useState<Page>("properties"),
    [mobile, setMobile] = useState(false);
  const [detail, setDetail] = useState<Selection | null>(null),
    [form, setForm] = useState<FormState | null>(null),
    [assignment, setAssignment] = useState<
      { type: "properties" | "client_requests"; id: string } | true | null
    >(null),
    [toast, setToast] = useState("");
  const dict = useMemo(() => dictionary(locale), [locale]);
  const [pendingDelete, setPendingDelete] = useState<{
    table: DeletableTable;
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false),
    [deleteError, setDeleteError] = useState("");
  const t = useCallback((key: TextKey): string => dict[key] ?? key, [dict]);
  const demo = !isConfigured;
  const favorites = useFavorites(profile?.id, demo);
  const favorite = (table: string, id: string) => (
    <FavoriteButton
      active={favorites.has(table, id)}
      busy={favorites.busy}
      label={t(favorites.has(table, id) ? "removeFavorite" : "addFavorite")}
      onClick={() => void favorites.toggle(table, id)}
    />
  );
  const refresh = useCallback(
    async (preferences = false, allowSignedOut = false) => {
      const result = await loadWorkspace({ allowSignedOut });
      if (!result) {
        setData(null);
        setProfile(null);
        setLoadError("");
        return;
      }
      setData(result.data);
      setProfile(result.profile);
      if (preferences) {
        setLocale(result.profile.locale);
        setTheme(result.profile.theme);
      }
    },
    [],
  );
  useEffect(() => {
    const savedLocale = localStorage.getItem("hm-locale");
    if (savedLocale === "ckb" || savedLocale === "en") setLocale(savedLocale);
    const savedTheme = localStorage.getItem("hm-theme");
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
    if (demo) {
      const d = readDemo();
      setData(d);
      setProfile(d.profiles[0]);
      setLoading(false);
    } else {
      refresh(true, true)
        .catch((e) =>
          setLoadError(
            e instanceof Error &&
              ["sessionError", "inactive"].includes(e.message)
              ? e.message
              : "genericError",
          ),
        )
        .finally(() => setLoading(false));
    }
    const client = getBrowserClient();
    const sub = client?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setData(null);
        setProfile(null);
        setLoggedOut(true);
      }
    });
    return () => sub?.data.subscription.unsubscribe();
  }, [demo, refresh]);
  useEffect(() => {
    const media = window.matchMedia("(max-width:760px)");
    const change = () => setNarrow(media.matches);
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (mobile && narrow) {
      closeMenuRef.current?.focus();
      wasOpen.current = true;
      document.body.style.overflow = "hidden";
    } else if (wasOpen.current) {
      menuRef.current?.focus();
      wasOpen.current = false;
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobile, narrow]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ckb" ? "rtl" : "ltr";
    localStorage.setItem("hm-locale", locale);
  }, [locale]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("hm-theme", theme);
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (demo || !profile) return;
    const timer = setInterval(() => {
      refresh().catch(() => {
        setData(null);
        setProfile(null);
        setLoadError("sessionError");
      });
    }, 60000);
    return () => clearInterval(timer);
  }, [demo, profile?.id, refresh]);
  function navigate(next: Page) {
    setPage(next === "dashboard" ? "properties" : next);
    setMobile(false);
    setDetail(null);
  }
  async function login() {
    await refresh(true);
    setLoadError("");
    setLoggedOut(false);
  }
  function updateDemo(next: WorkspaceData) {
    storeDemo(next);
    setData(next);
    if (profile)
      setProfile(next.profiles.find((p) => p.id === profile.id) ?? null);
  }
  async function save(
    table: string,
    values: Record<string, unknown>,
    id?: string | number,
  ) {
    if (!data || !profile) throw new Error("sessionError");
    if (demo) {
      const next = structuredClone(data);
      if (table === "office_settings")
        Object.assign(next.office_settings, values);
      else {
        const key = table as Exclude<keyof WorkspaceData, "office_settings">;
        const rows = next[key] as unknown as Record<string, unknown>[];
        if (id) {
          const index = rows.findIndex((r) => r.id === id);
          if (index < 0) throw new Error("genericError");
          rows[index] = { ...rows[index], ...values };
        } else
          rows.unshift({
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            ...(table === "properties"
              ? {
                  ref: `HM-${String(data.properties.length + 1).padStart(5, "0")}`,
                  address: "",
                  neighborhood: "",
                  description: "",
                  area: null,
                  bedrooms: null,
                }
              : table === "client_requests"
                ? {
                    ref: `RQ-${String(data.client_requests.length + 1).padStart(5, "0")}`,
                    neighborhood: "",
                    notes: "",
                    property_id: null,
                  }
                : {}),
            ...values,
          });
      }
      updateDemo(next);
    } else {
      await persist(table, values, id);
      await refresh();
    }
    setToast(t("saved"));
  }
  function requestDelete(table: DeletableTable, id: string, name: string) {
    if (!profile || !isAdmin(profile) || !profile.can_write) return;
    setDeleteError("");
    setPendingDelete({ table, id, name });
  }
  async function confirmDelete() {
    if (
      !pendingDelete ||
      !data ||
      !profile ||
      !isAdmin(profile) ||
      !profile.can_write
    )
      return;
    setDeleting(true);
    setDeleteError("");
    try {
      if (demo)
        updateDemo(
          deleteDemoRecord(data, pendingDelete.table, pendingDelete.id),
        );
      else {
        await deleteRecord(pendingDelete.table, pendingDelete.id);
        await refresh();
      }
      setDetail(null);
      setPendingDelete(null);
      setToast(t("deleted"));
    } catch (error) {
      setDeleteError(t(mutationErrorKey(error)));
    } finally {
      setDeleting(false);
    }
  }
  if (loading)
    return (
      <div className="loading-page">
        <BrandLogo />
        <span className="loading-bar" />
        <p>Hawall mulk</p>
      </div>
    );
  if (passwordSetup || loggedOut || !profile || !data)
    return (
      <>
        {loadError && (
          <div role="alert" className="auth-error">
            {t(loadError as TextKey)}
            {loadError === "genericError" && (
              <button
                className="text-button"
                onClick={() => window.location.reload()}
              >
                {t("retry")}
              </button>
            )}
          </div>
        )}
        <AuthPanel
          t={t}
          dark={theme === "dark"}
          onLogin={login}
          onLocale={() => setLocale(locale === "ckb" ? "en" : "ckb")}
          onTheme={() => setTheme(theme === "light" ? "dark" : "light")}
          passwordSetup={passwordSetup}
          onDemo={
            demo
              ? () => {
                  const d = readDemo();
                  setData(d);
                  setProfile(d.profiles[0]);
                  setLoggedOut(false);
                }
              : undefined
          }
        />
      </>
    );
  const visibleProperties = data.properties.filter((p) =>
    canSeeRecord(profile, p, data.assignments),
  );
  const visibleRequests = data.client_requests.filter((r) =>
    canSeeRecord(profile, r, data.assignments),
  );
  const demoSources = demo
    ? [...visibleProperties, ...visibleRequests].map((r) => {
        const office = data.partner_offices.find(
          (o) => o.id === r.source_office_id,
        );
        return {
          record_id: r.id,
          record_type: "title" in r ? "properties" : "client_requests",
          contributor_name:
            data.profiles.find((p) => p.id === r.source_contributor_id)?.name ??
            null,
          office_name: office?.name ?? null,
          office_address: office?.address ?? null,
          office_contact: office?.contact_name ?? null,
          office_phone: office?.phone ?? null,
          office_phone_secondary: office?.phone_secondary ?? null,
        };
      })
    : data.record_sources;
  const scoped: WorkspaceData = {
    ...data,
    properties: visibleProperties,
    client_requests: visibleRequests,
    partner_offices: profile.role === "freelancer" ? [] : data.partner_offices,
    record_sources: demoSources,
  };
  const myAssignments = data.assignments.filter(
    (a) =>
      a.status !== "completed" &&
      a.status !== "canceled" &&
      (profile.role !== "freelancer" || a.assignee_id === profile.id),
  );
  const record = detail
    ? (
        scoped[detail.table] as (Property | ClientRequest | PartnerOffice)[]
      ).find((r) => r.id === detail.id)
    : null;
  const editing = form?.id
    ? (scoped[form.table] as (Property | ClientRequest | PartnerOffice)[]).find(
        (r) => r.id === form.id,
      )
    : undefined;
  const open = (table: RecordTable, id: string) => setDetail({ table, id });
  return (
    <div className="app-shell notebook-shell">
      {favorites.error && (
        <div className="toast" role="alert">
          {t("favoriteError")}
          <button onClick={() => window.location.reload()}>{t("retry")}</button>
        </div>
      )}
      {mobile && (
        <button
          className="mobile-scrim"
          aria-label={t("close")}
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        inert={narrow && !mobile}
        aria-hidden={narrow && !mobile}
        onKeyDown={(e) => {
          if (e.key === "Escape") setMobile(false);
        }}
        className={`sidebar ${mobile ? "is-open" : ""}`}
      >
        <div className="brand">
          <a
            className="brand-link"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("dashboard");
            }}
          >
            <BrandLogo />
            <span dir="ltr">
              Hawall<span className="brand-light"> mulk</span>
            </span>
          </a>
          <button
            ref={closeMenuRef}
            className="icon-button mobile-close"
            aria-label={t("close")}
            onClick={(e) => {
              e.preventDefault();
              setMobile(false);
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="office-chip">
          <span className="office-icon">
            <img src="/brand/logo-mark.png" width={28} height={28} alt="" />
          </span>
          <div>
            <strong>{data.office_settings.name}</strong>
            <small>{data.office_settings.address || t("workspace")}</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <span className="nav-caption">{t("workspace")}</span>
        <nav aria-label={t("workspace")}>
          {navItems
            .filter(
              (n) =>
                n.id !== "partner_offices" || profile.role !== "freelancer",
            )
            .map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={`nav-item ${page === id ? "active" : ""}`}
                aria-current={page === id ? "page" : undefined}
              >
                <Icon size={19} />
                <span>{t(id)}</span>
                {id === "assignments" && myAssignments.length > 0 && (
                  <span className="nav-count">{myAssignments.length}</span>
                )}
              </button>
            ))}
        </nav>
        <span className="nav-caption management-caption">
          {t("management")}
        </span>
        <nav aria-label={t("management")}>
          {isAdmin(profile) && (
            <button
              className={`nav-item ${page === "team" ? "active" : ""}`}
              onClick={() => navigate("team")}
            >
              <UsersRound size={19} />
              <span>{t("team")}</span>
            </button>
          )}
          <button
            className={`nav-item ${page === "profile" ? "active" : ""}`}
            onClick={() => navigate("profile")}
          >
            <UserRound size={19} />
            <span>{t("profile")}</span>
          </button>
          {isAdmin(profile) && (
            <button
              className={`nav-item ${page === "settings" ? "active" : ""}`}
              onClick={() => navigate("settings")}
            >
              <Settings2 size={19} />
              <span>{t("settings")}</span>
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="tiny-dot green" />
            <span>{t(demo ? "localOnly" : "connected")}</span>
            <Building2 size={14} />
          </div>
          <button className="profile-chip" onClick={() => navigate("profile")}>
            <span className="avatar">{profile.name.slice(0, 1)}</span>
            <span>
              <strong>{profile.name}</strong>
              <small>{t(profile.role)}</small>
            </span>
            {locale === "ckb" ? (
              <ArrowLeft size={16} />
            ) : (
              <ArrowRight size={16} />
            )}
          </button>
          <button
            className="logout-button"
            onClick={async () => {
              if (demo) setLoggedOut(true);
              else {
                await getBrowserClient()?.auth.signOut();
                setProfile(null);
                setData(null);
              }
            }}
          >
            <LogOut size={16} />
            {t("logout")}
          </button>
        </div>
      </aside>
      <div className="main-area" inert={narrow && mobile}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              ref={menuRef}
              className="icon-button mobile-menu"
              onClick={() => setMobile(true)}
              aria-label={t("workspace")}
            >
              <Menu size={20} />
            </button>
            <span className="muted">Hawall mulk</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{t(page)}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="language-button"
              onClick={() => setLocale(locale === "ckb" ? "en" : "ckb")}
              title={t("language")}
            >
              <Languages size={17} />
              <span>{locale === "ckb" ? "EN" : "کوردی"}</span>
            </button>
            <button
              className="icon-button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label={t("theme")}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <span className="topbar-divider" />
            <span className="avatar topbar-avatar">
              {profile.name.slice(0, 1)}
            </span>
          </div>
        </header>
        {demo && (
          <div className="demo-bar">
            <span>
              <span className="tiny-dot" />
              {t("demo")}
              <span className="demo-description"> · {t("demoNotice")}</span>
            </span>
            <div className="demo-controls">
              <label>
                {t("demoRole")}
                <select
                  aria-label={t("demoRole")}
                  value={profile.id}
                  onChange={(e) => {
                    const selected = data.profiles.find(
                      (p) => p.id === e.target.value,
                    );
                    if (selected) {
                      setProfile(selected);
                      navigate("dashboard");
                    }
                  }}
                >
                  {data.profiles
                    .filter((p) => p.active)
                    .map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name} · {t(p.role)}
                      </option>
                    ))}
                </select>
              </label>
              <button
                className="icon-button"
                title={t("resetDemo")}
                aria-label={t("resetDemo")}
                onClick={() => {
                  if (confirm(t("resetConfirm"))) {
                    localStorage.removeItem(DEMO_KEY);
                    const next = initialDemo();
                    updateDemo(next);
                    setProfile(next.profiles[0]);
                    navigate("dashboard");
                  }
                }}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        )}
        <main className="page-content" id="main">
          {[
            "dashboard",
            "properties",
            "client_requests",
            "partner_offices",
          ].includes(page) && (
            <Notebook
              key={page}
              compact={narrow}
              data={scoped}
              profile={profile}
              table={
                page === "dashboard" ? "properties" : (page as RecordTable)
              }
              t={t}
              onSave={save}
              onOpen={open}
              favorite={favorite}
              isFavorite={favorites.has}
            />
          )}
          {page === "assignments" && (
            <AssignmentPanel
              favorites={favorites}
              data={scoped}
              profile={profile}
              t={t}
              onAdd={() => setAssignment(true)}
              onDelete={(id, name) => requestDelete("assignments", id, name)}
              onOpen={open}
              onProgress={(id, status) => save("assignments", { status }, id)}
              onUpdate={(id, note) =>
                save("assignment_updates", {
                  assignment_id: id,
                  author_id: profile.id,
                  note,
                })
              }
            />
          )}
          {page === "team" && (
            <TeamPanel
              data={data}
              profile={profile}
              t={t}
              onMember={(id, v) => save("profiles", v, id)}
              onInvite={async (values) => {
                if (demo) {
                  await save("profiles", {
                    ...demoProfiles[2],
                    ...values,
                    id: crypto.randomUUID(),
                    active: true,
                  });
                  setToast(t("demoInvite"));
                } else {
                  const response = await fetch("/api/team", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                  });
                  if (!response.ok) throw new Error("genericError");
                  await refresh();
                  setToast(t("inviteSent"));
                }
              }}
            />
          )}
          {(page === "profile" || page === "settings") && (
            <SettingsPanel
              key={page}
              page={page}
              data={data}
              profile={profile}
              t={t}
              locale={locale}
              theme={theme}
              onLocale={setLocale}
              onTheme={setTheme}
              onSave={(table, id, values) => save(table, values, id)}
              onPassword={() => {
                if (demo) setToast(t("demoNotice"));
                else window.location.assign("/auth/update-password");
              }}
            />
          )}
          <footer className="page-footer">
            <span dir="ltr">Hawall mulk</span>
            <span>{t(demo ? "demoWarning" : "workspace")}</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button
            className="icon-button"
            onClick={() => setToast("")}
            aria-label={t("close")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {form && (
        <Modal
          title={t(
            form.id
              ? "edit"
              : form.table === "properties"
                ? "addProperty"
                : form.table === "client_requests"
                  ? "addRequest"
                  : "addOffice",
          )}
          closeLabel={t("close")}
          onClose={() => setForm(null)}
        >
          <RecordForm
            table={form.table}
            initial={editing as unknown as Record<string, unknown> | undefined}
            data={scoped}
            profile={profile}
            t={t}
            onClose={() => setForm(null)}
            onSave={async (v) => {
              await save(form.table, v, form.id);
              setForm(null);
            }}
          />
        </Modal>
      )}
      {detail && record && !form && !assignment && (
        <RecordDetail
          key={record.id}
          table={detail.table}
          record={record}
          data={scoped}
          profile={profile}
          t={t}
          demo={demo}
          onClose={() => setDetail(null)}
          onEdit={() => setForm(detail)}
          onAssign={() =>
            setAssignment({
              type: detail.table as "properties" | "client_requests",
              id: record.id,
            })
          }
          onArchive={() =>
            save(detail.table, { status: "archived" }, record.id)
          }
          onDelete={() =>
            requestDelete(
              detail.table,
              record.id,
              "title" in record
                ? record.title
                : "client_name" in record
                  ? record.client_name
                  : record.name,
            )
          }
          onRefresh={refresh}
          onOpen={(id) => setDetail({ table: "properties", id })}
        />
      )}
      {assignment && (
        <Modal
          title={t("addAssignment")}
          closeLabel={t("close")}
          onClose={() => setAssignment(null)}
        >
          <AssignmentForm
            data={scoped}
            t={t}
            target={assignment === true ? undefined : assignment}
            onClose={() => setAssignment(null)}
            onSave={async (v) => {
              await save("assignments", { ...v, assigned_by: profile.id });
              setAssignment(null);
            }}
          />
        </Modal>
      )}
      {pendingDelete && (
        <Modal
          title={t("deleteRecord")}
          closeLabel={t("close")}
          onClose={() => {
            if (!deleting) setPendingDelete(null);
          }}
        >
          <h3>{pendingDelete.name}</h3>
          <p>{t("deleteConfirm")}</p>
          {deleteError && (
            <p className="form-error" role="alert">
              {deleteError}
            </p>
          )}
          <div className="form-actions">
            <button
              className="button secondary"
              disabled={deleting}
              onClick={() => setPendingDelete(null)}
            >
              {t("cancel")}
            </button>
            <button
              className="button secondary danger"
              disabled={deleting}
              onClick={confirmDelete}
            >
              <Trash2 size={17} />
              {t(deleting ? "saving" : "deleteRecord")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
