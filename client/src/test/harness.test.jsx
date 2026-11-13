import React from "react";
import axios from "axios";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "./server";

// Proves the test tooling works end to end: a component renders in jsdom, and an
// Axios call is answered by a mock handler instead of a real server.
describe("test harness", () => {
  it("renders a component", () => {
    render(<p>School Portal</p>);
    expect(screen.getByText("School Portal")).toBeInTheDocument();
  });

  it("answers API calls with mock handlers", async () => {
    server.use(http.get("http://api.test/ping", () => HttpResponse.json({ ok: true })));
    const res = await axios.get("http://api.test/ping");
    expect(res.data).toEqual({ ok: true });
  });
});
