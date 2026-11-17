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

export const publishFailure = (error) => ({
  severity: "error",
  message: thrownMessage(error, "The report cards could not be published. Please try again."),
});

// The action the screens dispatch to show an outcome.
export const publishAlert = ({ severity, message }) => ({ type: "showAlert", payload: { severity, message } });
