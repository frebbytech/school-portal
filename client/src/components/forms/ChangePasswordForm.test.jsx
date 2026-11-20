import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChangePasswordForm from "./ChangePasswordForm";

const fill = async (user, { old = "old-password", next = "new-password-1", confirm = next } = {}) => {
  await user.type(screen.getByLabelText("Current password"), old);
  await user.type(screen.getByLabelText("New password"), next);
  await user.type(screen.getByLabelText("Confirm new password"), confirm);
};
const submit = (user) => user.click(screen.getByRole("button", { name: "Change password" }));

describe("change password form", () => {
  it("asks for all three fields and does not call the server", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ChangePasswordForm onSubmit={onSubmit} />);
    await submit(user);
    expect(await screen.findByText("Enter your current password")).toBeInTheDocument();
    expect(await screen.findByText("Enter a new password")).toBeInTheDocument();
    expect(await screen.findByText("Type the new password again")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a short new password", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ChangePasswordForm onSubmit={onSubmit} />);
    await fill(user, { next: "short" });
    await submit(user);
    expect(await screen.findByText("Use at least 8 characters")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a confirmation that does not match", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ChangePasswordForm onSubmit={onSubmit} />);
    await fill(user, { confirm: "different-pass-1" });
    await submit(user);
    expect(await screen.findByText("The two passwords do not match")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a new password equal to the current one", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ChangePasswordForm onSubmit={onSubmit} />);
    await fill(user, { old: "same-password-1", next: "same-password-1" });
    await submit(user);
    expect(await screen.findByText(/must be different from the current one/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends only the current and new password", async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const user = userEvent.setup();
    render(<ChangePasswordForm onSubmit={onSubmit} />);
    await fill(user);
    await submit(user);
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ oldPassword: "old-password", newPassword: "new-password-1" })
    );
  });

  it("shows the server's reason whether it throws a string or an object", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ChangePasswordForm onSubmit={vi.fn().mockRejectedValue("Password is incorrect!!!")} />);
    await fill(user);
    await submit(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Password is incorrect!!!");
    unmount();

    render(<ChangePasswordForm onSubmit={vi.fn().mockRejectedValue({ message: "Unable to reach the server.", code: "NETWORK_ERROR" })} />);
    await fill(user);
    await submit(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to reach the server.");
  });
});
