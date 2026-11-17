import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const sockets = vi.hoisted(() => []);
vi.mock("socket.io-client", () => ({
  io: vi.fn((origin, options) => {
    const handlers = {};
    const socket = {
      origin,
      options,
      connected: false,
      handlers,
      on: (event, handler) => { handlers[event] = handler; },
      connect: vi.fn(() => { socket.connected = true; }),
      close: vi.fn(),
    };
    sockets.push(socket);
    return socket;
  }),
}));

const auth = vi.hoisted(() => ({ value: {} }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => auth.value }));
vi.stubEnv("VITE_BASE_URL", "https://api.test/api/frebbys/v1");

import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import RealtimeProvider, { useRealtime } from "./RealtimeProvider";

const Probe = () => {
  const { connected, progress } = useRealtime();
  return <p>{connected ? "online" : "offline"}:{Object.keys(progress).join(",")}</p>;
};

const setup = () => {
  const dispatch = vi.fn();
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const value = { schoolSessionDispatch: dispatch };
  // `tick` only forces a fresh render, as a change of sign-in state would
  // eslint-disable-next-line no-unused-vars
  const Tree = ({ tick = 0 }) => (
    <QueryClientProvider client={client}>
      <SchoolSessionContext.Provider value={value}>
        <RealtimeProvider>
          <Probe />
        </RealtimeProvider>
      </SchoolSessionContext.Provider>
    </QueryClientProvider>
  );
  return { view: <Tree />, Tree, dispatch, invalidate };
};

describe("live updates in the app", () => {
  beforeEach(() => {
    sockets.length = 0;
    auth.value = { accessToken: "token-1", mustChangePassword: false };
  });

  it("opens one socket on the API's address while signed in, using the current token", () => {
    const { view } = setup();
    render(view);
    expect(sockets).toHaveLength(1);
    expect(sockets[0].origin).toBe("https://api.test");
    const cb = vi.fn();
    sockets[0].options.auth(cb);
    expect(cb).toHaveBeenCalledWith({ token: "token-1" });
  });

  it("does not connect when signed out or while a new password is still required", () => {
    auth.value = { accessToken: null, mustChangePassword: false };
    render(setup().view);
    auth.value = { accessToken: "t", mustChangePassword: true };
    render(setup().view);
    expect(sockets).toHaveLength(0);
  });

  it("shows the result wherever the person is, and refreshes the publications", () => {
    const { view, dispatch, invalidate } = setup();
    render(view);
    act(() => sockets[0].handlers["publish:finished"]({
      publicationId: "p1", status: "completed", message: "Report cards for 2 students. SMS: 2 sent.",
      summary: { sms: { sent: 2, failed: 0, skipped: 0 } },
    }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "showAlert",
      payload: { severity: "success", message: "Report cards for 2 students. SMS: 2 sent." },
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["publications"] });
  });

  it("shows a failure as an error", () => {
    const { view, dispatch } = setup();
    render(view);
    act(() => sockets[0].handlers["publish:finished"]({ publicationId: "p1", status: "failed", message: "None of the reports could be sent" }));
    expect(dispatch.mock.calls[0][0].payload).toEqual({ severity: "error", message: "None of the reports could be sent" });
  });

  it("keeps live progress until the publish finishes", () => {
    const { view } = setup();
    render(view);
    act(() => sockets[0].handlers.connect());
    act(() => sockets[0].handlers["publish:progress"]({ publicationId: "p1", status: "running", phase: "sending", done: 1, total: 4 }));
    expect(screen.getByText("online:p1")).toBeInTheDocument();
    act(() => sockets[0].handlers["publish:finished"]({ publicationId: "p1", status: "completed", message: "m", summary: {} }));
    expect(screen.getByText("online:")).toBeInTheDocument();
  });

  it("reconnects with the new token after a refused (expired) connection", () => {
    const { Tree } = setup();
    const { rerender } = render(<Tree tick={1} />);
    expect(sockets[0].connect).not.toHaveBeenCalled();
    auth.value = { accessToken: "token-2", mustChangePassword: false };
    rerender(<Tree tick={2} />);
    expect(sockets).toHaveLength(1);
    expect(sockets[0].connect).toHaveBeenCalled();
    const cb = vi.fn();
    sockets[0].options.auth(cb);
    expect(cb).toHaveBeenCalledWith({ token: "token-2" });
  });
});
