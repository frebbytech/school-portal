jest.mock("axios", () => jest.fn());

const axios = require("axios");
const { sendSMS, smsText } = require("../../config/sms/messenger");

describe("smsText", () => {
  it("is the title, then the message on the next line, with no stray spaces", () => {
    expect(smsText({ title: "Fees", message: "Pay by Friday" })).toBe("Fees\nPay by Friday");
  });
  it("has no 'undefined' when there is no title or no message", () => {
    expect(smsText({ message: "Only text" })).toBe("Only text");
    expect(smsText({ title: "Only title" })).toBe("Only title");
    expect(smsText({ title: "  ", message: undefined })).toBe("");
    expect(smsText(undefined)).toBe("");
  });
});

describe("sendSMS", () => {
  it("posts that text to the provider and returns its answer", async () => {
    axios.mockResolvedValueOnce({ data: { ok: 1 } });
    const out = await sendSMS({ title: "Hi", message: "There" }, ["0240000001"]);
    expect(out).toEqual({ ok: 1 });
    expect(axios.mock.calls[0][0].data).toMatchObject({ message: "Hi\nThere", recipients: ["0240000001"] });
  });
  it("returns nothing (a failed send) when the provider is unreachable", async () => {
    axios.mockRejectedValueOnce(new Error("down"));
    expect(await sendSMS({ title: "Hi", message: "There" }, ["0240000001"])).toBeUndefined();
  });
});
