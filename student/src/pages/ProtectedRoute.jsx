// src/components/ProtectedRoute.js
import React from "react";
import GlobalSpinner from "@/components/spinners/GlobalSpinner";
import { useAuth } from "@/context/AuthProvider";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const { accessToken, loading } = useAuth();

  if (loading) return <GlobalSpinner />;

  return accessToken ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
