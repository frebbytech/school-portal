import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { downloadTemplate } from "./userAPI";

const base = "http://api.test/api/frebbys/v1";

describe("downloadTemplate", () => {
  afterEach(() => vi.restoreAllMocks());

  it("rejects with the server's reason instead of failing silently", async () => {
    server.use(http.get(`${base}/template`, () => HttpResponse.json("No template named 'x'", { status: 404 })));
    await expect(downloadTemplate("x")).rejects.toBe("No template named 'x'");
  });

  it("rejects with a readable message when the server cannot be reached", async () => {
    server.use(http.get(`${base}/template`, () => HttpResponse.error()));
    const error = await downloadTemplate("students").catch((e) => e);
    expect(JSON.stringify(error)).toMatch(/reach the server/i);
  });

  it("starts the download of <name>.xlsx on success", async () => {
    server.use(http.get(`${base}/template`, () => new HttpResponse(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "application/octet-stream" } })));
    window.URL.createObjectURL = vi.fn(() => "blob:test");
    window.URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    expect(await downloadTemplate("students")).toBe(true);
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector("a[download]")).toBeNull(); // the link is removed again
  });
});
