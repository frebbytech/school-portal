import React, { createContext, use, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { finishedOutcome, publishAlert } from "@/pages/examination/publishOutcome";
import { socketOrigin } from "./socketOrigin";

// Live updates from the server. While someone is signed in the app keeps one socket open;
// the server sends progress and the final result of the publishing they started, and the
// result is shown wherever they are in the app. Nothing depends on it: the report screens
// also read the same information over HTTP, so a missed message is only a delay.
export const RealtimeContext = createContext({ connected: false, progress: {} });

const RealtimeProvider = ({ children }) => {
  const { accessToken, mustChangePassword } = useAuth();
  const { schoolSessionDispatch } = use(SchoolSessionContext);
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [progress, setProgress] = useState({});

  // The socket asks for the token each time it connects, so a refreshed token is used.
  const tokenRef = useRef(accessToken);
  const socketRef = useRef(null);
  const signedIn = Boolean(accessToken) && !mustChangePassword;

  useEffect(() => {
    tokenRef.current = accessToken;
    // A refused connection (expired token) is not retried by itself: try again with the new token.
    if (signedIn && socketRef.current && !socketRef.current.connected) socketRef.current.connect();
  }, [accessToken, signedIn]);

  useEffect(() => {
    if (!signedIn) return undefined;
    const origin = socketOrigin(import.meta.env.VITE_BASE_URL);
    if (!origin) return undefined;

    const socket = io(origin, {
      auth: (callback) => callback({ token: tokenRef.current }),
      transports: ["websocket"],
      withCredentials: true,
    });
    socketRef.current = socket;

    const refreshPublications = () => queryClient.invalidateQueries({ queryKey: ["publications"] });

    socket.on("connect", () => {
      setConnected(true);
      // Anything that finished while offline
      refreshPublications();
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("publish:progress", (payload) => {
      setProgress((current) => ({ ...current, [payload.publicationId]: payload }));
    });
    socket.on("publish:finished", (payload) => {
      setProgress((current) => {
        const { [payload.publicationId]: _finished, ...rest } = current;
        return rest;
      });
      schoolSessionDispatch(publishAlert(finishedOutcome(payload)));
      refreshPublications();
    });

    return () => {
      socket.close();
      socketRef.current = null;
      setConnected(false);
      setProgress({});
    };
  }, [signedIn, queryClient, schoolSessionDispatch]);

  return <RealtimeContext.Provider value={{ connected, progress }}>{children}</RealtimeContext.Provider>;
};

RealtimeProvider.propTypes = { children: PropTypes.node };

export const useRealtime = () => use(RealtimeContext);

export default RealtimeProvider;
