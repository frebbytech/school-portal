import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "./LoginForm";

const fill = async (user, name = "teacher1", pass = "password1") => {
  await user.type(screen.getByLabelText("Username"), name);
  await user.type(screen.getByLabelText("Password"), pass);
};

describe("sign-in form", () => {
  it("asks for both fields and does not call the server", async () => {
    const onLogin = vi.fn();
    const user = userEvent.setup();
    render(<LoginForm onLogin={onLogin} />);
    await user.click(screen.getByRole("button", { name: "LOG INTO ACCOUNT" }));
    expect(await screen.findAllByText("Required*")).toHaveLength(2);
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("submits with the Enter key", async () => {
    const onLogin = vi.fn().mockResolvedValue();
    const user = userEvent.setup();
    render(<LoginForm onLogin={onLogin} />);
    await fill(user);
    await user.type(screen.getByLabelText("Password"), "{Enter}");
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith({ username: "teacher1", password: "password1" }));
  });

  it("shows the server's reason when the string is thrown", async () => {
    const user = userEvent.setup();
    render(<LoginForm onLogin={vi.fn().mockRejectedValue("Invalid username or password")} />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "LOG INTO ACCOUNT" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password");
  });

  it("shows a network failure object as text instead of crashing", async () => {
    const user = userEvent.setup();
    render(<LoginForm onLogin={vi.fn().mockRejectedValue({ message: "Unable to reach the server.", code: "NETWORK_ERROR" })} />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "LOG INTO ACCOUNT" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to reach the server.");
  });

  it("shows a notice passed in (for example 'session expired')", () => {
    render(<LoginForm onLogin={vi.fn()} notice="Session has expired" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Session has expired");
  });

  it("lets the browser fill saved logins", () => {
    render(<LoginForm onLogin={vi.fn()} />);
    expect(screen.getByLabelText("Username")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
  });
});
