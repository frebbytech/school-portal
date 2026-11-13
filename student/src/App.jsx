import React from "react";
import { Chart, registerables } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import {
  QueryClient,
  QueryClientProvider,
  useQueryErrorResetBoundary,
} from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { createBrowserRouter, RouterProvider } from "react-router";
import ThemeProvider from "./theme";
import Error from "./pages/Error";
import Root from "./pages/Root";
import Dashboard from "./pages/dashboard";
import Login from "./pages/auth/login";
import ForgotPassword from "./pages/auth/forgot-password";
import ConfirmCode from "./pages/auth/confirm-code";
import ResetPassword from "./pages/auth/reset-password";
import Profile from "./pages/profile";
import Academics from "./pages/academics";
import Results from "./pages/academics/results";
import Result from "./pages/academics/result/result";
import Fees from "./pages/fees";
import About from "./pages/about";
import Settings from "./pages/settings";
import { AuthProvider } from "./context/AuthProvider";
import { AlertProvider } from "./context/AlertProvider";
import PageNotFound from "./pages/PageNotFound";
import Announcements from "./pages/announcements";
import Events from "./pages/events";
import ViewEvent from "./pages/events/ViewEvent";
import NotesBoard from "./pages/notes";
import AcademicsDashboard from "./pages/academics/academic-dashboard";
import FeesDashboard from "./pages/fees/FeesDashboard";
import Report from "./pages/fees/Report";
import Attendance from "./pages/attendance";
import AttendanceDashboard from "./pages/attendance/attendance-dashboard";
import AttendanceHistory from "./pages/attendance/attendance-history";
import Payments from "./pages/fees/Payments";

Chart.register(...registerables);
Chart.register(ChartDataLabels);

// Created once for the whole app. Creating it inside App() made a new, empty cache every
// time App re-rendered.
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      networkMode: "offlineFirst",
    },
    queries: {
      networkMode: "offlineFirst",
    },
  },
});

function App() {
  const { reset } = useQueryErrorResetBoundary();

  let router = createBrowserRouter([
    {
      path: "/",
      Component: Root,
      errorElement: <Error />,

      errorBoundary: Error,
      children: [
        { index: true, Component: Dashboard },
        { path: "profile", Component: Profile },
        {
          path: "academics",
          Component: Academics,
          children: [
            { index: true, Component: AcademicsDashboard },
            { path: "result", Component: Results },
            { path: "result/:id", Component: Result },
          ],
        },
        {
          path: "fees",
          Component: Fees,
          children: [
            { index: true, Component: FeesDashboard },
            { path: "payment", Component: Payments },
            { path: "payment/:id", Component: Report },
          ],
        },
        {
          path: "attendance",
          Component: Attendance,
          children: [
            { index: true, Component: AttendanceDashboard },
            { path: "history", Component: AttendanceHistory },
          ],
        },
        { path: "events", Component: Events },
        { path: "events/:id", Component: ViewEvent },
        { path: "announcements", Component: Announcements },
        { path: "notes", Component: NotesBoard },
        { path: "settings", Component: Settings },
        { path: "about", Component: About },
      ],
    },
    { path: "login", Component: Login },
    { path: "forgot-password", Component: ForgotPassword },
    { path: "confirm-code", Component: ConfirmCode },
    { path: "reset-password", Component: ResetPassword },
    { path: "*", Component: PageNotFound },
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AlertProvider>
          <ErrorBoundary FallbackComponent={Error} onReset={reset}>
            <ThemeProvider>
              <RouterProvider router={router} />
            </ThemeProvider>
          </ErrorBoundary>
        </AlertProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
