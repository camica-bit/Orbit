import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Supabase is the only third-party origin the browser talks to. Read from env so
 * the CSP names the actual project; falls back to the vendor's host pattern when
 * the var is absent (e.g. a lint-only checkout) rather than throwing and taking
 * the whole build with it.
 */
const supabaseOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return "https://*.supabase.co";
  try {
    return new URL(raw).origin;
  } catch {
    return "https://*.supabase.co";
  }
})();

/**
 * ponytail: `script-src 'unsafe-inline'` — Next's hydration bootstrap is inline,
 * and a strict CSP needs a per-request nonce injected from `src/proxy.ts`
 * (see node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
 * That is a proxy change, not a config change; upgrade there when it's worth it.
 * Everything else below is already at its tightest useful value.
 */
const csp = [
  "default-src 'self'",
  // 'unsafe-eval' is required by the dev-mode React refresh runtime only.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Inline `style={{...}}` attributes are used throughout the components, and
  // Material Symbols ships as a stylesheet from Google.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // next/font self-hosts the three text faces; only the icon font is remote.
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  `connect-src 'self' ${supabaseOrigin}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Belt and braces with X-Frame-Options below, for older browsers.
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Don't advertise the framework and version to scanners.
  poweredByHeader: false,

  turbopack: {
    // Without this the build warns on every run that it is ignoring a stray
    // ~/package-lock.json outside this repo, and picks the root by guesswork.
    root: __dirname,
  },

  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Send the origin cross-site, the full path same-origin.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // /listen needs the mic; nothing here needs camera or location.
          {
            key: "Permissions-Policy",
            value: "microphone=(self), camera=(), geolocation=()",
          },
          // Browsers ignore HSTS over plain http, but keep dev free of it anyway.
          ...(isDev
            ? []
            : [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]),
        ],
      },
    ];
  },
};

export default nextConfig;
