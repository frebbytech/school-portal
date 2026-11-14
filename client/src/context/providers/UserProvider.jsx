import React, { useEffect, useReducer, useRef, useState } from "react";
import Swal from "sweetalert2";
import UserReducer from "../reducers/UserReducer";
import { useMutation, useQuery } from "@tanstack/react-query";
import { logOut } from "@/api/userAPI";
import { useNavigate } from "react-router-dom";
import {
  deleteUser,
  getUser,
  parseJwt,
  saveUser,
} from "@/config/sessionHandler";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import useLocalStorage from "@/hooks/useLocalStorage";
import { getTerm } from "@/api/termAPI";
import api from "@/api/customAxios";
import axios from "axios";
import { refreshOnce, registerRefreshHandler } from "@/api/authRetry";
import GlobalSpinner from "@/components/spinners/GlobalSpinner";
import PropTypes from "prop-types";

export const UserContext = React.createContext();

const UserProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimeoutRef = useRef(null);

  const [session, setSession] = useLocalStorage("@school_session", null);
  const [schoolInformation, setSchoolInformation] = useLocalStorage(
    "@school_info",
    null
  );

  const navigate = useNavigate();
  const [user, setUser] = useState(getUser());

  // Lets the API client renew the token and retry when a request meets an expired session
  // (for example after the laptop slept past the token's expiry).
  const refreshRef = useRef(null);
  useEffect(() => {
    registerRefreshHandler(() => refreshRef.current?.());
    return () => registerRefreshHandler(null);
  }, []);

  useEffect(() => {
    const tryInitialRefresh = async () => {
      setLoading(true);

      if (user?.id) {
        await refreshAccessToken();
      }
      setLoading(false);
    };
    tryInitialRefresh();
  }, []);

  useEffect(() => {
    const interceptor = api.interceptors.request.use(
      (config) => {
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
          api.defaults.headers.Authorization = `Bearer ${accessToken}`;
          axios.defaults.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    return () => api.interceptors.request.eject(interceptor);
  }, [accessToken]);

  const schoolSession = useQuery({
    queryKey: ["terms/:id", session?.termId],
    queryFn: () => getTerm(session?.termId),
    initialData: session,
    enabled: !!session?.sessionId && !!session?.termId && !!accessToken,
    // enabled: false,
    select: (sess) => {
      if (!sess?.termId) return session;
      const { core, ...rest } = sess;

      return {
        ...core,
        ...rest,
      };
    },
    // refetchOnMount: false,
  });

  const scheduleRefresh = (token) => {
    if (!token) return;

    const decoded = parseJwt(token);

    const expInMs = decoded.exp * 1000;
    const now = Date.now();
    const delay = expInMs - now - 60000;

    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);

    if (delay > 0) {
      refreshTimeoutRef.current = setTimeout(() => {
        refreshOnce();
      }, delay);
    }
  };

  const refreshAccessToken = async () => {
    try {
      const res = await api.post(
        "/users/verify",
        {},
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const token = res.data.token;
      setAccessToken(token);
      scheduleRefresh(token);

      const user = parseJwt(token);
      setUser(user);
      saveUser({ _id: user?.id, id: user?.id });
      return token;
    } catch (e) {
      setAccessToken(null);
      setUser(null);
      setSession(null);
      deleteUser();
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      setLoading(false);
      // alert(err?.message);
      console.log(e?.message);

      // Show a warning and redirect to login
      Swal.fire({
        title: "Session Expired",
        text: "Please log in again.",
        icon: "warning",
        confirmButtonText: "Login",
      }).then(() => {
        navigate("/login");
      });
    }
  };

  refreshRef.current = refreshAccessToken;

  const initState = {
    isPending: true,
    session: schoolSession.data,
    user: user,
    school_info: schoolInformation,
  };

  const [userState, userDispatch] = useReducer(UserReducer, initState);

  const authenticateUser = (token, school) => {
    setSchoolInformation(school);

    const user = parseJwt(token);
    setUser(user);
    saveUser({ _id: user?.id, id: user?.id });
    setAccessToken(token);
    scheduleRefresh(token);
  };

  const updateSession = (data) => {
    setSession((prev) => {
      return { ...prev, ...data };
    });
  };

  const updateSchoolInformation = (data) => {
    setSchoolInformation((prev) => {
      return { ...prev, ...data };
    });
  };

  //LOG OUT from System

  const { mutateAsync, isPending } = useMutation({
    mutationFn: logOut,
  });

  const logOutUser = () => {
    Swal.fire({
      title: "Exiting",
      text: "Do you want to exit app?",
      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        mutateAsync(
          {},
          {
            onSettled: () => {
              setSession(null);
              setUser(null);
              setAccessToken(null);
              deleteUser();
              if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
              }
              navigate("/login");
            },
          }
        );
      }
    });
  };

  const switchAccount = () => {
    Swal.fire({
      title: "Switch Account",
      text: "Do you want to switch account?",
      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        setSchoolInformation(null);
        deleteUser();
        setAccessToken(null);
        setUser(null);
        setSession(null);
      }
    });
  };

  //Back to login
  const backToLogin = () => {
    deleteUser();
    setAccessToken(null);
    setUser(null);
    setSession(null);
    navigate("/login");
  };

  const updateAccessToken = (token) => {
    setAccessToken(token);
  };

  // const authLoading = loading || userInfo.isPending;
  return (
    <>
      <UserContext.Provider
        value={{
          userState,
          school_info: schoolInformation,
          session: schoolSession?.data,
          user: user,
          updateSession,
          authenticateUser,
          updateAccessToken,
          logOutUser,
          updateSchoolInformation,
          schoolInformation,
          switchAccount,
          backToLogin,
          userDispatch,
          students: [],
          accessToken,
          loading,
        }}
      >
        {children}
      </UserContext.Provider>

      {loading && <GlobalSpinner />}
      {isPending && <LoadingSpinner value="Signing Out" />}
      {/* {levelLoading && <LoadingSpinner />} */}
    </>
  );
};
UserProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default UserProvider;
