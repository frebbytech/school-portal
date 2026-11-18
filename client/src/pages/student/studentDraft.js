// The "add student" form keeps what has been typed so a refresh does not lose it. It holds
// a child's and parents' personal details, so it is kept in sessionStorage (gone when the tab
// is closed) and not in localStorage, where it would stay on a shared school computer.
const KEY = "@student-data";

export const readDraft = (fallback) => {
  try {
    // Older versions kept the draft in localStorage for good: remove what they left behind
    localStorage.removeItem(KEY);
    const saved = JSON.parse(sessionStorage.getItem(KEY));
    return saved && typeof saved === "object" ? saved : fallback;
  } catch {
    return fallback;
  }
};

export const saveDraft = (values) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(values));
  } catch {
    // storage full or blocked: the draft is a convenience only
  }
};

export const clearDraft = () => {
  try {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
};
