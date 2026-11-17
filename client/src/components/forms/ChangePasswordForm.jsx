import React from "react";
import PropTypes from "prop-types";
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, CircularProgress, Stack, TextField } from "@mui/material";

export const MIN_PASSWORD_LENGTH = 8;

export const changePasswordSchema = yup.object({
  oldPassword: yup.string().required("Enter your current password"),
  newPassword: yup
    .string()
    .required("Enter a new password")
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
    .notOneOf([yup.ref("oldPassword")], "The new password must be different from the current one"),
  confirmPassword: yup
    .string()
    .required("Type the new password again")
    .oneOf([yup.ref("newPassword")], "The two passwords do not match"),
});

// Text of whatever the API function threw: a string, or { message }.
const reasonOf = (value) => {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value?.message === "string" && value.message.trim()) return value.message;
  return "Could not change the password. Please try again.";
};

// Current password + new password + confirmation. `onSubmit({ oldPassword, newPassword })`
// does the request and throws what the API throws; the reason is shown above the fields.
// A real <form>, so Enter submits and the browser's password manager can offer to save it.
const ChangePasswordForm = ({ onSubmit, submitLabel = "Change password" }) => {
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
    resolver: yupResolver(changePasswordSchema),
  });

  const submit = async ({ oldPassword, newPassword }) => {
    clearErrors("root.server");
    try {
      await onSubmit({ oldPassword, newPassword });
    } catch (error) {
      setError("root.server", { type: "server", message: reasonOf(error) });
    }
  };

  return (
    <Stack component="form" noValidate spacing={2} width="100%" onSubmit={handleSubmit(submit)}>
      {errors.root?.server?.message && (
        <Alert severity="error" role="alert">
          {errors.root.server.message}
        </Alert>
      )}
      <TextField
        fullWidth
        type="password"
        label="Current password"
        autoComplete="current-password"
        autoFocus
        {...register("oldPassword")}
        error={Boolean(errors.oldPassword)}
        helperText={errors.oldPassword?.message}
      />
      <TextField
        fullWidth
        type="password"
        label="New password"
        autoComplete="new-password"
        {...register("newPassword")}
        error={Boolean(errors.newPassword)}
        helperText={errors.newPassword?.message || `At least ${MIN_PASSWORD_LENGTH} characters`}
      />
      <TextField
        fullWidth
        type="password"
        label="Confirm new password"
        autoComplete="new-password"
        {...register("confirmPassword")}
        error={Boolean(errors.confirmPassword)}
        helperText={errors.confirmPassword?.message}
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={isSubmitting}
        startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
      >
        {isSubmitting ? "Please wait..." : submitLabel}
      </Button>
    </Stack>
  );
};

ChangePasswordForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  submitLabel: PropTypes.string,
};

export default ChangePasswordForm;
