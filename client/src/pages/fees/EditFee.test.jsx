import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/server";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import EditFee from "./EditFee";

vi.mock("@/components/dialog/CustomDialogTitle", () => ({ default: ({ title }) => <h2>{title}</h2> }));

const base = "http://api.test/api/frebbys/v1";

function setup() {
  const dispatch = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <SchoolSessionContext.Provider
        value={{
          schoolSessionDispatch: dispatch,
          schoolSessionState: { feeEditData: { open: true, data: { _id: "f1", level: "Basic 2", amount: [{ fee: "Tuition", amount: 100 }] } } },
        }}
      >
        <EditFee />
      </SchoolSessionContext.Provider>
    </QueryClientProvider>
  );
  return { dispatch, user: userEvent.setup() };
}

describe("edit fees dialog", () => {
  it("shows the class's fees and warns that changing them affects everyone", async () => {
    setup();
    expect(await screen.findByText("Tuition")).toBeInTheDocument();
    expect(screen.getByText(/including students who have already paid/i)).toBeInTheDocument();
  });

  it("shows the server's reason and stays open when the change is refused", async () => {
    server.use(http.put(`${base}/fees`, () => HttpResponse.json("These fees cannot be lowered to GHS 50.00: at least one student has already paid GHS 30.00 more than that.", { status: 409 })));
    const { dispatch, user } = setup();
    await screen.findByText("Tuition");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot be lowered/);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("closes and confirms when saved", async () => {
    server.use(http.put(`${base}/fees`, () => HttpResponse.json("Fee details has been updated successfully!!!", { status: 201 })));
    const { dispatch, user } = setup();
    await screen.findByText("Tuition");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "setFeeEditData", payload: { open: false, data: {} } })));
  });
});
