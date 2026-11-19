import React, { useContext, useState } from "react";
import { Alert, Avatar, Box, Button, Stack, TextField } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import dayjs from "@/lib/dates";
import { postUser } from "@/api/userAPI";
import Back from "@/components/Back";
import CustomTitle from "@/components/custom/CustomTitle";
import CustomFormControl from "@/components/inputs/CustomFormControl";
import CustomImageChooser from "@/components/inputs/CustomImageChooser";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { userValidationSchema } from "@/config/validationSchema";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { thrownMessage } from "@/lib/formErrors";
import UserFields, { USER_DEFAULTS, dobRule } from "./UserFields";

const schema = userValidationSchema.shape({ dateofbirth: dobRule });

function UserAdd() {
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { ...USER_DEFAULTS, password: "", confirmPassword: "", profile: null },
  });

  const { mutate, isPending } = useMutation({ mutationFn: postUser });

  const onSubmit = (values) => {
    clearErrors("root.server");
    const { confirmPassword: _confirm, ...rest } = values;
    mutate(
      {
        ...rest,
        dateofbirth: dayjs(values.dateofbirth).format("L"),
        fullname: `${values.firstname} ${values.lastname}`.trim(),
      },
      {
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
        onSuccess: (data) => {
          schoolSessionDispatch(alertSuccess(data));
          navigate("/users");
        },
        onError: (error) => {
          // Keep everything typed, and say why it was refused (for example, a taken username)
          setError("root.server", { type: "server", message: thrownMessage(error) });
          schoolSessionDispatch(alertError(error));
        },
      }
    );
  };

  const choosePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setValue("profile", file);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
  };

  const password = (name, label) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
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
    <>
      <Back color="#012e54" />
      <CustomTitle
        title="New User"
        subtitle="Add a new user to the system by filling out the form below. They will be asked to choose their own password the first time they sign in."
        color="primary.main"
      />
      <Box bgcolor="#fff" p={2}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack padding={2} spacing={2}>
            {errors.root?.server && (
              <Alert severity="error" role="alert">
                {errors.root.server.message}
              </Alert>
            )}
            <Stack alignSelf="center">
              <CustomImageChooser handleImageUpload={choosePhoto}>
                <Avatar srcSet={preview} sx={{ width: 100, height: 100, alignSelf: "center" }} />
              </CustomImageChooser>
            </Stack>
            <UserFields control={control} errors={errors}>
              <CustomFormControl>
                {password("password", "Password")}
                {password("confirmPassword", "Confirm Password")}
              </CustomFormControl>
            </UserFields>
            <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2} paddingY={2}>
              <Button type="submit" variant="contained" color="primary" disabled={isPending}>
                {isPending ? "Saving..." : "Save User"}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Box>
      {isPending && <LoadingSpinner value="Creating New User..." />}
    </>
  );
}

export default UserAdd;
