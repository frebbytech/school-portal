// Decides which parts of the route table a signed-in person may see. Pure functions with
// no React or page imports, so they can be tested on their own.
//
// A node may carry:
//   roles:      the roles allowed (omit = every signed-in role)
//   permission: a school-level module that must be switched on for the school
//               (omit = no module needed)
// A node that is not allowed is dropped together with everything under it.
//
// Note: this only decides what the screens offer. The API enforces access again on every
// request, so hiding a route is never the only protection.

export function isAllowed(node, { role, permissions }) {
  if (node.roles && !node.roles.includes(role)) return false;
  if (node.permission && !(permissions || []).includes(node.permission)) return false;
  return true;
}

export function visibleRoutes(nodes, context) {
  return nodes
    .filter((node) => isAllowed(node, context))
    .map((node) =>
      node.children ? { ...node, children: visibleRoutes(node.children, context) } : node
    );
}

const join = (base, path) => {
  if (!path) return base || "/";
  const next = path.startsWith("/") ? path : `${base === "/" ? "" : base}/${path}`;
  return next;
};

// Every full path in a tree, for tests and documentation (index routes show as their parent).
export function listPaths(nodes, base = "") {
  const out = [];
  for (const node of nodes) {
    const here = node.index ? base || "/" : join(base, node.path);
    out.push(here);
    if (node.children) out.push(...listPaths(node.children, node.index ? base : here));
  }
  return out;
}
