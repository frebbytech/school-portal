import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { server } from "@/test/server";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import NotesBoard from "./index";

// Dragging itself is the library's job: the mock hands the drop handler to the test.
const drag = { end: null };
vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children, onDragEnd }) => {
    drag.end = onDragEnd;
    return <div>{children}</div>;
  },
  Droppable: ({ children }) => children({ innerRef: () => {}, droppableProps: {}, placeholder: null }),
  Draggable: ({ children }) => children({ innerRef: () => {}, draggableProps: {}, dragHandleProps: {} }),
}));
vi.mock("@/components/custom/CustomTitle", () => ({ default: ({ title, right }) => <div><h1>{title}</h1>{right}</div> }));
vi.mock("@/components/skeleton/NoteSkeleton", () => ({ default: () => <p>loading</p> }));
vi.mock("@/components/EmptyDataContainer", () => ({ default: () => <p>no notes</p> }));

const base = "http://api.test/api/frebbys/v1";
const dispatch = vi.fn();
const wrap = (ui) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <SchoolSessionContext.Provider value={{ schoolSessionDispatch: dispatch }}>{ui}</SchoolSessionContext.Provider>
  </QueryClientProvider>
);
const note = (n) => ({ _id: `n${n}`, title: `Note ${n}`, content: `Content ${n}`, color: "#ffc09f" });
const titles = () => screen.getAllByRole("heading", { level: 6 }).map((h) => h.textContent);

beforeEach(() => dispatch.mockClear());

describe("notes board", () => {
  it("shows the notes, and a Try again banner (not an empty board) when loading fails", async () => {
    server.use(http.get(`${base}/notes`, () => HttpResponse.json([note(1), note(2)])));
    const { unmount } = render(wrap(<NotesBoard />));
    expect(await screen.findByText("Note 1")).toBeInTheDocument();
    unmount();

    server.use(http.get(`${base}/notes`, () => HttpResponse.json({ message: "boom" }, { status: 500 })));
    render(wrap(<NotesBoard />));
    expect(await screen.findByText(/Could not load your notes/)).toBeInTheDocument();
    expect(screen.queryByText("no notes")).toBeNull();
  });

  it("saves the new order when a note is dropped, and shows it at once", async () => {
    let sent;
    server.use(
      http.get(`${base}/notes`, () => HttpResponse.json([note(1), note(2), note(3)])),
      http.put(`${base}/notes/order`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ message: "Order saved" });
      })
    );
    render(wrap(<NotesBoard />));
    await screen.findByText("Note 1");
    act(() => drag.end({ source: { index: 0 }, destination: { index: 2 } }));
    await waitFor(() => expect(sent).toEqual({ ids: ["n2", "n3", "n1"] }));
    expect(titles()).toEqual(["Note 2", "Note 3", "Note 1"]);
  });

  it("puts the old order back, and says why, when the order cannot be saved", async () => {
    server.use(
      http.get(`${base}/notes`, () => HttpResponse.json([note(1), note(2)])),
      http.put(`${base}/notes/order`, () => HttpResponse.json({ message: "Note not found" }, { status: 404 }))
    );
    render(wrap(<NotesBoard />));
    await screen.findByText("Note 1");
    act(() => drag.end({ source: { index: 0 }, destination: { index: 1 } }));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    await waitFor(() => expect(titles()).toEqual(["Note 1", "Note 2"]));
  });

  it("keeps the form open, with what was typed, when a note is refused", async () => {
    server.use(
      http.get(`${base}/notes`, () => HttpResponse.json([note(1)])),
      http.post(`${base}/notes`, () => HttpResponse.json({ message: "Title cannot exceed 50 characters" }, { status: 400 }))
    );
    render(wrap(<NotesBoard />));
    await screen.findByText("Note 1");
    await userEvent.click(screen.getByRole("button", { name: /New Note/ }));
    await screen.findByLabelText("Title");
    await userEvent.type(screen.getByLabelText("Title"), "My title");
    await userEvent.type(screen.getByLabelText("Content"), "My content");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(screen.getByLabelText("Title")).toHaveValue("My title");
  });

  it("closes the form once the note is saved", async () => {
    server.use(
      http.get(`${base}/notes`, () => HttpResponse.json([note(1)])),
      http.post(`${base}/notes`, () => HttpResponse.json(note(2), { status: 201 }))
    );
    render(wrap(<NotesBoard />));
    await screen.findByText("Note 1");
    await userEvent.click(screen.getByRole("button", { name: /New Note/ }));
    await screen.findByLabelText("Title");
    await userEvent.type(screen.getByLabelText("Title"), "Another");
    await userEvent.type(screen.getByLabelText("Content"), "Text");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(screen.queryByLabelText("Title")).toBeNull());
  });
});
