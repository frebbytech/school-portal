import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/server";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import EditAnnouncementModal from "./EditAnnouncementModal";
import MoreAnnouncements from "./MoreAnnouncements";

vi.mock("sweetalert2", () => ({ default: { fire: vi.fn() } }));
vi.mock("@/components/custom/CustomTitle", () => ({ default: ({ title }) => <h1>{title}</h1> }));
vi.mock("@/components/skeleton/EventSkeleton", () => ({ default: () => <p>loading</p> }));
vi.mock("@/components/spinners/LoadingSpinner", () => ({ default: () => null }));
vi.mock("./AddAnnouncementModal", () => ({ default: () => null }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { _id: "u1", role: "administrator" } }) }));

const base = "http://api.test/api/frebbys/v1";
const dispatch = vi.fn();
const wrap = (ui, path) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <SchoolSessionContext.Provider value={{ schoolSessionDispatch: dispatch }}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </SchoolSessionContext.Provider>
  </QueryClientProvider>
);

const saved = {
  _id: "a1",
  title: "Fees due",
  description: "Please pay before Friday",
  priority: "high",
  bgColor: "#ffcccb",
  createdAt: "2026-11-01T10:00:00.000Z",
};

beforeEach(() => dispatch.mockClear());

describe("edit announcement", () => {
  it("loads the announcement and saves the change without choosing a colour", async () => {
    let sent;
    const onClose = vi.fn();
    server.use(
      http.get(`${base}/announcements/a1`, () => HttpResponse.json(saved)),
      http.put(`${base}/announcements`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json("Chnages Saved!");
      })
    );
    render(wrap(<EditAnnouncementModal onClose={onClose} />, "/announcements?_id=a1"));
    const title = await screen.findByLabelText("Title");
    expect(title).toHaveValue("Fees due");
    await userEvent.clear(title);
    await userEvent.type(title, "Fees due Friday");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(sent).toMatchObject({ _id: "a1", title: "Fees due Friday", priority: "high" });
    expect(sent.bgColor).toBeUndefined();
  });

  it("does not send an announcement with a short title", async () => {
    const put = vi.fn();
    server.use(
      http.get(`${base}/announcements/a1`, () => HttpResponse.json(saved)),
      http.put(`${base}/announcements`, () => { put(); return HttpResponse.json("Chnages Saved!"); })
    );
    render(wrap(<EditAnnouncementModal onClose={vi.fn()} />, "/announcements?_id=a1"));
    const title = await screen.findByLabelText("Title");
    await userEvent.clear(title);
    await userEvent.type(title, "ab");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText("At least 3 characters")).toBeInTheDocument();
    expect(put).not.toHaveBeenCalled();
  });

  it("shows what the server said when saving fails, and keeps the modal open", async () => {
    const onClose = vi.fn();
    server.use(
      http.get(`${base}/announcements/a1`, () => HttpResponse.json(saved)),
      http.put(`${base}/announcements`, () => HttpResponse.json("priority must be one of: high", { status: 400 }))
    );
    render(wrap(<EditAnnouncementModal onClose={onClose} />, "/announcements?_id=a1"));
    await userEvent.click(await screen.findByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText(/priority must be one of/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("says so when the announcement cannot be loaded", async () => {
    server.use(http.get(`${base}/announcements/a1`, () => HttpResponse.json("Server error", { status: 500 })));
    render(wrap(<EditAnnouncementModal onClose={vi.fn()} />, "/announcements?_id=a1"));
    expect(await screen.findByText(/Could not load the announcement/)).toBeInTheDocument();
  });
});

describe("announcements list", () => {
  vi.setConfig({ testTimeout: 20000 });
  it("lists announcements, and shows a banner (not an empty list) when loading fails", async () => {
    server.use(http.get(`${base}/announcements`, () => HttpResponse.json([saved])));
    const { unmount } = render(wrap(<MoreAnnouncements />, "/announcements"));
    expect(await screen.findByText("Fees due")).toBeInTheDocument();
    unmount();

    server.use(http.get(`${base}/announcements`, () => HttpResponse.json("Server error", { status: 500 })));
    render(wrap(<MoreAnnouncements />, "/announcements"));
    // the screen asks for two retries (with back-off) before it gives up
    expect(await screen.findByText(/Could not load the announcements/, {}, { timeout: 10000 })).toBeInTheDocument();
  });
});
