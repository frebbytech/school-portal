import React from "react";
import GlobalSpinner from "@/components/spinners/GlobalSpinner";
import { getUser } from "@/config/sessionHandler";
import { useAuth } from "@/hooks/useAuth";
import _ from "lodash";
import { useEffect } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import ChangePassword from "../ChangePassword";

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const user = getUser();
  const location = useLocation();
  const { session, loading, mustChangePassword } = useAuth();

  const isAuthenticated = !_.isEmpty(user?.id);
  const isSessionAuthenticated = !_.isEmpty(session?.termId);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: location }, replace: true });
    }

    if (!isSessionAuthenticated) {
      navigate("/school-session", { replace: true });
    }
  }, [isAuthenticated, isSessionAuthenticated, navigate, location]);

  if (loading) return <GlobalSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!isSessionAuthenticated) {
    return <Navigate to="/school-session" state={{ from: location }} replace />;
  }

  // A password set by an administrator has to be replaced before anything else is shown.
  if (mustChangePassword) return <ChangePassword />;

  return children;
};

export default ProtectedRoute;
