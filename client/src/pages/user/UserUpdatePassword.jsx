import { useContext, useEffect } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, Stack, TextField } from "@mui/material";
import Swal from "sweetalert2";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { userResetPasswordValidationSchema } from "@/config/validationSchema";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { updateUserPassword } from "@/api/userAPI";
import { thrownMessage } from "@/lib/formErrors";

const EMPTY = { password: "", confirmPassword: "" };

function UserUpdatePassword({ open, setOpen }) {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(userResetPasswordValidationSchema),
    defaultValues: EMPTY,
  });

  // A password must never linger in the form after the dialog is closed
  useEffect(() => {
    if (!open) reset(EMPTY);
  }, [open, reset]);

  const { mutate, isPending } = useMutation({ mutationFn: updateUserPassword });

  const handleClose = () => setOpen(false);

  const onSubmit = ({ password }) => {
    clearErrors("root.server");
    Swal.fire({
      title: "Updating Password",
      text: "The user will be asked to choose a new password when they next sign in. Do you wish to proceed?",
      showCancelButton: true,
      allowOutsideClick: false,
    }).then(({ isConfirmed }) => {
      if (!isConfirmed) return;
      mutate(
        { id, password },
        {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["user", id] });
            schoolSessionDispatch(alertSuccess(data));
            handleClose();
          },
          onError: (error) => {
            setError("root.server", { type: "server", message: thrownMessage(error) });
            schoolSessionDispatch(alertError(error));
          },
        }
      );
    });
  };

  const field = (name, label) => (
    <Controller
      name={name}
      control={control}
      render={({ field: f }) => (
        <TextField
          {...f}
          type="password"
          label={label}
          fullWidth
          size="small"
          autoComplete="new-password"
          error={!!errors[name]}
          helperText={errors[name]?.message}
        />
      )}
    />
  );

  return (
    <Dialog open={open} maxWidth="xs" fullWidth onClose={handleClose}>
      <CustomDialogTitle title="Password Reset" onClose={handleClose} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ p: 1 }}>
          <Stack padding={2} spacing={1}>
            {errors.root?.server && (
              <Alert severity="error" role="alert">
                {errors.root.server.message}
              </Alert>
            )}
            {field("password", "Password")}
            {field("confirmPassword", "Confirm Password")}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button type="submit" variant="contained" color="primary" disabled={isPending}>
            Update Password
          </Button>
        </DialogActions>
      </form>
      {isPending && <LoadingSpinner value="Updating Password.Please wait..." />}
    </Dialog>
  );
}

export default UserUpdatePassword;
