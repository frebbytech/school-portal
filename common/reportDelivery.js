// Sending published report cards (SMS and/or email) and saying truthfully what happened.
//
// Before, every publish answered "ok" even when the SMS provider or the mail server had
// refused every message (the senders log and swallow their errors), and one failing
// message could turn a mostly-successful batch into an error. Here each message is
// attempted on its own and counted: sent, failed, or skipped (no phone / email on record).
// Pure apart from the injected `send` and `prepare` functions, so it is easy to test.

const CHANNELS = { sms: ["sms"], email: ["email"], both: ["sms", "email"] };

const channelsFor = (type) => CHANNELS[type] || null;

const nameOf = (r) => r?.fullName || r?.indexnumber || "A student";

const LABEL = { sms: "SMS", email: "Email" };
const MISSING = { sms: "without a phone number", email: "without an email address" };

/**
 * Attempts every message and returns the per-message outcomes.
 *   results  report objects (fullName, indexnumber, phonenumber, email, report_id, ...)
 *   send     { sms(result) -> value | undefined, mail(result) -> value | undefined }
 *            (undefined means "not sent", which is what the senders return on failure)
 *   prepare  async (results) -> array of report_id whose PDF exists (needed for email)
 *   limit    optional concurrency limiter, (fn) => Promise
 */
async function deliverReports({ results, type, send, prepare, limit = (fn) => fn() }) {
  const channels = channelsFor(type);
  if (!channels) throw new Error(`Unknown publish type: ${type}`);

  let ready = new Set();
  if (channels.includes("email")) {
    try {
      // Only people who can receive it need their PDF made.
      ready = new Set(await prepare(results.filter((r) => r?.email && String(r.email).trim())));
    } catch {
      ready = new Set();
    }
  }

  const attempt = async (channel, result) => {
    const address = channel === "sms" ? result?.phonenumber : result?.email;
    if (!address || !String(address).trim()) return "skipped";
    if (channel === "email" && !ready.has(result?.report_id)) return "failed";
    try {
      const out = await (channel === "sms" ? send.sms(result) : send.mail(result));
      return out === undefined || out === null || out === false ? "failed" : "sent";
    } catch {
      return "failed";
    }
  };

  const tasks = [];
  for (const result of results) {
    for (const channel of channels) {
      tasks.push(limit(async () => ({ channel, result, status: await attempt(channel, result) })));
    }
  }
  return Promise.all(tasks);
}

/** Counts per channel, who missed out, and a sentence for the screen. */
function summarizeDelivery(outcomes, { total, type }) {
  const channels = channelsFor(type) || [];
  const counts = {};
  for (const ch of channels) counts[ch] = { sent: 0, failed: 0, skipped: 0 };
  const failedNames = new Set();
  const skippedNames = new Set();

  for (const { channel, result, status } of outcomes) {
    counts[channel][status] += 1;
    if (status === "failed") failedNames.add(nameOf(result));
    if (status === "skipped") skippedNames.add(nameOf(result));
  }

  const sentAny = channels.some((ch) => counts[ch].sent > 0);
  const attemptedAny = channels.some((ch) => counts[ch].sent + counts[ch].failed > 0);

  const parts = channels.map((ch) => {
    const c = counts[ch];
    const bits = [`${c.sent} sent`];
    if (c.failed) bits.push(`${c.failed} failed`);
    if (c.skipped) bits.push(`${c.skipped} ${MISSING[ch]}`);
    return `${LABEL[ch]}: ${bits.join(", ")}`;
  });

  const cap = (set) => [...set].slice(0, 20);
  return {
    total,
    ...counts,
    failedNames: cap(failedNames),
    skippedNames: cap(skippedNames),
    delivered: sentAny,
    // Nothing went out although something was tried: the provider or mail server is the problem.
    allFailed: attemptedAny && !sentAny,
    // Nothing could even be tried: nobody has the contact detail needed.
    nobodyReachable: !attemptedAny,
    message: `Report cards for ${total} student${total === 1 ? "" : "s"}. ${parts.join(". ")}.`,
  };
}

/** Message for the two failing cases, so the screen shows a reason instead of "ok". */
function failureMessage(summary, type) {
  if (summary.allFailed) {
    return `None of the reports could be sent (${summary.message.replace(/^Report cards for [^.]*\. /, "")}) Check the SMS or email settings and try again.`;
  }
  const what = type === "email" ? "an email address" : type === "sms" ? "a phone number" : "a phone number or email address";
  return summary.total === 1
    ? `This student has no ${what.replace(/^an? /, "")} on record, so nothing was sent.`
    : `None of the ${summary.total} students has ${what} on record, so nothing was sent.`;
}

module.exports = { channelsFor, deliverReports, summarizeDelivery, failureMessage };
