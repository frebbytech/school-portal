import React, { useContext, useEffect, useState } from "react";
import {
  Button,
  Autocomplete,
  Avatar,
  Dialog,
  DialogActions,
  DialogContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs from "@/lib/dates";

import { putStudent } from "@/api/studentAPI";
import CustomFormControl from "@/components/inputs/CustomFormControl";
import CustomDatePicker from "@/components/inputs/CustomDatePicker";
import CustomImageChooser from "@/components/inputs/CustomImageChooser";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";

import { studentEditValidationSchema } from "@/config/validationSchema";
import { StudentContext } from "@/context/providers/StudentProvider";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { NATIONALITY } from "@/mockup/data/nationality";
import { TOWNS } from "@/mockup/data/towns";

const StudentEdit = () => {
  const queryClient = useQueryClient();
  const [dob, setDob] = useState(null);
  const [profileImage, setProfileImage] = useState(null);

  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const {
    studentState: { editStudentData },
    studentDispatch,
  } = useContext(StudentContext);

  const student = editStudentData?.data;

  // Initialize form
  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(studentEditValidationSchema),
    defaultValues: student,
  });

  useEffect(() => {
    if (student) {
      reset(student);
      const born = student?.dateofbirth ? dayjs(student.dateofbirth) : null;
      setDob(born?.isValid() ? born : null);
      setProfileImage(student?.profile);
    }
  }, [student, reset]);

  // Close dialog
  const handleClose = () => {
    studentDispatch({
      type: "editStudent",
      payload: { open: false, data: {} },
    });
  };

  // Update student mutation
  const { mutate, isPending } = useMutation({ mutationFn: putStudent });

  const onSubmit = (values) => {
    if (!dob || !dayjs(dob).isValid()) {
      setError("dateofbirth", { type: "required", message: "Required*" });
      return;
    }
    clearErrors("dateofbirth");

    mutate(
      { ...values, dateofbirth: dayjs(dob).format("L"), profile: profileImage },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ["student-profile"] });
          queryClient.invalidateQueries({ queryKey: ["student/id"] });
          queryClient.invalidateQueries({ queryKey: ["student-details"] });
          schoolSessionDispatch(alertSuccess(data));
          handleClose();
        },
        onError: (error) => {
          schoolSessionDispatch(alertError(error));
        },
      }
    );
  };

  // Choose a new photo: it is only previewed here and saved with Save Changes
  const uploadProfile = (e) => {
    const profile = e.target?.files?.[0];
    if (!profile) return;
    const reader = new FileReader();
    reader.onload = (event) => setProfileImage(event.target?.result);
    reader.onerror = () =>
      schoolSessionDispatch(alertError("The photo could not be read. Choose another file."));
    reader.readAsDataURL(profile);
  };

  return (
    <Dialog open={editStudentData.open} maxWidth="md" fullWidth>
      <CustomDialogTitle
        title="Edit Student Information"
        subtitle="Make changes to student information"
        onClose={handleClose}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ p: 1.5 }}>
          <Stack spacing={1}>
            {/* Profile */}
            <Stack alignSelf="center">
              <CustomImageChooser handleImageUpload={uploadProfile}>
                <Avatar
                  srcSet={profileImage || ""}
                  sx={{ width: 100, height: 100, alignSelf: "center" }}
                />
              </CustomImageChooser>
            </Stack>

            <Typography
              variant="body2"
              color="primary.main"
              sx={{ fontWeight: "bold" }}
            >
              Personal Information
            </Typography>

            {/* Student ID */}
            <Controller
              name="indexnumber"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Student ID"
                  size="small"
                  sx={{ maxWidth: { xs: "100%", md: 240 } }}
                  disabled
                  error={!!errors.indexnumber}
                  helperText={errors.indexnumber?.message}
                />
              )}
            />

            {/* Names */}
            <CustomFormControl>
              <Controller
                name="firstname"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Firstname"
                    fullWidth
                    size="small"
                    error={!!errors.firstname}
                    helperText={errors.firstname?.message}
                    slotProps={{
                      htmlInput: {
                        style: {
                          textTransform: "capitalize",
                        },
                      },
                    }}
                  />
                )}
              />

              <Controller
                name="surname"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Surname"
                    fullWidth
                    size="small"
                    error={!!errors.surname}
                    helperText={errors.surname?.message}
                    slotProps={{
                      htmlInput: {
                        style: {
                          textTransform: "capitalize",
                        },
                      },
                    }}
                  />
                )}
              />

              <Controller
                name="othername"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Othername"
                    fullWidth
                    size="small"
                    error={!!errors.othername}
                    helperText={errors.othername?.message}
                    slotProps={{
                      htmlInput: {
                        style: {
                          textTransform: "capitalize",
                        },
                      },
                    }}
                  />
                )}
              />
            </CustomFormControl>

            {/* DOB and Gender */}
            <CustomFormControl>
              <CustomDatePicker
                label="Date of Birth"
                date={dob}
                setDate={(value) => {
                  setDob(value);
                  clearErrors("dateofbirth");
                }}
                disableFuture
                error={!!errors.dateofbirth}
                helperText={errors.dateofbirth?.message}
              />

              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    size="small"
                    label="Gender"
                    error={!!errors.gender}
                    helperText={errors.gender?.message}
                  >
                    <MenuItem value="male">male</MenuItem>
                    <MenuItem value="female">female</MenuItem>
                    <MenuItem value="other">other</MenuItem>
                  </TextField>
                )}
              />
            </CustomFormControl>

            {/* Contact Info */}
            <Typography
              variant="body2"
              color="primary.main"
              sx={{ fontWeight: "bold" }}
            >
              Contact
            </Typography>
            <CustomFormControl>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email"
                    fullWidth
                    size="small"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />

              <Controller
                name="phonenumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Telephone No."
                    type="tel"
                    fullWidth
                    size="small"
                    error={!!errors.phonenumber}
                    helperText={errors.phonenumber?.message}
                  />
                )}
              />
            </CustomFormControl>

            {/* Address */}
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Address"
                  fullWidth
                  size="small"
                  error={!!errors.address}
                  helperText={errors.address?.message}
                />
              )}
            />

            {/* Residence & Nationality */}
            <CustomFormControl>
              <Controller
                name="residence"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    freeSolo
                    fullWidth
                    size="small"
                    options={TOWNS}
                    value={field.value || ""}
                    onChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Residence"
                        fullWidth
                        size="small"
                        error={!!errors.residence}
                        helperText={errors.residence?.message}
                      />
                    )}
                  />
                )}
              />

              <Controller
                name="nationality"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    freeSolo
                    fullWidth
                    size="small"
                    options={NATIONALITY}
                    value={field.value || ""}
                    onChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Nationality"
                        fullWidth
                        size="small"
                        error={!!errors.nationality}
                        helperText={errors.nationality?.message}
                      />
                    )}
                  />
                )}
              />
            </CustomFormControl>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isPending}
          >
            Save Changes
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default React.memo(StudentEdit);

