// Shows staff-written rich text (messages, events, announcements) without letting it run
// anything. The text is parsed into an inert document and rebuilt from an allow-list of
// tags and attributes, so nothing that is not listed (scripts, event handlers such as
// onerror, javascript: links, styles that load things) can come through.
// No library is needed: the browser's own parser does the reading.

const ALLOWED_TAGS = new Set([
  "p", "br", "div", "span", "strong", "b", "em", "i", "u", "s", "strike", "sub", "sup",
  "ul", "ol", "li", "blockquote", "pre", "code", "h1", "h2", "h3", "h4", "h5", "h6", "a", "img",
]);

// Removed with everything inside them (other unknown tags keep their text)
const DROPPED_TAGS = new Set([
  "script", "style", "iframe", "frame", "frameset", "object", "embed", "link", "meta", "base",
  "svg", "math", "form", "input", "button", "textarea", "select", "option", "template",
  "noscript", "video", "audio", "source", "track", "canvas", "title", "head",
]);

const SAFE_LINK = /^(https?:|mailto:|tel:)/i;
const SAFE_IMAGE = /^(https?:\/\/|data:image\/(png|jpe?g|gif|webp);base64,)/i;
const QUILL_CLASS = /^(ql-[\w-]+)( ql-[\w-]+)*$/;
const COLOUR = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.\s,%]+\)|[a-z]+)$/i;
const STYLE_PROPS = new Set(["color", "background-color", "text-align"]);

const safeStyle = (value) =>
  value
    .split(";")
    .map((pair) => pair.split(":").map((part) => part.trim()))
    .filter(([prop, val]) => STYLE_PROPS.has((prop || "").toLowerCase()) && val && COLOUR.test(val))
    .map(([prop, val]) => `${prop.toLowerCase()}: ${val}`)
    .join("; ");

function copyAttributes(from, to, tag) {
  const cls = from.getAttribute("class");
  if (cls && QUILL_CLASS.test(cls.trim())) to.setAttribute("class", cls.trim());

  const style = from.getAttribute("style");
  if (style) {
    const clean = safeStyle(style);
    if (clean) to.setAttribute("style", clean);
  }

  if (tag === "a") {
    const href = (from.getAttribute("href") || "").trim();
    if (SAFE_LINK.test(href)) {
      to.setAttribute("href", href);
      to.setAttribute("target", "_blank");
      to.setAttribute("rel", "noopener noreferrer");
    }
  }
  if (tag === "img") {
    to.setAttribute("src", (from.getAttribute("src") || "").trim());
    const alt = from.getAttribute("alt");
    if (alt) to.setAttribute("alt", alt);
  }
}

function copyNode(node, target) {
  if (node.nodeType === 3) {
    target.appendChild(document.createTextNode(node.nodeValue));
    return;
  }
  if (node.nodeType !== 1) return;

  const tag = node.tagName.toLowerCase();
  if (DROPPED_TAGS.has(tag)) return;

  if (!ALLOWED_TAGS.has(tag)) {
    // unknown but harmless tag: keep what is inside it
    node.childNodes.forEach((child) => copyNode(child, target));
    return;
  }
  if (tag === "img" && !SAFE_IMAGE.test((node.getAttribute("src") || "").trim())) return;

  const el = document.createElement(tag);
  copyAttributes(node, el, tag);
  node.childNodes.forEach((child) => copyNode(child, el));
  target.appendChild(el);
}

export function sanitizeHtml(html) {
  if (typeof html !== "string" || html === "") return "";
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const out = document.createElement("div");
  parsed.body.childNodes.forEach((node) => copyNode(node, out));
  return out.innerHTML;
}

export default sanitizeHtml;
