import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/server";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { UserContext } from "@/context/providers/UserProvider";
import { eventValidationSchema } from "@/config/validationSchema";
import EditEvent from "./EditEvent";
import NewEvent from "./NewEvent";
import MoreEvents from "./MoreEvents";
import ViewEvent from "./ViewEvent";

vi.mock("@/components/spinners/LoadingSpinner", () => ({ default: () => <p>loading</p> }));
vi.mock("@/components/skeleton/EventSkeleton", () => ({ default: () => <p>loading</p> }));
vi.mock("@/components/custom/CustomTitle", () => ({ default: ({ title }) => <h1>{title}</h1> }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { _id: "u1", role: "administrator" } }) }));
vi.mock("@/components/custom/TextEditor", () => ({
  default: ({ label, value, onChange, touched, errors }) => (
    <div>
      <textarea aria-label={label} value={value || ""} onChange={(e) => onChange(e.target.value)} />
      {touched && errors && <p>{errors}</p>}
    </div>
  ),
}));

const base = "http://api.test/api/frebbys/v1";
const dispatch = vi.fn();
const wrap = (ui, path = "/events/e1/edit") => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <UserContext.Provider value={{ session: { sessionId: "s1", termId: "t1" } }}>
      <SchoolSessionContext.Provider value={{ schoolSessionDispatch: dispatch }}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/events/new" element={ui} />
            <Route path="/events/:id/edit" element={ui} />
            <Route path="/events/:id" element={ui} />
            <Route path="/events" element={ui} />
          </Routes>
        </MemoryRouter>
      </SchoolSessionContext.Provider>
    </UserContext.Provider>
  </QueryClientProvider>
);

const savedEvent = {
  _id: "e1",
  type: "Open Day",
  title: "Open day",
  caption: "Come along",
  description: "<p>Details</p>",
  start: "2026-12-10T10:00:00.000Z",
  end: null,
  createdAt: "2026-11-01T10:00:00.000Z",
};

beforeEach(() => dispatch.mockClear());

describe("event rules", () => {
  const valid = { type: "Open Day", title: "Open day", description: "<p>Hello</p>" };
  it("treats the editor's empty markup as no description", async () => {
    await expect(eventValidationSchema.validate({ ...valid, description: "<p><br></p>" })).rejects.toThrow("Required*");
    await expect(eventValidationSchema.validate(valid)).resolves.toBeTruthy();
  });
  it("accepts blank dates, and a range that runs forwards", async () => {
    await expect(eventValidationSchema.validate({ ...valid, start: "", end: "" })).resolves.toBeTruthy();
    await expect(
      eventValidationSchema.validate({ ...valid, start: "2026-12-10T10:00", end: "2026-12-10T12:00" })
    ).resolves.toBeTruthy();
  });
  it("rejects an end before the start", async () => {
    await expect(
      eventValidationSchema.validate({ ...valid, start: "2026-12-10T10:00", end: "2026-12-09T10:00" })
    ).rejects.toThrow("The end must not be before the start");
  });
});

describe("edit event", () => {
  it("shows the saved dates and sends the changes, then leaves", async () => {
    let sent;
    server.use(
      http.get(`${base}/events/e1`, () => HttpResponse.json(savedEvent)),
      http.put(`${base}/events`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json("Chnages Saved!");
      })
    );
    render(wrap(<EditEvent />));
    const title = await screen.findByLabelText("Event Title");
    expect(screen.getByLabelText("Start Date / Time").value).not.toBe("");
    await userEvent.clear(title);
    await userEvent.type(title, "Open day 2026");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(sent).toBeTruthy());
    expect(sent).toMatchObject({ _id: "e1", title: "Open day 2026" });
    expect(sent.start).toBeTruthy();
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
  });

  it("shows what the server said when saving fails, and stays on the form", async () => {
    server.use(
      http.get(`${base}/events/e1`, () => HttpResponse.json(savedEvent)),
      http.put(`${base}/events`, () => HttpResponse.json("end must not be before start", { status: 400 }))
    );
    render(wrap(<EditEvent />));
    await userEvent.click(await screen.findByRole("button", { name: "Save Changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/end must not be before start/);
    expect(screen.getByLabelText("Event Title")).toBeInTheDocument();
  });

  it("says so when the event cannot be loaded, instead of showing an empty form", async () => {
    server.use(http.get(`${base}/events/e1`, () => HttpResponse.json("Server error", { status: 500 })));
    render(wrap(<EditEvent />));
    expect(await screen.findByText(/Could not load the event/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Event Title")).toBeNull();
  });
});

describe("new event", () => {
  it("does not send an event whose end is before its start", async () => {
    const post = vi.fn();
    server.use(http.post(`${base}/events`, async () => { post(); return HttpResponse.json("Event Created!"); }));
    render(wrap(<NewEvent />, "/events/new"));
    await userEvent.type(screen.getByLabelText("Select Event Type"), "Open Day");
    await userEvent.type(screen.getByLabelText("Event Title"), "Open day");
    await userEvent.type(screen.getByLabelText("Description"), "Details");
    await userEvent.type(screen.getByLabelText("Start Date / Time"), "2026-12-10T10:00");
    await userEvent.click(screen.getByLabelText("End Date"));
    await userEvent.type(screen.getByLabelText("End Date / Time"), "2026-12-09T10:00");
    await userEvent.click(screen.getByRole("button", { name: "Create Event" }));
    expect(await screen.findByText("The end must not be before the start")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("keeps a typed event type that is not in the list", async () => {
    let sent;
    server.use(http.post(`${base}/events`, async ({ request }) => { sent = await request.json(); return HttpResponse.json("Event Created!"); }));
    render(wrap(<NewEvent />, "/events/new"));
    await userEvent.type(screen.getByLabelText("Select Event Type"), "Founders Day");
    await userEvent.type(screen.getByLabelText("Event Title"), "Founders");
    await userEvent.type(screen.getByLabelText("Description"), "Details");
    await userEvent.click(screen.getByRole("button", { name: "Create Event" }));
    await waitFor(() => expect(sent).toBeTruthy());
    expect(sent).toMatchObject({ type: "Founders Day", session: "s1", term: "t1" });
  });
});

describe("events list and view", () => {
  it("lists events, searches without crashing, and shows a banner when loading fails", async () => {
    server.use(http.get(`${base}/events`, () => HttpResponse.json([savedEvent])));
    const { unmount } = render(wrap(<MoreEvents />, "/events"));
    expect(await screen.findByText("Open day")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Search for event"), "zzz");
    expect(await screen.findByText("No events found.")).toBeInTheDocument();
    unmount();

    server.use(http.get(`${base}/events`, () => HttpResponse.json("Server error", { status: 500 })));
    render(wrap(<MoreEvents />, "/events"));
    expect(await screen.findByText(/Could not load the events/)).toBeInTheDocument();
  });

  it("says when an event is missing or cannot be loaded", async () => {
    server.use(http.get(`${base}/events/gone`, () => HttpResponse.json(null)));
    const { unmount } = render(wrap(<ViewEvent />, "/events/gone"));
    expect(await screen.findByText("This event no longer exists.")).toBeInTheDocument();
    unmount();

    server.use(http.get(`${base}/events/bad`, () => HttpResponse.json("Server error", { status: 500 })));
    render(wrap(<ViewEvent />, "/events/bad"));
    expect(await screen.findByText(/Could not load the event/)).toBeInTheDocument();
  });
});
