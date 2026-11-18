import React, { useContext, useEffect } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogContent,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import CustomFormControl from "@/components/inputs/CustomFormControl";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { StudentContext } from "@/context/providers/StudentProvider";
import { parentValidationSchema } from "@/config/validationSchema";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { NATIONALITY } from "@/mockup/data/nationality";
import { TOWNS } from "@/mockup/data/towns";
import { putParent } from "@/api/parentAPI";
import { RELATIONSHIP } from "@/mockup/columns/sessionColumns";
import { thrownMessage } from "@/lib/formErrors";

const EMPTY = {
  firstname: "",
  surname: "",
  gender: "",
  relationship: "",
  email: "",
  phonenumber: "",
  address: "",
  residence: "",
  nationality: "",
};

const ParentEdit = () => {
  const queryClient = useQueryClient();
  const { studentState, studentDispatch } = useContext(StudentContext);
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const parent = studentState?.editParentData?.data;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(parentValidationSchema),
    defaultValues: { ...EMPTY, ...parent },
  });

  // Load the chosen parent into the form each time the dialog is opened for someone
  useEffect(() => {
    reset({ ...EMPTY, ...parent });
  }, [parent, reset]);

  const gender = watch("gender");

  const handleClose = () => {
    clearErrors();
    studentDispatch({ type: "editParent", payload: { open: false, data: {} } });
  };

  const { mutate, isPending } = useMutation({ mutationFn: putParent });

  const onSubmit = (values) => {
    clearErrors("root.server");
    mutate(values, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["student-profile"] });
        schoolSessionDispatch(alertSuccess(data));
        handleClose();
      },
      onError: (error) => {
        // Keep the dialog open with what was typed, and say why it was refused
        setError("root.server", { type: "server", message: thrownMessage(error) });
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  const text = (name, label, extra = {}) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          value={field.value ?? ""}
          label={label}
          fullWidth
          size="small"
          error={!!errors[name]}
          helperText={errors[name]?.message}
          {...extra}
        />
      )}
    />
  );

  const place = (name, label, options) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Autocomplete
          freeSolo
          fullWidth
          size="small"
          options={options}
          noOptionsText="Nothing found"
          value={field.value || ""}
          onChange={(_, value) => field.onChange(value ?? "")}
          onInputChange={(_, value, reason) => reason === "input" && field.onChange(value)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              fullWidth
              size="small"
              error={!!errors[name]}
              helperText={errors[name]?.message}
            />
          )}
        />
      )}
    />
  );

  return (
    <Dialog
      maxWidth="md"
      fullWidth
      open={!!studentState?.editParentData?.open}
      onClose={handleClose}
    >
      <CustomDialogTitle title="Edit Parent/Guardian Information" onClose={handleClose} />
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack padding={2} spacing={1}>
            {errors.root?.server && (
              <Alert severity="error" role="alert">
                {errors.root.server.message}
              </Alert>
            )}
            <CustomFormControl>
              {text("firstname", "Firstname")}
              {text("surname", "Surname")}
            </CustomFormControl>
            <CustomFormControl>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    select
                    fullWidth
                    size="small"
                    label="Gender"
                    error={!!errors.gender}
                    helperText={errors.gender?.message}
                  >
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                  </TextField>
                )}
              />
              <Controller
                name="relationship"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    freeSolo
                    fullWidth
                    size="small"
                    options={RELATIONSHIP(gender)}
                    noOptionsText="No Relationship available"
                    value={field.value || ""}
                    onInputChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField {...params} label="Relationship" fullWidth size="small" />
                    )}
                  />
                )}
              />
            </CustomFormControl>
            <CustomFormControl>
              {text("email", "Email")}
              {text("phonenumber", "Telephone No.", { type: "tel", inputMode: "tel" })}
            </CustomFormControl>
            {text("address", "Residence Address")}
            <CustomFormControl>
              {place("residence", "Residence", TOWNS)}
              {place("nationality", "Nationality", NATIONALITY)}
            </CustomFormControl>
            <Stack direction="row" justifyContent="flex-end" paddingY={4}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isPending}
                sx={{ minWidth: { xs: 100, sm: 150 } }}
              >
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </Stack>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ParentEdit;
