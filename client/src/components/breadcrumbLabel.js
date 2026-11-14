// What to show for one segment of the page address in the breadcrumb trail.
// A database id (24 hex characters) means nothing to a person, so it is shown as "Details".
const OBJECT_ID = /^[0-9a-f]{24}$/i;

export function breadcrumbLabel(segment) {
  let text = segment;
  try {
    text = decodeURIComponent(segment);
  } catch {
    // keep the raw text if it is not valid URL encoding
  }
  if (OBJECT_ID.test(text)) return "Details";
  return text.replace(/[-_]+/g, " ");
}
