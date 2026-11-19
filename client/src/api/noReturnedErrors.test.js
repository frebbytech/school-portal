import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import fs from "node:fs";
import path from "node:path";
import { server } from "@/test/server";
import { postUser } from "./userAPI";

const base = "http://api.test/api/frebbys/v1";

describe("API modules report failures by throwing", () => {
  it("no API file hands the server's error back as if it were a result", () => {
    const dir = path.resolve(__dirname);
    const offenders = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".js") && !f.endsWith(".test.js"))
      .filter((f) => /return\s+(error|err)\??\.response/.test(fs.readFileSync(path.join(dir, f), "utf8")));
    expect(offenders).toEqual([]);
  });

  it("a refused new user rejects with the server's reason", async () => {
    server.use(http.post(`${base}/users`, () => HttpResponse.json("An account with this Username already exits!", { status: 400 })));
    await expect(postUser({ username: "kofi", role: "administrator" })).rejects.toBe(
      "An account with this Username already exits!"
    );
  });

  it("sends no photo field when none was chosen", async () => {
    let form;
    server.use(
      http.post(`${base}/users`, async ({ request }) => {
        form = await request.formData();
        return HttpResponse.json("New user has been added successfully!!!", { status: 201 });
      })
    );
    await postUser({ username: "kofi", role: "teacher", profile: null });
    expect(form.has("profile")).toBe(false);
    expect(form.get("role")).toBe("teacher");
  });
});
