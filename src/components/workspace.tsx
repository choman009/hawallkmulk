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
  { id: "dashboard", icon: LayoutDashboard },
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
  const [page, setPage] = useState<Page>("dashboard"),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [type, setType] = useState("all"),
    [purpose, setPurpose] = useState("all"),
    [view, setView] = useState<"grid" | "table">("table"),
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
  const [onlyFavorites, setOnlyFavorites] = useState(false);
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
    setOnlyFavorites(false);
    setPage(next);
    setView("table");
    setQuery("");
    setStatus("all");
    setType("all");
    setPurpose("all");
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
  const properties = visibleProperties
    .filter((p) => !onlyFavorites || favorites.has("properties", p.id))
    .sort(
      (a, b) =>
        Number(favorites.has("properties", b.id)) -
        Number(favorites.has("properties", a.id)),
    )
    .filter((p) =>
      status === "all" ? p.status !== "archived" : p.status === status,
    )
    .filter((p) => type === "all" || p.type === type)
    .filter((p) => purpose === "all" || p.purpose === purpose)
    .filter((p) =>
      [
        p.title,
        p.ref,
        p.city,
        p.neighborhood,
        p.contact_name,
        p.phone,
        p.phone_secondary ?? "",
      ].some((v) => v.toLocaleLowerCase().includes(query.toLocaleLowerCase())),
    );
  const requests = visibleRequests
    .filter((r) => !onlyFavorites || favorites.has("client_requests", r.id))
    .sort(
      (a, b) =>
        Number(favorites.has("client_requests", b.id)) -
        Number(favorites.has("client_requests", a.id)),
    )
    .filter((r) =>
      status === "all" ? r.status !== "archived" : r.status === status,
    )
    .filter((r) => type === "all" || r.type === type)
    .filter((r) => purpose === "all" || r.kind === purpose)
    .filter((r) =>
      [r.client_name, r.ref, r.city, r.neighborhood, r.phone].some((v) =>
        v.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      ),
    );
  const offices = scoped.partner_offices
    .filter((o) => !onlyFavorites || favorites.has("partner_offices", o.id))
    .sort(
      (a, b) =>
        Number(favorites.has("partner_offices", b.id)) -
        Number(favorites.has("partner_offices", a.id)),
    )
    .filter((o) =>
      [
        o.name,
        o.contact_name,
        o.address,
        o.phone,
        o.phone_secondary ?? "",
      ].some((v) => v.toLocaleLowerCase().includes(query.toLocaleLowerCase())),
    );
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
  const canCreate = profile.can_write && profile.active;
  const activeCount = visibleProperties.filter(
    (p) => p.status === "available",
  ).length;
  const subtitle: Partial<Record<Page, TextKey>> = {
    dashboard: "overviewSub",
    properties: "propertySub",
    client_requests: "requestsSub",
    assignments: "assignmentsSub",
    partner_offices: "officesSub",
    team: "teamSub",
    profile: "profileSub",
    settings: "officeSettingsSub",
  };
  const amount = (n: number | null, currency: string) =>
    n == null
      ? t("priceOnRequest")
      : `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)} ${currency}`;
  const open = (table: RecordTable, id: string) => setDetail({ table, id });
  const filterControls = (
    <div className="filters">
      <label className="filter-select">
        <SlidersHorizontal size={15} />
        <span className="sr-only">{t("type")}</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label={t("type")}
        >
          <option value="all">
            {t("all")} · {t("type")}
          </option>
          {["house", "apartment", "land", "commercial", "other"].map((k) => (
            <option key={k} value={k}>
              {t(k as TextKey)}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-select">
        <span className="sr-only">{t("purpose")}</span>
        <select
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          aria-label={t("purpose")}
        >
          <option value="all">
            {t("all")} · {t("purpose")}
          </option>
          {(page === "properties"
            ? ["sale", "rent"]
            : ["buy", "rent", "sell"]
          ).map((k) => (
            <option key={k} value={k}>
              {t(k as TextKey)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
  function PropertyTable({ items }: { items: Property[] }) {
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("property")}</th>
              <th>{t("type")}</th>
              <th>{t("price")}</th>
              <th>{t("area")}</th>
              <th>{t("status")}</th>
              <th>{t("contact")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="property-cell">
                    <span className={`property-thumb ${p.type}`}>
                      <Building2 size={26} strokeWidth={1.4} />
                    </span>
                    <div>
                      <button
                        className="row-title"
                        onClick={() => open("properties", p.id)}
                      >
                        {p.title}
                      </button>
                      {favorite("properties", p.id)}
                      <small>
                        <MapPin size={12} />
                        {p.city} · {p.neighborhood}
                        <bdi className="reference">{p.ref}</bdi>
                      </small>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="type-label">{t(p.type as TextKey)}</span>
                </td>
                <td>
                  <strong className="amount" dir="ltr">
                    {amount(p.price, p.currency)}
                  </strong>
                  <small>{t(p.purpose as TextKey)}</small>
                </td>
                <td>
                  <bdi>{p.area ?? "—"} m²</bdi>
                </td>
                <td>
                  <span className={`status ${p.status}`}>
                    {t(p.status as TextKey)}
                  </span>
                </td>
                <td>
                  <ContactActions
                    phone={p.phone}
                    secondaryPhone={p.phone_secondary}
                    t={t}
                    compact
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  const empty = (
    <div className="empty">
      <Search size={28} />
      <h3>{t("noResults")}</h3>
      <p>{t("noResultsSub")}</p>
      {(query || status !== "all" || type !== "all" || purpose !== "all") && (
        <button
          className="button secondary"
          onClick={() => {
            setQuery("");
            setStatus("all");
            setType("all");
            setPurpose("all");
          }}
        >
          {t("clearFilters")}
        </button>
      )}
    </div>
  );
  return (
    <div className="app-shell">
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
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "dashboard"
                  ? `${t("greeting")}، ${profile.name.split(" ")[0]}`
                  : t("workspace")}
              </div>
              <h1>{page === "dashboard" ? t("welcome") : t(page)}</h1>
              <p>{t(subtitle[page] ?? "overviewSub")}</p>
            </div>
            <div className="heading-actions">
              {page === "dashboard" ? (
                <>
                  <span className="date-label">
                    <span className="tiny-dot green" />
                    {new Intl.DateTimeFormat("en-GB", {
                      dateStyle: "medium",
                      timeZone: "Asia/Baghdad",
                    }).format(new Date())}
                  </span>
                  {canCreate && (
                    <button
                      className="button primary"
                      onClick={() => setForm({ table: "properties" })}
                    >
                      <Plus size={18} />
                      {t("addProperty")}
                    </button>
                  )}
                </>
              ) : ["properties", "client_requests", "partner_offices"].includes(
                  page,
                ) &&
                canCreate &&
                (page !== "partner_offices" ||
                  profile.role !== "freelancer") ? (
                <button
                  className="button primary"
                  onClick={() => setForm({ table: page as RecordTable })}
                >
                  <Plus size={18} />
                  {t(
                    page === "properties"
                      ? "addProperty"
                      : page === "client_requests"
                        ? "addRequest"
                        : "addOffice",
                  )}
                </button>
              ) : null}
            </div>
          </div>
          {page === "dashboard" && (
            <>
              {canCreate && (
                <div className="quick-actions">
                  <button
                    className="button secondary"
                    onClick={() => setForm({ table: "client_requests" })}
                  >
                    <ClipboardList size={18} />
                    {t("addRequest")}
                    <Plus size={15} />
                  </button>
                  {profile.role !== "freelancer" && (
                    <button
                      className="button secondary"
                      onClick={() => setForm({ table: "partner_offices" })}
                    >
                      <Network size={18} />
                      {t("addOffice")}
                      <Plus size={15} />
                    </button>
                  )}
                  {isAdmin(profile) && (
                    <button
                      className="button secondary"
                      onClick={() => setAssignment(true)}
                    >
                      <BriefcaseBusiness size={18} />
                      {t("addAssignment")}
                      <Plus size={15} />
                    </button>
                  )}
                </div>
              )}
              <section className="stats-grid" aria-label={t("dashboard")}>
                {[
                  {
                    label: "activeProperties",
                    value: activeCount,
                    icon: House,
                    color: "lime",
                    sub: `${visibleProperties.length} ${t("recordCount")}`,
                  },
                  {
                    label: "openRequests",
                    value: visibleRequests.filter((r) => r.status === "open")
                      .length,
                    icon: ClipboardList,
                    color: "peach",
                    sub: t("client_requests"),
                  },
                  {
                    label: "activeAssignments",
                    value: myAssignments.length,
                    icon: BriefcaseBusiness,
                    color: "lavender",
                    sub: t("nextSteps"),
                  },
                  {
                    label:
                      profile.role === "freelancer"
                        ? "completedThisMonth"
                        : "partnerCount",
                    value:
                      profile.role === "freelancer"
                        ? data.assignments.filter(
                            (a) =>
                              a.assignee_id === profile.id &&
                              a.status === "completed",
                          ).length
                        : data.partner_offices.length,
                    icon: profile.role === "freelancer" ? CheckCheck : Network,
                    color: "blue",
                    sub:
                      profile.role === "freelancer"
                        ? t("completed")
                        : t("partner_offices"),
                  },
                ].map(({ label, value, icon: Icon, color, sub }) => (
                  <article className={`stat-card ${color}`} key={label}>
                    <div>
                      <span>{t(label as TextKey)}</span>
                      <span className="stat-icon">
                        <Icon size={19} />
                      </span>
                    </div>
                    <strong>{value.toString().padStart(2, "0")}</strong>
                    <small>
                      <span className="tiny-dot" />
                      {sub}
                    </small>
                  </article>
                ))}
              </section>
              <div className="dashboard-grid">
                <section className="panel dashboard-properties">
                  <div className="section-heading">
                    <div>
                      <h2>{t("latestProperties")}</h2>
                      <p>{t("propertySub")}</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => navigate("properties")}
                    >
                      {t("viewAll")}
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                  {visibleProperties.length ? (
                    <PropertyTable
                      items={visibleProperties
                        .filter((p) => p.status !== "archived")
                        .slice(0, 5)}
                    />
                  ) : (
                    empty
                  )}
                </section>
                <section className="panel work-panel">
                  <div className="section-heading">
                    <h2>{t("nextSteps")}</h2>
                    <span className="count">{myAssignments.length}</span>
                  </div>
                  {myAssignments.slice(0, 3).map((a, i) => (
                    <button
                      className="task-row"
                      key={a.id}
                      onClick={() => navigate("assignments")}
                    >
                      <span className={`task-number task-${i}`}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <strong>{t(a.kind as TextKey)}</strong>
                        <small>{a.instructions || t("assignedRecord")}</small>
                        <span className={`status ${a.status}`}>
                          {t(a.status as TextKey)}
                        </span>
                      </span>
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                  {!myAssignments.length && (
                    <div className="empty small-empty">
                      <CheckCheck size={24} />
                      <p>{t("noTasks")}</p>
                    </div>
                  )}
                  <div className="work-note">
                    <Sparkles size={18} />
                    <strong>{t("dashboardTip")}</strong>
                    <p>{t("dashboardTipSub")}</p>
                  </div>
                </section>
                <section className="panel recent-requests">
                  <div className="section-heading">
                    <h2>{t("latestRequests")}</h2>
                    <button
                      className="text-button"
                      onClick={() => navigate("client_requests")}
                    >
                      {t("viewAll")}
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <div className="request-preview-grid">
                    {visibleRequests
                      .filter((r) => r.status === "open")
                      .slice(0, 3)
                      .map((r, i) => (
                        <button
                          className={`request-preview preview-${i}`}
                          key={r.id}
                          onClick={() => open("client_requests", r.id)}
                        >
                          <div>
                            <span className="avatar">
                              {r.client_name.slice(0, 1)}
                            </span>
                            <ArrowUpRight size={18} />
                          </div>
                          <h3>{r.client_name}</h3>
                          <p>
                            {t(r.kind as TextKey)} · {t(r.type as TextKey)} ·{" "}
                            {r.city}
                          </p>
                          <strong dir="ltr">
                            {amount(r.budget_max, r.currency)}
                          </strong>
                          <small>{r.ref}</small>
                        </button>
                      ))}
                  </div>
                  {!visibleRequests.some((r) => r.status === "open") && empty}
                </section>
              </div>
            </>
          )}
          {(page === "properties" ||
            page === "client_requests" ||
            page === "partner_offices") && (
            <section className="panel records-panel">
              <div className="records-toolbar">
                <button
                  className={`button ${onlyFavorites ? "primary" : "secondary"}`}
                  aria-pressed={onlyFavorites}
                  onClick={() => setOnlyFavorites(!onlyFavorites)}
                >
                  {t("favorites")}
                </button>
                <div className="search-input">
                  <Search size={18} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label={t("search")}
                    placeholder={t("search")}
                  />
                  {query && (
                    <button
                      className="icon-button"
                      aria-label={t("clearFilters")}
                      onClick={() => setQuery("")}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
                {page !== "partner_offices" && filterControls}
                {(page === "properties" || page === "partner_offices") && (
                  <div className="view-toggle">
                    <button
                      className={view === "table" ? "active" : ""}
                      onClick={() => setView("table")}
                      aria-label={t("tableView")}
                      aria-pressed={view === "table"}
                    >
                      <List size={18} />
                    </button>
                    <button
                      className={view === "grid" ? "active" : ""}
                      onClick={() => setView("grid")}
                      aria-label={t("cardView")}
                      aria-pressed={view === "grid"}
                    >
                      <LayoutGrid size={18} />
                    </button>
                  </div>
                )}
              </div>
              {page !== "partner_offices" && (
                <div className="tabs status-tabs">
                  {[
                    "all",
                    ...(page === "properties"
                      ? [
                          "available",
                          "reserved",
                          "sold",
                          "rented",
                          "withdrawn",
                          "archived",
                        ]
                      : ["open", "matched", "closed", "archived"]),
                  ].map((s) => (
                    <button
                      key={s}
                      className={status === s ? "active" : ""}
                      onClick={() => setStatus(s)}
                    >
                      {t(s as TextKey)}
                      {s === "all" && (
                        <span className="count">
                          {page === "properties"
                            ? visibleProperties.filter(
                                (p) => p.status !== "archived",
                              ).length
                            : visibleRequests.filter(
                                (r) => r.status !== "archived",
                              ).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {page === "properties" &&
                (properties.length ? (
                  view === "table" ? (
                    <PropertyTable items={properties} />
                  ) : (
                    <div className="property-grid">
                      {properties.map((p) => (
                        <article className="property-card" key={p.id}>
                          <button
                            className={`property-cover ${p.type}`}
                            onClick={() => open("properties", p.id)}
                            aria-label={`${t("details")} ${p.title}`}
                          >
                            <span className={`status ${p.status}`}>
                              {t(p.status as TextKey)}
                            </span>
                            <div className="building-art">
                              <Building2 size={85} strokeWidth={0.8} />
                            </div>
                            <span className="cover-purpose">
                              {t(p.purpose as TextKey)}
                            </span>
                          </button>
                          <div className="property-card-body">
                            <span className="reference">{p.ref}</span>
                            <h3>
                              <button onClick={() => open("properties", p.id)}>
                                {p.title}
                              </button>
                              {favorite("properties", p.id)}
                            </h3>
                            <p className="muted">
                              <MapPin size={14} />
                              {p.city} · {p.neighborhood}
                            </p>
                            <strong className="card-price" dir="ltr">
                              {amount(p.price, p.currency)}
                            </strong>
                            <div className="property-card-footer">
                              <span>
                                <Scan size={14} />
                                {p.area ?? "—"} m²
                              </span>
                              <span>
                                <BedDouble size={14} />
                                {p.bedrooms ?? "—"}
                              </span>
                              <ContactActions
                                phone={p.phone}
                                secondaryPhone={p.phone_secondary}
                                t={t}
                                compact
                              />
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )
                ) : (
                  empty
                ))}
              {page === "client_requests" &&
                (requests.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("client_name")}</th>
                          <th>{t("kind")}</th>
                          <th>{t("location")}</th>
                          <th>{t("budget")}</th>
                          <th>{t("status")}</th>
                          <th>{t("contact")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <button
                                className="row-title"
                                onClick={() => open("client_requests", r.id)}
                              >
                                {r.client_name}
                              </button>
                              {favorite("client_requests", r.id)}
                              <small className="reference">{r.ref}</small>
                            </td>
                            <td>
                              {t(r.kind as TextKey)} · {t(r.type as TextKey)}
                            </td>
                            <td>
                              {r.city}
                              <small>{r.neighborhood}</small>
                            </td>
                            <td>
                              <bdi>
                                {amount(r.budget_min, r.currency)} —{" "}
                                {amount(r.budget_max, r.currency)}
                              </bdi>
                            </td>
                            <td>
                              <span className={`status ${r.status}`}>
                                {t(r.status as TextKey)}
                              </span>
                            </td>
                            <td>
                              <ContactActions phone={r.phone} t={t} compact />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  empty
                ))}
              {page === "partner_offices" &&
                (profile.role === "freelancer" ? (
                  <div className="empty">{t("noAccess")}</div>
                ) : offices.length ? (
                  view === "table" ? (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("name")}</th>
                            <th>{t("address")}</th>
                            <th>{t("contact_name")}</th>
                            <th>{t("phone")}</th>
                            <th>{t("contact")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {offices.map((o) => (
                            <tr key={o.id}>
                              <td>
                                <button
                                  className="row-title"
                                  onClick={() => open("partner_offices", o.id)}
                                >
                                  {o.name}
                                </button>
                                {favorite("partner_offices", o.id)}
                              </td>
                              <td>{o.address || "—"}</td>
                              <td>{o.contact_name || "—"}</td>
                              <td>
                                <div dir="ltr">{o.phone}</div>
                                {o.phone_secondary && (
                                  <div dir="ltr">{o.phone_secondary}</div>
                                )}
                              </td>
                              <td>
                                <ContactActions
                                  phone={o.phone}
                                  secondaryPhone={o.phone_secondary}
                                  t={t}
                                  compact
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="office-grid">
                      {offices.map((o) => (
                        <article className="office-card" key={o.id}>
                          <span className="office-card-icon">
                            <Building2 size={23} />
                          </span>
                          <h3>
                            <button
                              className="row-title"
                              onClick={() => open("partner_offices", o.id)}
                            >
                              {o.name}
                            </button>
                            {favorite("partner_offices", o.id)}
                          </h3>
                          <p className="muted">
                            <MapPin size={14} />
                            {o.address}
                          </p>
                          <p>{o.contact_name}</p>
                          <span className="phone-text" dir="ltr">
                            {o.phone}
                          </span>
                          {o.phone_secondary && (
                            <span className="phone-text" dir="ltr">
                              {o.phone_secondary}
                            </span>
                          )}
                          <ContactActions
                            phone={o.phone}
                            secondaryPhone={o.phone_secondary}
                            t={t}
                          />
                        </article>
                      ))}
                    </div>
                  )
                ) : (
                  empty
                ))}
            </section>
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
