import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "./safeHtml";

const html = (s) => {
  const box = document.createElement("div");
  box.innerHTML = sanitizeHtml(s);
  return box;
};

describe("sanitizeHtml", () => {
  it("keeps ordinary rich text", () => {
    const out = sanitizeHtml('<p>Hello <strong>all</strong></p><ul><li>One</li></ul><h2>Title</h2>');
    expect(out).toBe("<p>Hello <strong>all</strong></p><ul><li>One</li></ul><h2>Title</h2>");
  });

  it("removes scripts and everything inside them", () => {
    const out = sanitizeHtml("<p>Hi</p><script>alert(1)</script><style>p{display:none}</style>");
    expect(out).toBe("<p>Hi</p>");
  });

  it("removes event handlers and unknown attributes", () => {
    const box = html('<img src="https://x.test/a.png" onerror="alert(1)" onclick="x()"><p onmouseover="x()" id="a" data-x="1">t</p>');
    expect(box.querySelector("[onerror],[onclick],[onmouseover]")).toBeNull();
    expect(box.querySelector("p").getAttributeNames()).toEqual([]);
  });

  it("only lets web, mail and phone links through, and opens them safely", () => {
    const box = html('<a href="javascript:alert(1)">a</a><a href=" JaVaScRiPt:alert(1)">b</a><a href="https://school.test/x">c</a><a href="mailto:a@b.c">d</a>');
    const links = [...box.querySelectorAll("a")];
    expect(links[0].hasAttribute("href")).toBe(false);
    expect(links[1].hasAttribute("href")).toBe(false);
    expect(links[2].getAttribute("href")).toBe("https://school.test/x");
    expect(links[2].getAttribute("rel")).toBe("noopener noreferrer");
    expect(links[3].getAttribute("href")).toBe("mailto:a@b.c");
  });

  it("only keeps images from the web or as png/jpeg/gif/webp data", () => {
    const box = html('<img src="javascript:alert(1)"><img src="data:text/html;base64,AAAA"><img src="data:image/svg+xml;base64,AAAA"><img src="data:image/png;base64,AAAA"><img src="https://x.test/a.png">');
    expect([...box.querySelectorAll("img")].map((i) => i.getAttribute("src"))).toEqual(["data:image/png;base64,AAAA", "https://x.test/a.png"]);
  });

  it("keeps only colour and alignment styles, with safe values", () => {
    const box = html('<p style="color: red; position: fixed; background-color: rgb(1, 2, 3); background: url(https://x.test/t.gif)">t</p><p style="color: expression(alert(1))">u</p>');
    const [a, b] = box.querySelectorAll("p");
    expect(a.getAttribute("style")).toBe("color: red; background-color: rgb(1, 2, 3)");
    expect(b.hasAttribute("style")).toBe(false);
  });

  it("keeps the editor's own classes and drops others", () => {
    const box = html('<p class="ql-align-center ql-indent-1">a</p><p class="evil">b</p>');
    const [a, b] = box.querySelectorAll("p");
    expect(a.getAttribute("class")).toBe("ql-align-center ql-indent-1");
    expect(b.hasAttribute("class")).toBe(false);
  });

  it("drops svg, iframes and forms; keeps the text of other unknown tags", () => {
    expect(sanitizeHtml('<svg onload="x()"><circle/></svg><iframe src="https://x.test"></iframe><form><input></form>')).toBe("");
    expect(sanitizeHtml("<custom-tag>kept</custom-tag>")).toBe("kept");
  });

  it("treats text as text (no tags are made out of escaped ones)", () => {
    expect(sanitizeHtml("a &lt;script&gt;alert(1)&lt;/script&gt; b")).toBe("a &lt;script&gt;alert(1)&lt;/script&gt; b");
  });

  it("is empty for nothing", () => {
    expect(sanitizeHtml(undefined)).toBe("");
    expect(sanitizeHtml("")).toBe("");
    expect(sanitizeHtml({ a: 1 })).toBe("");
  });
});
