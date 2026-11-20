// The text to show for whatever an API function threw: a bare string, or
// `{ message }` (see api/apiError.js).
export const errorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (typeof error === "string" && error.trim()) return error;
  if (typeof error?.message === "string" && error.message.trim()) return error.message;
  return fallback;
};
