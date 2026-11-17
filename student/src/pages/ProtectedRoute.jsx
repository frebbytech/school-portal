// src/components/ProtectedRoute.js
import React from "react";
import GlobalSpinner from "@/components/spinners/GlobalSpinner";
import { useAuth } from "@/context/AuthProvider";
import { Navigate } from "react-router-dom";
import ForceChangePassword from "./auth/force-change-password";

const ProtectedRoute = ({ children }) => {
  const { accessToken, loading, mustChangePassword } = useAuth();

  if (loading) return <GlobalSpinner />;

  if (!accessToken) return <Navigate to="/login" replace />;

  // The school-set password has to be replaced before anything else is shown.
  return mustChangePassword ? <ForceChangePassword /> : children;
};

export default ProtectedRoute;
