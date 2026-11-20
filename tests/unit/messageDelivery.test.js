const { deliverMessage, summarize, clean, plainText } = require("../../common/messageDelivery");

const ok = async () => ({ id: 1 });
const refused = async () => undefined;
const boom = async () => {
  throw new Error("provider down");
};
const run = (type, numbers, emails, send) => deliverMessage({ type, body: {}, numbers, emails, send: { sms: ok, mail: ok, ...send } });

describe("deliverMessage", () => {
  it("sends to the unique, non-empty numbers only", async () => {
    const calls = [];
    const r = await run("sms", ["1", " 1 ", "", null, "2"], [], { sms: async (b, n) => (calls.push(n), true) });
    expect(calls).toEqual([["1", "2"]]);
    expect(r).toMatchObject({ status: "sent", sent: { sms: 2 } });
  });

  it("is 'no-recipients' (and sends nothing) when no requested channel has anyone", async () => {
    let called = false;
    const r = await run("both", [], [], { sms: async () => ((called = true), true) });
    expect(r.status).toBe("no-recipients");
    expect(called).toBe(false);
  });

  it("treats undefined, false and a thrown error as a failed send", async () => {
    expect((await run("sms", ["1"], [], { sms: refused })).status).toBe("failed");
    expect((await run("email", [], ["a@b.c"], { mail: async () => false })).status).toBe("failed");
    expect((await run("sms", ["1"], [], { sms: boom })).status).toBe("failed");
  });

  it("both: reports a partial delivery, and a channel with nobody as skipped", async () => {
    const partial = await run("both", ["1"], ["a@b.c"], { mail: refused });
    expect(partial).toMatchObject({ status: "partial", sent: { sms: 1 }, failed: ["email"] });
    const skipped = await run("both", ["1"], [], {});
    expect(skipped).toMatchObject({ status: "sent", skipped: ["email"] });
  });

  it("rejects an unknown type", async () => {
    await expect(run("fax", ["1"], [], {})).rejects.toThrow();
  });
});

describe("summarize", () => {
  it("says what went where", () => {
    expect(summarize({ status: "sent", sent: { sms: 1, email: 3 }, failed: [], skipped: [] })).toEqual({
      http: 200,
      message: "Message sent to 1 phone number and 3 email addresses.",
    });
  });
  it("answers 422 for nobody to send to, 502 for failure and for a partial delivery", () => {
    expect(summarize({ status: "no-recipients" }, { type: "sms" }).http).toBe(422);
    expect(summarize({ status: "no-recipients" }, { type: "sms", individual: true }).message).toBe("There is no phone number to send to.");
    expect(summarize({ status: "failed", sent: {}, failed: ["sms"] }).http).toBe(502);
    const partial = summarize({ status: "partial", sent: { sms: 2 }, failed: ["email"] });
    expect(partial.http).toBe(502);
    expect(partial.message).toMatch(/sent to 2 phone numbers, but the email could not be sent/);
  });
});

describe("plainText", () => {
  it("turns the editor's HTML into readable text", () => {
    expect(plainText("<p>Hello <strong>parents</strong></p><p>Open &amp; ready</p>")).toBe("Hello parents\nOpen & ready");
    expect(plainText("<ul><li>One</li><li>Two</li></ul>")).toBe("- One\n- Two");
    expect(plainText("a &lt;b&gt; c")).toBe("a <b> c");
  });
  it("is empty for the editor's empty value and for non-text", () => {
    expect(plainText("<p><br></p>")).toBe("");
    expect(plainText(undefined)).toBe("");
    expect(plainText({ a: 1 })).toBe("");
  });
});

describe("clean", () => {
  it("removes blanks and repeats", () => {
    expect(clean([" a ", "a", "", null, "b"])).toEqual(["a", "b"]);
    expect(clean(undefined)).toEqual([]);
  });
});
