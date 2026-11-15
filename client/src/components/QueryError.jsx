import React from "react";
import { Alert, Button } from "@mui/material";
import { thrownMessage } from "@/lib/formErrors";

// Shown when a request failed, so a screen never looks "empty" or "zero" when the truth is
// "we could not load it". `error` is what the API function threw.
const QueryError = ({ error, onRetry, what = "this information" }) => (
  <Alert
    severity="error"
    role="alert"
    sx={{ my: 2 }}
    action={
      onRetry ? (
        <Button color="inherit" size="small" onClick={() => onRetry()}>
          Try again
        </Button>
      ) : null
    }
  >
    {`Could not load ${what}. ${thrownMessage(error, "")}`.trim()}
  </Alert>
);

export default QueryError;
