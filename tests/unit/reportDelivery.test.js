const { channelsFor, deliverReports, summarizeDelivery, failureMessage } = require("../../common/reportDelivery");

const students = () => [
  { fullName: "Ama", phonenumber: "0240000001", email: "ama@x.com", report_id: "a" },
  { fullName: "Kofi", phonenumber: "", email: "kofi@x.com", report_id: "b" },
  { fullName: "Esi", phonenumber: "0240000003", email: "", report_id: "c" },
  { fullName: "Yaw", phonenumber: "0240000004", email: "yaw@x.com", report_id: "d" },
];

describe("channels", () => {
  it("knows sms, email and both, and nothing else", () => {
    expect(channelsFor("sms")).toEqual(["sms"]);
    expect(channelsFor("email")).toEqual(["email"]);
    expect(channelsFor("both")).toEqual(["sms", "email"]);
    expect(channelsFor("fax")).toBeNull();
  });
});

describe("delivery", () => {
  it("counts sent, failed and skipped per channel, and names who missed out", async () => {
    const send = {
      sms: async (r) => (r.fullName === "Yaw" ? undefined : "ok"),
      mail: async () => "message-id",
    };
    const results = students();
    const outcomes = await deliverReports({ results, type: "both", send, prepare: async () => ["a", "b", "c"] });
    const s = summarizeDelivery(outcomes, { total: 4, type: "both" });
    expect(s.sms).toEqual({ sent: 2, failed: 1, skipped: 1 });
    // Yaw's PDF was not made (failed); Esi has no email (skipped)
    expect(s.email).toEqual({ sent: 2, failed: 1, skipped: 1 });
    expect(s.failedNames).toEqual(["Yaw"]);
    expect(s.skippedNames.sort()).toEqual(["Esi", "Kofi"]);
    expect(s.delivered).toBe(true);
    expect(s.allFailed).toBe(false);
    expect(s.message).toContain("SMS: 2 sent, 1 failed, 1 without a phone number");
  });

  it("does not send to people without a phone or email", async () => {
    const sms = jest.fn().mockResolvedValue("ok");
    await deliverReports({ results: students(), type: "sms", send: { sms }, prepare: async () => [] });
    expect(sms).toHaveBeenCalledTimes(3);
  });

  it("treats a thrown error as one failed message, not a failed batch", async () => {
    const send = { sms: async (r) => { if (r.fullName === "Ama") throw new Error("boom"); return "ok"; } };
    const outcomes = await deliverReports({ results: students(), type: "sms", send, prepare: async () => [] });
    const s = summarizeDelivery(outcomes, { total: 4, type: "sms" });
    expect(s.sms).toEqual({ sent: 2, failed: 1, skipped: 1 });
  });

  it("reports an outage: everything tried failed", async () => {
    const outcomes = await deliverReports({ results: students(), type: "sms", send: { sms: async () => undefined }, prepare: async () => [] });
    const s = summarizeDelivery(outcomes, { total: 4, type: "sms" });
    expect(s.allFailed).toBe(true);
    expect(failureMessage(s, "sms")).toMatch(/None of the reports could be sent/);
  });

  it("reports when nobody has a contact detail", async () => {
    const results = [{ fullName: "Ama", report_id: "a" }, { fullName: "Kofi", report_id: "b" }];
    const outcomes = await deliverReports({ results, type: "email", send: { mail: jest.fn() }, prepare: async () => ["a", "b"] });
    const s = summarizeDelivery(outcomes, { total: 2, type: "email" });
    expect(s.nobodyReachable).toBe(true);
    expect(failureMessage(s, "email")).toBe("None of the 2 students has an email address on record, so nothing was sent.");
  });

  it("says it in the singular for one student", async () => {
    const outcomes = await deliverReports({ results: [{ fullName: "Ama" }], type: "sms", send: { sms: jest.fn() }, prepare: async () => [] });
    const s = summarizeDelivery(outcomes, { total: 1, type: "sms" });
    expect(failureMessage(s, "sms")).toBe("This student has no phone number on record, so nothing was sent.");
  });

  it("counts every report as failed when the PDFs cannot be prepared", async () => {
    const mail = jest.fn().mockResolvedValue("id");
    const outcomes = await deliverReports({
      results: students(), type: "email", send: { mail }, prepare: async () => { throw new Error("no browser"); },
    });
    expect(mail).not.toHaveBeenCalled();
    expect(summarizeDelivery(outcomes, { total: 4, type: "email" }).allFailed).toBe(true);
  });
});
