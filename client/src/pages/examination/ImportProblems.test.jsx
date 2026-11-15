import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ImportProblems from "./ImportProblems";

describe("import problem list", () => {
  it("shows nothing when every row is fine", () => {
    const { container } = render(<ImportProblems problems={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists each row with its reason", () => {
    render(<ImportProblems problems={[{ row: 3, indexnumber: "ab2", message: "Class score must be from 0 to 40" }, { row: 7, indexnumber: "", message: "No index number" }]} />);
    expect(screen.getByText("2 rows will not be imported")).toBeInTheDocument();
    expect(screen.getByText("Class score must be from 0 to 40")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /3 ab2/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /7 – No index number/ })).toBeInTheDocument();
  });

  it("uses the singular for one row", () => {
    render(<ImportProblems problems={[{ row: 2, indexnumber: "x", message: "m" }]} />);
    expect(screen.getByText("1 row will not be imported")).toBeInTheDocument();
  });
});
