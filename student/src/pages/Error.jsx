import React from "react";
import { Box, Button, Typography } from "@mui/material";

const Error = ({ _error, resetErrorBoundary }) => {
  return (
    <Box
      sx={{
        height: "100svh",
        width: "100svw",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 2,
        textAlign: "center",
        bgcolor: "var(--primary)",
        color: "#fff",
      }}
    >
      <Typography variant="h3">oOps!!</Typography>
      <Typography variant="h4">
        Something went wrong.Try again later!
      </Typography>
      <Typography variant="caption">{_error?.message}</Typography>
      <Typography variant="caption" textAlign="center">
        Try checking your internet connection.
      </Typography>
      <Button
        variant="contained"
        sx={{
          color: "#000",
          backgroundColor: "#fff",
        }}
        onClick={resetErrorBoundary}
      >
        Try Again
      </Button>
    </Box>
  );
};

export default Error;
