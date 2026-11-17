import React from "react";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { LockResetRounded } from "@mui/icons-material";
import ChangePasswordForm from "@/components/forms/ChangePasswordForm";
import { changePassword } from "@/hooks/useStudentAuth";
import { forgetSavedPassword } from "@/config/sessionHandler";
import { useAuth } from "@/context/AuthProvider";

// Shown instead of the portal while the password is still the one the school set.
// It cannot be skipped; signing out is the only other way off the page.
const ForceChangePassword = () => {
  const { passwordChanged, logout } = useAuth();

  const onSubmit = async (values) => {
    await changePassword(values);
    forgetSavedPassword();
    passwordChanged();
  };

  return (
    <Box sx={{ minHeight: "100svh", display: "flex", bgcolor: "primary.main", p: 2 }}>
      <Container maxWidth="xs" sx={{ bgcolor: "#fff", borderRadius: 2, m: "auto", p: 3 }}>
        <Stack spacing={2} alignItems="center" textAlign="center" pb={2}>
          <LockResetRounded color="primary" sx={{ fontSize: 56 }} />
          <Typography variant="h5" component="h1">
            Choose a new password
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You are still using the password the school gave you. Choose one only you know before you continue.
          </Typography>
        </Stack>
        <ChangePasswordForm onSubmit={onSubmit} />
        <Button fullWidth variant="text" sx={{ mt: 1 }} onClick={() => logout()}>
          Sign out
        </Button>
      </Container>
    </Box>
  );
};

export default ForceChangePassword;
