import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const auth = vi.hoisted(() => ({ value: {} }));
vi.mock("@/context/AuthProvider", () => ({ useAuth: () => auth.value }));
vi.mock("@/hooks/useStudentAuth", () => ({ changePassword: vi.fn() }));

import { changePassword } from "@/hooks/useStudentAuth";
import ProtectedRoute from "./ProtectedRoute";

const renderGate = () =>
  render(
    <MemoryRouter>
      <ProtectedRoute>
        <p>The portal</p>
      </ProtectedRoute>
    </MemoryRouter>
  );

describe("first-login password prompt (student app)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    auth.value = {
      accessToken: "token",
      loading: false,
      mustChangePassword: false,
      passwordChanged: vi.fn(),
      logout: vi.fn(),
    };
  });

  it("shows the portal when the password does not need changing", () => {
    renderGate();
    expect(screen.getByText("The portal")).toBeInTheDocument();
  });

  it("shows the prompt instead of the portal when it does", () => {
    auth.value.mustChangePassword = true;
    renderGate();
    expect(screen.getByText("Choose a new password")).toBeInTheDocument();
    expect(screen.queryByText("The portal")).not.toBeInTheDocument();
  });

  it("changes the password, forgets the remembered one, and lets the student in", async () => {
    auth.value.mustChangePassword = true;
    localStorage.setItem("rememberStudentId", "stu1");
    localStorage.setItem("rememberPassword", "0240000000");
    changePassword.mockResolvedValue({ message: "Password changed" });
    const user = userEvent.setup();
    renderGate();
    await user.type(screen.getByLabelText("Current password"), "0240000000");
    await user.type(screen.getByLabelText("New password"), "my-own-secret");
    await user.type(screen.getByLabelText("Confirm new password"), "my-own-secret");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() =>
      expect(changePassword).toHaveBeenCalledWith({ oldPassword: "0240000000", newPassword: "my-own-secret" })
    );
    await waitFor(() => expect(auth.value.passwordChanged).toHaveBeenCalled());
    expect(localStorage.getItem("rememberPassword")).toBeNull();
    expect(localStorage.getItem("rememberStudentId")).toBe("stu1");
  });

  it("shows the server's reason and stays on the prompt", async () => {
    auth.value.mustChangePassword = true;
    changePassword.mockRejectedValue({ message: "Current password is incorrect" });
    const user = userEvent.setup();
    renderGate();
    await user.type(screen.getByLabelText("Current password"), "nope-nope-1");
    await user.type(screen.getByLabelText("New password"), "my-own-secret");
    await user.type(screen.getByLabelText("Confirm new password"), "my-own-secret");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Current password is incorrect");
    expect(auth.value.passwordChanged).not.toHaveBeenCalled();
  });

  it("goes to sign-in when there is no session", () => {
    auth.value.accessToken = null;
    renderGate();
    expect(screen.queryByText("The portal")).not.toBeInTheDocument();
    expect(screen.queryByText("Choose a new password")).not.toBeInTheDocument();
  });
});
