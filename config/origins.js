// Which browser origins may call the API (and open the live-updates socket).
// Browsers send the Origin header without a trailing slash, so entries are
// normalised (trailing slashes and whitespace removed) before comparison.
const normalizeOrigin = (value) => String(value).trim().replace(/\/+$/, "");

const whitelist = (
  process.env.CORS_WHITELIST
    ? process.env.CORS_WHITELIST.split(",")
    : [
        "https://frebbys-school-portal.vercel.app/",
        "https://frebbys-student-portal.vercel.app/",
        "https://school-portal-aivn.onrender.com",
        "https://school-portal-git-main-nicktest701s-projects.vercel.app/",
        "https://school-portal-mqk4r390o-nicktest701s-projects.vercel.app/",
      ]
)
  .filter(Boolean)
  .map(normalizeOrigin);

// A request with no Origin header (server to server, curl) is allowed, as before.
const isAllowedOrigin = (origin) => !origin || whitelist.includes(normalizeOrigin(origin));

module.exports = { normalizeOrigin, whitelist, isAllowedOrigin };
