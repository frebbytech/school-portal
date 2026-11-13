import React from "react";
import Scrollbars from "react-custom-scrollbars";
import { Chart, registerables } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import StudentProvider from "./context/providers/StudentProvider";
import {
  QueryClient,
  QueryClientProvider,
  useQueryErrorResetBoundary,
} from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import ThemeProvider from "./theme";
import Root from "./pages/layouts/Root";
import SchoolSessionProvider from "./context/providers/SchoolSessionProvider";
import UserProvider from "./context/providers/UserProvider";
import Error from "./pages/Error";

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

  return (
    <ErrorBoundary FallbackComponent={Error} onReset={reset}>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <ThemeProvider>
            <SchoolSessionProvider>
              <StudentProvider>
                <Scrollbars>
                  {/* <PageTitle /> */}
                  <Root />
                </Scrollbars>
              </StudentProvider>
            </SchoolSessionProvider>
          </ThemeProvider>
        </UserProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
