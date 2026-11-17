import { thrownMessage } from "@/lib/formErrors";

const CHANNEL_WORDS = { sms: "by SMS", email: "by email", both: "by SMS and email" };

// What the confirmation box says before anything is sent.
export const publishConfirmText = (value, who) =>
  `You are about to send the report card of ${who} ${CHANNEL_WORDS[value] || "by SMS"}. Do you wish to continue?`;

// What to tell the person once the server has answered. The server returns counts
// ({ message, sms: {sent, failed, skipped}, email: {...} }); an older server returned the
// plain string "ok", which is all that can be said for it.
export const publishOutcome = (data) => {
  if (data && typeof data === "object" && typeof data.message === "string") {
    const channels = [data.sms, data.email].filter(Boolean);
    const missedOut = channels.some((c) => c.failed > 0 || c.skipped > 0);
    return { severity: missedOut ? "warning" : "success", message: data.message };
  }
  return { severity: "success", message: "Report cards published." };
};

// The same, for the "finished" message that arrives over the socket (or a stored publication):
// { status: "completed" | "failed", message, summary }.
export const finishedOutcome = (publication) => {
  if (publication?.status === "failed") {
    return { severity: "error", message: publication.message || "Publishing failed." };
  }
  return publishOutcome({ message: publication?.message, ...(publication?.summary || {}) });
};

export const isActive = (publication) => publication?.status === "queued" || publication?.status === "running";

// "Preparing reports 3 of 10", "Sending messages 12 of 60", "Waiting to start"
export const progressLabel = (publication) => {
  if (!isActive(publication)) return "";
  const { phase, done = 0, total = 0 } = publication;
  if (publication.status === "queued" || !phase) return "Waiting to start";
  const what = phase === "preparing" ? "Preparing reports" : "Sending messages";
  return total ? `${what} ${done} of ${total}` : what;
};

export const progressPercent = (publication) => {
  const { done = 0, total = 0 } = publication || {};
  return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
};

export const publishFailure = (error) => ({
  severity: "error",
  message: thrownMessage(error, "The report cards could not be published. Please try again."),
});

// The action the screens dispatch to show an outcome.
export const STARTED_MESSAGE =
  "Publishing has started. You can keep working; you will be told here when it finishes.";

export const publishAlert = ({ severity, message }) => ({ type: "showAlert", payload: { severity, message } });
