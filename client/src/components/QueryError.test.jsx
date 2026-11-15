import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QueryError from "./QueryError";

describe("QueryError", () => {
  it("says what failed and why, and retries on request", async () => {
    const onRetry = vi.fn();
    render(<QueryError what="today's payments" error="You do not have permission to perform this action." onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load today's payments. You do not have permission");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
  it("copes with an object error and no retry", () => {
    render(<QueryError error={{ message: "Offline" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Offline");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
