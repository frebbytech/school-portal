import { describe, expect, it } from "vitest";
import {
  finishedOutcome,
  isActive,
  progressLabel,
  progressPercent,
  publishAlert,
  publishConfirmText,
  publishFailure,
  publishOutcome,
} from "./publishOutcome";

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

  it("turns a finished publication into the message to show", () => {
    expect(
      finishedOutcome({ status: "completed", message: "Report cards for 2 students. SMS: 2 sent.", summary: { sms: { sent: 2, failed: 0, skipped: 0 } } })
    ).toEqual({ severity: "success", message: "Report cards for 2 students. SMS: 2 sent." });
    expect(
      finishedOutcome({ status: "completed", message: "m", summary: { sms: { sent: 1, failed: 1, skipped: 0 } } }).severity
    ).toBe("warning");
    expect(finishedOutcome({ status: "failed", message: "None of the reports could be sent" })).toEqual({
      severity: "error",
      message: "None of the reports could be sent",
    });
  });

  it("describes progress in words and as a percentage", () => {
    expect(progressLabel({ status: "queued" })).toBe("Waiting to start");
    expect(progressLabel({ status: "running", phase: "preparing", done: 3, total: 10 })).toBe("Preparing reports 3 of 10");
    expect(progressLabel({ status: "running", phase: "sending", done: 12, total: 60 })).toBe("Sending messages 12 of 60");
    expect(progressLabel({ status: "completed" })).toBe("");
    expect(progressPercent({ done: 12, total: 60 })).toBe(20);
    expect(progressPercent({ done: 0, total: 0 })).toBe(0);
    expect(isActive({ status: "running" })).toBe(true);
    expect(isActive({ status: "failed" })).toBe(false);
  });
});
