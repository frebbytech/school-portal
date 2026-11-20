// Sending a staff message (SMS and/or email) and saying truthfully what happened.
//
// Before, every message route answered "Message delivered successfully!!!" whether or not
// anything was delivered: the senders log and swallow their errors, a group with no phone
// numbers or no emails "succeeded" with nobody to send to, and the "teachers" group read
// an unused collection, so it messaged nobody. Here the channels that have recipients are
// attempted, each outcome is checked, and the answer says what went where.
// Pure apart from the injected `send` functions, so it is easy to test.

const TYPES = { sms: ["sms"], email: ["email"], both: ["sms", "email"] };

const WORDS = {
  sms: ["phone number", "phone numbers", "SMS"],
  email: ["email address", "email addresses", "email"],
};

const clean = (list) => [
  ...new Set(
    (Array.isArray(list) ? list : [])
      .map((v) => (typeof v === "string" ? v.trim() : v))
      .filter(Boolean)
  ),
];

const count = (n, channel) => `${n} ${WORDS[channel][n === 1 ? 0 : 1]}`;
const joinAnd = (parts) => parts.join(" and ");
const failedFailed = (v) => v === undefined || v === null || v === false;

/**
 * Tries each requested channel that has recipients.
 * Returns { status, sent: {sms?: n, email?: n}, failed: [channel], skipped: [channel] }
 * where status is "sent", "partial", "failed" or "no-recipients".
 */
async function deliverMessage({ type, body, numbers, emails, send }) {
  const channels = TYPES[type];
  if (!channels) throw new Error(`Unknown message type: ${type}`);

  const lists = { sms: clean(numbers), email: clean(emails) };
  const plan = channels.filter((c) => lists[c].length > 0);
  const skipped = channels.filter((c) => lists[c].length === 0);
  if (plan.length === 0) return { status: "no-recipients", sent: {}, failed: [], skipped };

  const sent = {};
  const failed = [];
  for (const channel of plan) {
    let out;
    try {
      out = await (channel === "sms" ? send.sms(body, lists.sms) : send.mail(body, lists.email));
    } catch {
      out = undefined;
    }
    if (failedFailed(out)) failed.push(channel);
    else sent[channel] = lists[channel].length;
  }

  const status = failed.length === 0 ? "sent" : Object.keys(sent).length ? "partial" : "failed";
  return { status, sent, failed, skipped };
}

// What to answer: { http, message }. `individual` = one person, not a group.
function summarize(result, { type, individual = false } = {}) {
  const sentText = joinAnd(Object.entries(result.sent || {}).map(([c, n]) => count(n, c)));

  if (result.status === "no-recipients") {
    const wanted = TYPES[type] || [];
    const what = wanted.map((c) => (c === "sms" ? "a phone number" : "an email address")).join(" or ");
    return {
      http: 422,
      message: individual
        ? `There is no ${wanted.map((c) => (c === "sms" ? "phone number" : "email address")).join(" or ")} to send to.`
        : `No one in this group has ${what} on record, so nothing was sent.`,
    };
  }
  if (result.status === "failed") {
    return { http: 502, message: "Couldn't send the message. Please try again later." };
  }
  if (result.status === "partial") {
    const lost = joinAnd((result.failed || []).map((c) => WORDS[c][2]));
    return { http: 502, message: `The message was sent to ${sentText}, but the ${lost} could not be sent. Please try again later.` };
  }
  const note = (result.skipped || []).length
    ? ` No ${joinAnd((result.skipped || []).map((c) => WORDS[c][2]))} was sent: nobody had ${joinAnd((result.skipped || []).map((c) => (c === "sms" ? "a phone number" : "an email address")))} on record.`
    : "";
  return { http: 200, message: `Message sent to ${sentText}.${note}` };
}

// The message editor produces HTML (<p>Hello</p>). An email can show that, an SMS cannot:
// it used to go out with the tags in it. This is the readable text of the same message.
// Also how "nothing written" is told (the editor's empty value is "<p><br></p>").
const ENTITIES = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

function plainText(html) {
  if (typeof html !== "string") return "";
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m])
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

module.exports = { deliverMessage, summarize, clean, plainText, TYPES };
