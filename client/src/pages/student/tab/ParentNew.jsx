import React, { useContext, useEffect } from "react";
import {
  Stack,
  Typography,
  TextField,
  MenuItem,
  Autocomplete,
  Avatar,
  DialogContent,
  Dialog,
  DialogActions,
  Button,
  IconButton,
} from "@mui/material";

import { Add, Delete } from "@mui/icons-material";

import CustomFormControl from "@/components/inputs/CustomFormControl";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { NATIONALITY } from "@/mockup/data/nationality";
import { TOWNS } from "@/mockup/data/towns";
import { RELATIONSHIP } from "@/mockup/columns/sessionColumns";
import { guardianValidationSchema } from "@/config/validationSchema";
import { postParent } from "@/api/parentAPI";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";

import PropTypes from "prop-types";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { newStudentDefaultValues } from "@/config/initialValues";
import { useAuth } from "@/hooks/useAuth";

const ParentNew = ({ open, setOpen }) => {
  const { school_info } = useAuth();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();
  const { studentId } = useParams();

  const { isPending, mutate } = useMutation({ mutationFn: postParent });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: newStudentDefaultValues.parent,
    resolver: yupResolver(guardianValidationSchema),
  });

  // manage dynamic parents
  const { fields, append, remove } = useFieldArray({
    control,
    name: "parents",
  });

  useEffect(() => {
    reset({
      parents: newStudentDefaultValues.parent,
    });
  }, [parent, reset]);

  const onSubmit = async (values) => {
    // attach studentId to each parent before sending
    const payload = {
      parents: values.parents.map((p) => ({
        ...p,
        student: studentId,
        school: school_info?._id,
      })),
    };

    mutate(payload, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["student-profile", studentId] });
      },
      onSuccess: (data) => {
        schoolSessionDispatch(alertSuccess(data));
        handleClose();
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  const handleClose = () => setOpen(false);

  return (
    <Dialog maxWidth="md" fullWidth open={open} onClose={handleClose}>
      <CustomDialogTitle
        title="New Parent/Guardian Information"
        onClose={handleClose}
        subtitle="Fill in parent/guardian details below"
      />
      <DialogContent sx={{ p: 1 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack py={2} spacing={3}>
            {fields.map((field, index) => (
              <Stack
                key={field.id}
                spacing={2}
                sx={{
                  border: "1px solid #e0e0e0",
                  borderRadius: 2,
                  p: 2,
                  position: "relative",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography
                    variant="body2"
                    color="primary.main"
                    sx={{ fontWeight: "bold" }}
                  >
                    Parent/Guardian {index + 1}
                  </Typography>
                  <Avatar
                    sx={{ width: 30, height: 30, bgcolor: "primary.main" }}
                  >
                    {index + 1}
                  </Avatar>
                  {fields.length > 1 && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => remove(index)}
                      sx={{ ml: "auto" }}
                    >
                      <Delete />
                    </IconButton>
                  )}
                </Stack>

                <CustomFormControl>
                  {/* Firstname */}
                  <Controller
                    name={`parents.${index}.firstname`}
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Firstname"
                        size="small"
                        fullWidth
                        error={!!errors?.parents?.[index]?.firstname}
                        helperText={
                          errors?.parents?.[index]?.firstname?.message
                        }
                      />
                    )}
                  />
                  {/* Surname */}
                  <Controller
                    name={`parents.${index}.surname`}
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Surname"
                        size="small"
                        fullWidth
                        error={!!errors?.parents?.[index]?.surname}
                        helperText={errors?.parents?.[index]?.surname?.message}
                      />
                    )}
                  />
                </CustomFormControl>

                <CustomFormControl>
                  {/* Gender */}
                  <Controller
                    name={`parents.${index}.gender`}
                    control={control}
                    render={({ field }) => {
                      setValue(`parents.${index}.relationship`, "");
                      return (
                        <TextField
                          {...field}
                          select
                          label="Gender"
                          size="small"
                          fullWidth
                          error={!!errors?.parents?.[index]?.gender}
                          helperText={errors?.parents?.[index]?.gender?.message}
                        >
                          <MenuItem value="male">Male</MenuItem>
                          <MenuItem value="female">Female</MenuItem>
                        </TextField>
                      );
                    }}
                  />

                  {/* Relationship */}
                  <Controller
                    name={`parents.${index}.relationship`}
                    control={control}
                    render={({ field }) => {
                      const gender = watch(`parents.${index}.gender`);
                      return (
                        <Autocomplete
                          freeSolo
                          fullWidth
                          options={RELATIONSHIP(gender)}
                          value={field.value || ""}
                          onInputChange={(_, value) => field.onChange(value)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Relationship"
                              size="small"
                              fullWidth
                              error={!!errors?.parents?.[index]?.relationship}
                              helperText={
                                errors?.parents?.[index]?.relationship?.message
                              }
                            />
                          )}
                        />
                      );
                    }}
                  />
                </CustomFormControl>

                <CustomFormControl>
                  {/* Email */}
                  <Controller
                    name={`parents.${index}.email`}
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Email"
                        size="small"
                        fullWidth
                        error={!!errors?.parents?.[index]?.email}
                        helperText={errors?.parents?.[index]?.email?.message}
                      />
                    )}
                  />

                  {/* Phone */}
                  <Controller
                    name={`parents.${index}.phonenumber`}
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Telephone No."
                        size="small"
                        fullWidth
                        inputMode="tel"
                        error={!!errors?.parents?.[index]?.phonenumber}
                        helperText={
                          errors?.parents?.[index]?.phonenumber?.message
                        }
                      />
                    )}
                  />
                </CustomFormControl>

                {/* Address */}
                <Controller
                  name={`parents.${index}.address`}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Address"
                      size="small"
                      fullWidth
                      error={!!errors?.parents?.[index]?.address}
                      helperText={errors?.parents?.[index]?.address?.message}
                    />
                  )}
                />

                <CustomFormControl>
                  {/* Residence */}
                  <Controller
                    name={`parents.${index}.residence`}
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        freeSolo
                        options={TOWNS}
                        fullWidth
                        value={field.value || ""}
                        onInputChange={(_, value) => field.onChange(value)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Residence"
                            size="small"
                            fullWidth
                            error={!!errors?.parents?.[index]?.residence}
                            helperText={
                              errors?.parents?.[index]?.residence?.message
                            }
                          />
                        )}
                      />
                    )}
                  />
                  {/* Nationality */}
                  <Controller
                    name={`parents.${index}.nationality`}
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        freeSolo
                        fullWidth
                        options={NATIONALITY}
                        value={field.value || ""}
                        onInputChange={(_, value) => field.onChange(value)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Nationality"
                            size="small"
                            fullWidth
                            error={!!errors?.parents?.[index]?.nationality}
                            helperText={
                              errors?.parents?.[index]?.nationality?.message
                            }
                          />
                        )}
                      />
                    )}
                  />
                </CustomFormControl>
              </Stack>
            ))}

            {/* Add Parent Button */}
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() =>
                append({
                  firstname: "",
                  surname: "",
                  gender: "",
                  relationship: "",
                  email: "",
                  phonenumber: "",
                  address: "",
                  residence: "",
                  nationality: "",
                })
              }
              sx={{ alignSelf: "flex-start" }}
            >
              Add New Parent
            </Button>
          </Stack>

          <DialogActions>
            <Button onClick={handleClose} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isPending}
              startIcon={isPending && <LoadingSpinner size={20} />}
            >
              Save Data
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

ParentNew.propTypes = {
  open: PropTypes.bool.isRequired,
  setOpen: PropTypes.func.isRequired,
};

export default ParentNew;
