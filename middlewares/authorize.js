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
