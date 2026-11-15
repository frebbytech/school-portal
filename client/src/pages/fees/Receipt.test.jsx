import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UserContext } from "@/context/providers/UserProvider";
import Receipt from "./Receipt";

const show = (state) =>
  render(
    <UserContext.Provider value={{ school_info: { name: "Test School" } }}>
      <MemoryRouter initialEntries={[{ pathname: "/fee/receipt", state }]}>
        <Receipt />
      </MemoryRouter>
    </UserContext.Provider>
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
    show(undefined);
    expect(screen.getByText("No receipt to show")).toBeInTheDocument();
    expect(screen.queryByText("FEE RECEIPT")).toBeNull();
  });
});
