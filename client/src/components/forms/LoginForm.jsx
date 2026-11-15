import React from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, CircularProgress, Stack, TextField } from "@mui/material";
import { loginUserValidationSchema } from "@/config/validationSchema";
import { thrownMessage } from "@/lib/formErrors";

// The username/password form of the sign-in page. `onLogin(values)` does the request and
// throws what the API throws; this component shows the reason above the fields.
// It is a real <form>, so Enter submits, and the browser's password manager can fill it.
const LoginForm = ({ onLogin, notice = "" }) => {
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { username: "", password: "" },
    resolver: yupResolver(loginUserValidationSchema),
  });

  const submit = async (values) => {
    clearErrors("root.server");
    try {
      await onLogin(values);
    } catch (error) {
      setError("root.server", { type: "server", message: thrownMessage(error, "Login failed. Please try again.") });
    }
  };

  const message = errors.root?.server?.message || notice;

  return (
    <Stack component="form" noValidate spacing={2} py={2} width="100%" onSubmit={handleSubmit(submit)}>
      {message && (
        <Alert variant="filled" severity="error" role="alert">
          {message}
        </Alert>
      )}
      <TextField
        fullWidth
        label="Username"
        placeholder="Username here"
        autoComplete="username"
        autoFocus
        {...register("username")}
        error={Boolean(errors.username)}
        helperText={errors.username?.message}
      />
      <TextField
        fullWidth
        type="password"
        label="Password"
        placeholder="Password here"
        autoComplete="current-password"
        margin="dense"
        {...register("password")}
        error={Boolean(errors.password)}
        helperText={errors.password?.message}
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={isSubmitting}
        startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
      >
        {isSubmitting ? "PLEASE WAIT.." : "LOG INTO ACCOUNT"}
      </Button>
    </Stack>
  );
};

export default LoginForm;
