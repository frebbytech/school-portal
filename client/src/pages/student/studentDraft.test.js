import { beforeEach, describe, expect, it } from "vitest";
import { clearDraft, readDraft, saveDraft } from "./studentDraft";

const FALLBACK = { personal: { firstname: "" } };

describe("add-student draft", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("keeps the draft for the tab only, never in localStorage", () => {
    saveDraft({ personal: { firstname: "Ama" } });
    expect(readDraft(FALLBACK).personal.firstname).toBe("Ama");
    expect(localStorage.getItem("@student-data")).toBeNull();
  });

  it("removes a draft an older version left in localStorage", () => {
    localStorage.setItem("@student-data", JSON.stringify({ personal: { firstname: "Old" } }));
    expect(readDraft(FALLBACK)).toBe(FALLBACK);
    expect(localStorage.getItem("@student-data")).toBeNull();
  });

  it("falls back when there is no draft or it is unreadable", () => {
    expect(readDraft(FALLBACK)).toBe(FALLBACK);
    sessionStorage.setItem("@student-data", "{not json");
    expect(readDraft(FALLBACK)).toBe(FALLBACK);
  });

  it("clears the draft", () => {
    saveDraft({ a: 1 });
    clearDraft();
    expect(readDraft(FALLBACK)).toBe(FALLBACK);
  });
});
