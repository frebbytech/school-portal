/**
 * Role guard. Must run after `verifyJWT` (which sets `req.user`).
 *
 * Student access tokens carry no `role` claim, so they never satisfy a staff role
 * requirement. Responses use the same plain-string style as the existing
 * middleware so current frontends keep working.
 */
const requireRole =
  (...roles) =>
  (req, res, next) => {
    const role = req.user?.role;

    if (!role || !roles.includes(role)) {
      return res
        .status(403)
        .json("You do not have permission to perform this action.");
    }

    next();
  };

/**
 * True when the authenticated user belongs to the same school as the target
 * document. Both sides are compared as strings; a missing school never matches.
 */
const isSameSchool = (req, schoolId) => {
  const userSchool = req.user?.school;
  if (!userSchool || !schoolId) return false;
  return String(userSchool) === String(schoolId);
};

module.exports = { requireRole, isSameSchool };

// ---------------------------------------------------------------------------
// Stage 4 additions
// ---------------------------------------------------------------------------

const STAFF_ROLES = ["administrator", "teacher"];

/**
 * Kill switch for the role/tenant guards added in Stage 4. On by default; set
 * ENFORCE_AUTHZ=false only as a temporary rollback if a legitimate flow is blocked.
 * Guards from Stages 1-2 (backdoor removal, user delete) are NOT affected.
 */
const authzEnabled = () => String(process.env.ENFORCE_AUTHZ).toLowerCase() !== "false";

/**
 * Who is calling. Student access tokens carry no `role` claim, so a token without
 * one is a student token.
 */
const getPrincipal = (req) => {
  const user = req.user || {};
  const id = user.id || user._id;
  const role = user.role || (id ? "student" : undefined);
  return {
    kind: STAFF_ROLES.includes(role) ? "staff" : role === "student" ? "student" : "unknown",
    id: id ? String(id) : undefined,
    schoolId: user.school ? String(user.school) : undefined,
    role,
  };
};

/** Wrap a guard so ENFORCE_AUTHZ=false turns it into a no-op. */
const enforce =
  (guard) =>
  (req, res, next) =>
    authzEnabled() ? guard(req, res, next) : next();

/** Administrators and teachers only: rejects student tokens and unknown roles. */
const requireStaff = enforce((req, res, next) => {
  if (getPrincipal(req).kind !== "staff") {
    return res.status(403).json("You do not have permission to perform this action.");
  }
  next();
});

/** Like `requireRole`, but switchable with ENFORCE_AUTHZ. */
const requireRoleEnforced = (...roles) => enforce(requireRole(...roles));

/** True when `id` is the caller's own id. */
const isSelf = (req, id) => {
  const mine = getPrincipal(req).id;
  return Boolean(mine && id && String(id) === mine);
};

/** Copy only the listed fields (own properties) from `source`. */
const pickFields = (source, fields) => {
  const out = {};
  if (!source || typeof source !== "object") return out;
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(source, field) && source[field] !== undefined) {
      out[field] = source[field];
    }
  }
  return out;
};

/** Staff or student tokens (any signed-in member of a school); rejects unknown roles. */
const requireMember = enforce((req, res, next) => {
  const { kind } = getPrincipal(req);
  if (kind !== "staff" && kind !== "student") {
    return res.status(403).json("You do not have permission to perform this action.");
  }
  next();
});

Object.assign(module.exports, {
  requireMember,
  STAFF_ROLES,
  authzEnabled,
  getPrincipal,
  enforce,
  requireStaff,
  requireRoleEnforced,
  isSelf,
  pickFields,
});
