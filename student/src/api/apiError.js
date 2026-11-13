/**
 * Turns whatever a failed request produced into the value API functions throw.
 *
 * When the server answered, the throw value is exactly what it was before this helper
 * existed (the response body: a bare string, or `{ status, statusCode, message, code,
 * requestId }`), so every existing `onError` handler keeps working. The difference is
 * for failures with NO response (offline, server down, timeout): the old code read
 * `error.response.data` on `undefined` and crashed with a TypeError. Those now throw a
 * normal `{ message, code }` object that the alert helpers already display.
 */
export const NETWORK_ERROR_MESSAGE =
  "Unable to reach the server. Check your internet connection and try again.";
export const TIMEOUT_ERROR_MESSAGE =
  "The server took too long to respond. Please try again.";

export function normalizeApiError(error) {
  const response = error?.response;

  if (response) {
    const body = response.data;
    if (body !== undefined && body !== null && body !== "") return body;
    return {
      message: `The server could not complete the request (${response.status}).`,
      statusCode: response.status,
      code: "HTTP_ERROR",
    };
  }

  if (error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT") {
    return { message: TIMEOUT_ERROR_MESSAGE, code: "TIMEOUT" };
  }

  return { message: NETWORK_ERROR_MESSAGE, code: "NETWORK_ERROR" };
}
