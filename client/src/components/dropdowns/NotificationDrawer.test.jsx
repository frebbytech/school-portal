import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/server";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { UserContext } from "@/context/providers/UserProvider";
import NotificationDrawer from "./NotificationDrawer";
import { renderHook } from "@testing-library/react";
import { useNotifications } from "@/hooks/useNotifications";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { _id: "u1", id: "u1" } }) }));

const base = "http://api.test/api/frebbys/v1";
const dispatch = vi.fn();
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const wrapper = ({ children }) => {
  const [qc] = React.useState(client);
  return (
  <QueryClientProvider client={qc}>
    <SchoolSessionContext.Provider value={{ schoolSessionDispatch: dispatch }}>
      <UserContext.Provider value={{ user: { _id: "u1", id: "u1" } }}>
        <MemoryRouter>{children}</MemoryRouter>
      </UserContext.Provider>
    </SchoolSessionContext.Provider>
  </QueryClientProvider>
  );
};
const item = (n, active = true) => ({
  _id: `x${n}`,
  type: "Info",
  title: `Notice ${n}`,
  description: "d",
  active,
  createdAt: "2026-11-01T10:00:00.000Z",
});

beforeEach(() => dispatch.mockClear());

describe("notification drawer", () => {
  it("lists notifications, and clears them all for the signed-in person", async () => {
    let cleared = false;
    server.use(
      http.get(`${base}/notifications`, () => HttpResponse.json([item(1), item(2, false)])),
      http.delete(`${base}/notifications/u1/all`, () => {
        cleared = true;
        return HttpResponse.json("Notification deleted successfully!!!");
      })
    );
    render(<NotificationDrawer open setOpen={() => {}} />, { wrapper });
    expect(await screen.findByText("Notice 1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear All" }));
    await waitFor(() => expect(cleared).toBe(true));
  });

  it("says so when loading fails, instead of 'No new Notifications'", async () => {
    server.use(http.get(`${base}/notifications`, () => HttpResponse.json("Server error", { status: 500 })));
    render(<NotificationDrawer open setOpen={() => {}} />, { wrapper });
    expect(await screen.findByText(/Could not load your notifications/)).toBeInTheDocument();
    expect(screen.queryByText("No new Notifications")).toBeNull();
  });

  it("has nothing to mark or clear when there are no notifications", async () => {
    server.use(http.get(`${base}/notifications`, () => HttpResponse.json([])));
    render(<NotificationDrawer open setOpen={() => {}} />, { wrapper });
    expect(await screen.findByText("No new Notifications")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear All" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mark all as read" })).toBeDisabled();
  });

  it("shows the server's reason when a notification cannot be removed", async () => {
    server.use(
      http.get(`${base}/notifications`, () => HttpResponse.json([item(1)])),
      http.delete(`${base}/notifications/x1`, () => HttpResponse.json("Error removing notification.Try again later...", { status: 404 }))
    );
    render(<NotificationDrawer open setOpen={() => {}} />, { wrapper });
    await userEvent.click(await screen.findByRole("button", { name: "Remove notification" }));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(JSON.stringify(dispatch.mock.calls[0][0])).toMatch(/Error removing notification/);
  });
});

describe("useNotifications", () => {
  it("is an empty list while loading and after a failure, with isPending / isError telling them apart", async () => {
    server.use(http.get(`${base}/notifications`, () => HttpResponse.json("Server error", { status: 500 })));
    const { result } = renderHook(() => useNotifications(), { wrapper });
    expect(result.current.data).toEqual([]);
    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
