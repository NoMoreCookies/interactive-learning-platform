import type {
  NextConfig,
} from "next";

const isProduction =
  process.env.NODE_ENV ===
  "production";

const securityHeaders = [
  /*
   * Prevent MIME sniffing.
   */
  {
    key:
      "X-Content-Type-Options",
    value:
      "nosniff",
  },

  /*
   * Defense in depth against clickjacking.
   *
   * CSP frame-ancestors is the modern primary control.
   */
  {
    key:
      "X-Frame-Options",
    value:
      "DENY",
  },

  /*
   * Do not disclose the full URL when navigating to another
   * origin.
   */
  {
    key:
      "Referrer-Policy",
    value:
      "strict-origin-when-cross-origin",
  },

  /*
   * The platform currently does not require these browser APIs.
   */
  {
    key:
      "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "serial=()",
      "bluetooth=()",
      "browsing-topics=()",
    ].join(", "),
  },

  /*
   * Disable Adobe/legacy cross-domain policy files.
   */
  {
    key:
      "X-Permitted-Cross-Domain-Policies",
    value:
      "none",
  },

  ...(isProduction
    ? [
        /*
         * Start conservatively.
         *
         * Do not add includeSubDomains or preload until every
         * relevant subdomain has been reviewed for HTTPS.
         */
        {
          key:
            "Strict-Transport-Security",
          value:
            "max-age=31536000",
        },
      ]
    : []),
];

const nextConfig:
  NextConfig = {
    /*
     * Avoid advertising the framework through X-Powered-By.
     */
    poweredByHeader:
      false,

    async headers() {
      return [
        {
          source:
            "/(.*)",
          headers:
            securityHeaders,
        },
      ];
    },
  };

export default nextConfig;