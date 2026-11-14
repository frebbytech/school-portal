import React, { lazy, useCallback, useContext, useEffect, useMemo } from "react";
import { Route, Routes } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

import Shell from "../Shell";
import Login from "../Login";
import PageNotFound from "../PageNotFound";
import ProtectedRoute from "./ProtectedRoute";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { LazyRoute, renderRoutes } from "@/routes/renderRoutes";
import { visibleRoutes } from "@/routes/access";
import { shellRoutes } from "@/routes/routeTable";

const SchoolSession = lazy(() => import("../SchoolSession"));
const Platform = lazy(() => import("../platform"));

// The screens inside the app shell come from the route table (src/routes/routeTable.jsx),
// filtered here by the signed-in role and the modules switched on for the school.
// Screens outside the shell (sign-in, choosing a session, platform administration) stay here.
const Root = () => {
  const { user, school_info } = useAuth();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);

  const handleOnline = useCallback(() => {
    schoolSessionDispatch(alertSuccess("Connection Restored"));
  }, [schoolSessionDispatch]);

  const handleOffline = useCallback(() => {
    schoolSessionDispatch(alertError("Internet Connection Lost! Try reconnecting."));
  }, [schoolSessionDispatch]);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Depends on the school's modules as well as the role: before, the list was only rebuilt
  // when the role changed, so modules loaded after sign-in could be missing until a reload.
  const permissions = school_info?.permissions;
  const routes = useMemo(
    () => renderRoutes(visibleRoutes(shellRoutes, { role: user?.role, permissions })),
    [user?.role, permissions]
  );

  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Shell />
          </ProtectedRoute>
        }
      >
        {routes}
      </Route>
      <Route path="/school-session" element={<LazyRoute component={SchoolSession} />} />
      <Route path="/login" element={<Login />} />
      {/* Platform administration: own sign-in, outside the school session flow */}
      <Route path="/platform" element={<LazyRoute component={Platform} />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

export default React.memo(Root);
