import React from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import useUnsavedChangesWarning from "./useUnsavedChangesWarning";

const Probe = ({ dirty }) => {
  useUnsavedChangesWarning(dirty);
  return null;
};

const tryToLeave = () => {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

describe("unsaved changes warning", () => {
  it("does not interfere when nothing is unsaved", () => {
    render(<Probe dirty={false} />);
    expect(tryToLeave()).toBe(false);
  });

  it("asks before leaving while there are unsaved changes", () => {
    render(<Probe dirty />);
    expect(tryToLeave()).toBe(true);
  });

  it("stops asking once the changes are saved or the screen is closed", () => {
    const { rerender, unmount } = render(<Probe dirty />);
    rerender(<Probe dirty={false} />);
    expect(tryToLeave()).toBe(false);
    rerender(<Probe dirty />);
    unmount();
    expect(tryToLeave()).toBe(false);
  });
});
