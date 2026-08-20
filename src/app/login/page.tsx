"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Starfield from "@/components/focus/Starfield";
import OrbitPulse from "@/components/shared/OrbitPulse";
import { useAuth } from "@/context/AuthContext";
import styles from "./page.module.css";

type AuthMode = "signin" | "signup";
type AuthMethod = "password" | "magiclink";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithPassword, signUpWithPassword, signInWithOtp } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [method, setMethod] = useState<AuthMethod>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage("Please input your user terminal email.");
      return;
    }

    if (method === "password" && !password) {
      setErrorMessage("Password directive required.");
      return;
    }

    if (method === "password" && password.length < 6) {
      setErrorMessage("Password protocol requires at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (method === "magiclink") {
        const { error } = await signInWithOtp(email.trim());
        if (error) {
          setErrorMessage(error.message);
        } else {
          setSuccessMessage(
            "QUANTUM ACCESS LINK DISPATCHED: Check your email inbox to verify login."
          );
        }
      } else if (mode === "signin") {
        const { error } = await signInWithPassword(email.trim(), password);
        if (error) {
          setErrorMessage(error.message);
        } else {
          setSuccessMessage("IDENTITY VERIFIED. Linking to Orbit core...");
          setTimeout(() => {
            router.push("/");
            router.refresh();
          }, 400);
        }
      } else {
        const { error, user } = await signUpWithPassword(email.trim(), password);
        if (error) {
          setErrorMessage(error.message);
        } else if (user && !user.identities?.length) {
          setErrorMessage("Identity already registered in system.");
        } else {
          setSuccessMessage(
            "INITIALIZATION COMPLETE: Check your email for confirmation code or log in directly."
          );
          setTimeout(() => {
            setMode("signin");
          }, 1500);
        }
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Authentication protocol failure."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.loginWrap}>
      {/* Background Starfield effect */}
      <Starfield />

      <div className={styles.authContainer}>
        {/* Brand Header */}
        <div className={styles.brandHeader}>
          <div className={styles.logoRow}>
            <div className={`pixel-border ${styles.logoIcon}`}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 22, color: "var(--secondary)" }}
              >
                token
              </span>
            </div>
            <h1 className="font-headline-lg" style={{ color: "var(--on-surface)", letterSpacing: "0.04em" }}>
              ORBIT
            </h1>
            <span className={`font-label-mono ${styles.protocolBadge}`}>
              v1.0 AUTH
            </span>
          </div>
          <p className={`${styles.subtitle} font-body-md`}>
            Establish cognitive link with your personal operating environment.
          </p>
        </div>

        {/* Main Card */}
        <div className={`pixel-border corner-brackets ${styles.card}`}>
          <div className="noise-overlay" />

          {/* Mode Switcher Tabs */}
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tabBtn} ${
                mode === "signin" ? styles.tabBtnActive : ""
              } font-label-mono`}
              onClick={() => {
                setMode("signin");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                login
              </span>
              SIGN IN
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${
                mode === "signup" ? styles.tabBtnActive : ""
              } font-label-mono`}
              onClick={() => {
                setMode("signup");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                person_add
              </span>
              INITIALIZE ID
            </button>
          </div>

          {/* Auth Method Selector */}
          <div className={styles.methodSelector}>
            <button
              type="button"
              className={`${styles.methodBtn} ${
                method === "password" ? styles.methodBtnActive : ""
              } font-label-mono`}
              onClick={() => {
                setMethod("password");
                setErrorMessage(null);
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                key
              </span>
              Password Protocol
            </button>
            <button
              type="button"
              className={`${styles.methodBtn} ${
                method === "magiclink" ? styles.methodBtnActive : ""
              } font-label-mono`}
              onClick={() => {
                setMethod("magiclink");
                setErrorMessage(null);
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                mail
              </span>
              Magic Link (OTP)
            </button>
          </div>

          {/* Error / Alert feedback */}
          {errorMessage && (
            <div className={`pixel-border ${styles.alertError} font-body-md`}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18, color: "var(--error)" }}
              >
                error
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success feedback */}
          {successMessage && (
            <div className={`pixel-border ${styles.alertSuccess} font-body-md`}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18, color: "var(--secondary)" }}
              >
                verified
              </span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="auth-email" className={`${styles.label} font-label-mono`}>
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                  terminal
                </span>
                User Terminal Email
              </label>
              <div className={styles.inputBox}>
                <span className={styles.inputPrompt}>&gt;</span>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pilot@orbit.system"
                  className={styles.input}
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {method === "password" && (
              <div className={styles.field}>
                <label
                  htmlFor="auth-password"
                  className={`${styles.label} font-label-mono`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                    lock
                  </span>
                  Secret Key Phrase
                </label>
                <div className={styles.inputBox}>
                  <span className={styles.inputPrompt}>&gt;</span>
                  <input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={styles.input}
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className={`pixel-btn pixel-btn-primary ${styles.submitBtn} font-label-mono`}
            >
              {loading ? (
                <>
                  <span
                    className="material-symbols-outlined anim-orbit-pulse"
                    style={{ fontSize: 18 }}
                  >
                    sync
                  </span>
                  COMMUNICATING WITH CORE...
                </>
              ) : (
                <>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18 }}
                  >
                    {method === "magiclink"
                      ? "send"
                      : mode === "signin"
                      ? "key"
                      : "bolt"}
                  </span>
                  {method === "magiclink"
                    ? "DISPATCH MAGIC LINK"
                    : mode === "signin"
                    ? "AUTHENTICATE"
                    : "REGISTER IDENTITY"}
                </>
              )}
            </button>
          </form>

          {/* Telemetry Status Bar */}
          <div className={`${styles.telemetry} font-label-mono`}>
            <div className={styles.telemetryStatus}>
              <div className={`${styles.glowBall} anim-pulse-glow`} />
              <span>SUPABASE AUTH: ACTIVE</span>
            </div>
            <div className={styles.version}>
              <OrbitPulse size={8} gold />
              <span>ENCRYPTED PROTOCOL</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
