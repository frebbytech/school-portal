import { useEffect } from "react";

// While `hasUnsavedChanges` is true, closing the tab, reloading or typing a new address
// makes the browser ask before the work is lost. (Browsers show their own wording.)
export default function useUnsavedChangesWarning(hasUnsavedChanges) {
  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);
}
