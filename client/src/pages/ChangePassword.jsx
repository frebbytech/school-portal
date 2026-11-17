import React from "react";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { LockResetRounded } from "@mui/icons-material";
import ChangePasswordForm from "@/components/forms/ChangePasswordForm";
import { changePassword } from "@/api/userAPI";
import { useAuth } from "@/hooks/useAuth";

// Shown instead of the app while the account still has a password an administrator set.
// It cannot be skipped; signing out is the only other way off the page.
const ChangePassword = () => {
  const { user, passwordChanged, logOutUser } = useAuth();

  const onSubmit = async ({ oldPassword, newPassword }) => {
    await changePassword({ id: user?.id, oldPassword, newPassword });
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
            Your password was set by an administrator. Choose one only you know before you continue.
          </Typography>
        </Stack>
        <ChangePasswordForm onSubmit={onSubmit} />
        <Button fullWidth variant="text" sx={{ mt: 1 }} onClick={() => logOutUser()}>
          Sign out
        </Button>
      </Container>
    </Box>
  );
};

export default ChangePassword;
