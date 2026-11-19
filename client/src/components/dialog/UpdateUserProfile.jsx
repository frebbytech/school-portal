import React, { useContext, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Dialog from "@mui/material/Dialog";
import { FormControlLabel, Checkbox } from "@mui/material";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Formik } from "formik";
import PropTypes from "prop-types";
import { putUser } from "@/api/userAPI";
import CustomFormControl from "@/components/inputs/CustomFormControl";
import { updateProfileValidationSchema } from "@/config/validationSchema";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { uploadProfileImage } from "@/api/sessionAPI";

import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import CustomImageChooser from "@/components/inputs/CustomImageChooser";
import { UserContext } from "@/context/providers/UserProvider";
import { useSearchParams } from "react-router-dom";
import LoadingSpinner from "../spinners/LoadingSpinner";
import CustomDatePicker from "../inputs/CustomDatePicker";
import dayjs from "@/lib/dates";

const UpdateUserProfile = () => {
  const { user, updateAccessToken } = useContext(UserContext);
  const [searchParams, setSearchParams] = useSearchParams();

  const queryClient = useQueryClient();
  const [dob, setDob] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPasswordErr, setConfirmPasswordError] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);

  useEffect(() => {
    setProfileImage(user?.profile);
    setDob(dayjs(user?.dateofbirth));
  }, [user]);

  const { mutate, isPending } = useMutation({
    mutationFn: putUser,
  });
  const onSubmit = (values, options) => {
    if (values.confirmPassword !== values.password) {
      setConfirmPasswordError("Passwords do not match");
      options.setSubmitting(false);
      return;
    }

    delete values.profile;
    delete values.confirmPassword;
    values.dateofbirth = dayjs(dob).format("L");
    values._id = user?.id;
    mutate(values, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["user"] });
        options.setSubmitting(false);
      },
      onSuccess: (data) => {
        updateAccessToken(data?.token);
        schoolSessionDispatch(alertSuccess("Changes Saved!!!"));
        handleClose();
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });

    // options.setSubmitting(false);
  };

  const changeProfile = useMutation({
    mutationFn: uploadProfileImage,
  });
  const uploadProfile = (e) => {
    const profile = e.target?.files[0];
    const info = {
      _id: user?.id,
      profile,
      type: "users",
      user: true,
    };

    changeProfile.mutate(info, {
      onSuccess: (data) => {
        updateAccessToken(data?.token);
        schoolSessionDispatch(alertSuccess("Profile Updated!"));
        setProfileImage(URL.createObjectURL(profile));
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  const handleClose = () => {
    setSearchParams((params) => {
      params.delete("e_p");
      return params;
    });
  };

  const handleToggle = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <Dialog open={searchParams.get("e_p")} maxWidth="md" fullWidth>
      <CustomDialogTitle title="Edit Account" onClose={handleClose} />

      <Formik
        initialValues={{
          password: "",
          confirmPassword: "",
          ...user,
        }}
        onSubmit={onSubmit}
        enableReinitialize={true}
        validationSchema={updateProfileValidationSchema}
      >
        {({
          values,
          errors,
          touched,
          handleChange,
          handleSubmit,
          isSubmitting,
        }) => {
          return (
            <>
              <DialogContent sx={{ p: 0 }}>
                <Stack padding={2} spacing={2}>
                  <Stack alignSelf="center">
                    <CustomImageChooser handleImageUpload={uploadProfile}>
                      {changeProfile.isPending ? (
                        <div className="spinner"></div>
                      ) : (
                        <Avatar
                          srcSet={profileImage}
                          sx={{ width: 100, height: 100, alignSelf: "center" }}
                        />
                      )}
                    </CustomImageChooser>
                  </Stack>

                  <Typography
                    variant="body2"
                    color="primary.main"
                    sx={{ fontWeight: "bold" }}
                  >
                    Personal information
                  </Typography>

                  <TextField
                    label="Firstname"
                    type="text"
                    fullWidth
                    size="small"
                    value={values.firstname || ""}
                    onChange={handleChange("firstname")}
                    error={Boolean(touched.firstname && errors.firstname)}
                    helperText={touched.firstname && errors.firstname}
                  />
                  <TextField
                    label="Lastname"
                    type="text"
                    fullWidth
                    size="small"
                    value={values.lastname || ""}
                    onChange={handleChange("lastname")}
                    error={Boolean(touched.lastname && errors.lastname)}
                    helperText={touched.lastname && errors.lastname}
                  />

                  <TextField
                    label="Username"
                    fullWidth
                    size="small"
                    value={values.username || ""}
                    slotProps={{
                      input: {
                        readOnly: true,
                      },
                    }}
                    onChange={handleChange("username")}
                    error={Boolean(touched.username && errors.username)}
                    helperText={touched.username && errors.username}
                  />
                  <CustomDatePicker
                    label="Date of Birth"
                    date={dob}
                    setDate={setDob}
                    disableFuture={true}
                    error={Boolean(touched.dateofbirth && errors.dateofbirth)}
                    helperText={touched.dateofbirth && errors.dateofbirth}
                  />
                  <TextField
                    label="Email"
                    fullWidth
                    size="small"
                    value={values.email || ""}
                    onChange={handleChange("email")}
                    error={Boolean(touched.email && errors.email)}
                    helperText={touched.email && errors.email}
                  />

                  <TextField
                    label="Telephone No."
                    inputMode="tel"
                    type="tel"
                    fullWidth
                    size="small"
                    value={values.phonenumber || ""}
                    onChange={handleChange("phonenumber")}
                    error={Boolean(touched.phonenumber && errors.phonenumber)}
                    helperText={touched.phonenumber && errors.phonenumber}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showPassword}
                        onChange={handleToggle}
                        color="primary"
                      />
                    }
                    label="Update Password"
                  />
                  {showPassword && (
                    <>
                      <CustomFormControl>
                        <TextField
                          type="password"
                          label="Password"
                          fullWidth
                          size="small"
                          autoComplete="new-password"
                          value={values.password}
                          onChange={handleChange("password")}
                          error={Boolean(touched.password && errors.password)}
                          helperText={touched.password && errors.password}
                        />
                        <TextField
                          type="password"
                          label="Confirm Password"
                          autoComplete="new-password"
                          fullWidth
                          size="small"
                          value={values.confirmPassword}
                          onChange={handleChange("confirmPassword")}
                          error={Boolean(
                            touched.confirmPassword && errors.confirmPassword
                          )}
                          helperText={
                            confirmPasswordErr
                              ? confirmPasswordErr
                              : touched.confirmPassword &&
                                errors.confirmPassword
                          }
                          FormHelperTextProps={{
                            color: "error.main",
                          }}
                        />
                      </CustomFormControl>
                    </>
                  )}
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                  loading={isSubmitting}
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                >
                  Save Changes
                </Button>
              </DialogActions>
              {isPending && <LoadingSpinner value="Saving Changes.." />}
            </>
          );
        }}
      </Formik>
    </Dialog>
  );
};

UpdateUserProfile.propTypes = {
  open: PropTypes.bool,
  setOpen: PropTypes.func,
};

export default UpdateUserProfile;
