"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Starfield from "@/components/focus/Starfield";
import OrbitPulse from "@/components/shared/OrbitPulse";
import { useAuth } from "@/context/AuthContext";
import styles from "./page.module.css";

type AuthMode = "signin" | "signup";
type AuthMethod = "password" | "magiclink";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithPassword, signUpWithPassword, signInWithOtp, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [method, setMethod] = useState<AuthMethod>("password");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get("error");
      if (urlError) {
        setErrorMessage(decodeURIComponent(urlError));
      }
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setGoogleLoading(true);

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMessage(error.message);
        setGoogleLoading(false);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Google authentication protocol failed."
      );
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage("Please input your user email.");
      return;
    }

    if (method === "password" && !password) {
      setErrorMessage("Password required.");
      return;
    }

    if (method === "password" && password.length < 6) {
      setErrorMessage("Password requires at least 6 characters.");
      return;
    }

    setLoading(true);

    const userMeta =
      mode === "signup"
        ? {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }
        : undefined;

    try {
      if (method === "magiclink") {
        const { error } = await signInWithOtp(email.trim(), userMeta);
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
        const { error, user } = await signUpWithPassword(
          email.trim(),
          password,
          userMeta
        );
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
            <Image
              src="/Logo.png"
              alt="Orbit Logo"
              width={36}
              height={36}
              priority
              style={{ objectFit: "contain" }}
            />
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
              className={`${styles.tabBtn} ${mode === "signin" ? styles.tabBtnActive : ""
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
              className={`${styles.tabBtn} ${mode === "signup" ? styles.tabBtnActive : ""
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
              className={`${styles.methodBtn} ${method === "password" ? styles.methodBtnActive : ""
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
              className={`${styles.methodBtn} ${method === "magiclink" ? styles.methodBtnActive : ""
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
            {mode === "signup" && (
              <div className={styles.nameRow}>
                <div className={styles.field}>
                  <label
                    htmlFor="auth-first-name"
                    className={`${styles.label} font-label-mono`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                      badge
                    </span>
                    First Name
                  </label>
                  <div className={styles.inputBox}>
                    <span className={styles.inputPrompt}>&gt;</span>
                    <input
                      id="auth-first-name"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jane"
                      className={styles.input}
                      autoComplete="given-name"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label
                    htmlFor="auth-last-name"
                    className={`${styles.label} font-label-mono`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                      badge
                    </span>
                    Last Name
                  </label>
                  <div className={styles.inputBox}>
                    <span className={styles.inputPrompt}>&gt;</span>
                    <input
                      id="auth-last-name"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className={styles.input}
                      autoComplete="family-name"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            )}

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

          {/* Social / OAuth Divider */}
          <div className={styles.divider}>
            <span className={styles.dividerLine} />
            <span className={`${styles.dividerText} font-label-mono`}>OR LINK VIA</span>
            <span className={styles.dividerLine} />
          </div>

          {/* Google Auth Button */}
          <button
            id="auth-google-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className={`pixel-btn ${styles.googleBtn} font-label-mono`}
          >
            {googleLoading ? (
              <>
                <span
                  className="material-symbols-outlined anim-orbit-pulse"
                  style={{ fontSize: 18 }}
                >
                  sync
                </span>
                CONNECTING TO GOOGLE...
              </>
            ) : (
              <>
                <svg
                  className={styles.googleIcon}
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
                CONTINUE WITH GOOGLE
              </>
            )}
          </button>

          {/* Telemetry Status Bar */}
          <div className={`${styles.telemetry} font-label-mono`}>
            <div className={styles.telemetryStatus}>
              <div className={`${styles.glowBall} anim-pulse-glow`} />
              <span>SUPABASE AUTH: ACTIVE</span>
            </div>
            <div className={styles.version}>
              <OrbitPulse size={6} gold />
              <span>ENCRYPTED PROTOCOL</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
