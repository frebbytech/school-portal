import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { server } from "@/test/server";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import SMSBulk from "./SMSBulk";
import SMSQuick from "./SMSQuick";
import SMSHome from "./SMSHome";
import { plainText, messageSchema } from "./messageRules";
import { recipientText } from "./SMSView";

vi.mock("sweetalert2", () => ({ default: { fire: vi.fn() } }));
vi.mock("@/components/spinners/LoadingSpinner", () => ({ default: () => null }));
vi.mock("@/components/custom/CustomTitle", () => ({ default: ({ title }) => <h1>{title}</h1> }));
vi.mock("./SMSView", async (original) => ({ ...(await original()), default: () => null }));
// The rich-text editor is not what is under test: a plain box that gives its text back
vi.mock("@/components/custom/TextEditor", () => ({
  default: ({ label, value, setValue, touched, errors }) => (
    <div>
      <textarea aria-label={label} value={value} onChange={(e) => setValue(e.target.value)} />
      {touched && errors && <p>{errors}</p>}
    </div>
  ),
}));
vi.mock("@/components/tables/CustomizedMaterialTable", () => ({
  default: ({ data = [] }) => <ul>{data.map((m) => <li key={m._id}>{m.body?.title}</li>)}</ul>,
}));

const base = "http://api.test/api/frebbys/v1";
const dispatch = vi.fn();
const wrap = (ui) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <SchoolSessionContext.Provider value={{ schoolSessionDispatch: dispatch }}>
      <MemoryRouter initialEntries={["/messages/new"]}>
        <Routes>
          <Route path="/messages/new" element={ui} />
          <Route path="/messages" element={<p>messages list</p>} />
        </Routes>
      </MemoryRouter>
    </SchoolSessionContext.Provider>
  </QueryClientProvider>
);

beforeEach(() => {
  Swal.fire.mockReset().mockResolvedValue({ isConfirmed: true });
  dispatch.mockClear();
});

describe("message rules", () => {
  it("reads the editor's HTML as text and treats its empty value as nothing", () => {
    expect(plainText("<p>Hello <b>all</b></p>")).toBe("Hello all");
    expect(plainText("<p><br></p>")).toBe("");
  });
  it("asks for a phone number only when an SMS is chosen, and an address only for email", () => {
    const keys = (type) => Object.keys(messageSchema(type, { individual: true }).fields).sort();
    expect(keys("sms")).toEqual(["message", "phonenumber", "title"]);
    expect(keys("email")).toEqual(["email", "message", "title"]);
    expect(keys("both")).toEqual(["email", "message", "phonenumber", "title"]);
    expect(Object.keys(messageSchema(null).fields).sort()).toEqual(["message", "title"]);
  });
  it("says who a message went to", () => {
    expect(recipientText({ type: "Individual", phonenumber: ["0240000001"], email: [] })).toBe("0240000001");
    expect(recipientText({ type: "students", phonenumber: ["1", "2"], email: ["a@b.c"] })).toBe("students (2 phone numbers, 1 email address)");
    expect(recipientText({ type: "parents" })).toBe("parents");
    expect(recipientText(undefined)).toBe("");
  });
});

describe("bulk message", () => {
  const fill = async (title = "Closing early", message = "School closes at noon") => {
    await userEvent.type(screen.getByLabelText(/message title/i), title);
    if (message) await userEvent.type(screen.getByLabelText("Message"), message);
  };
  const send = () => userEvent.click(screen.getByRole("button", { name: /send message/i }));

  it("asks for a title and a message, and sends nothing", async () => {
    let called = false;
    server.use(http.post(`${base}/messages/bulk`, () => ((called = true), HttpResponse.json("ok"))));
    render(wrap(<SMSBulk />));
    await send();
    expect(await screen.findByText("Enter a title")).toBeInTheDocument();
    expect(screen.getByText("Write a message")).toBeInTheDocument();
    expect(called).toBe(false);
    expect(Swal.fire).not.toHaveBeenCalled();
  });

  it("treats the editor's empty value as no message", async () => {
    render(wrap(<SMSBulk />));
    await fill("Hello", "");
    await userEvent.type(screen.getByLabelText("Message"), "<p><br></p>");
    await send();
    expect(await screen.findByText("Write a message")).toBeInTheDocument();
  });

  it("asks before sending to a whole group, then sends type, group, title and message", async () => {
    let body;
    server.use(
      http.post(`${base}/messages/bulk`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json("Message sent to 12 phone numbers.");
      })
    );
    render(wrap(<SMSBulk />));
    await fill();
    await send();
    expect(await screen.findByText("messages list")).toBeInTheDocument();
    const asked = Swal.fire.mock.calls[0][0];
    expect(asked.title).toBe("Send to all students?");
    expect(asked.text).toMatch(/cannot be undone/);
    expect(body).toEqual({ type: "sms", group: "students", title: "Closing early", message: "School closes at noon", rate: "bulk" });
  });

  it("sends nothing when the confirmation is declined", async () => {
    Swal.fire.mockResolvedValue({ isConfirmed: false });
    let called = false;
    server.use(http.post(`${base}/messages/bulk`, () => ((called = true), HttpResponse.json("ok"))));
    render(wrap(<SMSBulk />));
    await fill();
    await send();
    await vi.waitFor(() => expect(Swal.fire).toHaveBeenCalled());
    expect(called).toBe(false);
    expect(screen.queryByText("messages list")).toBeNull();
  });

  it("shows the server's reason above the form and keeps what was typed", async () => {
    server.use(http.post(`${base}/messages/bulk`, () => HttpResponse.json("No one in this group has a phone number on record, so nothing was sent.", { status: 422 })));
    render(wrap(<SMSBulk />));
    await fill();
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent("No one in this group has a phone number");
    expect(screen.getByLabelText(/message title/i)).toHaveValue("Closing early");
    expect(screen.queryByText("messages list")).toBeNull();
  });
});

describe("quick message", () => {
  const send = () => userEvent.click(screen.getByRole("button", { name: /send message/i }));

  it("needs a valid phone number for an SMS", async () => {
    render(wrap(<SMSQuick />));
    await userEvent.type(screen.getByLabelText(/phone no/i), "12");
    await userEvent.type(screen.getByLabelText(/message title/i), "Hi");
    await userEvent.type(screen.getByLabelText("Message"), "Hello");
    await send();
    expect(await screen.findByText("Enter a valid phone number")).toBeInTheDocument();
  });

  it("an email message shows no phone box and sends no phone number", async () => {
    let body;
    server.use(
      http.post(`${base}/messages/quick`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json("Message sent to 1 email address.");
      })
    );
    render(wrap(<SMSQuick />));
    await userEvent.click(screen.getByLabelText("Email"));
    expect(screen.queryByLabelText(/phone no/i)).toBeNull();
    await userEvent.type(screen.getByLabelText(/email address/i), "kofi@example.com");
    await userEvent.type(screen.getByLabelText(/message title/i), "Hi");
    await userEvent.type(screen.getByLabelText("Message"), "Hello");
    await send();
    expect(await screen.findByText("messages list")).toBeInTheDocument();
    expect(body).toEqual({ type: "email", title: "Hi", message: "Hello", rate: "quick", email: "kofi@example.com" });
  });

  it("shows the server's refusal and stays on the form", async () => {
    server.use(http.post(`${base}/messages/quick`, () => HttpResponse.json("Couldn't send the message. Please try again later.", { status: 502 })));
    render(wrap(<SMSQuick />));
    await userEvent.type(screen.getByLabelText(/phone no/i), "0240000001");
    await userEvent.type(screen.getByLabelText(/message title/i), "Hi");
    await userEvent.type(screen.getByLabelText("Message"), "Hello");
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't send the message");
    expect(screen.getByLabelText(/phone no/i)).toHaveValue("0240000001");
  });
});

describe("messages list", () => {
  it("shows a Try again banner when the messages cannot be loaded, not an empty list", async () => {
    let calls = 0;
    server.use(
      http.get(`${base}/messages`, () => {
        calls += 1;
        return calls === 1 ? HttpResponse.json("Server busy", { status: 500 }) : HttpResponse.json([{ _id: "m1", body: { title: "Fees reminder" } }]);
      })
    );
    render(wrap(<SMSHome />));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the messages");
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Fees reminder")).toBeInTheDocument();
  });
});
