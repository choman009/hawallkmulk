"use client";
import { useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Building2,
  LockKeyhole,
  Sun,
  Moon,
  Languages,
} from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";
import type { TextKey } from "@/lib/i18n";
export function AuthPanel({
  t,
  onLogin,
  onDemo,
  onLocale,
  onTheme,
  dark,
  passwordSetup = false,
}: {
  t: (k: TextKey) => string;
  onLogin: () => Promise<void>;
  onDemo?: () => void;
  onLocale: () => void;
  onTheme: () => void;
  dark: boolean;
  passwordSetup?: boolean;
}) {
  const [recovery, setRecovery] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const client = getBrowserClient();
      if (!client) throw new Error("sessionError");
      if (passwordSetup) {
        const { error } = await client.auth.updateUser({
          password: String(fd.get("password")),
        });
        if (error) throw error;
        window.location.assign("/");
      } else if (recovery) {
        const { error } = await client.auth.resetPasswordForEmail(
          String(fd.get("email")),
          {
            redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
          },
        );
        if (error) throw error;
        setMessage(t("recoverySent"));
      } else {
        const { error } = await client.auth.signInWithPassword({
          email: String(fd.get("email")),
          password: String(fd.get("password")),
        });
        if (error) throw new Error("loginFailed");
        await onLogin();
      }
    } catch (e) {
      const key = e instanceof Error ? e.message : "genericError";
      setError(
        t(
          (["inactive", "sessionError", "loginFailed"].includes(key)
            ? key
            : "genericError") as TextKey,
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <div className="brand">
          <span className="brand-mark">
            <Building2 size={24} />
          </span>
          <span dir="ltr">
            Hawall<span className="brand-light"> mulk</span>
          </span>
        </div>
        <div>
          <span className="eyebrow">HAWALL MULK / WORKSPACE</span>
          <h1>{t("loginTitle")}</h1>
          <p>{t("overviewSub")}</p>
          <div className="auth-architecture">
            <div />
            <div />
            <div />
            <span>HM.</span>
          </div>
        </div>
        <small>Hawall mulk © {new Date().getFullYear()}</small>
      </aside>
      <main className="auth-content">
        <div className="auth-controls">
          <button
            className="icon-button"
            onClick={onLocale}
            aria-label={t("language")}
          >
            <Languages size={19} />
          </button>
          <button
            className="icon-button"
            onClick={onTheme}
            aria-label={t("theme")}
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
        <div className="auth-form">
          <span className="auth-lock">
            <LockKeyhole size={26} />
          </span>
          <h2>
            {t(
              passwordSetup
                ? "setPassword"
                : recovery
                  ? "sendRecovery"
                  : "greeting",
            )}
          </h2>
          <p className="muted">{t("loginSub")}</p>
          <form onSubmit={submit}>
            {!passwordSetup && (
              <label>
                <span>{t("email")}</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  dir="ltr"
                  required
                  placeholder="name@example.com"
                />
              </label>
            )}
            {(!recovery || passwordSetup) && (
              <label>
                <span>{t(passwordSetup ? "newPassword" : "password")}</span>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={passwordSetup ? 8 : undefined}
                  dir="ltr"
                  autoComplete={
                    passwordSetup ? "new-password" : "current-password"
                  }
                />
              </label>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="success-message">
                {message}
              </p>
            )}
            <button
              className="button primary full"
              disabled={busy || !getBrowserClient()}
            >
              {t(
                busy
                  ? "saving"
                  : passwordSetup
                    ? "save"
                    : recovery
                      ? "sendRecovery"
                      : "login",
              )}
              <ArrowUpRight size={18} />
            </button>
          </form>
          {!passwordSetup && (
            <button
              className="text-button full"
              onClick={() => {
                setRecovery(!recovery);
                setError("");
                setMessage("");
              }}
            >
              {t(recovery ? "back" : "forgot")}
            </button>
          )}
          {onDemo && (
            <div className="demo-login">
              <span className="eyebrow">{t("demo")}</span>
              <p>{t("demoNotice")}</p>
              <button className="button secondary full" onClick={onDemo}>
                {t("enterDemo")}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
