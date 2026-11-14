import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "../test/server";
import api from "./customAxios";
import { registerRefreshHandler } from "./authRetry";

const base = "http://api.test/api/frebbys/v1";
const EXPIRED = "Session has expired.Please login again";

// A protected endpoint that accepts only the token "new-token".
const protectedRoute = (status = 403, body = EXPIRED) =>
  http.get(`${base}/things`, ({ request }) =>
    request.headers.get("authorization") === "Bearer new-token"
      ? HttpResponse.json({ ok: true })
      : HttpResponse.json(body, { status })
  );

afterEach(() => registerRefreshHandler(null));

describe("renewing an expired session", () => {
  it("renews the token once and retries when the server says the session expired (403)", async () => {
    const refresh = vi.fn().mockResolvedValue("new-token");
    registerRefreshHandler(refresh);
    server.use(protectedRoute(403));
    const res = await api.get("/things");
    expect(res.data).toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("also retries after a 401", async () => {
    const refresh = vi.fn().mockResolvedValue("new-token");
    registerRefreshHandler(refresh);
    server.use(protectedRoute(401, "Unauthorized Access.Please contact administrator"));
    await expect(api.get("/things")).resolves.toMatchObject({ data: { ok: true } });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not renew for a real permission refusal", async () => {
    const refresh = vi.fn().mockResolvedValue("new-token");
    registerRefreshHandler(refresh);
    server.use(protectedRoute(403, "You do not have permission to perform this action."));
    await expect(api.get("/things")).rejects.toMatchObject({ response: { status: 403 } });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shares one renewal between requests that fail at the same time", async () => {
    let release;
    const refresh = vi.fn(() => new Promise((resolve) => (release = () => resolve("new-token"))));
    registerRefreshHandler(refresh);
    server.use(protectedRoute(403));
    const all = Promise.all([api.get("/things"), api.get("/things"), api.get("/things")]);
    await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
    release();
    const results = await all;
    expect(results.map((r) => r.data.ok)).toEqual([true, true, true]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("gives the original error when the session cannot be renewed", async () => {
    registerRefreshHandler(vi.fn().mockResolvedValue(null));
    server.use(protectedRoute(403));
    await expect(api.get("/things")).rejects.toMatchObject({ response: { status: 403 } });
  });

  it("gives the original error when renewing itself throws", async () => {
    registerRefreshHandler(vi.fn().mockRejectedValue(new Error("boom")));
    server.use(protectedRoute(403));
    await expect(api.get("/things")).rejects.toMatchObject({ response: { status: 403 } });
  });

  it("retries only once even if the new token is also refused", async () => {
    const refresh = vi.fn().mockResolvedValue("still-bad");
    registerRefreshHandler(refresh);
    server.use(protectedRoute(403));
    await expect(api.get("/things")).rejects.toMatchObject({ response: { status: 403 } });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("never renews for sign-in or renewal requests", async () => {
    const refresh = vi.fn().mockResolvedValue("new-token");
    registerRefreshHandler(refresh);
    server.use(
      http.post(`${base}/users/login`, () => HttpResponse.json("bad", { status: 401 })),
      http.post(`${base}/users/verify`, () => HttpResponse.json(EXPIRED, { status: 403 }))
    );
    await expect(api.post("/users/login", {})).rejects.toMatchObject({ response: { status: 401 } });
    await expect(api.post("/users/verify", {})).rejects.toMatchObject({ response: { status: 403 } });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("passes errors through untouched when no sign-in provider is registered", async () => {
    server.use(protectedRoute(403));
    await expect(api.get("/things")).rejects.toMatchObject({ response: { status: 403 } });
  });
});
