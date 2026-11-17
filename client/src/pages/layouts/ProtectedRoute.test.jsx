import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const auth = vi.hoisted(() => ({ value: {} }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => auth.value }));
vi.mock("@/config/sessionHandler", () => ({ getUser: () => ({ id: "u1" }) }));
vi.mock("@/api/userAPI", () => ({ changePassword: vi.fn() }));

import { changePassword } from "@/api/userAPI";
import ProtectedRoute from "./ProtectedRoute";

const renderGate = () =>
  render(
    <MemoryRouter>
      <ProtectedRoute>
        <p>The app</p>
      </ProtectedRoute>
    </MemoryRouter>
  );

describe("first-login password prompt (admin app)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.value = {
      session: { termId: "t1" },
      loading: false,
      user: { id: "u1" },
      mustChangePassword: false,
      passwordChanged: vi.fn(),
      logOutUser: vi.fn(),
    };
  });

  it("shows the app when the password does not need changing", () => {
    renderGate();
    expect(screen.getByText("The app")).toBeInTheDocument();
    expect(screen.queryByText("Choose a new password")).not.toBeInTheDocument();
  });

  it("shows the prompt instead of the app when it does", () => {
    auth.value.mustChangePassword = true;
    renderGate();
    expect(screen.getByText("Choose a new password")).toBeInTheDocument();
    expect(screen.queryByText("The app")).not.toBeInTheDocument();
  });

  it("changes the password for the signed-in user, then lets them in", async () => {
    auth.value.mustChangePassword = true;
    changePassword.mockResolvedValue("User information updated !!!");
    const user = userEvent.setup();
    renderGate();
    await user.type(screen.getByLabelText("Current password"), "temp-password");
    await user.type(screen.getByLabelText("New password"), "my-new-password");
    await user.type(screen.getByLabelText("Confirm new password"), "my-new-password");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() =>
      expect(changePassword).toHaveBeenCalledWith({ id: "u1", oldPassword: "temp-password", newPassword: "my-new-password" })
    );
    await waitFor(() => expect(auth.value.passwordChanged).toHaveBeenCalled());
  });

  it("stays on the prompt and shows the reason when the server refuses", async () => {
    auth.value.mustChangePassword = true;
    changePassword.mockRejectedValue("Password is incorrect!!!");
    const user = userEvent.setup();
    renderGate();
    await user.type(screen.getByLabelText("Current password"), "wrong-password");
    await user.type(screen.getByLabelText("New password"), "my-new-password");
    await user.type(screen.getByLabelText("Confirm new password"), "my-new-password");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Password is incorrect!!!");
    expect(auth.value.passwordChanged).not.toHaveBeenCalled();
  });

  it("offers sign out", async () => {
    auth.value.mustChangePassword = true;
    const user = userEvent.setup();
    renderGate();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(auth.value.logOutUser).toHaveBeenCalled();
  });
});
