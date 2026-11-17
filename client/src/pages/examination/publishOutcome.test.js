import { describe, expect, it } from "vitest";
import { publishAlert, publishConfirmText, publishFailure, publishOutcome } from "./publishOutcome";

describe("publish outcome", () => {
  it("shows the server's counts and is green when everyone was reached", () => {
    const out = publishOutcome({
      message: "Report cards for 3 students. SMS: 3 sent.",
      sms: { sent: 3, failed: 0, skipped: 0 },
    });
    expect(out).toEqual({ severity: "success", message: "Report cards for 3 students. SMS: 3 sent." });
  });

  it("is a warning when some failed or had no phone or email", () => {
    expect(publishOutcome({ message: "m", sms: { sent: 2, failed: 1, skipped: 0 } }).severity).toBe("warning");
    expect(publishOutcome({ message: "m", sms: { sent: 2, failed: 0, skipped: 0 }, email: { sent: 0, failed: 0, skipped: 2 } }).severity).toBe("warning");
  });

  it("copes with an older server that answers a plain string", () => {
    expect(publishOutcome("ok")).toEqual({ severity: "success", message: "Report cards published." });
  });

  it("shows the server's reason for a failure, whatever shape it throws", () => {
    expect(publishFailure("None of the reports could be sent").message).toBe("None of the reports could be sent");
    expect(publishFailure({ message: "Unable to reach the server.", code: "NETWORK_ERROR" }).message).toBe("Unable to reach the server.");
    expect(publishFailure(undefined).severity).toBe("error");
  });

  it("says which channel the confirmation is about", () => {
    expect(publishConfirmText("email", "Ama")).toContain("by email");
    expect(publishConfirmText("both", "12 students")).toContain("by SMS and email");
  });

  it("builds the alert action", () => {
    expect(publishAlert({ severity: "warning", message: "x" })).toEqual({ type: "showAlert", payload: { severity: "warning", message: "x" } });
  });
});
