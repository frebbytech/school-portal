// Renews the access token once and retries when the server says the token has expired.
//
// Why this exists: the sign-in provider renews the token with a timer shortly before it
// expires, but timers stop while a laptop sleeps or a phone tab is in the background, so
// the first request afterwards used to fail until the page was reloaded.
//
// The API answers an expired access token with 403 "Session has expired..." (some routes
// use 401), and also uses 403 for "you may not do this". Only an expired session is
// retried; a real permission refusal is passed straight through.

let refreshHandler = null;
let inFlight = null;

// The sign-in provider registers the function that renews the token. It must return the
// new token, or a falsy value when the session could not be renewed (the provider is then
// responsible for signing the user out).
export function registerRefreshHandler(handler) {
  refreshHandler = handler;
}

// Renew the token, sharing one renewal between all callers that arrive at the same time.
export function refreshOnce() {
  if (!refreshHandler) return Promise.resolve(null);
  if (!inFlight) {
    inFlight = Promise.resolve()
      .then(() => refreshHandler())
      .catch(() => null)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

// Requests that must never trigger a renewal: sign-in itself and the renewal call.
const NO_RETRY_URL = /(\/users\/login|\/users\/verify|\/users\/logout|\/platform\/login|\/student-auth\/(login|refresh|logout)|\/reset-password|\/confirm-reset-code)/;

export function isExpiredSession(error) {
  const response = error?.response;
  if (!response) return false;
  if (response.status === 401) return true;
  if (response.status !== 403) return false;
  const body = response.data;
  const text = typeof body === "string" ? body : body?.message;
  return typeof text === "string" && /(session has expired|token expired)/i.test(text);
}

export function installAuthRetry(api) {
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error?.config;
      if (!config || config._retried || !refreshHandler) return Promise.reject(error);
      if (NO_RETRY_URL.test(config.url || "")) return Promise.reject(error);
      if (!isExpiredSession(error)) return Promise.reject(error);

      config._retried = true;
      const token = await refreshOnce();
      if (!token) return Promise.reject(error);

      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      return api(config);
    }
  );
}
