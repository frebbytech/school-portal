import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { server } from "@/test/server";
import { UserContext } from "@/context/providers/UserProvider";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import ExamsScoreInput from "./ExamsScoreInput";

vi.mock("@/components/hooks/useLevelById", () => ({
  default: () => ({ gradeSystem: undefined, subjects: [{ _id: "s1", name: "Maths" }] }),
}));

const base = "http://api.test/api/frebbys/v1";

function setup() {
  const dispatch = vi.fn();
  const setTab = vi.fn();
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={["/examination/L1/student?eid=E1&sid=S1"]}>
        <Routes>
          <Route
            path="/examination/:levelId/student"
            element={
              <UserContext.Provider value={{ session: { exams: { scorePreference: "40/60" }, sessionId: "sess", termId: "term" } }}>
                <SchoolSessionContext.Provider value={{ schoolSessionDispatch: dispatch }}>
                  <ExamsScoreInput setTab={setTab} scores={[]} />
                </SchoolSessionContext.Provider>
              </UserContext.Provider>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { user, dispatch, setTab };
}

const pickSubject = async (user) => {
  await user.click(screen.getByLabelText("Subject"));
  await user.click(await screen.findByRole("option", { name: "Maths" }));
};

describe("entering one student's scores", () => {
  it("shows the limits for the term's split", () => {
    setup();
    expect(screen.getByText(/class score out of 40, exams score out of 60/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Class Score (0-40)")).toBeInTheDocument();
    expect(screen.getByLabelText("Exams Score (0-60)")).toBeInTheDocument();
  });

  it("shows a running total and lets Enter add the score", async () => {
    const { user } = setup();
    await pickSubject(user);
    await user.type(screen.getByLabelText("Class Score (0-40)"), "30");
    await user.type(screen.getByLabelText("Exams Score (0-60)"), "45");
    expect(screen.getByText(/Total: 75 \/ 100/)).toBeInTheDocument();
    await user.keyboard("{Enter}");
    const row = await screen.findByRole("row", { name: /Maths/ });
    expect(row).toHaveTextContent("75");
  });

  it("refuses a class score above the term's limit", async () => {
    const { user } = setup();
    await pickSubject(user);
    await user.type(screen.getByLabelText("Class Score (0-40)"), "41");
    expect(await screen.findByText("Class Score should be from 0 - 40")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Score" })).toBeDisabled();
  });

  it("warns before the tab is closed while scores are not saved", async () => {
    const { user } = setup();
    const leave = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(leave()).toBe(false);
    await pickSubject(user);
    await user.type(screen.getByLabelText("Class Score (0-40)"), "10");
    await user.type(screen.getByLabelText("Exams Score (0-60)"), "10{Enter}");
    await screen.findByRole("row", { name: /Maths/ });
    expect(leave()).toBe(true);
  });

  it("keeps the list and shows the server's reason beside it when saving fails", async () => {
    server.use(http.post(`${base}/examinations/update`, () => HttpResponse.json("Exams score must be between 0 and 60", { status: 400 })));
    const { user, setTab } = setup();
    await pickSubject(user);
    await user.type(screen.getByLabelText("Class Score (0-40)"), "10");
    await user.type(screen.getByLabelText("Exams Score (0-60)"), "10{Enter}");
    await user.click(await screen.findByRole("button", { name: "Save Results" }));
    expect(await screen.findByText(/Exams score must be between 0 and 60 Nothing was saved/)).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Maths/ })).toBeInTheDocument();
    expect(setTab).not.toHaveBeenCalled();
  });

  it("returns to the results tab after a successful save", async () => {
    server.use(http.post(`${base}/examinations/update`, () => HttpResponse.json("Saved")));
    const { user, setTab } = setup();
    await pickSubject(user);
    await user.type(screen.getByLabelText("Class Score (0-40)"), "10");
    await user.type(screen.getByLabelText("Exams Score (0-60)"), "10{Enter}");
    await user.click(await screen.findByRole("button", { name: "Save Results" }));
    await waitFor(() => expect(setTab).toHaveBeenCalledWith("1"));
  });
});
