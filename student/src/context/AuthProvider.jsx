// src/context/AuthContext.js
import React from "react";
import api from "@/api/customAxios";
import Swal from "sweetalert2";
import {
  deleteUser,
  getUser,
  parseJwt,
  saveUser,
} from "@/config/sessionHandler";

import { createContext, useState, useContext, useRef, useEffect } from "react";
import axios from "axios";
import { refreshOnce, registerRefreshHandler } from "@/api/authRetry";
import GlobalSpinner from "@/components/spinners/GlobalSpinner";
import useLocalStorage from "@/hooks/useLocalStorage";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(getUser());
  const [accessToken, setAccessToken] = useState(null);
  const [session, setSession] = useLocalStorage("@school_session", null);
  const [schoolInformation, setSchoolInformation] = useLocalStorage(
    "@school_info",
    null
  );
  const [loading, setLoading] = useState(true);
  const refreshTimeoutRef = useRef(null);

  // Lets the API client renew the token and retry when a request meets an expired session
  // (for example after a phone sat in the background past the token's expiry).
  const refreshRef = useRef(null);
  useEffect(() => {
    registerRefreshHandler(() => refreshRef.current?.());
    return () => registerRefreshHandler(null);
  }, []);

  // Only runs once on mount
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

  // Request interceptor
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

  const scheduleRefresh = (token) => {
    if (!token) return;

    const decoded = parseJwt(token);
    const expInMs = decoded.exp * 1000;
    const now = Date.now();
    const delay = expInMs - now - 60000; // 1 min buffer

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    if (delay > 0) {
      refreshTimeoutRef.current = setTimeout(() => {
        refreshOnce();
      }, delay);
    }
  };

  const refreshAccessToken = async () => {
    try {
      const res = await api.post(
        "/student-auth/refresh",
        {},
        { withCredentials: true }
      );

      const token = res.data.token;
      const { student, school, session } = res.data.data;
      if (token) {
        api.defaults.headers.Authorization = `Bearer ${token}`;
        axios.defaults.headers.Authorization = `Bearer ${token}`;

        const parsed = parseJwt(token);

        setSchoolInformation(school);
        setUser(student);
        saveUser({
          id: parsed?.id,
          _id: parsed?._id,
        });
        setSession(session);

        setAccessToken(token);
        scheduleRefresh(token);
        return token;
      }
      return null;
    } catch (err) {
      console.error("Error refreshing access token:", err);
      handleAuthError();
      return null;
    }
  };

  refreshRef.current = refreshAccessToken;

  const handleAuthError = () => {
    deleteUser();
    setUser(null);
    setAccessToken(null);

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    Swal.fire({
      title: "Session Expired",
      text: "Please log in again.",
      icon: "warning",
      confirmButtonText: "Login",
    }).then(() => {
      location.href = "/login";
    });
  };

  const login = (token, details) => {
    const parsed = parseJwt(token);

    setUser(details?.student);
    setSession(details?.session);
    setSchoolInformation(details?.school);
    saveUser({
      id: parsed?.id,
      _id: parsed?._id,
    });

    setAccessToken(token);
    scheduleRefresh(token);
  };

  const logout = async () => {
    try {
      await api.post("/student-auth/logout");
    } finally {
      deleteUser();
      setUser(null);
      setAccessToken(null);

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      delete api.defaults.headers.common["Authorization"];
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user,
        school_info: schoolInformation,
        session: session,
        accessToken,
        loading,
        login,
        logout,
      }}
    >
      {children}
      {loading && <GlobalSpinner bgColor="#ffffff" />}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
