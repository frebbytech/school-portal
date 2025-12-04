// src/context/AlertContext.js
import React from "react";
import Transition from "@/components/animations/Transition";
import { CheckCircleRounded, ErrorRounded } from "@mui/icons-material";
import { Alert, Snackbar } from "@mui/material";
import { createContext, useState, useContext } from "react";

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState({
    severity: "",
    message: "",
    open: false,
  });

  const openAlert = (alertType, data) => {
    const message =
      typeof data === "object" ? "An unknown error has occurred!" : data;

    setAlert({ severity: alertType, message, open: true });
  };

  const closeAlert = () => {
    setAlert({ ...alert, open: false });
  };

  const color = alert?.severity === "error" ? "#B72136" : "green";

  return (
    <AlertContext.Provider value={{ openAlert, closeAlert }}>
      <Snackbar
        anchorOrigin={{
          horizontal: "right",
          vertical: "top",
        }}
        open={alert?.open}
        autoHideDuration={5000}
        onClose={closeAlert}
        slotProps={{
          transition: Transition,
        }}
      >
        <Alert
          icon={
            alert?.severity === "success" ? (
              <CheckCircleRounded htmlColor="green" />
            ) : (
              <ErrorRounded color="error" />
            )
          }
          severity={alert?.severity}
          // onClose={closeAlert}
          sx={{
            bgcolor: "#fff",

            color: color,
            borderBottom: `2px solid ${color}`,
            py: 2,
          }}
        >
          {alert?.message}
        </Alert>
      </Snackbar>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);
