// React Hook Form helpers: turn a failed request into a message on the right
// field. The API answers with one message (no per-field list), so a form passes
// hints that say which words in the message belong to which field.
//
//   applyServerError(error, setError, [
//     { field: "personal.indexnumber", match: /index ?number/i },
//   ]);
//
// Anything not matched is put on "root.server" so the form can show it once at
// the top, instead of a toast that disappears.

// What the API functions throw (see api/apiError.js): a bare string, or { message, ... }.
export const thrownMessage = (value, fallback = "Something went wrong. Please try again.") => {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value?.message === "string" && value.message.trim()) return value.message;
  return fallback;
};

export const serverMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (!error?.response && !error?.request && error) return thrownMessage(error, fallback);
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (!error?.response && error?.request) return "Cannot reach the server. Check your connection.";
  return fallback;
};

export const applyServerError = (error, setError, hints = []) => {
  const message = serverMessage(error);
  const hit = hints.find((h) => h.match.test(message));
  if (hit) {
    setError(hit.field, { type: "server", message });
    return { field: hit.field, message };
  }
  setError("root.server", { type: "server", message });
  return { field: "root.server", message };
};
