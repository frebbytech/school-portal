import React, { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FeeItemsEditor from "./FeeItemsEditor";

const Harness = ({ start = [] }) => {
  const [items, setItems] = useState(start);
  return <FeeItemsEditor items={items} onChange={setItems} />;
};

describe("fee items editor", () => {
  it("adds an item with the Enter key and shows the total", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText("Fee Type"), "Tuition");
    await user.type(screen.getByLabelText("Fee Amount"), "500.50{Enter}");
    expect(screen.getByText("Tuition", { selector: "span, p" })).toBeInTheDocument();
    expect(screen.getAllByText("GHS 500.50").length).toBeGreaterThanOrEqual(2); // the item and the total
    expect(screen.getByLabelText("Fee Amount")).toHaveValue("");
  });

  it("says what is wrong and adds nothing", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText("Fee Type"), "Tuition");
    await user.type(screen.getByLabelText("Fee Amount"), "12.345{Enter}");
    expect(screen.getByText(/at most 2 decimal/i)).toBeInTheDocument();
    expect(screen.getByText("No Fee Available")).toBeInTheDocument();
  });

  it("removes an item", async () => {
    const user = userEvent.setup();
    render(<Harness start={[{ fee: "PTA", amount: 20 }]} />);
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByText("No Fee Available")).toBeInTheDocument();
  });
});
