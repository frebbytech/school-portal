import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { _id: "u1" } }) }));
vi.mock("@/api/levelAPI", () => ({ getAllLevels: vi.fn() }));

import { getAllLevels } from "@/api/levelAPI";
import useLevel from "./useLevel";

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

describe("useLevel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("@school_session", JSON.stringify({ sessionId: "s1", termId: "t1" }));
  });

  it("reports loading (not an empty class list) until the first load finishes", async () => {
    getAllLevels.mockResolvedValue({ students: [{ _id: "a" }], levelsOption: [{ _id: "l1" }] });
    const { result } = renderHook(() => useLevel(), { wrapper });
    expect(result.current.levelLoading).toBe(true);
    expect(result.current.students).toEqual([]);
    await waitFor(() => expect(result.current.levelLoading).toBe(false));
    expect(result.current.students).toEqual([{ _id: "a" }]);
  });

  it("exposes why loading failed instead of looking empty", async () => {
    getAllLevels.mockRejectedValue("Could not load classes");
    const { result } = renderHook(() => useLevel(), { wrapper });
    await waitFor(() => expect(result.current.levelError).toBe("Could not load classes"));
    expect(result.current.levelLoading).toBe(false);
    expect(result.current.levelsOption).toEqual([]);
  });

  it("is not stuck loading when there is no session yet", () => {
    localStorage.removeItem("@school_session");
    const { result } = renderHook(() => useLevel(), { wrapper });
    expect(result.current.levelLoading).toBe(false);
    expect(getAllLevels).not.toHaveBeenCalled();
  });

  it("copes with a damaged saved session", () => {
    localStorage.setItem("@school_session", "{broken");
    const { result } = renderHook(() => useLevel(), { wrapper });
    expect(result.current.levelLoading).toBe(false);
  });
});
