import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/server";
import { UserContext } from "@/context/providers/UserProvider";
import Receipt from "./Receipt";

const base = "http://api.test/api/frebbys/v1";

const show = (state, path = "/fee/receipt/INV-9") =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <UserContext.Provider value={{ school_info: { name: "Test School" } }}>
        <MemoryRouter initialEntries={[{ pathname: path, state }]}>
          <Routes>
            <Route path="/fee/receipt" element={<Receipt />} />
            <Route path="/fee/receipt/:invoice" element={<Receipt />} />
          </Routes>
        </MemoryRouter>
      </UserContext.Provider>
    </QueryClientProvider>
  );

describe("fee receipt", () => {
  it("shows the amounts and the real balance, not a fixed zero", () => {
    show({ fee: { id: "INV-9", createdAt: "2026-11-13T10:00:00Z", paid: 200, feePaid: 100, outstanding: 300, fee: 600, arreas: 0, paymentMethod: "Cash", payer: { name: "Ama", phonenumber: "0240000000" } } });
    expect(screen.getByText("INV-9")).toBeInTheDocument();
    expect(screen.getAllByText("GHS 300.00").length).toBeGreaterThanOrEqual(2); // balance column + outstanding
    expect(screen.getByText("GHS 200.00")).toBeInTheDocument();
    expect(screen.getByText("Paid This Term :").nextSibling).toHaveTextContent("GHS 300.00");
  });
  it("has no placeholder text", () => {
    show({ fee: { id: "INV-9", paid: 1, outstanding: 0 } });
    expect(screen.queryByText(/lorem ipsum/i)).toBeNull();
  });
  it("says there is no receipt when opened without a payment (for example after a reload)", () => {
    show(undefined, "/fee/receipt");
    expect(screen.getByText("No receipt to show")).toBeInTheDocument();
    expect(screen.queryByText("FEE RECEIPT")).toBeNull();
  });

  it("loads a receipt by its number after a reload or from payment history", async () => {
    server.use(http.get(`${base}/current-fees/receipt/INV-9`, () => HttpResponse.json({ id: "INV-9", paid: 40, outstanding: 60, fee: 100, arreas: 0, feePaid: 0, studentName: "Mensah Efua", levelName: "B2", payer: { name: "Ama" } })));
    show(undefined);
    expect(await screen.findByText("INV-9")).toBeInTheDocument();
    expect(screen.getByText(/Mensah Efua \(B2\)/)).toBeInTheDocument();
    expect(screen.getAllByText("GHS 60.00").length).toBeGreaterThanOrEqual(2);
  });

  it("says so when the receipt number is not found", async () => {
    server.use(http.get(`${base}/current-fees/receipt/INV-9`, () => HttpResponse.json("Receipt not found.", { status: 404 })));
    show(undefined);
    expect(await screen.findByRole("alert")).toHaveTextContent("Receipt not found.");
  });
});
